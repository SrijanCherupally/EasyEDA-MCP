/*
 * Built-in 2-layer PCB autorouter.
 *
 * Grid maze router with exact keep-out rasterisation:
 *  - every piece of copper marks the cells where another net's track CENTRELINE may not go
 *    (radius = copper half-width + clearance + default half-track-width);
 *  - A* over (cell, layer) with 8 directions, via transitions, bend and wrong-direction penalties;
 *  - multi-pad nets grow as trees; wide nets (power) check an extra clearance disk;
 *  - nets that fail are ripped up and retried first in a new pass (rip-up & reroute).
 * All units here are millimetres; the tool layer converts to EasyEDA mils.
 */

export interface RPad {
	net: string;
	x: number;
	y: number;
	w: number;
	h: number;
	rot: number; // degrees
	shape: string; // RECT | ELLIPSE | OVAL | POLYGON
	layers: number[]; // copper layer indices: 0 top, 1 bottom
	ref?: string;
}
export interface RSeg {
	net: string;
	layer: number;
	x1: number;
	y1: number;
	x2: number;
	y2: number;
	w: number;
}
export interface RVia {
	net: string;
	x: number;
	y: number;
	d: number;
	hole?: number;
}
export interface RouterRules {
	track: number; // default track width
	clearance: number;
	viaDiameter: number;
	viaHole: number;
	edgeClearance: number;
	grid?: number;
	netWidths?: Record<string, number>;
	layers?: number; // 1 or 2
	viaCost?: number;
	bendCost?: number;
	maxPasses?: number;
	timeLimitMs?: number;
	preferredDirections?: boolean;
}
export interface RouterInput {
	board: { minX: number; minY: number; maxX: number; maxY: number; polygon?: [number, number][] };
	pads: RPad[];
	tracks: RSeg[];
	vias: RVia[];
	nets?: string[]; // which nets to route (default: all with ≥2 pads)
	skipNets?: string[];
}
export interface RouterResult {
	segments: RSeg[];
	vias: RVia[];
	routed: string[];
	failed: { net: string; unconnectedPads: string[] }[];
	stats: { nets: number; connections: number; failedConnections: number; ms: number; passes: number; grid: number; vias: number; lengthMm: number };
}

const DIR8: [number, number, number][] = [
	[1, 0, 1],
	[-1, 0, 1],
	[0, 1, 1],
	[0, -1, 1],
	[1, 1, Math.SQRT2],
	[1, -1, Math.SQRT2],
	[-1, 1, Math.SQRT2],
	[-1, -1, Math.SQRT2],
];

export class PcbRouter {
	g: number;
	W: number;
	H: number;
	L: number;
	ox: number;
	oy: number;
	owner: Int32Array[]; // per layer: 0 free, >0 net id, -1 blocked
	netId = new Map<string, number>();
	netName: string[] = [''];
	rules: Required<Omit<RouterRules, 'netWidths'>> & { netWidths: Record<string, number> };
	inBoard: Uint8Array;
	noVia: Uint8Array; // cells where a via would overlap a pad (via-in-pad is not connected in EasyEDA)
	private gBuf?: Float32Array;
	private cameBuf?: Int32Array;
	private stampBuf?: Int32Array;
	private stamp = 0;

	constructor(
		private input: RouterInput,
		rules: RouterRules,
	) {
		this.rules = {
			grid: rules.grid ?? Math.max(0.05, Math.min(0.15, (rules.track + rules.clearance) / 3)),
			layers: rules.layers ?? 2,
			viaCost: rules.viaCost ?? 12,
			bendCost: rules.bendCost ?? 1.5,
			maxPasses: rules.maxPasses ?? 4,
			timeLimitMs: rules.timeLimitMs ?? 90000,
			preferredDirections: rules.preferredDirections ?? true,
			netWidths: rules.netWidths ?? {},
			...rules,
		} as any;
		this.rules.grid = rules.grid ?? Math.max(0.05, Math.min(0.15, (rules.track + rules.clearance) / 3));
		this.g = this.rules.grid;
		const b = input.board;
		this.ox = b.minX;
		this.oy = b.minY;
		this.W = Math.ceil((b.maxX - b.minX) / this.g) + 1;
		this.H = Math.ceil((b.maxY - b.minY) / this.g) + 1;
		this.L = this.rules.layers;
		this.owner = Array.from({ length: this.L }, () => new Int32Array(this.W * this.H));
		this.inBoard = new Uint8Array(this.W * this.H);
		this.noVia = new Uint8Array(this.W * this.H);
		this.markBoard();
	}

	id(net: string) {
		let i = this.netId.get(net);
		if (!i) {
			i = this.netName.length;
			this.netId.set(net, i);
			this.netName.push(net);
		}
		return i;
	}
	cx(i: number) {
		return this.ox + i * this.g;
	}
	cy(j: number) {
		return this.oy + j * this.g;
	}
	ci(x: number) {
		return Math.round((x - this.ox) / this.g);
	}
	cj(y: number) {
		return Math.round((y - this.oy) / this.g);
	}

	private markBoard() {
		const b = this.input.board;
		const m = this.rules.edgeClearance + this.rules.track / 2;
		const poly = b.polygon && b.polygon.length >= 3 ? b.polygon : null;
		for (let j = 0; j < this.H; j++)
			for (let i = 0; i < this.W; i++) {
				const x = this.cx(i),
					y = this.cy(j);
				let ok = x >= b.minX + m && x <= b.maxX - m && y >= b.minY + m && y <= b.maxY - m;
				if (ok && poly) ok = pointInPoly(x, y, poly) && distToPoly(x, y, poly) >= m;
				this.inBoard[j * this.W + i] = ok ? 1 : 0;
			}
	}

	/** Mark keep-out for net copper given a signed-distance predicate over a bbox. */
	private markKeepout(layer: number, net: number, bbox: [number, number, number, number], dist: (x: number, y: number) => number, radius: number) {
		const own = this.owner[layer];
		const i0 = Math.max(0, Math.floor((bbox[0] - radius - this.ox) / this.g)),
			i1 = Math.min(this.W - 1, Math.ceil((bbox[2] + radius - this.ox) / this.g));
		const j0 = Math.max(0, Math.floor((bbox[1] - radius - this.oy) / this.g)),
			j1 = Math.min(this.H - 1, Math.ceil((bbox[3] + radius - this.oy) / this.g));
		for (let j = j0; j <= j1; j++)
			for (let i = i0; i <= i1; i++) {
				if (dist(this.cx(i), this.cy(j)) >= radius) continue;
				const k = j * this.W + i;
				const o = own[k];
				if (o === 0) own[k] = net;
				else if (o !== net) own[k] = -1;
			}
	}

	keepoutRadius() {
		return this.rules.clearance + this.rules.track / 2 + this.g * 0.5;
	}

	addPad(p: RPad) {
		const n = p.net ? this.id(p.net) : -2;
		const r = this.keepoutRadius();
		const hw = p.w / 2,
			hh = p.h / 2;
		const a = (-p.rot * Math.PI) / 180;
		const ca = Math.cos(a),
			sa = Math.sin(a);
		const round = p.shape === 'ELLIPSE' || p.shape === 'OVAL';
		const dist = (x: number, y: number) => {
			const dx = x - p.x,
				dy = y - p.y;
			const lx = dx * ca - dy * sa,
				ly = dx * sa + dy * ca;
			if (round) {
				// capsule / circle
				const rr = Math.min(hw, hh);
				const ex = Math.max(0, Math.abs(lx) - (hw - rr)),
					ey = Math.max(0, Math.abs(ly) - (hh - rr));
				return Math.hypot(ex, ey) - rr;
			}
			const qx = Math.abs(lx) - hw,
				qy = Math.abs(ly) - hh;
			return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0);
		};
		const R = Math.hypot(hw, hh);
		for (const l of p.layers) if (l < this.L) this.markKeepout(l, n === -2 ? -1 : n, [p.x - R, p.y - R, p.x + R, p.y + R], dist, r);
		// no via may overlap any pad copper (any net)
		const vr = this.rules.viaDiameter / 2 + 0.05;
		const i0 = Math.max(0, Math.floor((p.x - R - vr - this.ox) / this.g)),
			i1 = Math.min(this.W - 1, Math.ceil((p.x + R + vr - this.ox) / this.g));
		const j0 = Math.max(0, Math.floor((p.y - R - vr - this.oy) / this.g)),
			j1 = Math.min(this.H - 1, Math.ceil((p.y + R + vr - this.oy) / this.g));
		for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) if (dist(this.cx(i), this.cy(j)) < vr) this.noVia[j * this.W + i] = 1;
		return dist;
	}

	addSeg(s: RSeg) {
		const n = s.net ? this.id(s.net) : -1;
		if (s.layer >= this.L) return;
		const r = this.keepoutRadius() + s.w / 2;
		this.markKeepout(s.layer, n, [Math.min(s.x1, s.x2), Math.min(s.y1, s.y2), Math.max(s.x1, s.x2), Math.max(s.y1, s.y2)], (x, y) => segDist(x, y, s.x1, s.y1, s.x2, s.y2), r);
	}

	addVia(v: RVia) {
		const n = v.net ? this.id(v.net) : -1;
		const r = this.keepoutRadius() + v.d / 2;
		for (let l = 0; l < this.L; l++) this.markKeepout(l, n, [v.x, v.y, v.x, v.y], (x, y) => Math.hypot(x - v.x, y - v.y), r);
	}

	/** Cells within distance rad of (i,j) that must be free for net n. */
	private diskFree(layer: number, k: number, n: number, offsets: number[][]) {
		const own = this.owner[layer];
		const i = k % this.W,
			j = (k / this.W) | 0;
		for (const [di, dj] of offsets) {
			const ii = i + di,
				jj = j + dj;
			if (ii < 0 || jj < 0 || ii >= this.W || jj >= this.H) return false;
			const kk = jj * this.W + ii;
			if (!this.inBoard[kk]) return false;
			const o = own[kk];
			if (o !== 0 && o !== n) return false;
		}
		return true;
	}

	private offsets(rad: number): number[][] {
		const r = Math.ceil(rad / this.g);
		const out: number[][] = [];
		for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) if (Math.hypot(di, dj) * this.g <= rad + 1e-9) out.push([di, dj]);
		return out;
	}

	route(): RouterResult {
		const t0 = Date.now();
		const { pads } = this.input;
		// group pads by net
		const byNet = new Map<string, RPad[]>();
		for (const p of pads) if (p.net) (byNet.get(p.net) || byNet.set(p.net, []).get(p.net)!).push(p);
		const skip = new Set(this.input.skipNets ?? []);
		let nets = [...byNet.keys()].filter((n) => byNet.get(n)!.length >= 2 && !skip.has(n));
		if (this.input.nets) nets = nets.filter((n) => this.input.nets!.includes(n));
		// order: small HPWL first, then by pad count
		const hpwl = (n: string) => {
			const ps = byNet.get(n)!;
			const xs = ps.map((p) => p.x),
				ys = ps.map((p) => p.y);
			return Math.max(...xs) - Math.min(...xs) + Math.max(...ys) - Math.min(...ys);
		};
		let order = nets.sort((a, b) => hpwl(a) - hpwl(b));

		let best: RouterResult | null = null;
		const baseOwner = () => {
			this.owner = Array.from({ length: this.L }, () => new Int32Array(this.W * this.H));
			this.noVia.fill(0);
			for (const p of pads) this.addPad(p);
			for (const s of this.input.tracks) this.addSeg(s);
			for (const v of this.input.vias) this.addVia(v);
		};

		for (let pass = 0; pass < this.rules.maxPasses; pass++) {
			baseOwner();
			const segments: RSeg[] = [];
			const vias: RVia[] = [];
			const failed: { net: string; unconnectedPads: string[] }[] = [];
			const routed: string[] = [];
			let connections = 0,
				failedConnections = 0;
			for (const net of order) {
				if (Date.now() - t0 > this.rules.timeLimitMs) {
					failed.push({ net, unconnectedPads: byNet.get(net)!.map((p) => p.ref || '') });
					failedConnections += byNet.get(net)!.length - 1;
					continue;
				}
				const r = this.routeNet(net, byNet.get(net)!);
				connections += byNet.get(net)!.length - 1;
				segments.push(...r.segments);
				vias.push(...r.vias);
				for (const s of r.segments) this.addSeg(s);
				for (const v of r.vias) this.addVia(v);
				if (r.unconnected.length) {
					failed.push({ net, unconnectedPads: r.unconnected });
					failedConnections += r.unconnected.length;
				} else routed.push(net);
			}
			const lengthMm = segments.reduce((s, x) => s + Math.hypot(x.x2 - x.x1, x.y2 - x.y1), 0);
			const res: RouterResult = {
				segments,
				vias,
				routed,
				failed,
				stats: { nets: order.length, connections, failedConnections, ms: Date.now() - t0, passes: pass + 1, grid: this.g, vias: vias.length, lengthMm: Math.round(lengthMm * 10) / 10 },
			};
			if (!best || failedConnections < best.stats.failedConnections || (failedConnections === best.stats.failedConnections && vias.length < best.stats.vias)) best = res;
			if (!failed.length || Date.now() - t0 > this.rules.timeLimitMs) break;
			// rip-up & reroute: failed nets first next pass
			const f = new Set(failed.map((x) => x.net));
			order = [...order.filter((n) => f.has(n)), ...order.filter((n) => !f.has(n))];
		}
		best!.stats.ms = Date.now() - t0;
		return best!;
	}

	private routeNet(net: string, pads: RPad[]) {
		const n = this.id(net);
		const width = this.rules.netWidths[net] ?? this.rules.track;
		const extra = Math.max(0, (width - this.rules.track) / 2);
		// conservative disks (+ half a grid cell) so rounding never eats into clearance
		const wideOffsets = extra > 1e-9 ? this.offsets(extra + this.g * 0.5) : null;
		const viaOffsets = this.offsets(Math.max(0, this.rules.viaDiameter / 2 - this.rules.track / 2) + this.g * 0.5);
		const segments: RSeg[] = [];
		const vias: RVia[] = [];
		// cells covered by each pad (where a track may terminate)
		const padCells = pads.map((p) => this.padCells(p, n));
		// tree: cells (layer*N + k) already connected
		const N = this.W * this.H;
		const tree = new Set<number>();
		// start with the pad that has the most cells reachable, nearest to centroid
		const cxm = pads.reduce((s, p) => s + p.x, 0) / pads.length,
			cym = pads.reduce((s, p) => s + p.y, 0) / pads.length;
		const idx = pads.map((_, i) => i).sort((a, b) => Math.hypot(pads[a].x - cxm, pads[a].y - cym) - Math.hypot(pads[b].x - cxm, pads[b].y - cym));
		const first = idx.find((i) => padCells[i].length) ?? idx[0];
		for (const c of padCells[first]) tree.add(c);
		// Existing copper of this net (hand-drawn tracks, vias) is part of the tree: pads it already
		// reaches are NOT routed again, and new connections T into it. This prevents duplicate routes.
		const existing = this.input.tracks.filter((t) => t.net === net);
		const existingVias = this.input.vias.filter((v) => v.net === net);
		if (existing.length || existingVias.length) {
			const cellsOf: Set<number>[] = [];
			const addCells = (set: Set<number>, l: number, x1: number, y1: number, x2: number, y2: number) => {
				const len = Math.hypot(x2 - x1, y2 - y1);
				const n2 = Math.max(1, Math.ceil(len / (this.g * 0.5)));
				for (let k = 0; k <= n2; k++) {
					const x = x1 + ((x2 - x1) * k) / n2,
						y = y1 + ((y2 - y1) * k) / n2;
					const i = this.ci(x),
						j = this.cj(y);
					if (i >= 0 && j >= 0 && i < this.W && j < this.H) set.add(l * N + j * this.W + i);
				}
			};
			// group existing copper into electrically connected clusters (segments touching or via-linked)
			const items: { cells: Set<number>; segs: RSeg[]; vias: RVia[] }[] = [];
			for (const t of existing) {
				const c = new Set<number>();
				addCells(c, t.layer, t.x1, t.y1, t.x2, t.y2);
				items.push({ cells: c, segs: [t], vias: [] });
			}
			for (const v of existingVias) {
				const c = new Set<number>();
				for (let l = 0; l < this.L; l++) addCells(c, l, v.x, v.y, v.x, v.y);
				items.push({ cells: c, segs: [], vias: [v] });
			}
			// all copper of the net is added to the tree; connected-ness to the first pad is decided below
			for (const it of items) for (const c of it.cells) tree.add(c);
			void cellsOf;
			// a pad counts as already connected only if it touches this copper AND that copper links to the first pad
			// (flood fill over touching copper starting from the first pad's cells)
			const pool = new Set(tree);
			const allPadCells = new Set<number>(padCells.flat());
			const reach = new Set<number>();
			const queue: number[] = [];
			for (const c of padCells[first]) {
				reach.add(c);
				queue.push(c);
			}
			while (queue.length) {
				const c = queue.pop()!;
				const l = Math.floor(c / N),
					k = c % N;
				const i = k % this.W,
					j = (k / this.W) | 0;
				const nbrs: number[] = [];
				for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) {
					const ii = i + di,
						jj = j + dj;
					if (ii >= 0 && jj >= 0 && ii < this.W && jj < this.H) nbrs.push(l * N + jj * this.W + ii);
				}
				for (let l2 = 0; l2 < this.L; l2++) if (l2 !== l) nbrs.push(l2 * N + k); // via links layers
				for (const nb of nbrs) {
					if (reach.has(nb)) continue;
					const isVia = Math.floor(nb / N) !== l;
					if (isVia && !existingVias.some((v) => this.ci(v.x) === i && this.cj(v.y) === j)) continue;
					if (pool.has(nb) || allPadCells.has(nb)) {
						reach.add(nb);
						queue.push(nb);
					}
				}
			}
			// tree = only copper actually connected to the first pad; islands are routed to it like unrouted pads
			tree.clear();
			for (const c of reach) tree.add(c);
		}
		const remaining = idx.filter((i) => i !== first);
		const unconnected: string[] = [];
		while (remaining.length) {
			// nearest pad to tree bbox
			const tb = this.treeBBox(tree);
			remaining.sort((a, b) => bboxDist(pads[a], tb) - bboxDist(pads[b], tb));
			const pi = remaining.shift()!;
			if (!padCells[pi].length) {
				unconnected.push(pads[pi].ref || `${net}@${pads[pi].x},${pads[pi].y}`);
				continue;
			}
			if (padCells[pi].some((c) => tree.has(c))) continue;
			const path = this.astar(padCells[pi], tree, n, wideOffsets, viaOffsets, tb);
			if (!path) {
				unconnected.push(pads[pi].ref || `${net}@${pads[pi].x},${pads[pi].y}`);
				continue;
			}
			// convert path → segments & vias
			const pts = path.map((s) => ({ l: Math.floor(s / N), k: s % N }));
			let runStart = 0;
			for (let i = 1; i <= pts.length; i++) {
				if (i === pts.length || pts[i].l !== pts[runStart].l) {
					const run = pts.slice(runStart, i);
					const poly = simplify(run.map((p) => [this.cx(p.k % this.W), this.cy((p.k / this.W) | 0)] as [number, number]));
					for (let q = 1; q < poly.length; q++) segments.push({ net, layer: run[0].l, x1: poly[q - 1][0], y1: poly[q - 1][1], x2: poly[q][0], y2: poly[q][1], w: width });
					if (i < pts.length) {
						const k = pts[i].k;
						vias.push({ net, x: this.cx(k % this.W), y: this.cy((k / this.W) | 0), d: this.rules.viaDiameter, hole: this.rules.viaHole });
					}
					runStart = i;
				}
			}
			// commit copper to the grid so later connections of this net can T into it
			for (const s of path) tree.add(s);
			for (const c of padCells[pi]) tree.add(c);
			const newSegs = segments.slice(-1 * segments.length);
			void newSegs;
		}
		return { segments, vias, unconnected };
	}

	private treeBBox(tree: Set<number>) {
		const N = this.W * this.H;
		let minX = Infinity,
			minY = Infinity,
			maxX = -Infinity,
			maxY = -Infinity;
		for (const s of tree) {
			const k = s % N;
			const x = this.cx(k % this.W),
				y = this.cy((k / this.W) | 0);
			if (x < minX) minX = x;
			if (x > maxX) maxX = x;
			if (y < minY) minY = y;
			if (y > maxY) maxY = y;
		}
		return { minX, minY, maxX, maxY };
	}

	/** Grid cells (layer*N + k) inside a pad where this net may start/end. */
	private padCells(p: RPad, n: number): number[] {
		const N = this.W * this.H;
		const out: number[] = [];
		const hw = p.w / 2,
			hh = p.h / 2;
		const a = (-p.rot * Math.PI) / 180;
		const ca = Math.cos(a),
			sa = Math.sin(a);
		const R = Math.hypot(hw, hh);
		const i0 = Math.max(0, this.ci(p.x - R)),
			i1 = Math.min(this.W - 1, this.ci(p.x + R));
		const j0 = Math.max(0, this.cj(p.y - R)),
			j1 = Math.min(this.H - 1, this.cj(p.y + R));
		for (const l of p.layers) {
			if (l >= this.L) continue;
			for (let j = j0; j <= j1; j++)
				for (let i = i0; i <= i1; i++) {
					const dx = this.cx(i) - p.x,
						dy = this.cy(j) - p.y;
					const lx = dx * ca - dy * sa,
						ly = dx * sa + dy * ca;
					if (Math.abs(lx) <= hw * 0.9 && Math.abs(ly) <= hh * 0.9) {
						const k = j * this.W + i;
						const o = this.owner[l][k];
						if (o === n || o === 0) out.push(l * N + k);
					}
				}
			if (!out.length) {
				// tiny pad: use nearest cell to the centre
				const k = this.cj(p.y) * this.W + this.ci(p.x);
				if (this.owner[l]?.[k] === n || this.owner[l]?.[k] === 0) out.push(l * N + k);
			}
		}
		return out;
	}

	private astar(sources: number[], targets: Set<number>, n: number, wide: number[][] | null, viaOff: number[][], tb: { minX: number; minY: number; maxX: number; maxY: number }): number[] | null {
		const N = this.W * this.H;
		const S = N * this.L;
		const g = this.g;
		if (!this.gBuf || this.gBuf.length < S * 8 + 8) {
			this.gBuf = new Float32Array(S * 8 + 8);
			this.cameBuf = new Int32Array(S * 8 + 8);
			this.stampBuf = new Int32Array(S * 8 + 8);
			this.stamp = 0;
		}
		const stamp = ++this.stamp;
		const gArr = this.gBuf,
			cameArr = this.cameBuf!,
			stampArr = this.stampBuf!;
		const G = (i: number) => (stampArr[i] === stamp ? gArr[i] : Infinity);
		const setG = (i: number, v: number, from: number) => {
			stampArr[i] = stamp;
			gArr[i] = v;
			cameArr[i] = from;
		};
		const CAME = (i: number) => (stampArr[i] === stamp ? cameArr[i] : -1);
		const srcSet = new Set(sources);
		const heap = new Heap();
		const h = (k: number) => {
			const x = this.cx(k % this.W),
				y = this.cy((k / this.W) | 0);
			const dx = x < tb.minX ? tb.minX - x : x > tb.maxX ? x - tb.maxX : 0;
			const dy = y < tb.minY ? tb.minY - y : y > tb.maxY ? y - tb.maxY : 0;
			return (Math.max(dx, dy) + (Math.SQRT2 - 1) * Math.min(dx, dy)) / g;
		};
		const passable = (l: number, k: number) => {
			if (!this.inBoard[k]) return false;
			const o = this.owner[l][k];
			if (o !== 0 && o !== n) return false;
			if (wide && !this.diskFree(l, k, n, wide)) return false;
			return true;
		};
		for (const s of sources) {
			setG(s * 8, 0, -1);
			heap.push(s * 8, h(s % N));
		}
		let expansions = 0;
		const maxExp = 3_000_000;
		while (heap.size) {
			const cur = heap.pop()!;
			const s = (cur / 8) | 0,
				dir = cur % 8;
			const gc = G(cur);
			if (targets.has(s) && !srcSet.has(s)) {
				const path = [s];
				let c = cur;
				while (CAME(c) >= 0) {
					c = CAME(c);
					const ss = (c / 8) | 0;
					if (path[path.length - 1] !== ss) path.push(ss);
				}
				return path.reverse();
			}
			if (++expansions > maxExp) return null;
			const l = (s / N) | 0,
				k = s % N;
			const i = k % this.W,
				j = (k / this.W) | 0;
			for (let d = 0; d < 8; d++) {
				const [di, dj, len] = DIR8[d];
				const ii = i + di,
					jj = j + dj;
				if (ii < 0 || jj < 0 || ii >= this.W || jj >= this.H) continue;
				const nk = jj * this.W + ii;
				if (!passable(l, nk)) continue;
				if (di && dj) {
					// diagonal: both orthogonal neighbours must be passable to avoid corner-cutting through copper
					if (!passable(l, j * this.W + ii) || !passable(l, jj * this.W + i)) continue;
				}
				let cost = len;
				if (d !== dir && gc > 0) cost += this.rules.bendCost * (sharpTurn(dir, d) ? 3 : 1);
				if (this.rules.preferredDirections && this.L > 1) {
					// top prefers horizontal, bottom vertical
					if ((l === 0 && di === 0) || (l === 1 && dj === 0)) cost *= 1.25;
				}
				const ns = l * N + nk;
				const st = ns * 8 + d;
				const ng = gc + cost;
				if (ng < G(st)) {
					setG(st, ng, cur);
					heap.push(st, ng + h(nk));
				}
			}
			// via
			if (this.L > 1 && !this.noVia[k] && this.diskFree(0, k, n, viaOff) && this.diskFree(1, k, n, viaOff)) {
				const nl = 1 - l;
				const ns = nl * N + k;
				const st = ns * 8 + dir;
				const ng = gc + this.rules.viaCost;
				if (ng < G(st)) {
					setG(st, ng, cur);
					heap.push(st, ng + h(k));
				}
			}
		}
		return null;
	}
}

function sharpTurn(a: number, b: number) {
	const va = DIR8[a],
		vb = DIR8[b];
	const dot = va[0] * vb[0] + va[1] * vb[1];
	return dot <= 0; // 90° or sharper
}

export function segDist(px: number, py: number, x1: number, y1: number, x2: number, y2: number) {
	const dx = x2 - x1,
		dy = y2 - y1;
	const L2 = dx * dx + dy * dy;
	let t = L2 ? ((px - x1) * dx + (py - y1) * dy) / L2 : 0;
	t = Math.max(0, Math.min(1, t));
	return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

function bboxDist(p: { x: number; y: number }, b: { minX: number; minY: number; maxX: number; maxY: number }) {
	const dx = p.x < b.minX ? b.minX - p.x : p.x > b.maxX ? p.x - b.maxX : 0;
	const dy = p.y < b.minY ? b.minY - p.y : p.y > b.maxY ? p.y - b.maxY : 0;
	return dx + dy;
}

export function pointInPoly(x: number, y: number, poly: [number, number][]) {
	let inside = false;
	for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
		const [xi, yi] = poly[i],
			[xj, yj] = poly[j];
		if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
	}
	return inside;
}
function distToPoly(x: number, y: number, poly: [number, number][]) {
	let d = Infinity;
	for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) d = Math.min(d, segDist(x, y, poly[j][0], poly[j][1], poly[i][0], poly[i][1]));
	return d;
}

export function simplify(pts: [number, number][]): [number, number][] {
	const out: [number, number][] = [];
	for (const p of pts) {
		if (out.length >= 2) {
			const a = out[out.length - 2],
				b = out[out.length - 1];
			const cross = (b[0] - a[0]) * (p[1] - b[1]) - (b[1] - a[1]) * (p[0] - b[0]);
			if (Math.abs(cross) < 1e-9) {
				out[out.length - 1] = p;
				continue;
			}
		}
		out.push(p);
	}
	return out;
}

class Heap {
	private k: number[] = [];
	private p: number[] = [];
	get size() {
		return this.k.length;
	}
	push(key: number, pri: number) {
		const k = this.k,
			p = this.p;
		k.push(key);
		p.push(pri);
		let i = k.length - 1;
		while (i > 0) {
			const par = (i - 1) >> 1;
			if (p[par] <= p[i]) break;
			[k[par], k[i]] = [k[i], k[par]];
			[p[par], p[i]] = [p[i], p[par]];
			i = par;
		}
	}
	pop() {
		const k = this.k,
			p = this.p;
		if (!k.length) return undefined;
		const top = k[0];
		const lk = k.pop()!,
			lp = p.pop()!;
		if (k.length) {
			k[0] = lk;
			p[0] = lp;
			let i = 0;
			for (;;) {
				const l = 2 * i + 1,
					r = l + 1;
				let m = i;
				if (l < k.length && p[l] < p[m]) m = l;
				if (r < k.length && p[r] < p[m]) m = r;
				if (m === i) break;
				[k[m], k[i]] = [k[i], k[m]];
				[p[m], p[i]] = [p[i], p[m]];
				i = m;
			}
		}
		return top;
	}
}
