import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { run, text, wrap, withEditorVisible, OUT_DIR } from '../server/ctx.js';

const KINDS: Record<string, { doc: 'pcb' | 'schematic'; code: string }> = {
	gerber: { doc: 'pcb', code: `return eda.pcb_ManufactureData.getGerberFile(args.name)` },
	bom: { doc: 'pcb', code: `return eda.pcb_ManufactureData.getBomFile(args.name, 'csv')` },
	cpl: { doc: 'pcb', code: `return eda.pcb_ManufactureData.getPickAndPlaceFile(args.name, 'csv')` },
	pcb_pdf: { doc: 'pcb', code: `return eda.pcb_ManufactureData.getPdfFile(args.name)` },
	step: { doc: 'pcb', code: `return eda.pcb_ManufactureData.get3DFile(args.name, 'step')` },
	dxf: { doc: 'pcb', code: `return eda.pcb_ManufactureData.getDxfFile(args.name)` },
	dsn: { doc: 'pcb', code: `return eda.pcb_ManufactureData.getDsnFile(args.name)` },
	pcb_netlist: { doc: 'pcb', code: `return eda.pcb_ManufactureData.getNetlistFile(args.name)` },
	ibom: { doc: 'pcb', code: `return eda.pcb_ManufactureData.getInteractiveBomFile(args.name)` },
	sch_bom: { doc: 'schematic', code: `return eda.sch_ManufactureData.getBomFile(args.name, 'csv')` },
	sch_netlist: { doc: 'schematic', code: `return eda.sch_ManufactureData.getNetlistFile(args.name)` },
	sch_pdf: { doc: 'schematic', code: `return eda.sch_ManufactureData.getExportDocumentFile(args.name, 'PDF', { theme: 'Default' }, 'All Schematic')` },
	project: { doc: 'pcb', code: `return eda.sys_FileManager.getProjectFile(args.name, undefined, 'epro')` },
};

export async function exportOne(kind: string, dir: string, name: string) {
	const k = KINDS[kind];
	if (!k) throw new Error('unknown export ' + kind);
	const r = await withEditorVisible(() =>
		run(`await lib.ensureDoc(args.doc); const f = await lib.withAutoConfirm(async () => { ${k.code}; }, ['OK', 'Confirm', 'Export', '确认', '导出'], 120000); return f.result;`, { doc: k.doc, name }, 150000),
	);
	if (!r || !r.__blob) throw new Error(`${kind}: EasyEDA returned no file (${JSON.stringify(r)?.slice(0, 120)})`);
	mkdirSync(dir, { recursive: true });
	const EXT: Record<string, string> = { gerber: 'zip', bom: 'csv', cpl: 'csv', pcb_pdf: 'pdf', step: 'step', dxf: 'dxf', dsn: 'dsn', pcb_netlist: 'net', ibom: 'html', sch_bom: 'csv', sch_netlist: 'net', sch_pdf: 'pdf', project: 'epro' };
	const suffix = kind === 'cpl' ? '_CPL' : kind === 'bom' || kind === 'sch_bom' ? '_BOM' : kind === 'gerber' ? '_Gerber' : '';
	const ext = r.name && /\.(\w+)$/.test(r.name) ? r.name.match(/\.(\w+)$/)![1] : EXT[kind] || 'bin';
	const file = join(dir, `${name}${suffix}.${ext}`);
	writeFileSync(file, Buffer.from(r.base64, 'base64'));
	return { kind, file, bytes: r.size };
}

export function registerExport(server: McpServer) {
	server.registerTool(
		'export_files',
		{
			title: 'Export manufacturing files',
			description: [
				'Export to disk: gerber (zip), bom, cpl (pick & place), pcb_pdf, step, dxf, dsn (Specctra for external routers), pcb_netlist, ibom, sch_bom, sch_netlist, sch_pdf, project (.epro backup).',
				'"jlcpcb" = gerber + bom + cpl in one folder, ready to upload for PCB + assembly. Files go to `dir` (default ~/.easyeda-mcp/out/<timestamp>).',
			].join(' '),
			inputSchema: { kinds: z.array(z.enum(['jlcpcb', ...Object.keys(KINDS)] as [string, ...string[]])).min(1), dir: z.string().optional(), name: z.string().default('board') },
		},
		wrap(async (a) => {
			const dir = resolve(a.dir ?? join(OUT_DIR, new Date().toISOString().replace(/[:.]/g, '-')));
			const kinds = a.kinds.flatMap((k) => (k === 'jlcpcb' ? ['gerber', 'bom', 'cpl'] : [k]));
			const out: any[] = [];
			for (const k of kinds) {
				try {
					out.push(await exportOne(k, dir, a.name));
				} catch (e: any) {
					out.push({ kind: k, error: e.message });
				}
			}
			return text({ dir, files: out });
		}),
	);
}
