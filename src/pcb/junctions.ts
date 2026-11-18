/*
 * EasyEDA's connectivity is endpoint based: a track end (or via) sitting in the MIDDLE of another
 * track does not count as connected unless that track is split there. This splits every same-net
 * segment at every T-junction point so EasyEDA sees exactly what the copper shows.
 */
import { segDist, type RSeg, type RVia } from './router.js';

export interface SplitResult {
	segments: (RSeg & { id?: string })[];
	replaced: string[]; // ids of existing tracks that were split (delete them, create the pieces)
	splits: number;
}

export function normalizeJunctions(segs: (RSeg & { id?: string })[], vias: RVia[], eps = 1e-3): SplitResult {
	const out: (RSeg & { id?: string })[] = [];
	const replaced: string[] = [];
	let splits = 0;
	for (const s of segs) {
		const pts: { t: number; x: number; y: number }[] = [];
		const L = Math.hypot(s.x2 - s.x1, s.y2 - s.y1);
		if (L < eps) continue;
		const consider = (x: number, y: number) => {
			if (segDist(x, y, s.x1, s.y1, s.x2, s.y2) > eps) return;
			const t = ((x - s.x1) * (s.x2 - s.x1) + (y - s.y1) * (s.y2 - s.y1)) / (L * L);
			if (t * L > eps && (1 - t) * L > eps) pts.push({ t, x, y });
		};
		for (const o of segs) {
			if (o === s || o.net !== s.net || o.layer !== s.layer) continue;
			consider(o.x1, o.y1);
			consider(o.x2, o.y2);
		}
		for (const v of vias) if (v.net === s.net) consider(v.x, v.y);
		if (!pts.length) {
			out.push(s);
			continue;
		}
		pts.sort((a, b) => a.t - b.t);
		const uniq = pts.filter((p, i) => i === 0 || (p.t - pts[i - 1].t) * L > eps);
		let px = s.x1,
			py = s.y1;
		for (const p of uniq) {
			out.push({ ...s, id: undefined, x1: px, y1: py, x2: p.x, y2: p.y });
			px = p.x;
			py = p.y;
		}
		out.push({ ...s, id: undefined, x1: px, y1: py, x2: s.x2, y2: s.y2 });
		splits += uniq.length;
		if (s.id) replaced.push(s.id);
	}
	return { segments: out, replaced, splits };
}
