/*
 * PCB auto-placer (mm units).
 * 1) constructive: big parts first near the centre, every next part at the free spot that minimises
 *    weighted half-perimeter wire length to already placed parts (tries 4 rotations);
 * 2) simulated annealing: shift / swap / rotate moves, never accepting overlaps or off-board positions.
 * Net weights: 2-pin nets ×2 (decoupling, series parts end up tight), large nets (GND / power) ×0.15.
 */

export interface PComp {
	ref: string;
	w: number; // footprint extent at rotation 0 (incl. courtyard margin)
	h: number;
	cx: number; // offset of the bbox centre from the component origin at rotation 0
	cy: number;
	x: number;
	y: number;
	rot: number;
	fixed?: boolean;
	edge?: boolean; // keep against a board edge (connectors)
	pads: { net: string; dx: number; dy: number }[]; // pad offsets from origin at rotation 0
}

export interface PlaceOptions {
	board: { minX: number; minY: number; maxX: number; maxY: number };
	spacing?: number;
	iterations?: number;
	grid?: number;
	seed?: number;
	rotate?: boolean;
	edgeMargin?: number;
}

const rotPt = (dx: number, dy: number, rot: number): [number, number] => {
	const r = (((Math.round(rot / 90) % 4) + 4) % 4) as 0 | 1 | 2 | 3;
	return r === 0 ? [dx, dy] : r === 1 ? [-dy, dx] : r === 2 ? [-dx, -dy] : [dy, -dx];
};

function rng(seed: number) {
	let s = seed >>> 0 || 1;
	return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

export function place(comps: PComp[], opts: PlaceOptions) {
	const sp = opts.spacing ?? 0.6;
	const grid = opts.grid ?? 0.25;
	const B = opts.board;
	const edgeM = opts.edgeMargin ?? 0.5;
	const rand = rng(opts.seed ?? 7);
	const nets = new Map<string, number[]>();
	comps.forEach((c, i) => c.pads.forEach((p) => p.net && (nets.get(p.net) || nets.set(p.net, []).get(p.net)!).push(i)));
	const weight = new Map<string, number>();
	for (const [n, members] of nets) {
		const k = new Set(members).size;
		weight.set(n, n.startsWith('__dec_') ? 5 : k <= 1 ? 0 : k === 2 ? 2 : k > 8 ? 0.15 : 1 / (k - 1));
	}
	const compNets = comps.map((c) => [...new Set(c.pads.map((p) => p.net).filter((n) => n && (weight.get(n) ?? 0) > 0))]);

	const box = (c: PComp, x = c.x, y = c.y, rot = c.rot) => {
		const [ox, oy] = rotPt(c.cx, c.cy, rot);
		const swap = Math.round(rot / 90) % 2 !== 0;
		const w = swap ? c.h : c.w,
			h = swap ? c.w : c.h;
		return { minX: x + ox - w / 2, maxX: x + ox + w / 2, minY: y + oy - h / 2, maxY: y + oy + h / 2 };
	};
	const placed = new Array(comps.length).fill(false);
	const overlaps = (i: number, x: number, y: number, rot: number) => {
		const a = box(comps[i], x, y, rot);
		if (a.minX < B.minX + edgeM || a.maxX > B.maxX - edgeM || a.minY < B.minY + edgeM || a.maxY > B.maxY - edgeM) return true;
		for (let j = 0; j < comps.length; j++) {
			if (j === i || !placed[j]) continue;
			const b = box(comps[j]);
			if (a.minX < b.maxX + sp && a.maxX > b.minX - sp && a.minY < b.maxY + sp && a.maxY > b.minY - sp) return true;
		}
		return false;
	};
	const pinPos = (i: number, p: { dx: number; dy: number }, x = comps[i].x, y = comps[i].y, rot = comps[i].rot) => {
		const [dx, dy] = rotPt(p.dx, p.dy, rot);
		return [x + dx, y + dy];
	};
	const netCost = (n: string, override?: { i: number; x: number; y: number; rot: number }) => {
		let minX = Infinity,
			maxX = -Infinity,
			minY = Infinity,
			maxY = -Infinity,
			cnt = 0;
		for (const i of new Set(nets.get(n)!)) {
			if (!placed[i] && !(override && override.i === i)) continue;
			for (const p of comps[i].pads) {
				if (p.net !== n) continue;
				const [x, y] = override && override.i === i ? pinPos(i, p, override.x, override.y, override.rot) : pinPos(i, p);
				minX = Math.min(minX, x);
				maxX = Math.max(maxX, x);
				minY = Math.min(minY, y);
				maxY = Math.max(maxY, y);
				cnt++;
			}
		}
		return cnt < 2 ? 0 : (maxX - minX + maxY - minY) * (weight.get(n) ?? 0);
	};
	const edgeCost = (i: number, x: number, y: number, rot: number) => {
		if (!comps[i].edge) return 0;
		const b = box(comps[i], x, y, rot);
		return 3 * Math.min(b.minX - B.minX, B.maxX - b.maxX, b.minY - B.minY, B.maxY - b.maxY);
	};
	const compCost = (i: number, x: number, y: number, rot: number) => compNets[i].reduce((s, n) => s + netCost(n, { i, x, y, rot }), 0) + edgeCost(i, x, y, rot);

	// ---- constructive ----
	comps.forEach((c, i) => {
		if (c.fixed) placed[i] = true;
	});
	const order = comps
		.map((_, i) => i)
		.filter((i) => !comps[i].fixed)
		.sort((a, b) => comps[b].pads.length * comps[b].w * comps[b].h - comps[a].pads.length * comps[a].w * comps[a].h);
	const cxB = (B.minX + B.maxX) / 2,
		cyB = (B.minY + B.maxY) / 2;
	const rots = opts.rotate === false ? [0] : [0, 90, 180, 270];
	for (const i of order) {
		const c = comps[i];
		// anchor: centroid of connected placed pads, else board centre
		let ax = 0,
			ay = 0,
			an = 0;
		for (const n of compNets[i])
			for (const j of new Set(nets.get(n)!))
				if (placed[j] && j !== i)
					for (const p of comps[j].pads)
						if (p.net === n) {
							const [x, y] = pinPos(j, p);
							const w = weight.get(n) ?? 0;
							ax += x * w;
							ay += y * w;
							an += w;
						}
		if (an) {
			ax /= an;
			ay /= an;
		} else {
			ax = cxB;
			ay = cyB;
		}
		if (c.edge) {
			// pull connectors toward the nearest edge from the anchor
			const d = [ax - B.minX, B.maxX - ax, ay - B.minY, B.maxY - ay];
			const m = d.indexOf(Math.min(...d));
			if (m === 0) ax = B.minX;
			else if (m === 1) ax = B.maxX;
			else if (m === 2) ay = B.minY;
			else ay = B.maxY;
		}
		let best: { x: number; y: number; rot: number; cost: number } | null = null;
		const maxR = Math.max(B.maxX - B.minX, B.maxY - B.minY);
		for (let r = 0; r <= maxR && (!best || r < 6); r += grid * 2) {
			const ring: [number, number][] = [];
			if (r === 0) ring.push([0, 0]);
			else {
				const steps = Math.max(8, Math.ceil((2 * Math.PI * r) / (grid * 2)));
				for (let s = 0; s < steps; s++) ring.push([r * Math.cos((2 * Math.PI * s) / steps), r * Math.sin((2 * Math.PI * s) / steps)]);
			}
			for (const [dx, dy] of ring) {
				const x = snap(ax + dx, grid),
					y = snap(ay + dy, grid);
				for (const rot of rots) {
					if (overlaps(i, x, y, rot)) continue;
					const cost = compCost(i, x, y, rot) + 0.02 * Math.hypot(x - ax, y - ay);
					if (!best || cost < best.cost) best = { x, y, rot, cost };
				}
			}
		}
		if (best) {
			c.x = best.x;
			c.y = best.y;
			c.rot = best.rot;
			placed[i] = true;
		}
	}
	const unplaced = comps.filter((_, i) => !placed[i]).map((c) => c.ref);

	// ---- annealing ----
	const movable = order.filter((i) => placed[i]);
	const total = () => [...nets.keys()].reduce((s, n) => s + netCost(n), 0) + comps.reduce((s, c, i) => s + edgeCost(i, c.x, c.y, c.rot), 0);
	let cost = total();
	const startCost = cost;
	const iters = opts.iterations ?? Math.min(60000, 1500 * movable.length);
	let T = Math.max(1, cost / Math.max(1, movable.length) / 4);
	for (let it = 0; it < iters && movable.length; it++) {
		const i = movable[Math.floor(rand() * movable.length)];
		const c = comps[i];
		const old = { x: c.x, y: c.y, rot: c.rot };
		const before = compCost(i, c.x, c.y, c.rot);
		const kind = rand();
		if (kind < 0.15 && movable.length > 1) {
			// swap with a similar-sized part
			const j = movable[Math.floor(rand() * movable.length)];
			if (j === i || Math.abs(comps[j].w * comps[j].h - c.w * c.h) > 0.5 * c.w * c.h) continue;
			const cj = comps[j];
			const oldj = { x: cj.x, y: cj.y };
			const b2 = before + compCost(j, cj.x, cj.y, cj.rot);
			placed[i] = placed[j] = false;
			const okI = !overlaps(i, oldj.x, oldj.y, c.rot);
			c.x = oldj.x;
			c.y = oldj.y;
			placed[i] = true;
			const okJ = okI && !overlaps(j, old.x, old.y, cj.rot);
			placed[j] = true;
			if (!okI || !okJ) {
				c.x = old.x;
				c.y = old.y;
				continue;
			}
			cj.x = old.x;
			cj.y = old.y;
			const after = compCost(i, c.x, c.y, c.rot) + compCost(j, cj.x, cj.y, cj.rot);
			if (after > b2 && rand() > Math.exp((b2 - after) / T)) {
				cj.x = oldj.x;
				cj.y = oldj.y;
				c.x = old.x;
				c.y = old.y;
			} else cost += after - b2;
		} else {
			const range = Math.max(grid, T * 0.5 + 3 * (1 - it / iters));
			const nx = snap(c.x + (rand() * 2 - 1) * range, grid),
				ny = snap(c.y + (rand() * 2 - 1) * range, grid);
			const nrot = kind > 0.85 && opts.rotate !== false ? (c.rot + 90 * (1 + Math.floor(rand() * 3))) % 360 : c.rot;
			placed[i] = false;
			const bad = overlaps(i, nx, ny, nrot);
			placed[i] = true;
			if (bad) continue;
			const after = compCost(i, nx, ny, nrot);
			if (after <= before || rand() < Math.exp((before - after) / T)) {
				c.x = nx;
				c.y = ny;
				c.rot = nrot;
				cost += after - before;
			}
		}
		if (it % 200 === 0) T *= 0.95;
	}
	return { comps, unplaced, hpwlBefore: Math.round(startCost * 10) / 10, hpwlAfter: Math.round(total() * 10) / 10 };
}

const snap = (v: number, g: number) => Math.round(v / g) * g;
