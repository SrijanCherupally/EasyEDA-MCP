/*
 * Orthogonal schematic wire router (A* on a grid).
 *
 * Rules that keep schematics readable and electrically correct:
 *  - wires never enter part bodies or run along pin stubs;
 *  - wires never overlap or touch a wire/pin of a different net (that would short it);
 *  - perpendicular crossings of other nets are allowed but penalised;
 *  - wires leave a pin in the pin's own direction and avoid needless bends;
 *  - multi-pin nets are grown as a tree that may T-join its own wires.
 */
import type { SchComp, SchState, Seg, Pt } from './connectivity.js';

export interface RouteRequest {
	net: string;
	pins: string[]; // refs like "U1.3"
}
export interface RouteOptions {
	grid?: number;
	bounds?: { minX: number; minY: number; maxX: number; maxY: number };
	bendCost?: number;
	crossCost?: number;
	clearanceCost?: number;
	maxExpansions?: number;
	stub?: number; // minimum straight run out of a pin
}
export interface RoutedNet {
	net: string;
	polylines: Pt[][];
	failed: string[]; // pins that could not be reached
	crossings: number;
	length: number;
}

const here0 = (n: NodeInfo | undefined) => !!n;
const DIRS: Pt[] = [
	[1, 0],
	[0, 1],
	[-1, 0],
	[0, -1],
];

/** Outward unit vector of a pin from its rotation (0 = +x, 90 = +y, Y axis up). */
export function pinOutward(rotation: number | undefined): Pt {
	const r = (((Math.round((rotation ?? 0) / 90) * 90) % 360) + 360) % 360;
	return r === 0 ? [1, 0] : r === 90 ? [0, 1] : r === 180 ? [-1, 0] : [0, -1];
}

interface NodeInfo {
	blocked?: boolean;
	pinNet?: string; // a pin end sits here (net name or "?" unknown)
	near?: number; // proximity to bodies (extra cost)
	h?: Set<string>; // nets with a horizontal wire through this node
	v?: Set<string>;
	ends?: Set<string>; // nets with a wire endpoint / bend / junction here
}

export class SchRouter {
	g: number;
	b: { minX: number; minY: number; maxX: number; maxY: number };
	nodes = new Map<number, NodeInfo>();
	W: number;
	H: number;
	opts: Required<Omit<RouteOptions, 'bounds'>>;
	pins = new Map<string, { x: number; y: number; rot: number; comp: SchComp }>();
	pinNetOf = new Map<string, string>();

	constructor(
		private state: SchState,
		opts: RouteOptions = {},
		netOfPin: Record<string, string> = {},
	) {
		this.g = opts.grid ?? 5;
		this.opts = {
			grid: this.g,
			bendCost: opts.bendCost ?? 6,
			crossCost: opts.crossCost ?? 25,
			clearanceCost: opts.clearanceCost ?? 3,
			maxExpansions: opts.maxExpansions ?? 400000,
			stub: opts.stub ?? 10,
		};
		// bounds: sheet or all content + margin
		let b = opts.bounds;
		if (!b) {
			let minX = Infinity,
				minY = Infinity,
				maxX = -Infinity,
				maxY = -Infinity;
			for (const c of state.components) {
				const bb = c.bbox ?? { minX: c.x, minY: c.y, maxX: c.x, maxY: c.y };
				minX = Math.min(minX, bb.minX);
				minY = Math.min(minY, bb.minY);
				maxX = Math.max(maxX, bb.maxX);
				maxY = Math.max(maxY, bb.maxY);
				for (const p of c.pins) {
					minX = Math.min(minX, p.x);
					minY = Math.min(minY, p.y);
					maxX = Math.max(maxX, p.x);
					maxY = Math.max(maxY, p.y);
				}
			}
			const m = 150;
			b = { minX: minX - m, minY: minY - m, maxX: maxX + m, maxY: maxY + m };
		}
		this.b = { minX: Math.floor(b.minX / this.g) * this.g, minY: Math.floor(b.minY / this.g) * this.g, maxX: Math.ceil(b.maxX / this.g) * this.g, maxY: Math.ceil(b.maxY / this.g) * this.g };
		this.W = Math.round((this.b.maxX - this.b.minX) / this.g) + 1;
		this.H = Math.round((this.b.maxY - this.b.minY) / this.g) + 1;
		for (const [k, v] of Object.entries(netOfPin)) this.pinNetOf.set(k, v);
		this.build();
	}

	key(x: number, y: number) {
		const i = Math.round((x - this.b.minX) / this.g),
			j = Math.round((y - this.b.minY) / this.g);
		return j * this.W + i;
	}
	xy(k: number): Pt {
		return [this.b.minX + (k % this.W) * this.g, this.b.minY + Math.floor(k / this.W) * this.g];
	}
	onGrid(x: number, y: number) {
		return Math.abs(x / this.g - Math.round(x / this.g)) < 1e-6 && Math.abs(y / this.g - Math.round(y / this.g)) < 1e-6;
	}
	info(k: number): NodeInfo {
		let n = this.nodes.get(k);
		if (!n) this.nodes.set(k, (n = {}));
		return n;
	}

	private build() {
		const g = this.g;
		for (const c of this.state.components) {
			if (c.type === 'part' && c.bbox) {
				const bb = c.bbox;
				// body: block everything inside (inclusive of a 1-unit skin)
				for (let x = Math.floor((bb.minX - 1) / g) * g; x <= bb.maxX + 1; x += g)
					for (let y = Math.floor((bb.minY - 1) / g) * g; y <= bb.maxY + 1; y += g) this.info(this.key(x, y)).blocked = true;
				// soft clearance ring
				for (let x = Math.floor((bb.minX - 2 * g) / g) * g; x <= bb.maxX + 2 * g; x += g)
					for (let y = Math.floor((bb.minY - 2 * g) / g) * g; y <= bb.maxY + 2 * g; y += g) {
						const n = this.info(this.key(x, y));
						n.near = (n.near ?? 0) + 1;
					}
			}
			for (const p of c.pins) {
				const ref = p.ref;
				this.pins.set(ref, { x: p.x, y: p.y, rot: p.rotation ?? 0, comp: c });
				const net = c.type !== 'part' ? (c.net ?? '?') : (this.pinNetOf.get(ref) ?? '#' + ref);
				if (c.type !== 'part') this.pinNetOf.set(ref, net);
				// pin stub (from end toward body) is blocked, the end itself is a pin node
				const [ox, oy] = pinOutward(p.rotation);
				const len = (p as any).pinLength ?? 10;
				for (let d = g; d < len - 1e-6; d += g) this.info(this.key(p.x - ox * d, p.y - oy * d)).blocked = true;
				if (this.onGrid(p.x, p.y)) {
					const n = this.info(this.key(p.x, p.y));
					n.pinNet = net;
					n.blocked = false;
				}
			}
		}
		for (const w of this.state.wires) this.addWire(w.net || '#w:' + w.id, w.segs);
	}

	/** Register wire segments as occupied by a net. */
	addWire(net: string, segs: Seg[]) {
		for (const [x1, y1, x2, y2] of segs) {
			const horiz = Math.abs(y1 - y2) < 1e-6;
			const steps = Math.round(Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1)) / this.g);
			for (let s = 0; s <= steps; s++) {
				const x = x1 + (steps ? ((x2 - x1) * s) / steps : 0);
				const y = y1 + (steps ? ((y2 - y1) * s) / steps : 0);
				if (!this.onGrid(x, y)) continue;
				const n = this.info(this.key(x, y));
				if (s === 0 || s === steps) (n.ends ??= new Set()).add(net);
				if (horiz) (n.h ??= new Set()).add(net);
				else (n.v ??= new Set()).add(net);
			}
		}
	}

	/** True if an orthogonal polyline can be drawn for `net` without touching other nets, pins or bodies. */
	pathFree(poly: Pt[], net: string, allowStartOnPin = true): boolean {
		for (let i = 1; i < poly.length; i++) {
			const [x1, y1] = poly[i - 1],
				[x2, y2] = poly[i];
			const steps = Math.round(Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1)) / this.g);
			const horiz = Math.abs(y1 - y2) < 1e-6;
			for (let s = i === 1 && allowStartOnPin ? 1 : 0; s <= steps; s++) {
				const x = x1 + (steps ? ((x2 - x1) * s) / steps : 0),
					y = y1 + (steps ? ((y2 - y1) * s) / steps : 0);
				if (!this.onGrid(x, y)) continue;
				if (x < this.b.minX || x > this.b.maxX || y < this.b.minY || y > this.b.maxY) return false;
				const n = this.nodes.get(this.key(x, y));
				if (!n) continue;
				if (n.blocked) return false;
				if (n.pinNet !== undefined && n.pinNet !== net) return false;
				const same = horiz ? n.h : n.v;
				const perp = horiz ? n.v : n.h;
				for (const set of [same, n.ends]) if (set) for (const k of set) if (k !== net) return false;
				// endpoints / bends must not sit on a perpendicular foreign wire
				const isVertex = s === 0 || s === steps;
				if (isVertex && perp) for (const k of perp) if (k !== net) return false;
			}
		}
		return true;
	}

	/** True if a rectangular area (e.g. a flag symbol + text) is free of foreign copper/pins/bodies. */
	boxFree(b: { minX: number; minY: number; maxX: number; maxY: number }, net: string): boolean {
		for (let x = Math.ceil(b.minX / this.g) * this.g; x <= b.maxX; x += this.g)
			for (let y = Math.ceil(b.minY / this.g) * this.g; y <= b.maxY; y += this.g) {
				const n = this.nodes.get(this.key(x, y));
				if (!n) continue;
				if (n.blocked) return false;
				if (n.pinNet !== undefined && n.pinNet !== net) return false;
				for (const set of [n.h, n.v]) if (set) for (const k of set) if (k !== net) return false;
			}
		return true;
	}

	blockBox(b: { minX: number; minY: number; maxX: number; maxY: number }) {
		for (let x = Math.ceil(b.minX / this.g) * this.g; x <= b.maxX; x += this.g)
			for (let y = Math.ceil(b.minY / this.g) * this.g; y <= b.maxY; y += this.g) this.info(this.key(x, y)).blocked = true;
	}

	/** Route one net; returns polylines to draw. */
	route(req: RouteRequest): RoutedNet {
		const net = req.net;
		const out: RoutedNet = { net, polylines: [], failed: [], crossings: 0, length: 0 };
		const refs = req.pins.filter((r) => this.pins.has(r));
		out.failed.push(...req.pins.filter((r) => !this.pins.has(r)));
		if (refs.length < 2) return out;
		for (const r of refs) {
			const p = this.pins.get(r)!;
			if (this.onGrid(p.x, p.y)) this.info(this.key(p.x, p.y)).pinNet = net;
			this.pinNetOf.set(r, net);
		}
		// order: start from pin nearest centroid, then nearest-first (Prim-like)
		const cx = refs.reduce((s, r) => s + this.pins.get(r)!.x, 0) / refs.length;
		const cy = refs.reduce((s, r) => s + this.pins.get(r)!.y, 0) / refs.length;
		refs.sort((a, b) => dist(this.pins.get(a)!, cx, cy) - dist(this.pins.get(b)!, cx, cy));
		const tree = new Set<number>(); // grid keys belonging to this net's tree
		const first = this.pins.get(refs[0])!;
		tree.add(this.key(first.x, first.y));
		// existing same-net wires are part of the tree
		for (const [k, n] of this.nodes) if (n.h?.has(net) || n.v?.has(net)) tree.add(k);
		const remaining = refs.slice(1);
		while (remaining.length) {
			remaining.sort((a, b) => this.distToTree(this.pins.get(a)!, tree) - this.distToTree(this.pins.get(b)!, tree));
			const ref = remaining.shift()!;
			const p = this.pins.get(ref)!;
			if (tree.has(this.key(p.x, p.y))) continue;
			const path = this.astar(p, tree, net);
			if (!path) {
				out.failed.push(ref);
				continue;
			}
			const poly = simplify(path.map((k) => this.xy(k)));
			out.polylines.push(poly);
			out.crossings += path.reduce((s, k) => s + (this.isForeignWire(k, net) ? 1 : 0), 0);
			for (let i = 1; i < poly.length; i++) out.length += Math.abs(poly[i][0] - poly[i - 1][0]) + Math.abs(poly[i][1] - poly[i - 1][1]);
			const segs: Seg[] = [];
			for (let i = 1; i < poly.length; i++) segs.push([poly[i - 1][0], poly[i - 1][1], poly[i][0], poly[i][1]]);
			this.addWire(net, segs);
			for (const k of path) tree.add(k);
		}
		return out;
	}

	private distToTree(p: { x: number; y: number }, tree: Set<number>) {
		let best = Infinity;
		for (const k of tree) {
			const [x, y] = this.xy(k);
			best = Math.min(best, Math.abs(x - p.x) + Math.abs(y - p.y));
		}
		return best;
	}

	private isForeignWire(k: number, net: string) {
		const n = this.nodes.get(k);
		if (!n) return false;
		for (const s of [n.h, n.v]) if (s) for (const x of s) if (x !== net) return true;
		return false;
	}

	/** A* from a pin to any node in `targets`. State = node*4+dir. */
	private astar(src: { x: number; y: number; rot: number }, targets: Set<number>, net: string): number[] | null {
		const g = this.g;
		if (!this.onGrid(src.x, src.y)) return null;
		const start = this.key(src.x, src.y);
		const out = pinOutward(src.rot);
		const startDir = DIRS.findIndex((d) => d[0] === out[0] && d[1] === out[1]);
		// heuristic: manhattan to nearest target (approx via bbox of targets for speed)
		const tpts = [...targets].map((k) => this.xy(k));
		const h = (k: number) => {
			const [x, y] = this.xy(k);
			let best = Infinity;
			for (const t of tpts) {
				const d = Math.abs(t[0] - x) + Math.abs(t[1] - y);
				if (d < best) best = d;
			}
			return best / g;
		};
		const gScore = new Map<number, number>();
		const came = new Map<number, number>();
		const heap = new MinHeap();
		const s0 = start * 4 + startDir;
		gScore.set(s0, 0);
		heap.push(s0, h(start));
		let expansions = 0;
		const W = this.W,
			H = this.H;
		while (heap.size) {
			const cur = heap.pop()!;
			const node = Math.floor(cur / 4),
				dir = cur % 4;
			const gc = gScore.get(cur)!;
			if (node !== start && targets.has(node) && !(here0(this.nodes.get(node)) && this.foreignAt(this.nodes.get(node)!, net))) {
				// arriving at a target pin must be along its inward direction
				return this.reconstruct(came, cur).map((s) => Math.floor(s / 4));
			}
			if (++expansions > this.opts.maxExpansions) break;
			const [x, y] = this.xy(node);
			const here = this.nodes.get(node);
			const foreignHere = node !== start && here && this.foreignAt(here, net);
			const steps = gc; // unused
			void steps;
			for (let nd = 0; nd < 4; nd++) {
				if (nd === (dir + 2) % 4) continue; // no reversing
				const turning = nd !== dir;
				if (node === start && gc < this.opts.stub / g && turning) continue; // leave the pin straight
				if (turning && foreignHere) continue; // never bend on top of another net's wire
				const nx = x + DIRS[nd][0] * g,
					ny = y + DIRS[nd][1] * g;
				const i = Math.round((nx - this.b.minX) / g),
					j = Math.round((ny - this.b.minY) / g);
				if (i < 0 || j < 0 || i >= W || j >= H) continue;
				const nk = j * W + i;
				const ni = this.nodes.get(nk);
				let cost = 1;
				if (ni) {
					if (ni.blocked) continue;
					if (ni.pinNet !== undefined && ni.pinNet !== net && !targets.has(nk)) continue; // foreign pin
					const horiz = nd % 2 === 0;
					const same = horiz ? ni.h : ni.v;
					const perp = horiz ? ni.v : ni.h;
					if (same) for (const n of same) if (n !== net) cost = Infinity; // collinear overlap with another net
					if (cost === Infinity) continue;
					if (ni.ends) for (const n of ni.ends) if (n !== net) cost = Infinity; // would touch another net's endpoint
					if (cost === Infinity) continue;
					if (perp) for (const n of perp) if (n !== net) cost += this.opts.crossCost;
					if (ni.near) cost += this.opts.clearanceCost * Math.min(ni.near, 2);
					if (targets.has(nk) && ni.pinNet === net) {
						// entering a target pin: must come in against its outward direction
						const tp = this.pinAtKey(nk);
						if (tp) {
							const o = pinOutward(tp.rot);
							if (!(DIRS[nd][0] === -o[0] && DIRS[nd][1] === -o[1])) continue;
						}
					}
				}
				if (turning) cost += this.opts.bendCost;
				const ns = nk * 4 + nd;
				const ng = gc + cost;
				if (ng < (gScore.get(ns) ?? Infinity)) {
					gScore.set(ns, ng);
					came.set(ns, cur);
					heap.push(ns, ng + h(nk));
				}
			}
		}
		return null;
	}

	private foreignAt(n: NodeInfo, net: string) {
		for (const s of [n.h, n.v]) if (s) for (const x of s) if (x !== net) return true;
		return false;
	}

	private pinAtKey(k: number) {
		const [x, y] = this.xy(k);
		for (const p of this.pins.values()) if (Math.abs(p.x - x) < 1e-6 && Math.abs(p.y - y) < 1e-6 && p.comp.type === 'part') return p;
		return undefined;
	}

	private reconstruct(came: Map<number, number>, end: number): number[] {
		const path = [end];
		let c = end;
		while (came.has(c)) {
			c = came.get(c)!;
			path.push(c);
		}
		return path.reverse();
	}
}

function dist(p: { x: number; y: number }, x: number, y: number) {
	return Math.abs(p.x - x) + Math.abs(p.y - y);
}

export function simplify(pts: Pt[]): Pt[] {
	const out: Pt[] = [];
	for (const p of pts) {
		if (out.length >= 2) {
			const a = out[out.length - 2],
				b = out[out.length - 1];
			if ((a[0] === b[0] && b[0] === p[0]) || (a[1] === b[1] && b[1] === p[1])) {
				out[out.length - 1] = p;
				continue;
			}
		}
		if (!out.length || out[out.length - 1][0] !== p[0] || out[out.length - 1][1] !== p[1]) out.push(p);
	}
	return out;
}

class MinHeap {
	private k: number[] = [];
	private p: number[] = [];
	get size() {
		return this.k.length;
	}
	push(key: number, pri: number) {
		this.k.push(key);
		this.p.push(pri);
		let i = this.k.length - 1;
		while (i > 0) {
			const par = (i - 1) >> 1;
			if (this.p[par] <= this.p[i]) break;
			[this.k[par], this.k[i]] = [this.k[i], this.k[par]];
			[this.p[par], this.p[i]] = [this.p[i], this.p[par]];
			i = par;
		}
	}
	pop(): number | undefined {
		if (!this.k.length) return undefined;
		const top = this.k[0];
		const lk = this.k.pop()!,
			lp = this.p.pop()!;
		if (this.k.length) {
			this.k[0] = lk;
			this.p[0] = lp;
			let i = 0;
			for (;;) {
				const l = 2 * i + 1,
					r = l + 1;
				let m = i;
				if (l < this.k.length && this.p[l] < this.p[m]) m = l;
				if (r < this.k.length && this.p[r] < this.p[m]) m = r;
				if (m === i) break;
				[this.k[m], this.k[i]] = [this.k[i], this.k[m]];
				[this.p[m], this.p[i]] = [this.p[i], this.p[m]];
				i = m;
			}
		}
		return top;
	}
}
