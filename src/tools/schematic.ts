import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { run, text, image, wrap, withEditorVisible } from '../server/ctx.js';
import { analyze, layoutIssues, isGroundName, isPowerName, type SchState, type SchComp, type Pt } from '../sch/connectivity.js';
import { SchRouter, pinOutward } from '../sch/router.js';
import { schematicSvg } from '../render/svg.js';

/* ------------------------------ state helpers ------------------------------ */

/** The schematic page the tools work on (set with sch_page open/add); default = first page. */
let activePage: string | undefined;
export const ensureSch = () => run('return lib.ensureDoc("schematic", args.p)', { p: activePage }, 30000);

const ELECTRICAL = new Set(['part', 'netflag', 'netport', 'short', 'netlabel', 'nonElectrical_symbol']);

export async function readSch(): Promise<SchState & { page?: any; raw: any }> {
	await ensureSch();
	const raw = await run('return lib.schState({pins:true})', {}, 120000);
	const components: SchComp[] = raw.components.filter((c: any) => c.type === 'part' || (c.type !== 'sheet' && c.type !== 'nonElectrical_symbol' && (c.pins || []).length)).map((c: any) => ({
		...c,
		designator: c.designator || (c.type === 'part' ? c.id : `${c.type}:${c.net}`),
		pins: (c.pins || []).map((p: any) => ({ ...p, ref: `${c.designator || c.id}.${p.number}`, designator: c.designator })),
	}));
	return { components, wires: raw.wires, page: raw.page, graphics: raw.graphics, raw } as any;
}

function sheetBounds(page: any) {
	if (page?.width && page?.height) return { minX: 0, minY: 0, maxX: page.width, maxY: page.height };
	return undefined;
}

/** Resolve "U1.3", "U1.VCC" (pin name), "U1:3" to a canonical pin ref. */
function resolvePin(state: SchState, spec: string): { comp: SchComp; pin: any; ref: string } {
	const m = spec.match(/^(.+?)[.:]([^.:]+)$/);
	if (!m) throw new Error(`Pin "${spec}" must look like DESIGNATOR.PIN (e.g. U1.3 or U1.VCC).`);
	const comps = state.components.filter((c) => c.designator === m[1]);
	if (!comps.length) throw new Error(`No component ${m[1]} on this sheet.`);
	for (const comp of comps) {
		const byNum = comp.pins.find((p) => p.number === m[2]);
		if (byNum) return { comp, pin: byNum, ref: byNum.ref };
	}
	for (const comp of comps) {
		const byName = comp.pins.filter((p) => p.name?.toUpperCase() === m[2].toUpperCase());
		if (byName.length === 1) return { comp, pin: byName[0], ref: byName[0].ref };
		if (byName.length > 1) throw new Error(`${spec} is ambiguous (pins ${byName.map((p) => p.number).join(', ')} share that name); use the pin number.`);
	}
	throw new Error(`${m[1]} has no pin "${m[2]}". Pins: ${comps[0].pins.map((p) => `${p.number}${p.name && p.name !== p.number ? '/' + p.name : ''}`).join(' ')}`);
}

const add = (a: Pt, b: Pt, k = 1): Pt => [a[0] + b[0] * k, a[1] + b[1] * k];

/* ------------------------------ connect engine ------------------------------ */

type Style = 'auto' | 'wire' | 'label' | 'flag';

interface ConnectNet {
	name?: string;
	pins: string[];
	style?: Style;
}

function flagFor(name: string, override?: string): 'power' | 'ground' | 'analogground' | 'protectground' {
	if (override) return override as any;
	if (/^AGND/i.test(name)) return 'analogground';
	if (/^(PGND|EARTH|PE|CHASSIS)/i.test(name)) return 'protectground';
	if (isGroundName(name)) return 'ground';
	return 'power';
}

type Box = { minX: number; minY: number; maxX: number; maxY: number };
interface FlagPlan {
	wire: Pt[];
	at: Pt;
	rotation: number;
	box: Box;
	label?: boolean;
}

/** Bounding box of a power / ground symbol (with its text) whose pin is at `at`. */
function flagBox(kind: string, at: Pt, rotation: number): Box {
	const up = (kind === 'power') !== (rotation === 180);
	return up ? { minX: at[0] - 15, minY: at[1] + 2, maxX: at[0] + 15, maxY: at[1] + 28 } : { minX: at[0] - 15, minY: at[1] - 30, maxX: at[0] + 15, maxY: at[1] - 2 };
}
function labelBox(wire: Pt[]): Box {
	const [p, e] = [wire[0], wire[wire.length - 1]];
	// EasyEDA draws the name just above (or left of) the wire, ~7 units tall
	if (p[1] === e[1]) return { minX: Math.min(p[0], e[0]) + 3, minY: p[1] + 2, maxX: Math.max(p[0], e[0]) - 1, maxY: p[1] + 8 };
	return { minX: p[0] - 8, minY: Math.min(p[1], e[1]) + 3, maxX: p[0] - 2, maxY: Math.max(p[1], e[1]) - 1 };
}

/** Candidate geometries for a flag on a pin, best first. Power symbols point up, grounds down. */
function flagCandidates(pin: any, kind: string, siblings: any[] = []): FlagPlan[] {
	const o = pinOutward(pin.rotation);
	// rows of other pins on the same side of the part: a turned stub must not cut across them
	const sameSide = siblings.filter((q) => q !== pin && pinOutward(q.rotation).join() === o.join() && (o[0] !== 0 ? q.x === pin.x : q.y === pin.y));
	const crossesRow = (wire: Pt[]) => {
		if (wire.length < 3) return false;
		const [a, b] = [wire[1], wire[2]];
		const lo = o[0] !== 0 ? Math.min(a[1], b[1]) : Math.min(a[0], b[0]);
		const hi = o[0] !== 0 ? Math.max(a[1], b[1]) : Math.max(a[0], b[0]);
		return sameSide.some((q) => {
			const v = o[0] !== 0 ? q.y : q.x;
			return v >= lo - 1 && v <= hi + 1;
		});
	};
	const p: Pt = [pin.x, pin.y];
	const natural: Pt = kind === 'power' ? [0, 1] : [0, -1];
	const out: FlagPlan[] = [];
	const mk = (wire: Pt[], rotation: number) => ({ wire, at: wire[wire.length - 1], rotation, box: flagBox(kind, wire[wire.length - 1], rotation) });
	if (o[0] === natural[0] && o[1] === natural[1]) for (const L of [20, 30, 40, 60]) out.push(mk([p, add(p, o, L)], 0));
	else if (o[1] === 0) {
		for (const L of [20, 30, 40, 50, 70])
			for (const T of [10, 20, 30]) {
				const w = [p, add(p, o, L), add(add(p, o, L), natural, T)];
				if (!crossesRow(w)) out.push(mk(w, 0));
			}
	} else for (const L of [20, 30, 40]) out.push(mk([p, add(p, o, L)], 180));
	return out;
}
function labelCandidates(pin: any): FlagPlan[] {
	const o = pinOutward(pin.rotation);
	const p: Pt = [pin.x, pin.y];
	return [30, 40, 20, 50, 60, 80].map((L) => {
		const wire = [p, add(p, o, L)];
		return { wire, at: wire[1], rotation: 0, box: labelBox(wire), label: true };
	});
}

function planLabel(pin: any, stub: number): Pt[] {
	const o = pinOutward(pin.rotation);
	const p: Pt = [pin.x, pin.y];
	return [p, add(p, o, stub)];
}

/** Planar-ish flag/label placement that never touches foreign pins, wires or parts. */
function chooseGeometry(router: SchRouter, net: string, cands: FlagPlan[]): FlagPlan | null {
	for (const c of cands) if (router.pathFree(c.wire, net) && router.boxFree(c.box, net)) return c;
	return null;
}
function commitGeometry(router: SchRouter, net: string, c: FlagPlan) {
	const segs: [number, number, number, number][] = [];
	for (let i = 1; i < c.wire.length; i++) segs.push([c.wire[i - 1][0], c.wire[i - 1][1], c.wire[i][0], c.wire[i][1]]);
	router.addWire(net, segs);
	router.blockBox(c.box);
}

/** Group same-net pins that sit next to each other on one side of one part. */
function clusterPins(resolved: { comp: SchComp; pin: any; ref: string }[], allPins: (comp: SchComp) => any[]) {
	const groups: (typeof resolved)[] = [];
	const used = new Set<string>();
	for (const r of resolved) {
		if (used.has(r.ref)) continue;
		const o = pinOutward(r.pin.rotation);
		const axis = o[0] !== 0 ? 1 : 0; // coordinate that varies along the side
		const side = resolved.filter((x) => x.comp === r.comp && !used.has(x.ref) && pinOutward(x.pin.rotation).join() === o.join() && (axis ? x.pin.x === r.pin.x : x.pin.y === r.pin.y));
		side.sort((a, b) => (axis ? a.pin.y - b.pin.y : a.pin.x - b.pin.x));
		const others = allPins(r.comp).filter((p) => pinOutward(p.rotation).join() === o.join() && !side.some((x) => x.pin === p));
		let run: typeof resolved = [];
		const flush = () => {
			if (run.length) groups.push(run);
			run.forEach((x) => used.add(x.ref));
			run = [];
		};
		for (const x of side) {
			if (run.length) {
				const prev = run[run.length - 1];
				const lo = axis ? Math.min(prev.pin.y, x.pin.y) : Math.min(prev.pin.x, x.pin.x);
				const hi = axis ? Math.max(prev.pin.y, x.pin.y) : Math.max(prev.pin.x, x.pin.x);
				const blocked = others.some((p) => (axis ? p.y > lo && p.y < hi : p.x > lo && p.x < hi));
				if (hi - lo > 30 || blocked) flush();
			}
			run.push(x);
		}
		flush();
	}
	return groups;
}

export async function connectNets(
	nets: ConnectNet[],
	opts: { wireSpan?: number; maxWirePins?: number; flagStub?: number; labelStub?: number; dryRun?: boolean; grid?: number } = {},
) {
	const st = await readSch();
	const report = analyze(st);
	const bounds = sheetBounds(st.page);
	const wireSpan = opts.wireSpan ?? 450;
	const maxWirePins = opts.maxWirePins ?? 8;
	const flagStub = opts.flagStub ?? 20;
	const labelStub = opts.labelStub ?? 30;

	// router sees existing wires under their analysed net names
	const wireNet = new Map<string, string>();
	for (const n of report.nets) for (const w of n.wires) wireNet.set(w, n.name);
	const routedState: SchState = { components: st.components, wires: st.wires.map((w) => ({ ...w, net: wireNet.get(w.id) || w.net })) };
	const router = new SchRouter(routedState, { bounds, grid: opts.grid ?? 5 }, report.pinNet);

	const actions: { kind: 'wire' | 'flag'; points?: Pt[]; net?: string; flag?: string; at?: Pt; rotation?: number }[] = [];
	const summary: any[] = [];
	const errors: string[] = [];

	const isSym = (n: ConnectNet) => n.style === 'flag' || n.style === 'label' || (!n.style || n.style === 'auto' ? !!n.name && (isGroundName(n.name) || isPowerName(n.name)) : false);
	const ordered = [...nets.filter(isSym), ...nets.filter((n) => !isSym(n))];
	for (const n of ordered) {
		let resolved: ReturnType<typeof resolvePin>[];
		try {
			resolved = n.pins.map((p) => resolvePin(st, p));
		} catch (e: any) {
			errors.push(e.message);
			continue;
		}
		// name: given, or existing name of any pin's net
		const existingNames = [...new Set(resolved.map((r) => report.pinNet[r.ref]).filter((x) => x && !x.startsWith('$')))];
		const name = n.name || existingNames[0];
		if (n.name && existingNames.some((x) => x !== n.name)) errors.push(`warning: ${n.pins.join(',')} already belong to net ${existingNames.join('/')} — connecting to ${n.name} will merge names.`);
		let style: Style = n.style || 'auto';
		if (style === 'auto') {
			if (name && (isGroundName(name) || isPowerName(name))) style = 'flag';
			else {
				const xs = resolved.map((r) => r.pin.x),
					ys = resolved.map((r) => r.pin.y);
				const span = Math.max(...xs) - Math.min(...xs) + Math.max(...ys) - Math.min(...ys);
				style = resolved.length <= maxWirePins && span <= wireSpan ? 'wire' : name ? 'label' : 'wire';
			}
		}
		const netKey = name || `$auto:${resolved[0].ref}`;
		const row: any = { net: name || '(unnamed)', style, pins: resolved.length };
		if (style === 'flag' || style === 'label') {
			if (!name) {
				errors.push(`Net with pins ${n.pins.join(',')} needs a name to use ${style === 'flag' ? 'power/ground symbols' : 'net labels'}.`);
				continue;
			}
			const kind = flagFor(name);
			const groups = clusterPins(resolved, (c) => c.pins);
			let flags = 0,
				labels = 0;
			for (const grp of groups) {
				let rep = grp[0];
				if (grp.length > 1) {
					// tie neighbouring pins together, then one symbol for the group
					const rr = router.route({ net: name, pins: grp.map((g) => g.ref) });
					rr.polylines.forEach((pl) => actions.push({ kind: 'wire', points: pl }));
					rep = grp[Math.floor((grp.length - 1) / 2)];
					if (rr.failed.length) for (const f of rr.failed) groups.push([grp.find((g) => g.ref === f)!]);
				}
				const cands = style === 'flag' ? [...flagCandidates(rep.pin, kind, rep.comp.pins), ...labelCandidates(rep.pin)] : labelCandidates(rep.pin);
				const pick = chooseGeometry(router, name, cands);
				if (!pick) {
					errors.push(`No collision-free spot for a ${name} ${style === 'flag' ? 'symbol' : 'label'} at ${rep.ref} — move nearby parts apart (or rotate ${rep.comp.designator}) and run sch_connect again for this net. Skipped to avoid shorting other nets.`);
					continue;
				}
				commitGeometry(router, name, pick);
				if (pick.label) {
					actions.push({ kind: 'wire', points: pick.wire, net: name });
					labels++;
				} else {
					actions.push({ kind: 'wire', points: pick.wire });
					actions.push({ kind: 'flag', flag: kind, net: name, at: pick.at, rotation: pick.rotation });
					flags++;
				}
			}
			row.symbols = flags;
			row.labels = labels;
		} else {
			const res = router.route({ net: netKey, pins: resolved.map((r) => r.ref) });
			res.polylines.forEach((pl) => actions.push({ kind: 'wire', points: pl }));
			row.wires = res.polylines.length;
			row.crossings = res.crossings;
			if (res.failed.length) {
				row.fallbackLabels = res.failed;
				const lname = name || `N_${resolved[0].ref.replace('.', '_')}`;
				// label the routed tree once + each failed pin
				const anchor = resolved.find((r) => !res.failed.includes(r.ref));
				const lab = (pin: any) => {
					const cands = labelCandidates(pin);
					const pick = chooseGeometry(router, netKey, cands);
					if (!pick) {
						errors.push(`No room for a ${lname} label at a pin of ${pin.ref ?? 'this net'} — move parts apart and retry.`);
						return;
					}
					commitGeometry(router, netKey, pick);
					actions.push({ kind: 'wire', points: pick.wire, net: lname });
				};
				if (anchor) lab(anchor.pin);
				for (const f of res.failed) lab(resolved.find((x) => x.ref === f)!.pin);
			}
		}
		summary.push(row);
	}

	if (opts.dryRun) return { dryRun: true, summary, actions, errors };
	const created = await run(
		`const out = { wires: 0, flags: 0, errors: [] };
		 for (const a of args.actions) {
			try {
				if (a.kind === 'wire') {
					await lib.createWire(a.points, a.net); out.wires++;
				} else { await lib.createFlag(a.flag, a.net, a.at[0], a.at[1], a.rotation); out.flags++; }
			} catch (e) { out.errors.push(String(e.message || e)); }
		 }
		 return out;`,
		{ actions },
		300000,
	);
	return { summary, created, errors: [...errors, ...created.errors] };
}

/* ------------------------------ tools ------------------------------ */

const PartSpec = z.object({
	lcsc: z.string().optional().describe('LCSC code, e.g. C25804 (exact match)'),
	deviceUuid: z.string().optional(),
	libraryUuid: z.string().optional(),
	keyword: z.string().optional().describe('library search (first hit) — prefer lcsc'),
	designator: z.string().optional(),
	value: z.string().optional().describe('sets the Value attribute, e.g. "10kΩ"'),
	attributes: z.record(z.string()).optional(),
	x: z.number().optional(),
	y: z.number().optional(),
	rotation: z.number().optional().describe('0/90/180/270, counter-clockwise'),
	mirror: z.boolean().optional(),
	subPart: z.string().optional().describe('for multi-part symbols, e.g. "LM358.2"'),
	near: z
		.object({ pin: z.string().describe('anchor pin, e.g. U1.5'), gap: z.number().default(40), connect: z.boolean().default(true) })
		.optional()
		.describe('2-pin parts: place in line with this pin (pointing outward) and wire it'),
});

export function registerSchematic(server: McpServer) {
	server.registerTool(
		'sch_page',
		{
			title: 'Schematic pages',
			description: [
				'Multi-page schematics. All sch_* tools work on the ACTIVE page chosen here.',
				'action "list" (pages with part counts), "add" (name → new page, becomes active), "open" (page name or uuid → active), "rename" (page, name), "delete" (page),',
				'"title" (title-block fields for the active page: title, version, company, drawn, reviewed).',
				'Split big designs by function (Power, MCU, Sensors, Connectors…). Nets connect across pages by name: use the same net name (label / power symbol / net port) on each page.',
			].join(' '),
			inputSchema: {
				action: z.enum(['list', 'add', 'open', 'rename', 'delete', 'title']),
				page: z.string().optional(),
				name: z.string().optional(),
				fields: z.record(z.string()).optional(),
			},
		},
		wrap(async (a) => {
			const resolve = async (pg?: string) => {
				const pages: any[] = await run('return (await eda.dmt_Schematic.getAllSchematicPagesInfo()).map(p => ({ uuid: p.uuid, name: p.name, schematic: p.parentSchematicUuid }))', {}, 20000);
				if (!pg) return { pages, hit: undefined };
				const hit = pages.find((p) => p.uuid === pg || String(p.name).toLowerCase() === pg.toLowerCase());
				if (!hit) throw new Error(`No page "${pg}". Pages: ${pages.map((p) => p.name).join(', ')}`);
				return { pages, hit };
			};
			if (a.action === 'list') {
				const { pages } = await resolve();
				const out: any[] = [];
				for (const pg of pages) {
					await run('return lib.ensureDoc("schematic", args.u)', { u: pg.uuid }, 30000);
					const n = await run("return (await eda.sch_PrimitiveComponent.getAll('part', false)).length", {}, 20000);
					out.push({ ...pg, parts: n, active: pg.uuid === activePage || (!activePage && out.length === 0) });
				}
				return text(out);
			}
			if (a.action === 'add') {
				const r = await run(
					`const info = await lib.projectInfo(); const sch = info.boards[0]?.schematic?.uuid || info.others.find(o => o.type === 'schematic')?.uuid; if (!sch) throw new Error('no schematic in project');
					 const id = await eda.dmt_Schematic.createSchematicPage(sch); if (!id) throw new Error('page creation failed'); if (args.name) { await lib.ensureDoc('schematic', id); await eda.dmt_Schematic.modifySchematicPageName(id, args.name); } return id;`,
					{ name: a.name },
				);
				activePage = r;
				return text({ page: r, name: a.name, active: true });
			}
			const { hit } = await resolve(a.page);
			if (a.action === 'open') {
				activePage = hit!.uuid;
				await ensureSch();
				return text({ active: hit });
			}
			if (a.action === 'rename') return text({ ok: await run('await lib.ensureDoc("schematic", args.u); return eda.dmt_Schematic.modifySchematicPageName(args.u, args.n)', { u: hit!.uuid, n: a.name }) });
			if (a.action === 'delete') {
				if (activePage === hit!.uuid) activePage = undefined;
				return text({ ok: await run('return eda.dmt_Schematic.deleteSchematicPage(args.u)', { u: hit!.uuid }) });
			}
			// title block
			if (hit) activePage = hit.uuid;
			await ensureSch();
			const map: Record<string, string> = { title: 'Name', version: 'Version', company: 'Company', drawn: 'Drawn', reviewed: 'Reviewed', description: 'Description' };
			const data: any = {};
			for (const [k, v] of Object.entries(a.fields ?? {})) data[map[k.toLowerCase()] ?? k] = { showTitle: true, showValue: true, value: v };
			return text({ ok: await run('return eda.dmt_Schematic.modifySchematicPageTitleBlock(true, args.d)', { d: data }) });
		}, { save: true }),
	);

	server.registerTool(
		'sch_section',
		{
			title: 'Schematic sections (framed blocks with titles)',
			description: [
				'Group a functional block visually: draws a dashed frame around the given parts (or a region) with a bold title at its top-left, e.g. "POWER INPUT", "3V3 REGULATOR", "555 TIMER".',
				'Lay out each block compactly first, leave ~40 units between blocks, then add a section per block. action "delete" removes a frame/text by id (ids come back from create and from sch_read graphics).',
			].join(' '),
			inputSchema: {
				action: z.enum(['create', 'delete']).default('create'),
				title: z.string().optional(),
				designators: z.array(z.string()).optional(),
				region: z.object({ minX: z.number(), minY: z.number(), maxX: z.number(), maxY: z.number() }).optional(),
				padding: z.number().default(25),
				color: z.string().default('#5a5a9a'),
				lineType: z.enum(['dashed', 'solid', 'dotted']).default('dashed'),
				titleSize: z.number().default(12),
				ids: z.array(z.string()).optional(),
			},
		},
		wrap(async (a) => {
			if (a.action === 'delete') {
				await ensureSch();
				return text(await run(`let n = 0; for (const id of args.ids || []) { for (const api of [eda.sch_PrimitiveRectangle, eda.sch_PrimitiveText]) { let o; try { o = await api.get(id); } catch (e) {} if (o && typeof o.getState_PrimitiveId === 'function' && o.getState_PrimitiveId() === id) { await api.delete(id); n++; break; } } } return { deleted: n };`, { ids: a.ids }));
			}
			const st = await readSch();
			let r = a.region;
			if (!r) {
				const cs = st.components.filter((c) => a.designators?.includes(c.designator));
				if (!cs.length) throw new Error('give designators (existing on this page) or a region');
				// include the parts' own power/ground symbols and labels near them
				const box = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
				const grow = (x: number, y: number) => ((box.minX = Math.min(box.minX, x)), (box.minY = Math.min(box.minY, y)), (box.maxX = Math.max(box.maxX, x)), (box.maxY = Math.max(box.maxY, y)));
				for (const c of cs) {
					if (c.bbox) (grow(c.bbox.minX, c.bbox.minY), grow(c.bbox.maxX, c.bbox.maxY));
					for (const p of c.pins) grow(p.x, p.y);
				}
				const rep = analyze(st);
				const nets = new Set(cs.flatMap((c) => c.pins.map((p) => rep.pinNet[p.ref])).filter(Boolean));
				const near = (x: number, y: number) => x > box.minX - 45 && x < box.maxX + 45 && y > box.minY - 45 && y < box.maxY + 45;
				for (const f of st.components) if (f.type !== 'part' && nets.has(f.net!) && near(f.x, f.y)) (grow(f.x - 12, f.y - 25), grow(f.x + 12, f.y + 25));
				for (const n of rep.nets) if (nets.has(n.name)) for (const wid of n.wires) for (const w of st.wires.filter((x) => x.id === wid)) for (const sg of w.segs) if (near(sg[0], sg[1]) && near(sg[2], sg[3])) (grow(sg[0], sg[1]), grow(sg[2], sg[3]));
				r = { minX: box.minX - a.padding, minY: box.minY - a.padding, maxX: box.maxX + a.padding, maxY: box.maxY + a.padding + (a.title ? a.titleSize + 6 : 0) };
			}
			const snap = (v: number, up: boolean) => (up ? Math.ceil(v / 5) * 5 : Math.floor(v / 5) * 5);
			const R = { minX: snap(r.minX, false), minY: snap(r.minY, false), maxX: snap(r.maxX, true), maxY: snap(r.maxY, true) };
			const ids = await run(
				`const out = {};
				 const rc = await eda.sch_PrimitiveRectangle.create(args.r.minX, args.r.maxY, args.r.maxX - args.r.minX, args.r.maxY - args.r.minY, 0, 0, args.color, null, 1, args.lt, null);
				 out.frame = rc && rc.getState_PrimitiveId();
				 if (args.title) { const t = await eda.sch_PrimitiveText.create(args.r.minX + 6, args.r.maxY - args.size - 3, args.title, 0, args.color, null, args.size, true); out.title = t && t.getState_PrimitiveId(); }
				 return out;`,
				{ r: R, color: a.color, lt: a.lineType === 'dashed' ? 1 : a.lineType === 'dotted' ? 2 : 0, title: a.title, size: a.titleSize },
			);
			const warnings: string[] = [];
			const inside = st.components.filter((c) => c.type === 'part' && c.bbox && c.bbox.minX < R.maxX && c.bbox.maxX > R.minX && c.bbox.minY < R.maxY && c.bbox.maxY > R.minY && !(a.designators ?? []).includes(c.designator));
			if (a.designators && inside.length) warnings.push(`Frame also covers ${inside.map((c) => c.designator).join(', ')} — move this block apart from them (sch_modify dx/dy) for a clean section.`);
			for (const g of (st as any).graphics?.rects ?? []) {
				const gx2 = g.x + g.w,
					gy1 = g.y - g.h;
				if (g.x < R.maxX && gx2 > R.minX && gy1 < R.maxY && g.y > R.minY) warnings.push(`Overlaps another section frame (${g.id}).`);
			}
			return text({ ...ids, region: R, warnings: warnings.length ? warnings : undefined });
		}, { save: true }),
	);

	server.registerTool(
		'sch_read',
		{
			title: 'Read schematic (compact)',
			description:
				'Compact view of the active schematic page (choose pages with sch_page): parts (designator, value, LCSC, position, rotation, bbox) with every pin\'s number/name/position/net, net flags, and wires. Filter with designators or a region to keep output small. Units: 0.01 inch, Y up; A4 sheet ≈ 1170×825.',
			inputSchema: {
				designators: z.array(z.string()).optional(),
				region: z.object({ minX: z.number(), minY: z.number(), maxX: z.number(), maxY: z.number() }).optional(),
				pins: z.boolean().default(true),
				wires: z.boolean().default(false),
			},
		},
		wrap(async (a) => {
			const st = await readSch();
			const rep = analyze(st);
			const inRegion = (c: SchComp) => !a.region || (c.x >= a.region.minX && c.x <= a.region.maxX && c.y >= a.region.minY && c.y <= a.region.maxY);
			const parts = st.components
				.filter((c) => c.type === 'part' && inRegion(c) && (!a.designators || a.designators.includes(c.designator)))
				.map((c) => {
					const o: any = { ref: c.designator, value: c.value, lcsc: c.lcsc, fp: (c as any).footprint, at: [c.x, c.y], rot: c.rotation, bbox: c.bbox && [c.bbox.minX, c.bbox.minY, c.bbox.maxX, c.bbox.maxY] };
					if ((c as any).mirror) o.mirror = true;
					if ((c as any).subPart) o.sub = (c as any).subPart;
					if (a.pins) o.pins = c.pins.map((p) => `${p.number}${p.name && p.name !== p.number ? '/' + p.name : ''}@${p.x},${p.y}${pinDir(p.rotation)}→${rep.pinNet[p.ref] ?? '·'}`);
					return o;
				});
			const flags = st.components.filter((c) => c.type !== 'part' && inRegion(c)).map((c) => `${c.type}:${c.net || ''}@${c.x},${c.y}`);
			const out: any = { page: st.page, parts, flags, wireCount: st.wires.length, legend: 'pin = number/name@x,y<dir> → net (· = unconnected). dir: > right, < left, ^ up, v down' };
			if (a.wires) out.wires = st.wires.map((w) => ({ id: w.id, net: w.net || undefined, segs: w.segs }));
			return text(out);
		}),
	);

	server.registerTool(
		'sch_place',
		{
			title: 'Place schematic parts (batch)',
			description: [
				'Place one or many parts on the active schematic page. Each part by LCSC code (exact, preferred) / deviceUuid / keyword, with designator, value, x, y, rotation.',
				'Returns each placed part with its pin positions so you can plan wiring. Use `near` to drop a 2-pin part (decoupling cap, pull-up) in line with an IC pin and wire it automatically.',
				'Layout tips: keep 0.1in grid (multiples of 10), leave ≥ 60 units between parts for wires/labels, signal flow left→right, power at top, ground at bottom.',
			].join(' '),
			inputSchema: { parts: z.array(PartSpec).min(1).max(80) },
		},
		wrap(async ({ parts }) => {
			await ensureSch();
			const placed: any[] = [];
			const errors: string[] = [];
			let st: SchState | null = null;
			for (const spec of parts) {
				try {
					const s: any = { ...spec };
					let wireTo: { from: Pt; anchorDir: Pt } | null = null;
					if (spec.near) {
						st ??= await readSch();
						const anchor = resolvePin(st, spec.near.pin);
						const o = pinOutward(anchor.pin.rotation);
						s.rotation = o[0] !== 0 ? 0 : 90;
						// a standard 2-pin part spans ±20 units around its origin (pins at ends)
						const centre = add([anchor.pin.x, anchor.pin.y], o, spec.near.gap + 20);
						s.x = Math.round(centre[0] / 5) * 5;
						s.y = Math.round(centre[1] / 5) * 5;
						if (spec.near.connect) wireTo = { from: [anchor.pin.x, anchor.pin.y], anchorDir: o };
					}
					if (s.x === undefined || s.y === undefined) throw new Error(`${spec.designator || spec.lcsc}: x and y (or near) are required.`);
					const res = await run('return lib.placeSchPart(args.s)', { s }, 60000);
					if (wireTo && res.pins?.length) {
						// connect the anchor pin to the closest pin of the new part
						const near = res.pins.reduce((a: any, b: any) => (Math.hypot(a.x - wireTo!.from[0], a.y - wireTo!.from[1]) <= Math.hypot(b.x - wireTo!.from[0], b.y - wireTo!.from[1]) ? a : b));
						await run('return lib.createWire(args.pts)', { pts: [wireTo.from, [near.x, near.y]] });
					}
					placed.push({ ref: res.designator, id: res.id, value: res.value, lcsc: res.lcsc, at: [res.x, res.y], rot: res.rotation, bbox: res.bbox && [res.bbox.minX, res.bbox.minY, res.bbox.maxX, res.bbox.maxY], pins: (res.pins || []).map((p: any) => `${p.number}${p.name && p.name !== p.number ? '/' + p.name : ''}@${p.x},${p.y}${pinDir(p.rotation)}`) });
					st = null;
				} catch (e: any) {
					errors.push(`${spec.designator || spec.lcsc || spec.keyword}: ${e.message}`);
				}
			}
			return text({ placed, errors: errors.length ? errors : undefined });
		}, { save: true }),
	);

	server.registerTool(
		'sch_modify',
		{
			title: 'Modify schematic parts (batch, attribute-safe)',
			description: [
				'Move / rotate / mirror / rename / re-value parts, set any attribute, mark DNP (addIntoBom=false), or swap to another LCSC part (keeps position & designator).',
				'Attribute-safe: EasyEDA normally wipes all other attributes and the supplier part number on modify — this tool merges and verifies, so nothing is lost.',
				'Moving a part does NOT drag its wires; re-run sch_connect or delete/re-route wires of affected nets afterwards.',
			].join(' '),
			inputSchema: {
				items: z
					.array(
						z.object({
							ref: z.string().describe('designator or primitive id'),
							x: z.number().optional(),
							y: z.number().optional(),
							dx: z.number().optional(),
							dy: z.number().optional(),
							rotation: z.number().optional(),
							mirror: z.boolean().optional(),
							designator: z.string().optional(),
							value: z.string().optional(),
							attributes: z.record(z.string()).optional(),
							addIntoBom: z.boolean().optional(),
							addIntoPcb: z.boolean().optional(),
							lcsc: z.string().optional().describe('swap the part to this LCSC code'),
						}),
					)
					.min(1)
					.max(100),
			},
		},
		wrap(async ({ items }) => {
			await ensureSch();
			const r = await run(
				`const out = [];
				 for (const it of args.items) {
					try {
						let c = await lib.findSchComponent(it.ref);
						if (it.lcsc && it.lcsc.toUpperCase() !== String(c.getState_SupplierId()).toUpperCase()) {
							const d = await lib.findDevice({ lcsc: it.lcsc });
							const keep = { x: c.getState_X(), y: c.getState_Y(), rot: c.getState_Rotation(), mir: c.getState_Mirror(), des: c.getState_Designator(), bom: c.getState_AddIntoBom() };
							const n = await eda.sch_PrimitiveComponent.create(d, keep.x, keep.y, undefined, keep.rot, keep.mir, keep.bom !== false, true);
							await eda.sch_PrimitiveComponent.delete(c.getState_PrimitiveId());
							c = n;
							await lib.safeModifySch(c, { designator: keep.des });
							c = await eda.sch_PrimitiveComponent.get(c.getState_PrimitiveId());
						}
						const patch = {};
						if (it.x !== undefined) patch.x = it.x;
						if (it.y !== undefined) patch.y = it.y;
						if (it.dx) patch.x = (patch.x ?? c.getState_X()) + it.dx;
						if (it.dy) patch.y = (patch.y ?? c.getState_Y()) + it.dy;
						if (it.rotation !== undefined) patch.rotation = it.rotation;
						if (it.mirror !== undefined) patch.mirror = it.mirror;
						if (it.designator) patch.designator = it.designator;
						if (it.addIntoBom !== undefined) patch.addIntoBom = it.addIntoBom;
						if (it.addIntoPcb !== undefined) patch.addIntoPcb = it.addIntoPcb;
						if (it.value !== undefined || it.attributes) patch.otherProperty = { ...(it.attributes || {}), ...(it.value !== undefined ? { Value: it.value } : {}) };
						if (Object.keys(patch).length) await lib.safeModifySch(c, patch);
						const f = await eda.sch_PrimitiveComponent.get(c.getState_PrimitiveId());
						out.push({ ref: f.getState_Designator(), at: [f.getState_X(), f.getState_Y()], rot: f.getState_Rotation(), value: (f.getState_OtherProperty()||{}).Value, lcsc: f.getState_SupplierId() });
					} catch (e) { out.push({ ref: it.ref, error: String(e.message || e) }); }
				 }
				 return out;`,
				{ items },
				300000,
			);
			return text(r);
		}, { save: true }),
	);

	server.registerTool(
		'sch_delete',
		{
			title: 'Delete schematic items',
			description: 'Delete parts (by designator/id), wires (by id), all wires of given nets, net flags of given nets, or everything wire-like (wipeWiring) to re-route from scratch.',
			inputSchema: {
				parts: z.array(z.string()).optional(),
				wireIds: z.array(z.string()).optional(),
				nets: z.array(z.string()).optional().describe('delete every wire and flag of these nets'),
				wipeWiring: z.boolean().optional().describe('delete ALL wires and net flags/ports on the page'),
			},
		},
		wrap(async (a) => {
			await ensureSch();
			let wireIds = a.wireIds ?? [];
			let flagIds: string[] = [];
			if (a.nets?.length || a.wipeWiring) {
				const st = await readSch();
				const rep = analyze(st);
				const nets = new Set(a.nets ?? []);
				for (const n of rep.nets) if (a.wipeWiring || nets.has(n.name)) wireIds = wireIds.concat(n.wires);
				flagIds = st.components.filter((c) => c.type !== 'part' && (a.wipeWiring || nets.has(c.net || ''))).map((c) => c.id);
			}
			const r = await run(
				`const out = { parts: 0, wires: 0, flags: 0, errors: [] };
				 for (const ref of args.parts || []) { try { const c = await lib.findSchComponent(ref); await eda.sch_PrimitiveComponent.delete(c.getState_PrimitiveId()); out.parts++; } catch (e) { out.errors.push(ref + ': ' + e.message); } }
				 if (args.wires.length) { await eda.sch_PrimitiveWire.delete(args.wires); out.wires = args.wires.length; }
				 if (args.flags.length) { await eda.sch_PrimitiveComponent.delete(args.flags); out.flags = args.flags.length; }
				 return out;`,
				{ parts: a.parts, wires: [...new Set(wireIds)], flags: flagIds },
				120000,
			);
			return text(r);
		}, { save: true }),
	);

	server.registerTool(
		'sch_connect',
		{
			title: 'Connect nets (readable wiring)',
			description: [
				'The main wiring tool. Give it nets as lists of pins ("U1.3", "U1.VCC", "R1.2") and it draws them the way a human would:',
				'• power/ground names (GND, AGND, +3V3, 5V, VBAT…) → power/ground symbols on short stubs (power up, ground down);',
				'• nearby pins (≤ wireSpan, ≤ maxWirePins) → real orthogonal wires routed around parts, never shorting other nets, minimal bends/crossings;',
				'• long or many-pin nets → net labels; anything the router cannot reach automatically falls back to labels.',
				'Override per net with style: wire | label | flag. Use dryRun to preview. Follow with sch_snapshot to look at the result and sch_check to verify.',
			].join(' '),
			inputSchema: {
				nets: z.array(z.object({ name: z.string().optional(), pins: z.array(z.string()).min(1), style: z.enum(['auto', 'wire', 'label', 'flag']).optional() })).min(1),
				wireSpan: z.number().default(450).describe('max (dx+dy) extent for auto-wiring, in 0.01in'),
				maxWirePins: z.number().int().default(8),
				dryRun: z.boolean().default(false),
			},
		},
		wrap(async (a) => text(await connectNets(a.nets, a)), { save: true }),
	);

	server.registerTool(
		'sch_wire',
		{
			title: 'Draw schematic wires (raw)',
			description: 'Draw explicit orthogonal wires as polylines [[x,y],…]. Optional net name turns the wire into a labelled net (EasyEDA shows the name). Prefer sch_connect, which routes automatically.',
			inputSchema: { wires: z.array(z.object({ points: z.array(z.tuple([z.number(), z.number()])).min(2), net: z.string().optional() })).min(1).max(300) },
		},
		wrap(async ({ wires }) => {
			await ensureSch();
			const r = await run(`const ids=[]; const errors=[]; for (const w of args.wires) { try { ids.push(await lib.createWire(w.points, w.net)); } catch(e) { errors.push(e.message); } } return { created: ids.length, ids, errors };`, { wires }, 120000);
			return text(r);
		}, { save: true }),
	);

	server.registerTool(
		'sch_flag',
		{
			title: 'Net flags, ports, labels, no-connects',
			description: [
				'Place symbols: kind power | ground | analogground | protectground (net flags), in | out | bi (net ports), label (net label stub), short (short-circuit flag), noconnect (X on a pin).',
				'Give `pin` (e.g. "U1.5") to attach with a tidy stub automatically, or x/y/rotation to place freely.',
			].join(' '),
			inputSchema: {
				items: z
					.array(
						z.object({
							kind: z.enum(['power', 'ground', 'analogground', 'protectground', 'in', 'out', 'bi', 'label', 'short', 'noconnect']),
							net: z.string().optional(),
							pin: z.string().optional(),
							x: z.number().optional(),
							y: z.number().optional(),
							rotation: z.number().optional(),
							stub: z.number().optional(),
						}),
					)
					.min(1)
					.max(200),
			},
		},
		wrap(async ({ items }) => {
			const st = await readSch();
			const router = new SchRouter(st, { bounds: sheetBounds(st.page) }, analyze(st).pinNet);
			const actions: any[] = [];
			const errors: string[] = [];
			for (const it of items) {
				try {
					if (it.kind === 'noconnect') {
						if (!it.pin) throw new Error('noconnect needs pin');
						const [d, n] = [it.pin.slice(0, it.pin.lastIndexOf('.')), it.pin.slice(it.pin.lastIndexOf('.') + 1)];
						actions.push({ nc: true, d, n });
						continue;
					}
					if (it.kind !== 'short' && !it.net) throw new Error(`${it.kind} needs a net name`);
					if (it.pin) {
						const r = resolvePin(st, it.pin);
						if (it.kind === 'label') actions.push({ wire: planLabel(r.pin, it.stub ?? 30), net: it.net });
						else if (['power', 'ground', 'analogground', 'protectground'].includes(it.kind)) {
							const cands = flagCandidates(r.pin, it.kind === 'power' ? 'power' : 'ground', r.comp.pins);
							const pl = chooseGeometry(router, it.net!, [...cands, ...labelCandidates(r.pin)]);
							if (!pl) throw new Error(`no collision-free spot for ${it.net} at ${it.pin}; move parts apart`);
							commitGeometry(router, it.net!, pl);
							if (pl.label) {
								actions.push({ wire: pl.wire, net: it.net });
								continue;
							}
							actions.push({ wire: pl.wire });
							actions.push({ flag: it.kind, net: it.net, at: pl.at, rotation: it.rotation ?? pl.rotation });
						} else {
							const o = pinOutward(r.pin.rotation);
							const end = add([r.pin.x, r.pin.y], o, it.stub ?? 20);
							actions.push({ wire: [[r.pin.x, r.pin.y], end] });
							actions.push({ flag: it.kind, net: it.net, at: end, rotation: it.rotation ?? (o[0] === 1 ? 0 : o[0] === -1 ? 180 : o[1] === 1 ? 90 : 270) });
						}
					} else {
						if (it.x === undefined || it.y === undefined) throw new Error('pin or x/y required');
						if (it.kind === 'label') actions.push({ wire: [[it.x, it.y], [it.x + (it.stub ?? 30), it.y]], net: it.net });
						else actions.push({ flag: it.kind, net: it.net, at: [it.x, it.y], rotation: it.rotation ?? 0 });
					}
				} catch (e: any) {
					errors.push(e.message);
				}
			}
			const r = await run(
				`const out = { wires: 0, flags: 0, noConnects: 0, errors: [] };
				 for (const a of args.actions) { try {
					if (a.nc) { await lib.setNoConnect(a.d, a.n, true); out.noConnects++; }
					else if (a.wire) { await lib.createWire(a.wire, a.net); out.wires++; }
					else { await lib.createFlag(a.flag, a.net, a.at[0], a.at[1], a.rotation); out.flags++; }
				 } catch (e) { out.errors.push(String(e.message || e)); } }
				 return out;`,
				{ actions },
				120000,
			);
			r.errors = [...errors, ...r.errors];
			return text(r);
		}, { save: true }),
	);

	server.registerTool(
		'sch_netlist',
		{
			title: 'Schematic netlist (computed)',
			description: 'Nets and their pins, computed from the drawing geometry (wires, junctions, flags, labels) — exactly what EasyEDA will see, without EasyEDA\'s slow export. Filter by net names or a designator.',
			inputSchema: { nets: z.array(z.string()).optional(), designator: z.string().optional(), includeSingles: z.boolean().default(false) },
		},
		wrap(async (a) => {
			const st = await readSch();
			const rep = analyze(st);
			let nets = rep.nets;
			if (a.nets) nets = nets.filter((n) => a.nets!.includes(n.name));
			if (a.designator) nets = nets.filter((n) => n.pins.some((p) => p.startsWith(a.designator + '.')));
			if (!a.includeSingles) nets = nets.filter((n) => n.pins.length > 1 || n.named);
			return text({ count: nets.length, nets: Object.fromEntries(nets.map((n) => [n.name, n.pins.join(' ')])) });
		}),
	);

	server.registerTool(
		'sch_check',
		{
			title: 'Schematic check (ERC + readability)',
			description:
				'Electrical + readability review: nets with conflicting names, floating wires, dangling ends, single-pin nets (typos in labels), unconnected pins, pins touching a wire mid-segment, overlapping parts, parts off the sheet, wires through part bodies, crossing count. native=true also runs EasyEDA\'s own ERC.',
			inputSchema: { native: z.boolean().default(false) },
		},
		wrap(async ({ native }) => {
			const st = await readSch();
			const rep = analyze(st);
			const lay = layoutIssues(st, st.page?.width ? { width: st.page.width, height: st.page.height } : undefined);
			const issues = [...rep.issues, ...lay];
			const out: any = {
				parts: st.components.filter((c) => c.type === 'part').length,
				nets: rep.nets.length,
				errors: issues.filter((i) => i.severity === 'error').map((i) => i.message),
				warnings: issues.filter((i) => i.severity === 'warning').map((i) => i.message),
				info: issues.filter((i) => i.severity === 'info').map((i) => i.message),
			};
			if (native) {
				try {
					out.nativeErc = await withEditorVisible(() =>
						run(`const r = await lib.withTimeout(eda.sch_Drc.check(true, false, true), 40000, 'EasyEDA ERC'); return Array.isArray(r) ? r.slice(0, 80) : r;`, {}, 50000),
					);
				} catch (e: any) {
					out.nativeErc = 'failed: ' + e.message;
				}
			}
			return text(out);
		}),
	);

	server.registerTool(
		'sch_snapshot',
		{
			title: 'Schematic snapshot (image)',
			description: [
				'Picture of the active schematic page (whole sheet, a region, or the area around some parts) for judging readability.',
				'Default mode "render" draws it from the design data inside EasyEDA without touching the user window, view or focus (parts as body boxes with pin numbers/names, wires, junction dots, labels, power/ground symbols).',
				'mode "native" uses EasyEDA own drawing but only when EasyEDA is already visible on screen, and it moves the user view; use it rarely.',
			].join(' '),
			inputSchema: {
				region: z.object({ minX: z.number(), minY: z.number(), maxX: z.number(), maxY: z.number() }).optional(),
				around: z.array(z.string()).optional().describe('designators to frame'),
				padding: z.number().default(40),
				full: z.boolean().default(false).describe('frame the whole sheet'),
				mode: z.enum(['render', 'native']).default('render'),
				maxPx: z.number().int().min(400).max(3000).default(1600),
			},
		},
		wrap(async (a) => {
			const st = await readSch();
			let reg = a.region;
			if (!reg && a.around?.length) {
				const cs = st.components.filter((c) => a.around!.includes(c.designator));
				if (!cs.length) throw new Error('none of those designators exist');
				const r = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
				for (const c of cs) {
					const pts = [...c.pins.map((p) => [p.x, p.y]), ...(c.bbox ? [[c.bbox.minX, c.bbox.minY], [c.bbox.maxX, c.bbox.maxY]] : [[c.x, c.y]])];
					for (const [x, y] of pts) {
						r.minX = Math.min(r.minX, x);
						r.minY = Math.min(r.minY, y);
						r.maxX = Math.max(r.maxX, x);
						r.maxY = Math.max(r.maxY, y);
					}
				}
				reg = { minX: r.minX - a.padding, minY: r.minY - a.padding, maxX: r.maxX + a.padding, maxY: r.maxY + a.padding };
			}
			if (!reg && a.full && st.page?.width) reg = { minX: 0, minY: 0, maxX: st.page.width, maxY: st.page.height };
			if (a.mode === 'native') {
				const vis = await run('return lib.isVisible()', {}, 5000);
				if (!vis) throw new Error('EasyEDA is not visible on screen, so it cannot draw. Use mode "render" (default), which never disturbs the user.');
				const shot = await run(
					`if (args.reg) await eda.dmt_EditorControl.zoomToRegion(args.reg.minX, args.reg.maxX, args.reg.maxY, args.reg.minY); else await eda.dmt_EditorControl.zoomToAllPrimitives();
					 await runtime.sleep(700); return await eda.dmt_EditorControl.getCurrentRenderedAreaImage();`,
					{ reg },
					30000,
				);
				return image(shot.base64, shot.mime || 'image/png');
			}
			const { svg, width, height } = schematicSvg(st, reg, { maxPx: a.maxPx, pad: reg ? 5 : 30 });
			const png = await run('return lib.rasterizeSvg(args.svg, args.w, args.h)', { svg, w: width, h: height }, 30000);
			return image(png.base64, 'image/png');
		}),
	);

	server.registerTool(
		'sch_annotate',
		{
			title: 'Annotate designators',
			description: 'Assign designators to parts that have "?" (or all parts with renumber=true), ordered top-to-bottom then left-to-right per prefix (R, C, U, …).',
			inputSchema: { renumber: z.boolean().default(false) },
		},
		wrap(async ({ renumber }) => {
			await ensureSch();
			const r = await run(
				`const comps = await eda.sch_PrimitiveComponent.getAll('part', true);
				 const used = {}; const todo = [];
				 for (const c of comps) {
					const d = c.getState_Designator() || '?';
					const m = d.match(/^([A-Za-z_]+)(\\d+)$/);
					if (!args.renumber && m) { (used[m[1]] ||= new Set()).add(Number(m[2])); continue; }
					todo.push(c);
				 }
				 todo.sort((a, b) => (b.getState_Y() - a.getState_Y()) || (a.getState_X() - b.getState_X()));
				 const out = [];
				 for (const c of todo) {
					const prefix = (c.getState_Designator() || 'U?').replace(/[?\\d]+$/, '') || 'U';
					const set = (used[prefix] ||= new Set()); let n = 1; while (set.has(n)) n++; set.add(n);
					await lib.safeModifySch(c, { designator: prefix + n }); out.push(prefix + n);
				 }
				 return { annotated: out.length, designators: out };`,
				{ renumber },
				300000,
			);
			return text(r);
		}, { save: true }),
	);
}

function pinDir(rot?: number) {
	const o = pinOutward(rot);
	return o[0] === 1 ? '>' : o[0] === -1 ? '<' : o[1] === 1 ? '^' : 'v';
}
