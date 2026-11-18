/* Copper connectivity on the PCB (mm). Finds unrouted connections and shorts between nets. */
import { segDist, type RPad, type RSeg, type RVia } from './router.js';

export interface PcbConnReport {
	nets: { net: string; pads: number; islands: number; unrouted: string[][] }[];
	unroutedConnections: number;
	routedNets: number;
	totalNets: number;
	shorts: { netA: string; netB: string; at: [number, number] }[];
}

function padContains(p: RPad, x: number, y: number, tol: number) {
	const a = (-p.rot * Math.PI) / 180;
	const dx = x - p.x,
		dy = y - p.y;
	const lx = dx * Math.cos(a) - dy * Math.sin(a),
		ly = dx * Math.sin(a) + dy * Math.cos(a);
	return Math.abs(lx) <= p.w / 2 + tol && Math.abs(ly) <= p.h / 2 + tol;
}

export function pcbConnectivity(pads: RPad[], segs: RSeg[], vias: RVia[]): PcbConnReport {
	const items: { kind: 'pad' | 'seg' | 'via'; i: number }[] = [];
	pads.forEach((_, i) => items.push({ kind: 'pad', i }));
	segs.forEach((_, i) => items.push({ kind: 'seg', i }));
	vias.forEach((_, i) => items.push({ kind: 'via', i }));
	const parent = items.map((_, i) => i);
	const find = (a: number): number => (parent[a] === a ? a : (parent[a] = find(parent[a])));
	const union = (a: number, b: number) => (parent[find(a)] = find(b));
	const P = 0,
		S = pads.length,
		V = pads.length + segs.length;
	const shorts: PcbConnReport['shorts'] = [];
	const touch = (na: string, nb: string, at: [number, number], a: number, b: number) => {
		if (na && nb && na !== nb) {
			if (shorts.length < 50) shorts.push({ netA: na, netB: nb, at });
			return;
		}
		union(a, b);
	};
	// seg-seg (same layer): endpoint within the other's width
	for (let a = 0; a < segs.length; a++)
		for (let b = a + 1; b < segs.length; b++) {
			const A = segs[a],
				Bs = segs[b];
			if (A.layer !== Bs.layer) continue;
			const tol = (A.w + Bs.w) / 2 - 0.001;
			const d = Math.min(segDist(A.x1, A.y1, Bs.x1, Bs.y1, Bs.x2, Bs.y2), segDist(A.x2, A.y2, Bs.x1, Bs.y1, Bs.x2, Bs.y2), segDist(Bs.x1, Bs.y1, A.x1, A.y1, A.x2, A.y2), segDist(Bs.x2, Bs.y2, A.x1, A.y1, A.x2, A.y2));
			if (d <= tol) touch(A.net, Bs.net, [A.x1, A.y1], S + a, S + b);
		}
	// seg-pad
	for (let a = 0; a < segs.length; a++)
		for (let p = 0; p < pads.length; p++) {
			const s = segs[a],
				pd = pads[p];
			if (!pd.layers.includes(s.layer)) continue;
			if (padContains(pd, s.x1, s.y1, s.w / 2) || padContains(pd, s.x2, s.y2, s.w / 2) || segDist(pd.x, pd.y, s.x1, s.y1, s.x2, s.y2) <= Math.min(pd.w, pd.h) / 2 + s.w / 2 - 0.001)
				touch(s.net, pd.net, [pd.x, pd.y], S + a, P + p);
		}
	// via - seg / pad
	for (let v = 0; v < vias.length; v++) {
		const vi = vias[v];
		for (let a = 0; a < segs.length; a++) if (segDist(vi.x, vi.y, segs[a].x1, segs[a].y1, segs[a].x2, segs[a].y2) <= vi.d / 2 + segs[a].w / 2 - 0.001) touch(vi.net, segs[a].net, [vi.x, vi.y], V + v, S + a);
		for (let p = 0; p < pads.length; p++) if (padContains(pads[p], vi.x, vi.y, vi.d / 2)) touch(vi.net, pads[p].net, [vi.x, vi.y], V + v, P + p);
	}
	// pad-pad overlap (same net only, e.g. multi-pad footprints)
	const byNet = new Map<string, number[]>();
	pads.forEach((p, i) => p.net && (byNet.get(p.net) || byNet.set(p.net, []).get(p.net)!).push(i));
	const nets: PcbConnReport['nets'] = [];
	let unroutedConnections = 0,
		routedNets = 0;
	for (const [net, idx] of byNet) {
		if (idx.length < 2) continue;
		const groups = new Map<number, number[]>();
		for (const i of idx) (groups.get(find(P + i)) || groups.set(find(P + i), []).get(find(P + i))!).push(i);
		const islands = [...groups.values()];
		const unrouted = islands.length > 1 ? islands.map((g) => g.map((i) => pads[i].ref || `${pads[i].x.toFixed(2)},${pads[i].y.toFixed(2)}`)) : [];
		unroutedConnections += islands.length - 1;
		if (islands.length === 1) routedNets++;
		nets.push({ net, pads: idx.length, islands: islands.length, unrouted });
	}
	return { nets, unroutedConnections, routedNets, totalNets: nets.length, shorts };
}


/**
 * Redundant routes: copper of one net forming a closed loop (two parallel paths between the same
 * points). Nodes = track ends / via centres / pad centres per layer; every edge or via/pad join that
 * connects two already-connected nodes closes one loop. A clean routed tree has zero.
 */
export function redundantLoops(pads: RPad[], segs: RSeg[], vias: RVia[]): { net: string; loops: number; near: [number, number] }[] {
	const out: { net: string; loops: number; near: [number, number] }[] = [];
	const key = (x: number, y: number) => `${Math.round(x * 100)},${Math.round(y * 100)}`;
	for (const net of new Set(segs.map((t) => t.net).filter(Boolean))) {
		const parent = new Map<string, string>();
		const find = (a: string): string => {
			let r = a;
			while (parent.get(r) !== r) r = parent.get(r)!;
			parent.set(a, r);
			return r;
		};
		let loops = 0;
		let near: [number, number] = [0, 0];
		const join = (a: string, b: string, at: [number, number]) => {
			for (const k of [a, b]) if (!parent.has(k)) parent.set(k, k);
			if (find(a) === find(b)) {
				loops++;
				near = at;
			} else parent.set(find(a), find(b));
		};
		const netPads = pads.filter((p) => p.net === net);
		const snap = (x: number, y: number) => {
			for (const p of netPads) if (Math.abs(x - p.x) <= p.w / 2 + 0.01 && Math.abs(y - p.y) <= p.h / 2 + 0.01) return key(p.x, p.y);
			return key(x, y);
		};
		const points = new Map<string, Set<number>>(); // point -> layers present
		const note = (pt: string, l: number) => (points.get(pt) || points.set(pt, new Set()).get(pt)!).add(l);
		for (const t of segs.filter((q) => q.net === net)) {
			const a = snap(t.x1, t.y1),
				b = snap(t.x2, t.y2);
			note(a, t.layer);
			note(b, t.layer);
			if (a === b) continue;
			join(`${a}|${t.layer}`, `${b}|${t.layer}`, [t.x1, t.y1]);
		}
		// a via, or a through-hole pad, connects all layers present at its point
		const linkLayers = (pt: string, at: [number, number]) => {
			const ls = [...(points.get(pt) ?? [])];
			for (let i = 1; i < ls.length; i++) join(`${pt}|${ls[0]}`, `${pt}|${ls[i]}`, at);
		};
		for (const v of vias.filter((q) => q.net === net)) linkLayers(snap(v.x, v.y), [v.x, v.y]);
		for (const p of netPads.filter((q) => q.layers.length > 1)) linkLayers(key(p.x, p.y), [p.x, p.y]);
		if (loops > 0) out.push({ net, loops, near });
	}
	return out;
}
