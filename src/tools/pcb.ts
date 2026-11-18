import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { run, text, image, wrap, withEditorVisible, mm2mil, mil2mm } from '../server/ctx.js';
import { PcbRouter, type RPad, type RSeg, type RVia } from '../pcb/router.js';
import { place, type PComp } from '../pcb/placer.js';
import { pcbConnectivity } from '../pcb/connectivity.js';
import { normalizeJunctions } from '../pcb/junctions.js';
import { pcbSvg, polygonPoints, type PcbRenderData } from '../render/svg.js';
import { isGroundName, isPowerName } from '../sch/connectivity.js';

const r3 = (v: number) => Math.round(v * 1000) / 1000;

/* ------------------------------ state ------------------------------ */

export async function readPcb(opts: { pads?: boolean } = { pads: true }) {
	await run('return lib.ensureDoc("pcb")', {}, 30000);
	const raw = await run(
		`const comps = await lib.pcbComponents(args.pads);
		 const tracks = await lib.pcbTracks();
		 const vias = await lib.pcbVias();
		 const outline = await lib.pcbOutline();
		 let freePads = [];
		 try { const cids = comps.map(c => c.id); freePads = ((await eda.pcb_PrimitivePad.getAll()) || []).filter(p => !cids.some(id => String(p.getState_PrimitiveId()).startsWith(id))).map(p => { const s = p.getState_Pad() || []; const h = p.getState_Hole(); return { id: p.getState_PrimitiveId(), net: p.getState_Net() || '', x: p.getState_X(), y: p.getState_Y(), rotation: p.getState_Rotation(), layer: p.getState_Layer(), shape: s[0], w: s[1], h: s[2], hole: h ? [h[0], h[1], h[2]] : null, number: p.getState_PadNumber() }; }); } catch (e) {}
		 const layers = await eda.pcb_Layer.getTheNumberOfCopperLayers().catch(() => 2);
		 const pourNets = [...new Set(((await eda.pcb_PrimitivePour.getAll().catch(() => [])) || []).map((p) => p.getState_Net()).filter(Boolean))];
		 return { comps, tracks, vias, outline, freePads, layers, pourNets };`,
		{ pads: opts.pads !== false },
		180000,
	);
	const toMm = (v: number) => mil2mm(v);
	const comps = raw.comps.map((c: any) => ({
		...c,
		x: toMm(c.x),
		y: toMm(c.y),
		bbox: c.bbox && { minX: toMm(c.bbox.minX), minY: toMm(c.bbox.minY), maxX: toMm(c.bbox.maxX), maxY: toMm(c.bbox.maxY) },
		side: c.layer === 2 ? 'bottom' : 'top',
		pads: (c.pads || []).map((p: any) => ({ ...p, x: toMm(p.x), y: toMm(p.y), ...padDims(p) })),
	}));
	const tracks: RSeg[] = raw.tracks
		.filter((t: any) => t.layer === 1 || t.layer === 2)
		.map((t: any) => ({ id: t.id, net: t.net, layer: t.layer - 1, x1: toMm(t.x1), y1: toMm(t.y1), x2: toMm(t.x2), y2: toMm(t.y2), w: toMm(t.w) }));
	const vias: RVia[] = raw.vias.map((v: any) => ({ id: v.id, net: v.net, x: toMm(v.x), y: toMm(v.y), d: toMm(v.d), hole: toMm(v.hole) }));
	const ob = raw.outline.bbox;
	const board = ob ? { minX: toMm(ob.minX), minY: toMm(ob.minY), maxX: toMm(ob.maxX), maxY: toMm(ob.maxY) } : null;
	const freePads = raw.freePads.map((p: any) => ({ ...p, x: toMm(p.x), y: toMm(p.y), ...padDims(p) }));
	return { comps, tracks, vias, board, outline: raw.outline, freePads, copperLayers: raw.layers, pourNets: raw.pourNets as string[] };
}

function padDims(p: any) {
	if (typeof p.w === 'number' && typeof p.h === 'number') return { w: mil2mm(p.w), h: mil2mm(p.h) };
	// polygon pads: estimate from source numbers
	const src = Array.isArray(p.w) ? p.w.flat(3) : [];
	const nums = src.filter((x: any) => typeof x === 'number');
	if (nums.length >= 4) {
		const xs = nums.filter((_: any, i: number) => i % 2 === 0),
			ys = nums.filter((_: any, i: number) => i % 2 === 1);
		return { w: mil2mm(Math.max(...xs) - Math.min(...xs)), h: mil2mm(Math.max(...ys) - Math.min(...ys)) };
	}
	return { w: 0.5, h: 0.5 };
}

export function routerPads(st: Awaited<ReturnType<typeof readPcb>>): RPad[] {
	const pads: RPad[] = [];
	const layersOf = (l: number) => (l === 1 ? [0] : l === 2 ? [1] : [0, 1]);
	for (const c of st.comps)
		for (const p of c.pads || [])
			pads.push({ net: p.net, x: p.x, y: p.y, w: p.w, h: p.h, rot: p.rotation || 0, shape: p.shape || 'RECT', layers: layersOf(p.layer), ref: `${c.designator}.${p.number}` });
	for (const p of st.freePads) pads.push({ net: p.net, x: p.x, y: p.y, w: p.w, h: p.h, rot: p.rotation || 0, shape: p.shape || 'ELLIPSE', layers: layersOf(p.layer), ref: `PAD.${p.number || p.id}` });
	return pads;
}

function connSummary(conn: ReturnType<typeof pcbConnectivity>, pourNets: string[]) {
	const viaPour = conn.nets.filter((n) => n.islands > 1 && pourNets.includes(n.net));
	const open = conn.nets.filter((n) => n.islands > 1 && !pourNets.includes(n.net));
	return {
		routedNets: `${conn.totalNets - open.length}/${conn.totalNets}`,
		unroutedConnections: open.reduce((s, n) => s + n.islands - 1, 0),
		connectedByPour: viaPour.length ? viaPour.map((n) => n.net) : undefined,
		pourNote: viaPour.length ? 'These nets rely on copper pours; their connectivity is verified by EasyEDA DRC ("Connection Error" items), not by this geometry check.' : undefined,
		shorts: conn.shorts,
		open,
	};
}

const defaultRules = {
	track: 0.25,
	clearance: 0.2,
	viaDiameter: 0.6,
	viaHole: 0.3,
	edgeClearance: 0.3,
	powerTrack: 0.5,
};

/* ------------------------------ tools ------------------------------ */

export function registerPcb(server: McpServer) {
	server.registerTool(
		'pcb_sync',
		{
			title: 'Update PCB from schematic',
			description: 'Import schematic changes into the PCB (Design → Update PCB). EasyEDA\'s confirmation dialog is applied automatically. New parts land stacked near the origin — run pcb_auto_place or pcb_place next.',
			inputSchema: { pcbUuid: z.string().optional() },
		},
		wrap(async ({ pcbUuid }) => {
			await run('await lib.ensureDoc("schematic"); return eda.sch_Document.save()', {}, 30000).catch(() => undefined);
			await run('return lib.ensureDoc("pcb", args.u)', { u: pcbUuid }, 30000);
			const before = await run('return (await eda.pcb_PrimitiveComponent.getAll()).length', {}, 20000);
			const r = await withEditorVisible(() =>
				run('return lib.withAutoConfirm(() => eda.pcb_Document.importChanges(), ["Apply Changes", "Apply", "OK", "Confirm", "确认", "应用修改"], 45000)', {}, 60000),
			);
			await new Promise((res) => setTimeout(res, 800));
			const after = await run('return (await eda.pcb_PrimitiveComponent.getAll()).map(c => c.getState_Designator())', {}, 20000);
			return text({ imported: r.result, dialogClicked: r.clicked, componentsBefore: before, componentsAfter: after.length, designators: after });
		}, { save: true }),
	);

	server.registerTool(
		'pcb_read',
		{
			title: 'Read PCB (compact)',
			description: 'Compact PCB state in mm: board outline bbox, components (designator, x, y, rotation, side, footprint, bbox), optional pads with nets, and a per-net routing summary. Filter by designators.',
			inputSchema: { designators: z.array(z.string()).optional(), pads: z.boolean().default(false), tracks: z.boolean().default(false) },
		},
		wrap(async (a) => {
			const st = await readPcb({ pads: true });
			const conn = pcbConnectivity(routerPads(st), st.tracks, st.vias);
			const comps = st.comps
				.filter((c: any) => !a.designators || a.designators.includes(c.designator))
				.map((c: any) => {
					const o: any = { ref: c.designator, at: [r3(c.x), r3(c.y)], rot: c.rotation, side: c.side, fp: c.footprint, value: c.value, bbox: c.bbox && [r3(c.bbox.minX), r3(c.bbox.minY), r3(c.bbox.maxX), r3(c.bbox.maxY)] };
					if (c.locked) o.locked = true;
					if (a.pads) o.pads = c.pads.map((p: any) => `${p.number}@${r3(p.x)},${r3(p.y)} ${p.shape} ${r3(p.w)}x${r3(p.h)}${p.layer === 12 ? ' TH' : p.layer === 2 ? ' B' : ''}→${p.net || '·'}`);
					return o;
				});
			const out: any = {
				units: 'mm',
				board: st.board ? { ...st.board, width: r3(st.board.maxX - st.board.minX), height: r3(st.board.maxY - st.board.minY) } : 'NO BOARD OUTLINE — create one with pcb_outline',
				copperLayers: st.copperLayers,
				components: comps,
				routing: { ...connSummary(conn, st.pourNets), open: undefined, tracks: st.tracks.length, vias: st.vias.length },
			};
			if (conn.shorts.length) out.SHORTS = conn.shorts;
			if (a.tracks) out.tracks = st.tracks.map((t) => `${t.net || '·'} L${t.layer + 1} ${r3(t.x1)},${r3(t.y1)}→${r3(t.x2)},${r3(t.y2)} w${r3(t.w)}`);
			return text(out);
		}),
	);

	server.registerTool(
		'pcb_outline',
		{
			title: 'Board outline',
			description: 'Create/replace the board outline (layer 11, Board Outline). Rectangle: width, height (mm), optional cornerRadius, lower-left at origin (default 0,0). Or polygon: list of [x,y] mm points. Removes the previous outline.',
			inputSchema: {
				width: z.number().optional(),
				height: z.number().optional(),
				cornerRadius: z.number().default(0),
				origin: z.tuple([z.number(), z.number()]).default([0, 0]),
				polygon: z.array(z.tuple([z.number(), z.number()])).optional(),
			},
		},
		wrap(async (a) => {
			let source: any[];
			if (a.polygon?.length) {
				const pts = a.polygon.map(([x, y]) => [mm2mil(x), mm2mil(y)]);
				source = [pts[0][0], pts[0][1], 'L', ...pts.slice(1).flat(), pts[0][0], pts[0][1]];
			} else {
				if (!a.width || !a.height) return text('width and height (mm) or polygon required');
				const [ox, oy] = a.origin;
				// 'R' x y w h rot radius — (x,y) is the top-left corner, height extends downward
				source = ['R', mm2mil(ox), mm2mil(oy + a.height), mm2mil(a.width), mm2mil(a.height), 0, mm2mil(a.cornerRadius)];
			}
			const r = await run(
				`await lib.ensureDoc('pcb');
				 const old = await lib.pcbOutline();
				 const ids = [...old.polylines.map(p => p.id)];
				 if (ids.length) await eda.pcb_PrimitivePolyline.delete(ids);
				 if (old.lines.length) await eda.pcb_PrimitiveLine.delete(old.lines.map(l => l.id));
				 if (old.arcs.length) await eda.pcb_PrimitiveArc.delete(old.arcs.map(l => l.id));
				 const poly = lib.polygon(args.source);
				 const pl = await eda.pcb_PrimitivePolyline.create('', 11, poly, 10);
				 if (!pl) throw new Error('outline creation failed');
				 const now = await lib.pcbOutline();
				 return { id: pl.getState_PrimitiveId(), removed: ids.length + old.lines.length + old.arcs.length, bbox: now.bbox };`,
				{ source },
			);
			const b = r.bbox;
			return text({ created: r.id, removedOld: r.removed, bboxMm: b && { minX: mil2mm(b.minX), minY: mil2mm(b.minY), maxX: mil2mm(b.maxX), maxY: mil2mm(b.maxY) } });
		}, { save: true }),
	);

	server.registerTool(
		'pcb_place',
		{
			title: 'Place / move PCB components (batch)',
			description: 'Move, rotate, flip (side), lock components. Coordinates in mm (component origin). Use pcb_read to see current positions and bboxes, pcb_snapshot to look.',
			inputSchema: {
				items: z
					.array(z.object({ ref: z.string(), x: z.number().optional(), y: z.number().optional(), dx: z.number().optional(), dy: z.number().optional(), rotation: z.number().optional(), side: z.enum(['top', 'bottom']).optional(), lock: z.boolean().optional() }))
					.min(1)
					.max(300),
			},
		},
		wrap(async ({ items }) => {
			const conv = items.map((i) => ({ ...i, x: i.x !== undefined ? mm2mil(i.x) : undefined, y: i.y !== undefined ? mm2mil(i.y) : undefined, dx: i.dx ? mm2mil(i.dx) : 0, dy: i.dy ? mm2mil(i.dy) : 0 }));
			const r = await run(
				`await lib.ensureDoc('pcb');
				 const out = [];
				 for (const it of args.items) { try {
					const c = await lib.findPcbComponent(it.ref);
					const patch = {};
					if (it.x !== undefined) patch.x = it.x; if (it.y !== undefined) patch.y = it.y;
					if (it.dx) patch.x = (patch.x ?? c.getState_X()) + it.dx; if (it.dy) patch.y = (patch.y ?? c.getState_Y()) + it.dy;
					if (it.rotation !== undefined) patch.rotation = it.rotation;
					if (it.side) patch.layer = it.side === 'bottom' ? 2 : 1;
					if (it.lock !== undefined) patch.primitiveLock = it.lock;
					await lib.safeModifyPcb(c, patch);
					out.push(it.ref);
				 } catch (e) { out.push(it.ref + ': ' + e.message); } }
				 return out;`,
				{ items: conv },
				300000,
			);
			return text({ done: r });
		}, { save: true }),
	);

	server.registerTool(
		'pcb_auto_place',
		{
			title: 'Auto-place components',
			description: [
				'Automatic placement inside the board outline: big parts first, every part placed to minimise weighted wire length (decoupling caps and series parts end up next to their IC pins; GND/power nets weigh little), no overlaps, then simulated annealing.',
				'Keep parts fixed with `fixed` (or lock them). Connectors (J*, USB*, CN*, or listed in `edge`) are pulled to board edges. Review with pcb_snapshot, then fine-tune with pcb_place.',
			].join(' '),
			inputSchema: {
				fixed: z.array(z.string()).optional(),
				only: z.array(z.string()).optional().describe('place only these; everything else is fixed'),
				edge: z.array(z.string()).optional(),
				spacing: z.number().default(0.6).describe('mm between part bodies'),
				rotate: z.boolean().default(true),
				iterations: z.number().int().optional(),
				dryRun: z.boolean().default(false),
			},
		},
		wrap(async (a) => {
			const st = await readPcb({ pads: true });
			if (!st.board) throw new Error('Create a board outline first (pcb_outline).');
			const fixed = new Set(a.fixed ?? []);
			const edgeSet = new Set(a.edge ?? []);
			const comps: PComp[] = st.comps.map((c: any) => {
				const bb = c.bbox ?? { minX: c.x - 1, maxX: c.x + 1, minY: c.y - 1, maxY: c.y + 1 };
				// unrotate bbox / pad offsets to rotation 0
				const rot = c.rotation || 0;
				const un = (dx: number, dy: number): [number, number] => {
					const r = ((((-Math.round(rot / 90)) % 4) + 4) % 4) as number;
					return r === 0 ? [dx, dy] : r === 1 ? [-dy, dx] : r === 2 ? [-dx, -dy] : [dy, -dx];
				};
				const swap = Math.round(rot / 90) % 2 !== 0;
				const w = bb.maxX - bb.minX,
					h = bb.maxY - bb.minY;
				const [cx, cy] = un((bb.minX + bb.maxX) / 2 - c.x, (bb.minY + bb.maxY) / 2 - c.y);
				const isFixed = c.locked || fixed.has(c.designator) || (a.only ? !a.only.includes(c.designator) : false);
				return {
					ref: c.designator,
					w: swap ? h : w,
					h: swap ? w : h,
					cx,
					cy,
					x: c.x,
					y: c.y,
					rot,
					fixed: isFixed,
					edge: edgeSet.has(c.designator) || (!a.edge && /^(J|USB|CN|P\d|CON)/i.test(c.designator)),
					pads: (c.pads || []).map((p: any) => {
						const [dx, dy] = un(p.x - c.x, p.y - c.y);
						return { net: p.net, dx, dy };
					}),
				};
			});
			// decoupling affinity: a 2-pad part between a power rail and ground is pulled to an IC power pin
			const isGnd = (n: string) => isGroundName(n);
			const icLoad = new Map<string, number>();
			for (const c of comps) {
				const nets = [...new Set(c.pads.map((p) => p.net))];
				if (c.pads.length !== 2 || nets.length !== 2) continue;
				const pwr = nets.find((n) => n && !isGnd(n) && isPowerName(n));
				if (!pwr || !nets.some((n) => n && isGnd(n))) continue;
				const ics = comps.filter((x) => x !== c && x.pads.length >= 4 && !/^(J|USB|CN|P\d)/i.test(x.ref) && x.pads.some((p) => p.net === pwr));
				if (!ics.length) continue;
				ics.sort((a, b) => (icLoad.get(a.ref) ?? 0) - (icLoad.get(b.ref) ?? 0) || b.pads.length - a.pads.length);
				const ic = ics[0];
				icLoad.set(ic.ref, (icLoad.get(ic.ref) ?? 0) + 1);
				const tag = `__dec_${c.ref}`;
				const cp = c.pads.find((p) => p.net === pwr)!;
				const ip = ic.pads.find((p) => p.net === pwr)!;
				c.pads.push({ net: tag, dx: cp.dx, dy: cp.dy });
				ic.pads.push({ net: tag, dx: ip.dx, dy: ip.dy });
			}
			// mounting holes and other free pads are fixed obstacles
			for (const fp of st.freePads) {
				const d = Math.max(fp.w, fp.h) + 0.5;
				comps.push({ ref: `__pad_${fp.id}`, w: d, h: d, cx: 0, cy: 0, x: fp.x, y: fp.y, rot: 0, fixed: true, pads: [] });
			}
			const res = place(comps, { board: st.board, spacing: a.spacing, rotate: a.rotate, iterations: a.iterations });
			const moves = res.comps.filter((c) => !c.fixed && !c.ref.startsWith('__pad_')).map((c) => ({ ref: c.ref, x: r3(c.x), y: r3(c.y), rotation: ((c.rot % 360) + 360) % 360 }));
			if (!a.dryRun) {
				await run(
					`for (const it of args.items) { try { const c = await lib.findPcbComponent(it.ref); await lib.safeModifyPcb(c, { x: it.x, y: it.y, rotation: it.rotation }); } catch (e) {} } return true;`,
					{ items: moves.map((m) => ({ ref: m.ref, x: mm2mil(m.x), y: mm2mil(m.y), rotation: m.rotation })) },
					300000,
				);
			}
			return text({ placed: moves.length, unplaced: res.unplaced, wireLengthBefore: res.hpwlBefore, wireLengthAfter: res.hpwlAfter, dryRun: a.dryRun, positions: moves, next: 'pcb_snapshot to review, pcb_place to adjust, then pcb_autoroute.' });
		}, { save: true }),
	);

	server.registerTool(
		'pcb_autoroute',
		{
			title: 'Autoroute (built-in router)',
			description: [
				'OPTIONAL helper — route power and critical nets by hand first (pcb_tracks, pcb_copper), then use this for the remaining small signal nets.',
				'Built-in 2-layer maze router (exact clearances, 45° segments, vias, rip-up & retry). Ground nets are skipped by default — connect them with GND pours on top & bottom (pcb_pour) — unless routeGround=true. Power nets get powerTrack width.',
				'Options: nets (route only these), skipNets, replace (rip existing routing of those nets first). All sizes in mm.',
				'Reports routed / failed connections. If some fail: move parts apart (pcb_place), allow more vias, or reduce track/clearance, then run again.',
			].join(' '),
			inputSchema: {
				nets: z.array(z.string()).optional(),
				skipNets: z.array(z.string()).optional(),
				routeGround: z.boolean().default(false).describe('ground nets are normally left to GND pours/planes (pcb_pour) — set true to route them as tracks'),
				replace: z.boolean().default(false),
				track: z.number().default(defaultRules.track),
				powerTrack: z.number().default(defaultRules.powerTrack),
				netWidths: z.record(z.number()).optional(),
				clearance: z.number().default(defaultRules.clearance),
				viaDiameter: z.number().default(defaultRules.viaDiameter),
				viaHole: z.number().default(defaultRules.viaHole),
				edgeClearance: z.number().default(defaultRules.edgeClearance),
				grid: z.number().optional().describe('router grid in mm (auto)'),
				layers: z.number().int().min(1).max(2).default(2),
				viaCost: z.number().default(12),
				timeLimitS: z.number().default(90),
				dryRun: z.boolean().default(false),
			},
		},
		wrap(async (a) => {
			let st = await readPcb({ pads: true });
			if (!st.board) throw new Error('Create a board outline first (pcb_outline).');
			const pads = routerPads(st);
			const allNets = [...new Set(pads.map((p) => p.net).filter(Boolean))];
			const groundNets = allNets.filter((n) => isGroundName(n));
			const skip = [...(a.skipNets ?? []), ...(a.routeGround ? [] : groundNets.filter((n) => !a.nets?.includes(n)))];
			const target = (a.nets ?? allNets).filter((n) => !skip.includes(n));
			if (a.replace && !a.dryRun) {
				const kill = new Set(target);
				const tIds = st.tracks.filter((t: any) => kill.has(t.net)).map((t: any) => t.id);
				const vIds = st.vias.filter((v: any) => kill.has(v.net)).map((v: any) => v.id);
				await run('if (args.t.length) await eda.pcb_PrimitiveLine.delete(args.t); if (args.v.length) await eda.pcb_PrimitiveVia.delete(args.v); return true;', { t: tIds, v: vIds }, 120000);
				st = await readPcb({ pads: true });
			}
			const netWidths: Record<string, number> = {};
			for (const n of allNets) if (isGroundName(n) || isPowerName(n)) netWidths[n] = a.powerTrack;
			Object.assign(netWidths, a.netWidths ?? {});
			const router = new PcbRouter(
				{ board: st.board!, pads: routerPads(st), tracks: st.tracks, vias: st.vias, nets: target, skipNets: skip },
				{ track: a.track, clearance: a.clearance, viaDiameter: a.viaDiameter, viaHole: a.viaHole, edgeClearance: a.edgeClearance, grid: a.grid, netWidths, layers: Math.min(a.layers, st.copperLayers || 2), viaCost: a.viaCost, timeLimitMs: a.timeLimitS * 1000 },
			);
			const res = router.route();
			// split T-junctions so EasyEDA's endpoint-based connectivity matches the copper
			const routedNets = new Set(res.segments.map((x) => x.net));
			const existing = st.tracks.filter((t: any) => routedNets.has(t.net));
			const norm = normalizeJunctions([...existing, ...res.segments], [...st.vias, ...res.vias]);
			const toCreate = norm.segments.filter((x) => !x.id);
			if (!a.dryRun && norm.replaced.length) await run('await eda.pcb_PrimitiveLine.delete(args.ids); return true;', { ids: norm.replaced }, 120000);
			if (!a.dryRun && (toCreate.length || res.vias.length)) {
				const segs = toCreate.map((s) => [s.net, s.layer + 1, mm2mil(s.x1), mm2mil(s.y1), mm2mil(s.x2), mm2mil(s.y2), mm2mil(s.w)]);
				const vias = res.vias.map((v) => [v.net, mm2mil(v.x), mm2mil(v.y), mm2mil(v.hole ?? a.viaHole), mm2mil(v.d)]);
				// ORDER MATTERS: EasyEDA links a track only to objects that already exist when the track is
				// created, so vias must be placed before the tracks that end on them.
				if (vias.length) await run(`let n=0; for (const v of args.v) { if (await lib.createVia(v[0], v[1], v[2], v[3], v[4])) n++; } return n;`, { v: vias }, 300000);
				for (let i = 0; i < segs.length; i += 400) {
					await run(`let n=0; for (const s of args.s) { if (await eda.pcb_PrimitiveLine.create(s[0], s[1], s[2], s[3], s[4], s[5], s[6])) n++; } return n;`, { s: segs.slice(i, i + 400) }, 300000);
				}
			}
			return text({
				stats: res.stats,
				routedNets: res.routed.length,
				failed: res.failed,
				created: a.dryRun ? 'dry run — nothing written' : { tracks: toCreate.length, vias: res.vias.length, junctionSplits: norm.splits },
				skippedGround: a.routeGround ? undefined : groundNets,
				next: res.failed.length ? 'Some connections failed: spread parts (pcb_place / pcb_auto_place), then pcb_autoroute again with nets=[failed] or replace=true.' : 'Connect ground with pcb_pour (GND top + bottom, stitching), then pcb_drc and pcb_snapshot.',
			});
		}, { save: true }),
	);

	server.registerTool(
		'pcb_tracks',
		{
			title: 'Manual routing: tracks & vias',
			description: [
				'Route by hand (preferred for power, high-current, sensitive and critical nets). Polyline points in mm, or pad references like "U1.3" that snap exactly to the pad centre.',
				'Net is taken from the first pad reference if omitted. layer top | bottom | inner1..4. width in mm (power: 0.5–2 mm).',
				'Vias are created first and T-junctions are split automatically so EasyEDA sees every connection. Check with pcb_status / pcb_drc and look with pcb_snapshot.',
			].join(' '),
			inputSchema: {
				tracks: z
					.array(z.object({ net: z.string().optional(), layer: z.union([z.enum(['top', 'bottom', 'inner1', 'inner2', 'inner3', 'inner4']), z.number()]).default('top'), points: z.array(z.union([z.tuple([z.number(), z.number()]), z.string()])).min(2), width: z.number().default(0.25) }))
					.default([]),
				vias: z.array(z.object({ net: z.string(), x: z.number(), y: z.number(), diameter: z.number().default(0.6), hole: z.number().default(0.3) })).default([]),
			},
		},
		wrap(async (a) => {
			const st = await readPcb({ pads: true });
			const padAt = (ref: string) => {
				const i = ref.lastIndexOf('.');
				const c = st.comps.find((x: any) => x.designator === ref.slice(0, i));
				const p = c?.pads.find((q: any) => q.number === ref.slice(i + 1));
				if (!p) throw new Error(`pad ${ref} not found`);
				return p;
			};
			const lid = (l: any) => (typeof l === 'number' ? l : ({ top: 1, bottom: 2, inner1: 15, inner2: 16, inner3: 17, inner4: 18 } as any)[l]);
			const newSegs: any[] = [];
			for (const t of a.tracks) {
				let net = t.net;
				const pts = t.points.map((pt) => {
					if (typeof pt === 'string') {
						const p = padAt(pt);
						net ??= p.net;
						return [p.x, p.y] as [number, number];
					}
					return pt;
				});
				if (net === undefined) throw new Error('track needs a net (or start at a pad reference)');
				const L = lid(t.layer);
				for (let i = 1; i < pts.length; i++) newSegs.push({ net, layer: L <= 2 ? L - 1 : L, x1: pts[i - 1][0], y1: pts[i - 1][1], x2: pts[i][0], y2: pts[i][1], w: t.width });
			}
			const newVias = a.vias.map((v) => ({ net: v.net, x: v.x, y: v.y, d: v.diameter, hole: v.hole }));
			const nets = new Set(newSegs.map((x) => x.net));
			const existing = st.tracks.filter((t: any) => nets.has(t.net));
			const norm = normalizeJunctions([...existing, ...newSegs], [...st.vias, ...newVias]);
			const toCreate = norm.segments.filter((x: any) => !x.id);
			const segs = toCreate.map((s: any) => [s.net, s.layer <= 1 ? s.layer + 1 : s.layer, mm2mil(s.x1), mm2mil(s.y1), mm2mil(s.x2), mm2mil(s.y2), mm2mil(s.w)]);
			const vias = newVias.map((v) => [v.net, mm2mil(v.x), mm2mil(v.y), mm2mil(v.hole), mm2mil(v.d)]);
			const r = await run(
				`await lib.ensureDoc('pcb'); let t = 0, v = 0;
				 if (args.del.length) await eda.pcb_PrimitiveLine.delete(args.del);
				 for (const x of args.v) if (await lib.createVia(x[0], x[1], x[2], x[3], x[4])) v++;
				 for (const s of args.s) if (await eda.pcb_PrimitiveLine.create(s[0], s[1], s[2], s[3], s[4], s[5], s[6])) t++;
				 return { tracks: t, vias: v };`,
				{ s: segs, v: vias, del: norm.replaced },
				300000,
			);
			return text({ ...r, junctionSplits: norm.splits });
		}, { save: true }),
	);

	server.registerTool(
		'pcb_fanout',
		{
			title: 'Fan out pads to vias (ground/power plane connections)',
			description: [
				'Give every SMD pad of a net (default GND) a short stub to its own via, placed at the nearest clear spot (never in a pad, never stacked).',
				'Do this BEFORE routing signals when ground comes from pours/planes: signals then route around the vias and every ground pad stays tied to the plane. Also useful for power nets feeding an inner plane.',
			].join(' '),
			inputSchema: { net: z.string().default('GND'), only: z.array(z.string()).optional().describe('pad refs like U1.3 (default: all SMD pads of the net)') },
		},
		wrap(async (a) => {
			const st = await readPcb({ pads: true });
			const refs = a.only ?? routerPads(st).filter((p) => p.net === a.net && p.layers.length === 1).map((p) => p.ref!);
			const r = await fixIsolatedGround(a.net, refs);
			return text({ ...r, next: 'route signals (pcb_tracks / pcb_autoroute), then pcb_pour for the plane.' });
		}, { save: true }),
	);

	server.registerTool(
		'pcb_pour',
		{
			title: 'Copper pour (e.g. GND plane)',
			description: 'Add a copper pour covering the board (inset by margin) on top, bottom or both, for a net (default GND), then fill it. Optional stitching vias on a grid tie top & bottom pours together. rebuildOnly=true re-fills existing pours after changes.',
			inputSchema: {
				rebuildOnly: z.boolean().default(false).describe('just re-fill existing pours (after moving parts/tracks)'),
				fixGround: z.boolean().default(true).describe('after filling, give every pad of this net that the pour cannot reach a short stub + via to the other layer'),
				net: z.string().default('GND'),
				layers: z.enum(['top', 'bottom', 'both']).default('both'),
				margin: z.number().default(0.5),
				fill: z.enum(['solid', '45grid', '90grid']).default('solid'),
				stitchPitch: z.number().optional().describe('mm; add stitching vias on this grid where free'),
				replace: z.boolean().default(true),
			},
		},
		wrap(async (a) => {
			if (a.rebuildOnly) {
				await run('return lib.ensureDoc("pcb")', {}, 30000);
				return text(await withEditorVisible(() => run('return lib.rebuildPours()', {}, 60000)));
			}
			const st = await readPcb({ pads: true });
			if (!st.board) throw new Error('Create a board outline first.');
			const b = st.board;
			const m = a.margin;
			const src = ['R', mm2mil(b.minX + m), mm2mil(b.maxY - m), mm2mil(b.maxX - b.minX - 2 * m), mm2mil(b.maxY - b.minY - 2 * m), 0, 0];
			const layers = a.layers === 'both' ? [1, 2] : a.layers === 'top' ? [1] : [2];
			const r = await run(
				`await lib.ensureDoc('pcb');
				 if (args.replace) { const old = (await eda.pcb_PrimitivePour.getAll()).filter(p => p.getState_Net() === args.net && args.layers.includes(p.getState_Layer())); if (old.length) await eda.pcb_PrimitivePour.delete(old.map(p => p.getState_PrimitiveId())); }
				 const ids = [];
				 for (const l of args.layers) { const p = await eda.pcb_PrimitivePour.create(args.net, l, lib.polygon(args.src), args.fill, false, args.net + '_' + (l === 1 ? 'TOP' : 'BOTTOM'), 1); if (p) ids.push(p.getState_PrimitiveId()); }
				 return ids;`,
				{ net: a.net, layers, src, fill: a.fill, replace: a.replace },
			);
			let stitched = 0;
			if (a.stitchPitch && a.layers === 'both') {
				// stitching vias where no other copper is near (reuse the router's keep-out map)
				const router = new PcbRouter({ board: b, pads: routerPads(st), tracks: st.tracks, vias: st.vias }, { ...defaultRules, grid: 0.1 });
				for (const p of routerPads(st)) router.addPad(p);
				for (const s of st.tracks) router.addSeg(s);
				for (const v of st.vias) router.addVia(v);
				const pts: number[][] = [];
				const n = router.id(a.net);
				const rad = Math.ceil(0.6 / 0.1);
				for (let x = b.minX + 2; x <= b.maxX - 2; x += a.stitchPitch)
					for (let y = b.minY + 2; y <= b.maxY - 2; y += a.stitchPitch) {
						const i = router.ci(x),
							j = router.cj(y);
						let ok = true;
						for (let dj = -rad; dj <= rad && ok; dj++)
							for (let di = -rad; di <= rad && ok; di++) {
								const k = (j + dj) * router.W + (i + di);
								for (let l = 0; l < 2; l++) {
									const o = router.owner[l][k];
									if (o !== 0 && o !== n) ok = false;
								}
							}
						if (ok && router.noVia[j * router.W + i]) ok = false;
						if (ok && st.vias.some((v: any) => Math.hypot(v.x - x, v.y - y) < 1.2)) ok = false; // never stack on an existing via
						if (ok) pts.push([mm2mil(x), mm2mil(y)]);
					}
				stitched = await run(`let n=0; for (const p of args.p) if (await lib.createVia(args.net, p[0], p[1], args.h, args.d)) n++; return n;`, { p: pts, net: a.net, h: mm2mil(0.3), d: mm2mil(0.6) }, 300000);
			}
			const filled = await withEditorVisible(() => run('return lib.rebuildPours()', {}, 60000)).catch((e) => ({ error: e.message }));
			let islands: any;
			if (a.fixGround && a.layers === 'both') {
				islands = await fixIsolatedGround(a.net).catch((e) => ({ error: e.message }));
				const still = await groundPadsDisconnected(a.net).catch(() => []);
				if (still.length) islands.tracked = await routeIsolatedPads(a.net, still).catch((e) => ({ error: e.message }));
			}
			return text({ pours: r, stitchingVias: stitched, rebuilt: filled, isolatedPadsFixed: islands, next: 'pcb_snapshot to look, pcb_drc to verify.' });
		}, { save: true }),
	);

	server.registerTool(
		'pcb_holes',
		{
			title: 'Mounting holes',
			description: 'Add mounting holes (multi-layer pads with a round hole). size "M2"|"M2.5"|"M3"|"M4" or custom hole/pad (mm). positions "corners" (inset from the board edge) or explicit [[x,y]] mm. plated=false gives NPTH.',
			inputSchema: {
				size: z.enum(['M2', 'M2.5', 'M3', 'M4']).default('M3'),
				hole: z.number().optional(),
				pad: z.number().optional(),
				positions: z.union([z.literal('corners'), z.array(z.tuple([z.number(), z.number()]))]).default('corners'),
				inset: z.number().optional().describe('mm from the board edge to the hole centre (default: pad radius + 1 mm)'),
				plated: z.boolean().default(true),
				net: z.string().default(''),
			},
		},
		wrap(async (a) => {
			const table: Record<string, [number, number]> = { M2: [2.2, 4.0], 'M2.5': [2.7, 5.0], M3: [3.2, 6.0], M4: [4.3, 8.0] };
			const [hole, pad] = [a.hole ?? table[a.size][0], a.pad ?? table[a.size][1]];
			let pos = a.positions as [number, number][];
			if (a.positions === 'corners') {
				const st = await readPcb({ pads: false });
				if (!st.board) throw new Error('Create a board outline first.');
				const b = st.board,
					i = a.inset ?? (a.plated ? pad : hole) / 2 + 1;
				pos = [
					[b.minX + i, b.minY + i],
					[b.maxX - i, b.minY + i],
					[b.maxX - i, b.maxY - i],
					[b.minX + i, b.maxY - i],
				];
			}
			const r = await run(
				`await lib.ensureDoc('pcb'); const ids = []; const errs = [];
				 for (let k = 0; k < args.pos.length; k++) { const [x, y] = args.pos[k];
					try { const p = await eda.pcb_PrimitivePad.create(12, 'MH' + (k + 1), x, y, 0, ['ELLIPSE', args.pad, args.pad], args.net, ['ROUND', args.hole], 0, 0, 0, args.plated);
						if (p) ids.push(p.getState_PrimitiveId()); else errs.push('pad create returned nothing'); } catch (e) { errs.push(e.message); } }
				 return { ids, errs };`,
				{ pos: pos.map(([x, y]) => [mm2mil(x), mm2mil(y)]), hole: mm2mil(hole), pad: mm2mil(a.plated ? pad : hole), plated: a.plated, net: a.net },
			);
			return text({ created: r.ids.length, holeMm: hole, padMm: a.plated ? pad : hole, positionsMm: pos, errors: r.errs.length ? r.errs : undefined });
		}, { save: true }),
	);

	server.registerTool(
		'pcb_silkscreen',
		{
			title: 'Silkscreen: tidy designators / add text',
			description: [
				'Silkscreen control (mm). "tidy": put every designator at a readable spot next to its part (not over pads, other labels or off-board), upright.',
				'"move": place one designator exactly (ref, x, y, rotation, height). "show"/"hide": designator visibility (ref or all). "size": designator height for all.',
				'"text": add text (board name, version, labels like "VIN", "+", pin-1 hints) on top/bottom silk. "line": silkscreen lines/outlines from points (e.g. a box around a section, polarity marks). "delete_text": remove a silk text/line by id.',
			].join(' '),
			inputSchema: {
				action: z.enum(['tidy', 'text', 'size', 'move', 'show', 'hide', 'line', 'delete_text']),
				ref: z.string().optional().describe('component designator for move/show/hide (omit for all)'),
				points: z.array(z.tuple([z.number(), z.number()])).optional().describe('line/outline points in mm (action line)'),
				lineWidth: z.number().default(0.15),
				align: z.enum(['center', 'left', 'right']).default('center'),
				id: z.string().optional(),
				text: z.string().optional(),
				x: z.number().optional(),
				y: z.number().optional(),
				side: z.enum(['top', 'bottom']).default('top'),
				height: z.number().default(1.0).describe('text height mm'),
				rotation: z.number().default(0),
				only: z.array(z.string()).optional(),
			},
		},
		wrap(async (a) => {
			if (a.action === 'move' || a.action === 'show' || a.action === 'hide') {
				const r = await run(
					`await lib.ensureDoc('pcb'); const comps = await eda.pcb_PrimitiveComponent.getAll(); let n = 0;
					 for (const c of comps) { if (args.ref && c.getState_Designator() !== args.ref) continue;
						for (const t of (await eda.pcb_PrimitiveAttribute.getAll(c.getState_PrimitiveId())).filter(t => t.getState_Key() === 'Designator')) {
							const prop = {};
							if (args.action === 'move') Object.assign(prop, { x: args.x, y: args.y, rotation: args.rot, alignMode: 5, fontSize: args.size, lineWidth: args.lw });
							else prop.valueVisible = args.action === 'show';
							await eda.pcb_PrimitiveAttribute.modify(t.getState_PrimitiveId(), prop); n++; } }
					 return n;`,
					{ action: a.action, ref: a.ref, x: a.x !== undefined ? mm2mil(a.x) : undefined, y: a.y !== undefined ? mm2mil(a.y) : undefined, rot: a.rotation, size: mm2mil(a.height), lw: mm2mil(Math.max(0.15, a.height * 0.15)) },
					120000,
				);
				return text({ changed: r });
			}
			if (a.action === 'line') {
				if (!a.points || a.points.length < 2) return text('points (≥2) required');
				const pts = a.points.map(([x, y]) => [mm2mil(x), mm2mil(y)]);
				const r = await run(
					`await lib.ensureDoc('pcb'); const src = [args.p[0][0], args.p[0][1], 'L', ...args.p.slice(1).flat()]; const pl = await eda.pcb_PrimitivePolyline.create('', args.layer, lib.polygon(src), args.w); return pl && pl.getState_PrimitiveId();`,
					{ p: pts, layer: a.side === 'top' ? 3 : 4, w: mm2mil(a.lineWidth) },
				);
				return text({ created: r });
			}
			if (a.action === 'delete_text') {
				const r = await run(`for (const api of [eda.pcb_PrimitiveString, eda.pcb_PrimitivePolyline]) { let o; try { o = await api.get(args.id); } catch (e) {} if (o && typeof o.getState_PrimitiveType === 'function' && o.getState_PrimitiveId() === args.id) return api.delete(args.id); } return false;`, { id: a.id });
				return text({ deleted: r });
			}
			if (a.action === 'text') {
				if (!a.text || a.x === undefined || a.y === undefined) return text('text, x, y required');
				const r = await run(
					`await lib.ensureDoc('pcb'); const s = await eda.pcb_PrimitiveString.create(args.layer, args.x, args.y, args.t, 'default', args.size, args.lw, args.align, args.rot, false, 0, args.mirror, false); return s && s.getState_PrimitiveId();`,
					{ align: a.align === 'left' ? 2 : a.align === 'right' ? 8 : 5, layer: a.side === 'top' ? 3 : 4, x: mm2mil(a.x), y: mm2mil(a.y), t: a.text, size: mm2mil(a.height), lw: mm2mil(Math.max(0.15, a.height * 0.15)), rot: a.rotation, mirror: a.side === 'bottom' },
				);
				return text({ created: r });
			}
			if (a.action === 'size') {
				const r = await run(
					`const attrs = (await eda.pcb_PrimitiveAttribute.getAll()).filter(t => t.getState_Key() === 'Designator'); let n = 0;
					 for (const t of attrs) { await eda.pcb_PrimitiveAttribute.modify(t.getState_PrimitiveId(), { fontSize: args.size, lineWidth: args.lw }); n++; } return n;`,
					{ size: mm2mil(a.height), lw: mm2mil(Math.max(0.15, a.height * 0.15)) },
					120000,
				);
				return text({ resized: r });
			}
			// tidy
			const st = await readPcb({ pads: true });
			const h = a.height;
			const padBoxes = st.comps.flatMap((c: any) => (c.pads || []).map((p: any) => ({ minX: p.x - Math.max(p.w, p.h) / 2 - 0.15, maxX: p.x + Math.max(p.w, p.h) / 2 + 0.15, minY: p.y - Math.max(p.w, p.h) / 2 - 0.15, maxY: p.y + Math.max(p.w, p.h) / 2 + 0.15 })));
			const taken: any[] = [];
			const moves: any[] = [];
			const b = st.board;
			const comps = st.comps.filter((c: any) => c.bbox && (!a.only || a.only.includes(c.designator)));
			// bigger parts first so small parts adapt around them
			comps.sort((x: any, y: any) => (y.bbox.maxX - y.bbox.minX) * (y.bbox.maxY - y.bbox.minY) - (x.bbox.maxX - x.bbox.minX) * (x.bbox.maxY - x.bbox.minY));
			const otherBodies = st.comps.filter((c: any) => c.bbox).map((c: any) => ({ ref: c.designator, ...c.bbox }));
			for (const c of comps) {
				const wTxt = h * 0.75 * c.designator.length + 0.2;
				const bb = c.bbox;
				const cands: number[][] = [];
				for (const g of [0.25, 0.7, 1.4]) {
					cands.push(
						[(bb.minX + bb.maxX) / 2, bb.maxY + g + h / 2],
						[(bb.minX + bb.maxX) / 2, bb.minY - g - h / 2],
						[bb.minX - g - wTxt / 2, (bb.minY + bb.maxY) / 2],
						[bb.maxX + g + wTxt / 2, (bb.minY + bb.maxY) / 2],
						[bb.minX + wTxt / 2, bb.maxY + g + h / 2],
						[bb.maxX - wTxt / 2, bb.minY - g - h / 2],
						[bb.minX - g - wTxt / 2, bb.maxY + g + h / 2],
						[bb.maxX + g + wTxt / 2, bb.minY - g - h / 2],
					);
				}
				let best: any = null;
				for (const [x, y] of cands) {
					const box = { minX: x - wTxt / 2, maxX: x + wTxt / 2, minY: y - h / 2, maxY: y + h / 2 };
					let score = 0;
					for (const p of padBoxes) score += overlapArea(box, p) * 10;
					for (const t of taken) score += overlapArea(box, t) * 8;
					for (const o of otherBodies) if (o.ref !== c.designator) score += overlapArea(box, o) * 6;
					score += 0.01 * Math.hypot(x - (bb.minX + bb.maxX) / 2, y - (bb.minY + bb.maxY) / 2); // prefer close spots
					if (b && (box.minX < b.minX || box.maxX > b.maxX || box.minY < b.minY || box.maxY > b.maxY)) score += 50;
					if (!best || score < best.score - 1e-9) best = { x, y, box, score };
				}
				taken.push(best.box);
				moves.push({ ref: c.designator, id: c.id, x: mm2mil(best.x), y: mm2mil(best.y), clean: best.score < 0.2 });
			}
			const r = await run(
				`let n = 0; const errs = [];
				 for (const m of args.moves) { try {
					const attrs = (await eda.pcb_PrimitiveAttribute.getAll(m.id)).filter(t => t.getState_Key() === 'Designator');
					for (const t of attrs) { await eda.pcb_PrimitiveAttribute.modify(t.getState_PrimitiveId(), { x: m.x, y: m.y, rotation: 0, alignMode: 5, fontSize: args.size, lineWidth: args.lw }); n++; }
				 } catch (e) { errs.push(m.ref + ': ' + e.message); } }
				 return { n, errs };`,
				{ moves, size: mm2mil(h), lw: mm2mil(Math.max(0.15, h * 0.15)) },
				300000,
			);
			return text({ moved: r.n, notPerfect: moves.filter((m) => !m.clean).map((m) => m.ref), errors: r.errs.length ? r.errs : undefined });
		}, { save: true }),
	);

	server.registerTool(
		'pcb_drc',
		{
			title: 'PCB design rule check',
			description: 'Run EasyEDA\'s DRC and return violations grouped by type with locations (mm). Also reports unrouted connections and shorts computed from copper geometry.',
			inputSchema: { limit: z.number().int().default(60) },
		},
		wrap(async ({ limit }) => {
			const st = await readPcb({ pads: true });
			const conn = pcbConnectivity(routerPads(st), st.tracks, st.vias);
			let native: any;
			try {
				native = await withEditorVisible(() => run(`return await lib.withTimeout(eda.pcb_Drc.check(true, false, true), 90000, 'EasyEDA DRC');`, {}, 100000));
			} catch (e: any) {
				native = { error: e.message };
			}
			let summary: any = native;
			if (Array.isArray(native)) {
				const flat: any[] = [];
				const walk = (x: any) => {
					if (!x || typeof x !== 'object') return;
					if (Array.isArray(x)) return x.forEach(walk);
					if (x.errorType && (x.objs || x.obj1)) return void flat.push(x);
					Object.values(x).forEach(walk);
				};
				walk(native);
				const byType: Record<string, number> = {};
				for (const v of flat) byType[v.errorType] = (byType[v.errorType] || 0) + 1;
				const fmt = (o: any) => (o ? `${o.typeName ?? ''}${o.suffix ? ' ' + o.suffix : ''}`.trim() : undefined);
				summary = {
					violations: flat.length,
					byType,
					items: flat.slice(0, limit).map((v) => ({
						type: v.errorType,
						rule: v.ruleName,
						net: v.net || undefined,
						objects: [fmt(v.obj1), fmt(v.obj2)].filter(Boolean),
						message: (v.explanation?.str || '')
							.replace('{obj1}', fmt(v.obj1) || 'object')
							.replace('{obj2}', fmt(v.obj2) || 'object')
							.replace(/\{(\w+)\}/g, (m: string, k: string) => {
								const val = v[k] ?? v.explanation?.param?.[k] ?? v.explanation?.errData?.[k];
								return typeof val === 'number' ? `${mil2mm(val)}mm` : val !== undefined ? String(val) : m;
							}),
						// EasyEDA reports DRC positions in 10-mil units
						atMm: v.pos ? [Math.round(v.pos.x * 0.254 * 100) / 100, Math.round(v.pos.y * 0.254 * 100) / 100] : undefined,
						ids: v.objs,
					})),
					note: flat.some((v) => v.errorType === 'Connection Error') ? '"Connection Error" = copper or pads of a net not connected to the rest of that net (unrouted, or tracks that do not end exactly on a pad/via/track end).' : undefined,
				};
			}
			const cs = connSummary(conn, st.pourNets);
			return text({ drc: summary, connectivity: { ...cs, open: undefined } });
		}),
	);

	server.registerTool(
		'pcb_status',
		{
			title: 'Routing status / ratsnest',
			description: 'Which nets are fully connected by copper and which pads are still unrouted (islands), plus shorts between different nets. Computed from geometry (pours not counted).',
			inputSchema: { nets: z.array(z.string()).optional() },
		},
		wrap(async ({ nets }) => {
			const st = await readPcb({ pads: true });
			const conn = pcbConnectivity(routerPads(st), st.tracks, st.vias);
			const cs = connSummary(conn, st.pourNets);
			const list = cs.open.filter((n) => !nets || nets.includes(n.net)).map((n) => ({ net: n.net, islands: n.unrouted.map((i) => i.join(' ')) }));
			return text({ ...cs, open: undefined, unrouted: list });
		}),
	);

	server.registerTool(
		'pcb_delete',
		{
			title: 'Delete PCB items',
			description: 'Remove routing (all, or for given nets), vias, pours, components (designators), or explicit primitive ids.',
			inputSchema: {
				routingOfNets: z.array(z.string()).optional(),
				allRouting: z.boolean().default(false),
				pours: z.boolean().default(false),
				components: z.array(z.string()).optional(),
				ids: z.array(z.string()).optional(),
			},
		},
		wrap(async (a) => {
			const r = await run(
				`await lib.ensureDoc('pcb'); const out = { tracks: 0, vias: 0, pours: 0, comps: 0, ids: 0 };
				 if (args.allRouting || (args.nets && args.nets.length)) {
					const sel = (n) => args.allRouting || args.nets.includes(n);
					const t = (await eda.pcb_PrimitiveLine.getAll()).filter(x => (x.getState_Layer() === 1 || x.getState_Layer() === 2) && sel(x.getState_Net())).map(x => x.getState_PrimitiveId());
					const ar = (await eda.pcb_PrimitiveArc.getAll()).filter(x => (x.getState_Layer() === 1 || x.getState_Layer() === 2) && sel(x.getState_Net())).map(x => x.getState_PrimitiveId());
					const v = (await eda.pcb_PrimitiveVia.getAll()).filter(x => sel(x.getState_Net())).map(x => x.getState_PrimitiveId());
					if (t.length) await eda.pcb_PrimitiveLine.delete(t); if (ar.length) await eda.pcb_PrimitiveArc.delete(ar); if (v.length) await eda.pcb_PrimitiveVia.delete(v);
					out.tracks = t.length + ar.length; out.vias = v.length;
				 }
				 if (args.pours) { const p = (await eda.pcb_PrimitivePour.getAll()).map(x => x.getState_PrimitiveId()); if (p.length) await eda.pcb_PrimitivePour.delete(p); out.pours = p.length; }
				 for (const ref of args.comps || []) { try { const c = await lib.findPcbComponent(ref); await eda.pcb_PrimitiveComponent.delete(c.getState_PrimitiveId()); out.comps++; } catch (e) {} }
				 const apiFor = { Line: eda.pcb_PrimitiveLine, Track: eda.pcb_PrimitiveLine, Via: eda.pcb_PrimitiveVia, Arc: eda.pcb_PrimitiveArc, Pad: eda.pcb_PrimitivePad, String: eda.pcb_PrimitiveString, Polyline: eda.pcb_PrimitivePolyline, Pour: eda.pcb_PrimitivePour, Fill: eda.pcb_PrimitiveFill, Region: eda.pcb_PrimitiveRegion, Component: eda.pcb_PrimitiveComponent, Dimension: eda.pcb_PrimitiveDimension, Image: eda.pcb_PrimitiveImage };
				 out.unknown = [];
				 for (const id of args.ids || []) {
					// getPrimitiveTypeByPrimitiveId returns null in v3.2 and some get() calls return placeholder
					// objects for foreign ids, so verify the returned primitive really is that id.
					let done = false;
					for (const api of new Set(Object.values(apiFor))) {
						let o; try { o = await api.get(id); } catch (e) { continue; }
						if (o && typeof o.getState_PrimitiveType === 'function' && o.getState_PrimitiveId() === id) { if (await api.delete(id)) { out.ids++; done = true; } break; }
					}
					if (!done) out.unknown.push(id);
				 }
				 return out;`,
				{ nets: a.routingOfNets, allRouting: a.allRouting, pours: a.pours, comps: a.components, ids: a.ids },
				120000,
			);
			return text(r);
		}, { save: true }),
	);

	server.registerTool(
		'pcb_rules',
		{
			title: 'Board setup: design rules, layers, copper, net classes',
			description: [
				'Design rules and board setup for any board type (all sizes in mm).',
				'action "read": summary of the active rules (clearances, track widths, via sizes, plane/pour connection, mask expansion), layers and net classes.',
				'action "set": clearance (copper↔copper), pourClearance, boardEdgeClearance, holeToHole, track {min,default,max}, via {diameter,hole,minDiameter,minHole}, copperWeight "1oz"|"2oz", padConnection "thermal"|"direct" (+ spokeWidth, spokeClearance), solderMaskExpansion.',
				'action "patch": raw edits [{path:"Physics/Via Size/viaSize/form/viaOuterdiameterDefault", value}] on the rule JSON.',
				'action "layers": copper layer count (2/4/6…). action "layer_modify": layer (id or name), name, type SIGNAL|PLANE (inner layers), color.',
				'action "net_class": name + nets. action "diff_pair": name, positive, negative.',
			].join(' '),
			inputSchema: {
				action: z.enum(['read', 'set', 'patch', 'layers', 'layer_modify', 'net_class', 'diff_pair']),
				clearance: z.number().optional(),
				boardEdgeClearance: z.number().optional(),
				pourClearance: z.number().optional().describe('copper pour/plane to other objects'),
				holeToHole: z.number().optional(),
				track: z.object({ min: z.number().optional(), default: z.number().optional(), max: z.number().optional() }).optional(),
				via: z.object({ diameter: z.number().optional(), hole: z.number().optional(), minDiameter: z.number().optional(), minHole: z.number().optional() }).optional(),
				copperWeight: z.enum(['1oz', '2oz']).optional(),
				padConnection: z.enum(['thermal', 'direct']).optional(),
				spokeWidth: z.number().optional(),
				spokeClearance: z.number().optional(),
				solderMaskExpansion: z.number().optional(),
				edits: z.array(z.object({ path: z.string(), value: z.any() })).optional(),
				layers: z.number().int().optional(),
				layer: z.union([z.number(), z.string()]).optional(),
				name: z.string().optional(),
				type: z.enum(['SIGNAL', 'PLANE']).optional(),
				color: z.string().optional(),
				nets: z.array(z.string()).optional(),
				positive: z.string().optional(),
				negative: z.string().optional(),
			},
		},
		wrap(async (a) => {
			await run('return lib.ensureDoc("pcb")', {}, 30000);
			if (a.action === 'read') {
				const r = await run(
					`const full = await eda.pcb_Drc.getCurrentRuleConfiguration(); const c = full.config;
					 const def = (grp) => Object.values(grp || {}).find((x) => x.isSetDefault) || Object.values(grp || {})[0];
					 const sp = def(c.Spacing['Safe Spacing']); const t = sp.tables[Object.keys(sp.tables)[0]].content;
					 const rows = sp.row; const at = (r, col) => (t[rows.indexOf(r)] || [])[sp.column.indexOf(col)];
					 const tr = def(c.Physics.Track); const vs = c.Physics['Via Size'].viaSize.form; const oc = c.Spacing['Other Spacing'].otherClearance.form;
					 const pz = c.Plane['Copper Zone'].copperRegion.form.singleLayerPadModel.data['1'];
					 const layers = (await eda.pcb_Layer.getAllLayers()).filter(l => l.layerStatus !== 0 || l.id <= 2).map(l => ({ id: l.id, name: l.name, type: l.type }));
					 return { ruleSet: await eda.pcb_Drc.getCurrentRuleConfigurationName(), copperWeight: sp.editName, clearance: { trackTrack: at('Track','Track'), trackPad: at('SMD Pad','Track'), padPad: at('SMD Pad','SMD Pad'), viaVia: at('Via','Via'), toPour: at('Copper/Plane Zone','Track'), boardEdge: at('Board Outline','Track'), hole: at('Hole','Track') },
						track: tr.form.data['1'], via: vs, holeToHole: oc.hole2Hole, padConnection: { mode: pz.connectMode === 0 ? 'thermal?' : 'direct?', raw: pz }, solderMask: c.Expansion['Solder Mask Expansion'].solderMaskExpansion.form,
						copperLayers: await eda.pcb_Layer.getTheNumberOfCopperLayers(), layers: layers.filter(l => /SIGNAL|PLANE/.test(l.type)), netClasses: await eda.pcb_Drc.getAllNetClasses().catch(() => []), diffPairs: await eda.pcb_Drc.getAllDifferentialPairs().catch(() => []) };`,
				);
				return text({ units: 'mm', ...r });
			}
			if (a.action === 'set' || a.action === 'patch') {
				const r = await run(
					`const full = await eda.pcb_Drc.getCurrentRuleConfiguration(); const c = full.config; const A = args;
					 const changed = [];
					 if (A.copperWeight) { const want = 'copperThickness' + A.copperWeight; for (const grp of [c.Spacing['Safe Spacing'], c.Physics.Track]) for (const [k, v] of Object.entries(grp)) v.isSetDefault = k === want; changed.push('copperWeight'); }
					 const def = (grp) => Object.values(grp || {}).find((x) => x.isSetDefault) || Object.values(grp || {})[0];
					 const sp = def(c.Spacing['Safe Spacing']);
					 const setMatrix = (fn) => { for (const tb of Object.values(sp.tables)) tb.content = tb.content.map((row, i) => row.map((v, j) => { const nv = fn(sp.row[i], sp.column[j], v); return nv === undefined ? v : nv; })); };
					 const special = ['Board Outline', 'Hole', 'Slot Region', 'Text/Image', 'Line', 'Copper/Plane Zone'];
					 if (A.clearance !== undefined) { setMatrix((r, col) => (special.includes(r) || special.includes(col) ? undefined : A.clearance)); changed.push('clearance'); }
					 if (A.pourClearance !== undefined) { setMatrix((r, col) => ((r === 'Copper/Plane Zone') !== (col === 'Copper/Plane Zone') ? A.pourClearance : undefined)); changed.push('pourClearance'); }
					 if (A.boardEdgeClearance !== undefined) { setMatrix((r, col) => (r === 'Board Outline' || col === 'Board Outline' ? A.boardEdgeClearance : undefined)); changed.push('boardEdge'); }
					 if (A.holeToHole !== undefined) { c.Spacing['Other Spacing'].otherClearance.form.hole2Hole = A.holeToHole; changed.push('holeToHole'); }
					 if (A.track) { const d = def(c.Physics.Track).form.data['1']; if (A.track.min !== undefined) d.minValue = A.track.min; if (A.track.default !== undefined) d.defaultValue = A.track.default; if (A.track.max !== undefined) d.maxValue = A.track.max; changed.push('track'); }
					 if (A.via) { const f = c.Physics['Via Size'].viaSize.form; if (A.via.diameter !== undefined) f.viaOuterdiameterDefault = A.via.diameter; if (A.via.hole !== undefined) f.viaInnerdiameterDefault = A.via.hole; if (A.via.minDiameter !== undefined) f.viaOuterdiameterMin = A.via.minDiameter; if (A.via.minHole !== undefined) f.viaInnerdiameterMin = A.via.minHole; changed.push('via'); }
					 if (A.padConnection || A.spokeWidth || A.spokeClearance) { const cz = c.Plane['Copper Zone'].copperRegion.form; for (const m of Object.values(cz)) for (const d of Object.values(m.data || {})) { if (A.padConnection) d.connectMode = A.padConnection === 'direct' ? 1 : 0; if (A.spokeWidth) d.lineWidth = A.spokeWidth; if (A.spokeClearance) d.lineClearance = A.spokeClearance; } changed.push('padConnection'); }
					 if (A.solderMaskExpansion !== undefined) { const f = c.Expansion['Solder Mask Expansion'].solderMaskExpansion.form; f.padToplayerExpansion = f.padBottomlayerExpansion = A.solderMaskExpansion; changed.push('solderMask'); }
					 for (const e of A.edits || []) { const parts = e.path.split('/'); let o = c; for (const k of parts.slice(0, -1)) { if (!(k in o)) throw new Error('rule path not found: ' + e.path); o = o[k]; } o[parts[parts.length - 1]] = e.value; changed.push(e.path); }
					 const ok = await eda.pcb_Drc.overwriteCurrentRuleConfiguration(full.config); // expects the inner config object
					 return { ok, changed };`,
					a,
				);
				return text({ ...r, next: 'pcb_rules read to confirm; pcb_drc re-checks with the new rules.' });
			}
			if (a.action === 'layers') return text({ ok: await run('return eda.pcb_Layer.setTheNumberOfCopperLayers(args.n)', { n: a.layers }), note: 'Inner layers: use layer_modify type PLANE for a GND/power plane, then pcb_copper kind "pour" on that layer.' });
			if (a.action === 'layer_modify') {
				return text(
					await run(
						`const all = await eda.pcb_Layer.getAllLayers(); const l = typeof args.layer === 'number' ? all.find(x => x.id === args.layer) : all.find(x => x.name.toLowerCase() === String(args.layer).toLowerCase());
						 if (!l) throw new Error('layer not found; layers: ' + all.map(x => x.id + ':' + x.name).join(', '));
						 const prop = {}; if (args.name) prop.name = args.name; if (args.type) prop.type = args.type; if (args.color) prop.color = args.color;
						 return { layer: l.id, ok: await eda.pcb_Layer.modifyLayer(l.id, prop) };`,
						a,
					),
				);
			}
			if (a.action === 'net_class') return text({ ok: await run('return eda.pcb_Drc.createNetClass(args.n, args.nets, null)', { n: a.name, nets: a.nets }) });
			return text({ ok: await run('return eda.pcb_Drc.createDifferentialPair(args.n, args.p, args.m)', { n: a.name, p: a.positive, m: a.negative }) });
		}, { save: true }),
	);

	server.registerTool(
		'pcb_copper',
		{
			title: 'Copper regions: pours, solid fills, keepouts (manual)',
			description: [
				'Lay out copper by hand — for power circuits, current paths, thermal areas and planes. All coordinates in mm.',
				'kind "pour": a copper pour (clears around other nets, refills automatically) on a net — e.g. a VIN/VOUT/SW island or a GND plane on an inner layer.',
				'kind "fill": a solid copper fill (does NOT clear other nets — keep it away from them) — for heat-sink pads and wide current paths.',
				'kind "keepout": a region with rules (no tracks / pours / fills / components).',
				'Shape: rect {x,y,width,height} (lower-left corner) or polygon [[x,y],…]. layer: top | bottom | inner1..inner4 | layer id.',
				'Pours are refilled after creation; priority: higher number = filled later (wins).',
			].join(' '),
			inputSchema: {
				kind: z.enum(['pour', 'fill', 'keepout']),
				net: z.string().default(''),
				layer: z.union([z.enum(['top', 'bottom', 'inner1', 'inner2', 'inner3', 'inner4']), z.number()]).default('top'),
				rect: z.object({ x: z.number(), y: z.number(), width: z.number(), height: z.number(), cornerRadius: z.number().default(0) }).optional(),
				polygon: z.array(z.tuple([z.number(), z.number()])).optional(),
				name: z.string().optional(),
				priority: z.number().int().default(1),
				fillStyle: z.enum(['solid', '45grid', '90grid']).default('solid'),
				keepoutRules: z.array(z.enum(['tracks', 'pours', 'components', 'fills', 'innerLayers'])).default(['tracks', 'pours']).describe('tracks = no wires/tracks (and their vias)'),
			},
		},
		wrap(async (a) => {
			const layerId = typeof a.layer === 'number' ? a.layer : ({ top: 1, bottom: 2, inner1: 15, inner2: 16, inner3: 17, inner4: 18 } as any)[a.layer];
			let src: any[];
			if (a.polygon?.length) {
				const pts = a.polygon.map(([x, y]) => [mm2mil(x), mm2mil(y)]);
				src = [pts[0][0], pts[0][1], 'L', ...pts.slice(1).flat(), pts[0][0], pts[0][1]];
			} else if (a.rect) src = ['R', mm2mil(a.rect.x), mm2mil(a.rect.y + a.rect.height), mm2mil(a.rect.width), mm2mil(a.rect.height), 0, mm2mil(a.rect.cornerRadius)];
			else return text('rect or polygon required');
			const r = await run(
				`await lib.ensureDoc('pcb');
				 const poly = lib.polygon(args.src);
				 if (args.kind === 'pour') { const p = await eda.pcb_PrimitivePour.create(args.net, args.layer, poly, args.fill, false, args.name || (args.net + '_' + args.layer), args.priority); if (!p) throw new Error('pour creation failed'); const f = await lib.rebuildPours(); return { id: p.getState_PrimitiveId(), filled: f.filledRegions }; }
				 if (args.kind === 'fill') { const f = await eda.pcb_PrimitiveFill.create(args.layer, poly, args.net || undefined, 0); if (!f) throw new Error('fill creation failed'); return { id: f.getState_PrimitiveId() }; }
				 const map = { components: 2, tracks: 5, fills: 6, pours: 7, innerLayers: 8 };
				 const rg = await eda.pcb_PrimitiveRegion.create(args.layer, poly, args.rules.map(k => map[k]), args.name || 'keepout');
				 if (!rg) throw new Error('keepout creation failed'); return { id: rg.getState_PrimitiveId() };`,
				{ kind: a.kind, net: a.net, layer: layerId, src, fill: a.fillStyle, name: a.name, priority: a.priority, rules: a.keepoutRules },
				90000,
			);
			return text({ ...r, next: 'pcb_snapshot to look at it, pcb_drc to verify clearances.' });
		}, { save: true }),
	);

	server.registerTool(
		'pcb_snapshot',
		{
			title: 'PCB snapshot (image)',
			description: [
				'Picture of the PCB (whole board, a region in mm, or the area around some parts). layers: all | top | bottom.',
				'Default mode "render" draws it from the design data without touching the user window, view or focus: outline, pours (dashed), copper fills, tracks (top red / bottom blue), pads, vias, holes, part outlines and designators; pad net names when zoomed in.',
				'mode "native" uses EasyEDA own drawing (filled pours, silkscreen) but only if EasyEDA is already visible, and it moves the user view.',
			].join(' '),
			inputSchema: {
				region: z.object({ minX: z.number(), minY: z.number(), maxX: z.number(), maxY: z.number() }).optional(),
				around: z.array(z.string()).optional(),
				padding: z.number().default(2),
				layers: z.enum(['all', 'top', 'bottom']).default('all'),
				mode: z.enum(['render', 'native']).default('render'),
				maxPx: z.number().int().min(400).max(3000).default(1600),
			},
		},
		wrap(async (a) => {
			const st = await readPcb({ pads: true });
			let reg = a.region;
			if (!reg && a.around?.length) {
				const cs = st.comps.filter((c: any) => a.around!.includes(c.designator) && c.bbox);
				if (!cs.length) throw new Error('none of those designators exist on the PCB');
				reg = { minX: Math.min(...cs.map((c: any) => c.bbox.minX)) - a.padding, minY: Math.min(...cs.map((c: any) => c.bbox.minY)) - a.padding, maxX: Math.max(...cs.map((c: any) => c.bbox.maxX)) + a.padding, maxY: Math.max(...cs.map((c: any) => c.bbox.maxY)) + a.padding };
			}
			if (a.mode === 'native') {
				const vis = await run('return lib.isVisible()', {}, 5000);
				if (!vis) throw new Error('EasyEDA is not visible on screen, so it cannot draw. Use mode "render" (default).');
				const shot = await run(
					`if (args.reg) await eda.dmt_EditorControl.zoomToRegion(args.reg.minX, args.reg.maxX, args.reg.maxY, args.reg.minY); else { const ok = await eda.pcb_Document.zoomToBoardOutline(); if (!ok) await eda.dmt_EditorControl.zoomToAllPrimitives(); }
					 await runtime.sleep(800); return await eda.dmt_EditorControl.getCurrentRenderedAreaImage();`,
					{ reg: reg && { minX: mm2mil(reg.minX), minY: mm2mil(reg.minY), maxX: mm2mil(reg.maxX), maxY: mm2mil(reg.maxY) } },
					40000,
				);
				return image(shot.base64, shot.mime || 'image/png');
			}
			const extra = await run(
				`const pours = []; for (const p of (await eda.pcb_PrimitivePour.getAll()) || []) { const poly = p.getState_ComplexPolygon(); pours.push({ net: p.getState_Net(), layer: p.getState_Layer(), src: poly && poly.getSource ? poly.getSource() : poly }); }
				 const fills = []; try { for (const p of (await eda.pcb_PrimitiveFill.getAll()) || []) { const poly = p.getState_ComplexPolygon(); fills.push({ net: p.getState_Net(), layer: p.getState_Layer(), src: poly && poly.getSource ? poly.getSource() : poly }); } } catch (e) {}
				 const labels = {}; try { for (const t of (await eda.pcb_PrimitiveAttribute.getAll()) || []) if (t.getState_Key() === 'Designator' && t.getState_X() != null) labels[t.getState_ParentPrimitiveId()] = [t.getState_X(), t.getState_Y()]; } catch (e) {}
				 const texts = []; try { for (const t of (await eda.pcb_PrimitiveString.getAll()) || []) texts.push({ x: t.getState_X(), y: t.getState_Y(), text: t.getState_Text(), size: t.getState_FontSize(), layer: t.getState_Layer(), rot: t.getState_Rotation() }); } catch (e) {}
				 return { pours, fills, labels, texts };`,
				{},
				60000,
			);
			const toPts = (src: any) => polygonPoints(src).map(([x, y]) => [mil2mm(x), mil2mm(y)] as [number, number]);
			const outlineSrc = st.outline?.polylines?.[0]?.source;
			const data: PcbRenderData = {
				board: st.board,
				outline: outlineSrc && outlineSrc[0] !== 'R' ? toPts(outlineSrc) : undefined,
				comps: st.comps.map((c: any) => ({
					designator: c.designator,
					x: c.x,
					y: c.y,
					bbox: c.bbox,
					side: c.side,
					label: extra.labels[c.id] ? { x: mil2mm(extra.labels[c.id][0]), y: mil2mm(extra.labels[c.id][1]) } : undefined,
					pads: (c.pads || []).map((p: any) => ({ ...p, hole: p.hole ? [p.hole[0], mil2mm(p.hole[1])] : null })),
				})),
				freePads: st.freePads.map((p: any) => ({ ...p, hole: p.hole ? [p.hole[0], mil2mm(p.hole[1])] : null })),
				tracks: st.tracks,
				vias: st.vias,
				pours: extra.pours.filter((p: any) => p.layer <= 2).map((p: any) => ({ layer: p.layer - 1, net: p.net, points: toPts(p.src) })),
				fills: extra.fills.filter((p: any) => p.layer <= 2).map((p: any) => ({ layer: p.layer - 1, net: p.net, points: toPts(p.src) })),
				texts: extra.texts.filter((t: any) => t.layer === 3 || t.layer === 4).map((t: any) => ({ x: mil2mm(t.x), y: mil2mm(t.y), text: t.text, size: mil2mm(t.size), bottom: t.layer === 4, rot: t.rot })),
			};
			const { svg, width, height } = pcbSvg(data, reg, { maxPx: a.maxPx, layers: a.layers });
			const png = await run('return lib.rasterizeSvg(args.svg, args.w, args.h)', { svg, w: width, h: height }, 30000);
			return image(png.base64, 'image/png');
		}),
	);
}

function overlapArea(a: any, b: any) {
	const w = Math.min(a.maxX, b.maxX) - Math.max(a.minX, b.minX);
	const h = Math.min(a.maxY, b.maxY) - Math.max(a.minY, b.minY);
	return w > 0 && h > 0 ? w * h : 0;
}


/** Ground pads the pour cannot reach get a short stub + via down/up to the other layer's pour. */
export async function fixIsolatedGround(net: string, only?: string[]) {
	const drc: any = only ? null : await run(`return await lib.withTimeout(eda.pcb_Drc.check(true, false, true), 90000, 'DRC');`, {}, 100000).catch(() => null);
	const flat: any[] = [];
	const walk = (x: any) => {
		if (!x || typeof x !== 'object') return;
		if (Array.isArray(x)) return x.forEach(walk);
		if (x.errorType && (x.objs || x.obj1)) return void flat.push(x);
		Object.values(x).forEach(walk);
	};
	walk(drc);
	const refs = only ?? flat
		.filter((v) => v.errorType === 'Connection Error' && v.net === net && /Pad/.test(v.obj1?.typeName || ''))
		.map((v) => (String(v.obj1.suffix).match(/\):\s*(\S+)_(\S+)$/) || []).slice(1))
		.filter((m) => m.length === 2)
		.map(([d, n]) => `${d}.${n}`);
	if (!refs.length) return { fixed: [], unfixable: [] };
	const st = await readPcb({ pads: true });
	const pads = routerPads(st);
	const router = new PcbRouter({ board: st.board!, pads, tracks: st.tracks, vias: st.vias }, { ...defaultRules, grid: 0.1 });
	for (const p of pads) router.addPad(p);
	for (const t of st.tracks) router.addSeg(t);
	for (const v of st.vias) router.addVia(v);
	const n = router.id(net);
	const viaR = Math.ceil((defaultRules.viaDiameter / 2 + defaultRules.clearance) / 0.1);
	const free = (l: number, x: number, y: number, r: number) => {
		const i0 = router.ci(x),
			j0 = router.cj(y);
		for (let dj = -r; dj <= r; dj++)
			for (let di = -r; di <= r; di++) {
				if (di * di + dj * dj > r * r) continue;
				const i = i0 + di,
					j = j0 + dj;
				if (i < 0 || j < 0 || i >= router.W || j >= router.H) return false;
				const k = j * router.W + i;
				if (!router.inBoard[k]) return false;
				const o = router.owner[l][k];
				if (o !== 0 && o !== n) return false;
			}
		return true;
	};
	const fixed: string[] = [],
		unfixable: string[] = [];
	const segs: any[] = [],
		vias: any[] = [];
	for (const ref of refs) {
		const pd = pads.find((p) => p.ref === ref);
		if (!pd) continue;
		const L = pd.layers[0];
		let done = false;
		for (let rad = 0.9; rad <= 3.5 && !done; rad += 0.3)
			for (let k = 0; k < 16 && !done; k++) {
				const ang = (k / 16) * Math.PI * 2;
				const x = pd.x + rad * Math.cos(ang),
					y = pd.y + rad * Math.sin(ang);
				const i = router.ci(x),
					j = router.cj(y);
				if (router.noVia[j * router.W + i]) continue;
				if (st.vias.some((v: any) => Math.hypot(v.x - x, v.y - y) < defaultRules.viaDiameter + defaultRules.clearance) || vias.some((v) => Math.hypot(v[1] * 0.0254 - x, v[2] * 0.0254 - y) < 1)) continue;
				if (!free(0, x, y, viaR) || !free(1, x, y, viaR)) continue;
				// straight stub on the pad's layer must be clear
				let ok = true;
				for (let t = 0; t <= 1 && ok; t += 0.05) ok = free(L, pd.x + (x - pd.x) * t, pd.y + (y - pd.y) * t, Math.ceil(0.15 / 0.1));
				if (!ok) continue;
				vias.push([net, mm2mil(x), mm2mil(y), mm2mil(defaultRules.viaHole), mm2mil(defaultRules.viaDiameter)]);
				segs.push([net, L + 1, mm2mil(pd.x), mm2mil(pd.y), mm2mil(x), mm2mil(y), mm2mil(0.4)]);
				router.addVia({ net, x, y, d: defaultRules.viaDiameter });
				fixed.push(ref);
				done = true;
			}
		if (!done) unfixable.push(ref);
	}
	await run(
		`for (const v of args.v) await lib.createVia(v[0], v[1], v[2], v[3], v[4]);
		 for (const s of args.s) await eda.pcb_PrimitiveLine.create(s[0], s[1], s[2], s[3], s[4], s[5], s[6]);
		 return lib.rebuildPours();`,
		{ v: vias, s: segs },
		120000,
	);
	return { fixed, unfixable };
}

/** Stage 2: pads still cut off from the pour get a real track to the nearest healthy pad of the net. */
export async function routeIsolatedPads(net: string, flagged: string[]) {
	if (!flagged.length) return { routed: [], failed: [] };
	const st = await readPcb({ pads: true });
	const pads = routerPads(st);
	const healthy = pads.filter((p) => p.net === net && !flagged.includes(p.ref!));
	const routed: string[] = [],
		failed: string[] = [];
	for (const ref of flagged) {
		const P = pads.find((p) => p.ref === ref);
		if (!P || !healthy.length) {
			failed.push(ref);
			continue;
		}
		const Q = healthy.reduce((a, b) => (Math.hypot(a.x - P.x, a.y - P.y) <= Math.hypot(b.x - P.x, b.y - P.y) ? a : b));
		const tmp = '__fix__';
		const rp = pads.map((p) => (p === P || p === Q ? { ...p, net: tmp } : p));
		const router = new PcbRouter({ board: st.board!, pads: rp, tracks: st.tracks, vias: st.vias, nets: [tmp] }, { ...defaultRules, track: 0.4 });
		const res = router.route();
		if (res.failed.length || !res.segments.length) {
			failed.push(ref);
			continue;
		}
		await run(
			`for (const v of args.v) await lib.createVia(args.net, v[0], v[1], v[2], v[3]);
			 for (const s of args.s) await eda.pcb_PrimitiveLine.create(args.net, s[0], s[1], s[2], s[3], s[4], s[5]);
			 return true;`,
			{ net, v: res.vias.map((v) => [mm2mil(v.x), mm2mil(v.y), mm2mil(v.hole ?? 0.3), mm2mil(v.d)]), s: res.segments.map((x) => [x.layer + 1, mm2mil(x.x1), mm2mil(x.y1), mm2mil(x.x2), mm2mil(x.y2), mm2mil(x.w)]) },
			120000,
		);
		st.tracks.push(...res.segments.map((x) => ({ ...x, net })));
		routed.push(`${ref}→${Q.ref}`);
	}
	await run('return lib.rebuildPours()', {}, 60000);
	return { routed, failed };
}

export async function groundPadsDisconnected(net: string): Promise<string[]> {
	const drc: any = await run(`return await lib.withTimeout(eda.pcb_Drc.check(true, false, true), 90000, 'DRC');`, {}, 100000).catch(() => null);
	const flat: any[] = [];
	const walk = (x: any) => {
		if (!x || typeof x !== 'object') return;
		if (Array.isArray(x)) return x.forEach(walk);
		if (x.errorType && (x.objs || x.obj1)) return void flat.push(x);
		Object.values(x).forEach(walk);
	};
	walk(drc);
	return flat
		.filter((v) => v.errorType === 'Connection Error' && v.net === net && /Pad/.test(v.obj1?.typeName || ''))
		.map((v) => (String(v.obj1.suffix).match(/\):\s*(\S+)_(\S+)$/) || []).slice(1))
		.filter((m) => m.length === 2)
		.map(([d, n]) => `${d}.${n}`);
}
