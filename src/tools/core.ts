import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { client, run, text, image, wrap, windowScreenshot, withEditorVisible, DATA_DIR } from '../server/ctx.js';
import { RUNTIME_CODE, RUNTIME_MANIFEST, RUNTIME_VERSION } from '../generated/runtime.js';
import { VERSION } from '../version.js';

const SELF_UPDATE = `
const UUID = JSON.parse(args.manifest).uuid;
const dbs = (await indexedDB.databases()).filter((d) => /^User_.*_v\\d+$/.test(d.name));
const open = (name) => new Promise((res, rej) => { const r = indexedDB.open(name); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
const req = (r) => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
const updated = [];
for (const d of dbs) {
	const db = await open(d.name);
	if (!db.objectStoreNames.contains('extensionsIndex')) { db.close(); continue; }
	const idx = await req(db.transaction('extensionsIndex').objectStore('extensionsIndex').get(UUID));
	if (!idx) { db.close(); continue; }
	const tx = db.transaction(['extensionsIndex', 'extensionsObjectStorage'], 'readwrite');
	const os = tx.objectStore('extensionsObjectStorage');
	for (const [path, text, type] of [['dist/index.js', args.code, 'text/javascript'], ['extension.json', args.manifest, 'application/json']]) {
		os.put({ key: UUID + '|' + path, uuid: UUID, path, source: new File([text], path, { type }) });
	}
	idx.config = JSON.parse(args.manifest);
	tx.objectStore('extensionsIndex').put(idx);
	await new Promise((res, rej) => { tx.oncomplete = res; tx.onerror = () => rej(tx.error); });
	updated.push(d.name);
	db.close();
}
if (updated.length && args.reload) setTimeout(() => location.reload(), 600);
return { updated: updated.length, from: runtime.version, to: JSON.parse(args.manifest).version, reloading: !!(updated.length && args.reload) };
`;

const cmpVer = (a: string, b: string) => {
	const pa = String(a).split('.').map(Number),
		pb = String(b).split('.').map(Number);
	for (let i = 0; i < 3; i++) if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) - (pb[i] || 0);
	return 0;
};

let autoUpdated = false;
export async function maybeAutoUpdateRuntime(editorRuntime?: string) {
	if (autoUpdated || !editorRuntime || cmpVer(editorRuntime, RUNTIME_VERSION) >= 0) return null;
	autoUpdated = true;
	// install silently; takes effect next time EasyEDA reloads the extension (no disruption now)
	return client.exec(SELF_UPDATE, { code: RUNTIME_CODE, manifest: RUNTIME_MANIFEST, reload: false }, { raw: true, timeoutMs: 20000 }).then((r) => r.result);
}

function apiDocPath() {
	const here = dirname(fileURLToPath(import.meta.url));
	for (const p of [join(here, '..', 'assets', 'easyeda-pro-api.d.ts'), join(here, '..', '..', 'assets', 'easyeda-pro-api.d.ts')]) if (existsSync(p)) return p;
	return null;
}
let apiLines: string[] | null = null;

export function registerCore(server: McpServer) {
	server.registerTool(
		'easyeda_status',
		{
			title: 'Connection status',
			description:
				'Check the EasyEDA connection: hub, connected EasyEDA windows (version, open project/document), runtime version. Call this first. Also installs runtime updates automatically. If nothing is connected it explains how to set up.',
			inputSchema: {},
		},
		wrap(async () => {
			const st = await client.status();
			const editors = st.editors || [];
			const res: any = {
				mcpVersion: VERSION,
				hub: { version: st.hubVersion, port: st.port, uptimeS: st.uptimeS, agents: (st.agents || []).map((a: any) => a.name) },
				editors: editors.map((e: any) => ({ id: e.id, eda: e.edaVersion, runtime: e.runtimeVersion, project: e.project?.name, busy: e.busy })),
				bundledRuntime: RUNTIME_VERSION,
			};
			if (!editors.length) {
				res.setup = [
					'No EasyEDA Pro window is connected.',
					'1. Open EasyEDA Pro (desktop client or pro.easyeda.com).',
					`2. Settings → Extensions → Extension Manager → Import → choose the .eext file (bundled at ${join(dirname(fileURLToPath(import.meta.url)), 'easyeda-mcp.eext')}).`,
					'3. In the extension entry enable "Allow External Interaction" (and "Display in top menu").',
					'4. It connects automatically within a few seconds (menu: MCP → Status).',
				];
			} else {
				const newest = editors[0];
				try {
					const info = await client.info();
					res.active = { project: info.project?.name, projectUuid: info.project?.uuid, document: info.document ? { type: ({ 1: 'schematic', 3: 'pcb' } as any)[info.document.documentType] ?? info.document.documentType, uuid: info.document.uuid } : null };
				} catch {
					/* ignore */
				}
				const upd = await maybeAutoUpdateRuntime(newest.runtimeVersion).catch((e) => ({ error: String(e?.message || e) }));
				if (upd) res.runtimeUpdate = { ...upd, note: 'New runtime installed; it activates the next time EasyEDA reloads (or call easyeda_update_runtime with reload=true).' };
			}
			if (client.events.length) res.recentEvents = client.events.slice(-5).map((e) => `${e.at} ${e.event}`);
			return text(res);
		}),
	);

	server.registerTool(
		'easyeda_update_runtime',
		{
			title: 'Update in-editor runtime',
			description: 'Install the runtime bundled with this MCP server into EasyEDA (no manual re-import). reload=true reloads the EasyEDA editor so it takes effect now — save work first.',
			inputSchema: { reload: z.boolean().default(false) },
		},
		wrap(async ({ reload }) => {
			const r = await client.exec(SELF_UPDATE, { code: RUNTIME_CODE, manifest: RUNTIME_MANIFEST, reload }, { raw: true, timeoutMs: 20000 });
			return text(r.result);
		}),
	);

	server.registerTool(
		'easyeda_run_script',
		{
			title: 'Run JavaScript in EasyEDA (full API)',
			description: [
				'Execute JavaScript inside EasyEDA Pro with the COMPLETE extension API (`eda.*`, ~95 modules, every EasyEDA feature) — use it for anything the dedicated tools do not cover.',
				'In scope: `eda` (API root), `lib` (helpers: lib.schState(), lib.pcbComponents(true), lib.findSchComponent(ref), lib.safeModifySch(c, patch), lib.clickButton(text), lib.withAutoConfirm(fn, buttons), lib.ensureDoc("schematic"|"pcb")…), `args` (your JSON), `runtime.sleep(ms)`, `console.log` (returned as logs).',
				'Use `return` to send back a value; EasyEDA primitive objects are auto-serialised via their getState_* methods; Blobs/Files come back as base64.',
				'Units: schematic = 0.01 inch, Y up. PCB = mil, Y up. Use easyeda_api_search to look up exact method signatures before guessing.',
				'Warning: sch/pcb modify() replaces otherProperty wholesale — use lib.safeModifySch / lib.safeModifyPcb instead of raw modify for components.',
			].join('\n'),
			inputSchema: { code: z.string(), args: z.record(z.any()).optional(), timeoutMs: z.number().int().min(1000).max(900000).optional(), visible: z.boolean().optional().describe('bring EasyEDA to the front while running — disturbs the user, avoid') },
		},
		wrap(async ({ code, args, timeoutMs, visible }) => {
			const exec = () => client.exec(code, args ?? {}, { timeoutMs: timeoutMs ?? 60000 });
			const r = visible ? await withEditorVisible(exec, true) : await exec();
			const res: any = r.result;
			if (res && res.__blob && /^image\//.test(res.mime)) return image(res.base64, res.mime, r.logs.length ? 'logs:\n' + r.logs.join('\n') : undefined);
			return text({ result: res, logs: r.logs.length ? r.logs : undefined, ms: r.ms });
		}),
	);

	server.registerTool(
		'easyeda_api_search',
		{
			title: 'Search the EasyEDA Pro API',
			description: 'Search the full EasyEDA Pro extension API reference (classes, methods, signatures, enums) by keyword or regex, e.g. "PrimitiveVia.create", "getDsnFile", "enum EPCB_LayerId". Marks whether each module exists in the connected EasyEDA version.',
			inputSchema: { query: z.string(), limit: z.number().int().min(1).max(80).default(25) },
		},
		wrap(async ({ query, limit }) => {
			const p = apiDocPath();
			if (!p) return text('API reference file missing from the package.');
			apiLines ??= readFileSync(p, 'utf8').split('\n');
			let re: RegExp;
			try {
				re = new RegExp(query, 'i');
			} catch {
				re = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
			}
			const hits: string[] = [];
			let currentClass = '';
			for (let i = 0; i < apiLines.length && hits.length < limit; i++) {
				const l = apiLines[i];
				const m = l.match(/^\s*(?:declare\s+)?(?:class|interface|enum|type)\s+(\w+)/);
				if (m) currentClass = m[1];
				if (re.test(l) || (m && re.test(m[1]))) {
					if (/^\s*(enum|interface)\s/.test(l) && re.test(l)) {
						// include the body
						const body = [l.trim()];
						for (let j = i + 1; j < apiLines.length && body.length < 40; j++) {
							body.push(apiLines[j].trim());
							if (/^\s*}/.test(apiLines[j])) break;
						}
						hits.push(body.join(' '));
					} else hits.push(`${currentClass}: ${l.trim()}`);
				}
			}
			// runtime availability (module names are lower-camel of class names)
			let available: Record<string, boolean> = {};
			try {
				const mods = [...new Set(hits.map((h) => h.split(':')[0]).filter((c) => /^[A-Z]{2,4}_/.test(c)))];
				if (mods.length) {
					available = await run(
						`const o={}; for (const c of args.mods) { const k = c.replace(/^([A-Z]+)_/, (m,p)=>p.toLowerCase()+'_'); o[c] = !!eda[k]; } return o;`,
						{ mods },
						8000,
					);
				}
			} catch {
				/* editor offline: skip */
			}
			return text({ matches: hits.length, available: Object.keys(available).length ? available : undefined, results: hits, note: 'Call as eda.<module>.<method>(…), module = class name with lower-case prefix (SCH_PrimitiveWire → eda.sch_PrimitiveWire).' });
		}),
	);

	server.registerTool(
		'easyeda_ui',
		{
			title: 'EasyEDA window / dialogs',
			description:
				'Deal with EasyEDA UI dialogs that block API calls: action "buttons" lists visible dialog buttons, "click" presses one by its text (e.g. "Apply Changes", "OK", "Confirm"). "screenshot" (whole window incl. dialogs) and "focus" BRING EASYEDA TO THE FRONT — only use them when the user agrees; prefer sch_snapshot / pcb_snapshot which never disturb the user.',
			inputSchema: { action: z.enum(['buttons', 'click', 'screenshot', 'focus']), button: z.string().optional() },
		},
		wrap(async ({ action, button }) => {
			if (action === 'buttons') return text({ buttons: await run('return lib.visibleButtons()', {}, 8000) });
			if (action === 'click') {
				if (!button) return text('button text required');
				const r = await run('return lib.clickButton(args.b)', { b: button }, 8000);
				return text({ clicked: r });
			}
			if (action === 'focus') {
				await withEditorVisible(async () => undefined, true);
				return text('ok');
			}
			const f = await withEditorVisible(async () => {
				await new Promise((r) => setTimeout(r, 300));
				return windowScreenshot();
			}, true);
			if (!f) return text('Window screenshots are only supported on Windows (or EasyEDA window not found).');
			return image(readFileSync(f).toString('base64'), 'image/png');
		}),
	);

	server.registerTool(
		'easyeda_project',
		{
			title: 'Projects & documents',
			description: [
				'Project / document management.',
				'action: "info" (current project: boards, schematic pages, PCBs, active doc) | "list" (all projects) | "create" (name → creates and opens a project with a schematic+PCB board) | "open" (projectUuid) |',
				'"open_document" (uuid, or kind "schematic"/"pcb" for the first one) | "save" (save EVERY schematic page and PCB of the project) | "add_page" / "rename_page" (prefer sch_page).',
				'Tools that change the design also save the document they changed automatically (disable with EASYEDA_MCP_AUTOSAVE=0).',
			].join(' '),
			inputSchema: {
				action: z.enum(['info', 'list', 'create', 'open', 'open_document', 'save', 'add_page', 'rename_page']),
				name: z.string().optional(),
				uuid: z.string().optional(),
				kind: z.enum(['schematic', 'pcb']).optional(),
				description: z.string().optional(),
			},
		},
		wrap(async (a) => {
			switch (a.action) {
				case 'info':
					return text(await run('return lib.projectInfo()'));
				case 'list':
					return text(
						await run(`const ids = await eda.dmt_Project.getAllProjectsUuid(); const out=[]; for (const id of ids.slice(0,200)) { const p = await eda.dmt_Project.getProjectInfo(id); out.push({uuid:id, name:p&&(p.friendlyName||p.name)}); } return out;`, {}, 60000),
					);
				case 'create': {
					if (!a.name) return text('name required');
					const r = await run(
						`const uuid = await eda.dmt_Project.createProject(args.name, args.name.replace(/[^\\w-]+/g,'_') + '_' + Date.now().toString(36), undefined, undefined, args.description || '');
						 if (!uuid) throw new Error('createProject failed');
						 await eda.dmt_Project.openProject(uuid);
						 return uuid;`,
						{ name: a.name, description: a.description },
						60000,
					);
					// opening a project reloads the editor context; wait for it to reconnect
					await new Promise((res) => setTimeout(res, 3000));
					let info: any;
					for (let i = 0; i < 10; i++) {
						try {
							info = await run('return lib.projectInfo()', {}, 10000);
							if (info?.uuid === r) break;
						} catch {
							/* reconnecting */
						}
						await new Promise((res) => setTimeout(res, 1500));
					}
					return text({ created: r, project: info });
				}
				case 'open':
					await run('return eda.dmt_Project.openProject(args.uuid)', { uuid: a.uuid }, 60000);
					await new Promise((res) => setTimeout(res, 3000));
					return text(await run('return lib.projectInfo()', {}, 20000).catch(() => 'opened (editor reconnecting)'));
				case 'open_document':
					return text({ active: await run('return lib.ensureDoc(args.kind || "schematic", args.uuid)', { kind: a.kind ?? (a.uuid ? undefined : 'schematic'), uuid: a.uuid }, 30000) });
				case 'save':
					return text(
						await run(
							`const info = await lib.projectInfo(); const out = [];
							 const pages = [...info.boards.flatMap(b => b.schematic ? b.schematic.pages : []), ...info.others.filter(o => o.type === 'schematic').flatMap(o => o.pages || [])];
							 const pcbs = [...info.boards.map(b => b.pcb).filter(Boolean), ...info.others.filter(o => o.type === 'pcb')];
							 for (const pg of pages) { try { await lib.ensureDoc('schematic', pg.uuid); out.push({ page: pg.name, saved: await eda.sch_Document.save() }); } catch (e) { out.push({ page: pg.name, error: e.message }); } }
							 for (const pc of pcbs) { try { await lib.ensureDoc('pcb', pc.uuid); out.push({ pcb: pc.name, saved: await eda.pcb_Document.save() }); } catch (e) { out.push({ pcb: pc.name, error: e.message }); } }
							 return out;`,
							{},
							120000,
						),
					);
				case 'add_page':
					return text(
						await run(
							`const info = await lib.projectInfo(); const sch = info.boards[0]?.schematic?.uuid; if (!sch) throw new Error('no schematic'); const id = await eda.dmt_Schematic.createSchematicPage(sch); if (args.name && id) await eda.dmt_Schematic.modifySchematicPageName(id, args.name); return {page: id};`,
							{ name: a.name },
						),
					);
				case 'rename_page':
					return text({ ok: await run('return eda.dmt_Schematic.modifySchematicPageName(args.uuid, args.name)', { uuid: a.uuid, name: a.name }) });
			}
		}),
	);

	void DATA_DIR;
}
