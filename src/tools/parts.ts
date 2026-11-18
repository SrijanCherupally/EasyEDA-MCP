import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { run, text, wrap } from '../server/ctx.js';
import * as jlc from '../jlc.js';

const fmtPart = (p: jlc.JlcPart, qty = 10) => ({
	lcsc: p.lcsc,
	mpn: p.mpn,
	mfr: p.manufacturer,
	pkg: p.package,
	class: p.class,
	stock: p.stock,
	[`usd@${qty}`]: jlc.priceAt(p, qty),
	desc: p.description.slice(0, 110),
});

export function registerParts(server: McpServer) {
	server.registerTool(
		'jlc_search',
		{
			title: 'Search JLCPCB parts (live stock)',
			description:
				'Search the live JLCPCB/LCSC assembly catalogue. Returns LCSC code, MPN, package, class (Basic / Preferred Extended / Extended), live stock and unit price. Use basicOnly or noFeeOnly to avoid the per-part Extended fee; package filters e.g. "0603".',
			inputSchema: {
				keyword: z.string().describe('e.g. "10k 0603 1%", "AMS1117-3.3", "100nF 50V X7R 0402", "USB-C 16P"'),
				basicOnly: z.boolean().default(false),
				noFeeOnly: z.boolean().default(false).describe('Basic + Preferred Extended'),
				inStockOnly: z.boolean().default(true),
				minStock: z.number().int().optional(),
				package: z.string().optional(),
				sort: z.enum(['relevance', 'stock', 'price']).default('relevance'),
				limit: z.number().int().min(1).max(50).default(10),
				qty: z.number().int().default(10).describe('quantity for the price column'),
			},
		},
		wrap(async (a) => {
			const r = await jlc.search(a.keyword, a);
			return text({ total: r.total, shown: r.parts.length, parts: r.parts.map((p) => fmtPart(p, a.qty)) });
		}),
	);

	server.registerTool(
		'jlc_part',
		{
			title: 'JLCPCB part details (live)',
			description: 'Exact live lookup of one or more LCSC codes: class (Basic/Preferred/Extended), stock, price breaks, package, attributes, datasheet. Codes that JLC does not list come back as null.',
			inputSchema: { codes: z.array(z.string()).min(1).max(60), attributes: z.boolean().default(true) },
		},
		wrap(async ({ codes, attributes }) => {
			const r = await jlc.parts(codes, attributes);
			return text(r);
		}),
	);

	server.registerTool(
		'easyeda_library_search',
		{
			title: 'Search EasyEDA device library',
			description: 'Search EasyEDA\'s own device library (symbols + footprints) by keyword. Use the returned lcsc code with sch_place. Set withStock to merge live JLC stock/class.',
			inputSchema: { keyword: z.string(), limit: z.number().int().min(1).max(50).default(15), withStock: z.boolean().default(true) },
		},
		wrap(async ({ keyword, limit, withStock }) => {
			const list: any[] = await run('return lib.searchDevices(args.k, args.n)', { k: keyword, n: limit }, 30000);
			if (withStock) {
				const codes = list.map((d) => d.lcsc).filter((c) => /^C\d+$/i.test(c || ''));
				const live = await jlc.parts(codes).catch(() => ({}) as Record<string, any>);
				for (const d of list) {
					const p = live[String(d.lcsc).toUpperCase()];
					if (p) Object.assign(d, { stock: p.stock, class: p.class, usd: p.unitPrice });
				}
			}
			return text(list);
		}),
	);

	server.registerTool(
		'bom_check',
		{
			title: 'BOM audit against live JLCPCB data',
			description: [
				'Audits every schematic part against the live JLCPCB catalogue: stock (vs. board quantity), class (Basic / Preferred Extended / Extended), price, missing or invalid LCSC codes,',
				'value mismatches (e.g. value says 10k but the LCSC part is 1k), package mismatches with the footprint, and the extended-part fee. Groups identical parts.',
			].join(' '),
			inputSchema: { boards: z.number().int().min(1).default(5).describe('number of boards to assemble (stock & price)'), allPages: z.boolean().default(true) },
		},
		wrap(async ({ boards, allPages }) => {
			const parts: any[] = await run(
				`const comps = await eda.sch_PrimitiveComponent.getAll('part', args.all);
				 return comps.map(c => ({ d: c.getState_Designator(), lcsc: c.getState_SupplierId() || '', mpn: c.getState_ManufacturerId() || '', value: (c.getState_OtherProperty()||{}).Value || '', fp: (c.getState_Footprint()||{}).name || '', bom: c.getState_AddIntoBom() !== false }));`,
				{ all: allPages },
				60000,
			);
			const groups = new Map<string, { lcsc: string; mpn: string; value: string; fp: string; refs: string[] }>();
			const issues: string[] = [];
			for (const p of parts) {
				if (!p.bom) continue;
				const code = String(p.lcsc).toUpperCase();
				if (!/^C\d+$/.test(code)) {
					issues.push(`${p.d}: no valid LCSC code ("${p.lcsc}") — JLC cannot assemble it.`);
					continue;
				}
				const g = groups.get(code) || { lcsc: code, mpn: p.mpn, value: p.value, fp: p.fp, refs: [] as string[] };
				g.refs.push(p.d);
				if (g.value !== p.value) issues.push(`${p.d}: same LCSC ${code} as ${g.refs[0]} but value "${p.value}" vs "${g.value}".`);
				groups.set(code, g);
			}
			const live = await jlc.parts([...groups.keys()]);
			const lines: any[] = [];
			let extended = 0,
				preferred = 0,
				basic = 0,
				cost = 0;
			for (const g of groups.values()) {
				const lp = live[g.lcsc];
				const need = g.refs.length * boards;
				const row: any = { lcsc: g.lcsc, refs: g.refs.join(','), qty: need, value: g.value };
				if (!lp) {
					row.status = 'NOT FOUND at JLCPCB';
					issues.push(`${g.refs.join(',')}: ${g.lcsc} is not in the JLCPCB assembly catalogue.`);
				} else {
					row.mpn = lp.mpn;
					row.pkg = lp.package;
					row.class = lp.class;
					row.stock = lp.stock;
					row.usd = jlc.priceAt(lp, need);
					cost += (row.usd || 0) * need;
					if (lp.class === 'Extended') extended++;
					else if (lp.class === 'Preferred Extended') preferred++;
					else basic++;
					if (lp.stock < need) issues.push(`${g.refs.join(',')}: ${g.lcsc} stock ${lp.stock} < needed ${need}.`);
					else if (lp.stock < need * 20) row.note = 'low stock';
					if (g.mpn && lp.mpn && g.mpn.replace(/\W/g, '').toUpperCase() !== lp.mpn.replace(/\W/g, '').toUpperCase())
						issues.push(`${g.refs.join(',')}: schematic MPN "${g.mpn}" ≠ JLC MPN "${lp.mpn}" for ${g.lcsc}.`);
					const pv = jlc.jlcPrimaryValue(lp);
					const sv = jlc.parseValue(g.value);
					if (pv && sv !== undefined && Math.abs(pv.value - sv) / Math.max(pv.value, 1e-15) > 0.02)
						issues.push(`${g.refs.join(',')}: value "${g.value}" does not match ${g.lcsc} (${lp.description.slice(0, 50)}).`);
					const fpSize = (g.fp.match(/(0201|0402|0603|0805|1206|1210|2512)/) || [])[1];
					const pkSize = ((lp.package || '').match(/(0201|0402|0603|0805|1206|1210|2512)/) || [])[1];
					if (fpSize && pkSize && fpSize !== pkSize) issues.push(`${g.refs.join(',')}: footprint ${g.fp} but ${g.lcsc} is ${lp.package}.`);
				}
				lines.push(row);
			}
			lines.sort((a, b) => (a.class === b.class ? a.lcsc.localeCompare(b.lcsc) : String(a.class).localeCompare(String(b.class))));
			return text({
				summary: {
					uniqueParts: groups.size,
					placements: parts.filter((p) => p.bom).length,
					basic,
					preferredExtended: preferred,
					extended,
					extendedFeeUSD_estimate: extended * 3,
					partsCostUSD_estimate: Math.round(cost * 100) / 100,
					boards,
				},
				issues,
				lines,
				note: 'JLCPCB charges a setup fee (~$3) per unique Extended part on Economic PCBA; Basic and Preferred Extended parts have none. Use jlc_search with basicOnly/noFeeOnly to find replacements, then sch_modify {lcsc} to swap.',
			});
		}),
	);
}
