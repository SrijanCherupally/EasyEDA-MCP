/*
 * Data-driven renderers: build an SVG of the schematic or PCB from primitive data, so we can look at
 * the design without touching the user's window (EasyEDA does not repaint while hidden, and bringing
 * it forward is disruptive). The SVG is rasterised to PNG inside the EasyEDA page (works hidden).
 */
import { pinOutward } from '../sch/router.js';
import type { SchState } from '../sch/connectivity.js';

const esc = (s: any) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

export interface Region {
	minX: number;
	minY: number;
	maxX: number;
	maxY: number;
}

function frame(r: Region, pad: number, maxPx: number) {
	const w = r.maxX - r.minX + 2 * pad,
		h = r.maxY - r.minY + 2 * pad;
	const scale = Math.min(maxPx / w, maxPx / h);
	return { x0: r.minX - pad, y1: r.maxY + pad, w, h, W: Math.round(w * scale), H: Math.round(h * scale), scale };
}

/* ------------------------------ schematic ------------------------------ */

export function schematicSvg(st: SchState & { page?: any; netOfPin?: Record<string, string> }, region?: Region, opts: { maxPx?: number; pad?: number } = {}) {
	const pad = opts.pad ?? 30;
	let r = region;
	if (!r) {
		r = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
		const grow = (x: number, y: number) => {
			r!.minX = Math.min(r!.minX, x);
			r!.minY = Math.min(r!.minY, y);
			r!.maxX = Math.max(r!.maxX, x);
			r!.maxY = Math.max(r!.maxY, y);
		};
		for (const c of st.components) {
			if (c.bbox) {
				grow(c.bbox.minX, c.bbox.minY);
				grow(c.bbox.maxX, c.bbox.maxY);
			}
			for (const p of c.pins) grow(p.x, p.y);
		}
		for (const w of st.wires) for (const s of w.segs) (grow(s[0], s[1]), grow(s[2], s[3]));
		if (!isFinite(r.minX)) r = { minX: 0, minY: 0, maxX: 1170, maxY: 825 };
	}
	const f = frame(r, pad, opts.maxPx ?? 1600);
	const X = (x: number) => x - f.x0;
	const Y = (y: number) => f.y1 - y; // Y up → SVG Y down
	const out: string[] = [];
	out.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${f.W}" height="${f.H}" viewBox="0 0 ${f.w} ${f.h}" font-family="Arial, Helvetica, sans-serif">`);
	out.push(`<rect x="0" y="0" width="${f.w}" height="${f.h}" fill="#fffdf6"/>`);
	// light grid
	const gs = 50;
	out.push(`<g stroke="#ece8dc" stroke-width="0.4">`);
	for (let x = Math.ceil(f.x0 / gs) * gs; x < f.x0 + f.w; x += gs) out.push(`<line x1="${X(x)}" y1="0" x2="${X(x)}" y2="${f.h}"/>`);
	for (let y = Math.ceil((f.y1 - f.h) / gs) * gs; y < f.y1; y += gs) out.push(`<line x1="0" y1="${Y(y)}" x2="${f.w}" y2="${Y(y)}"/>`);
	out.push(`</g>`);
	if (st.page?.width) out.push(`<rect x="${X(0)}" y="${Y(st.page.height)}" width="${st.page.width}" height="${st.page.height}" fill="none" stroke="#b22" stroke-width="1"/>`);

	// section frames and free text (drawn under everything else)
	for (const r of (st as any).graphics?.rects ?? []) {
		const dash = r.lineType === 1 ? ' stroke-dasharray="6 4"' : r.lineType === 2 ? ' stroke-dasharray="1.5 3"' : '';
		out.push(`<rect x="${X(r.x)}" y="${Y(r.y)}" width="${r.w}" height="${r.h}" fill="none" stroke="${r.color || '#7a7aa0'}" stroke-width="1"${dash}/>`);
	}
	for (const t of (st as any).graphics?.texts ?? []) out.push(`<text x="${X(t.x)}" y="${Y(t.y)}" font-size="${t.size || 10}" fill="${t.color || '#333'}"${t.bold ? ' font-weight="bold"' : ''}>${esc(t.text)}</text>`);
	// wires
	const ends = new Map<string, number>();
	const key = (x: number, y: number) => `${Math.round(x * 10)},${Math.round(y * 10)}`;
	out.push(`<g stroke="#1a8a1a" stroke-width="1.3" stroke-linecap="round">`);
	for (const w of st.wires)
		for (const s of w.segs) {
			out.push(`<line x1="${X(s[0])}" y1="${Y(s[1])}" x2="${X(s[2])}" y2="${Y(s[3])}"/>`);
			for (const [x, y] of [
				[s[0], s[1]],
				[s[2], s[3]],
			])
				ends.set(key(x, y), (ends.get(key(x, y)) ?? 0) + 1);
		}
	out.push(`</g>`);
	// junction dots: 3+ wire ends, or a wire end on another wire's interior
	const allSegs = st.wires.flatMap((w) => w.segs);
	const dots = new Set<string>();
	for (const [k, n] of ends) if (n >= 3) dots.add(k);
	for (const s of allSegs)
		for (const [x, y] of [
			[s[0], s[1]],
			[s[2], s[3]],
		])
			for (const t of allSegs) {
				if (t === s) continue;
				const onH = Math.abs(t[1] - t[3]) < 0.01 && Math.abs(y - t[1]) < 0.01 && x > Math.min(t[0], t[2]) + 0.01 && x < Math.max(t[0], t[2]) - 0.01;
				const onV = Math.abs(t[0] - t[2]) < 0.01 && Math.abs(x - t[0]) < 0.01 && y > Math.min(t[1], t[3]) + 0.01 && y < Math.max(t[1], t[3]) - 0.01;
				if (onH || onV) dots.add(key(x, y));
			}
	for (const d of dots) {
		const [x, y] = d.split(',').map((v) => Number(v) / 10);
		out.push(`<circle cx="${X(x)}" cy="${Y(y)}" r="2.6" fill="#c00"/>`);
	}
	// net labels on named wires (one per wire, at its first segment end)
	for (const w of st.wires) {
		if (!w.net || !w.segs.length) continue;
		const s = w.segs[0];
		const horiz = Math.abs(s[1] - s[3]) < 0.01;
		const x = horiz ? Math.min(s[0], s[2]) + 2 : s[0] - 2;
		const y = horiz ? s[1] + 2 : Math.max(s[1], s[3]) - 2;
		out.push(horiz ? `<text x="${X(x)}" y="${Y(y)}" font-size="8" fill="#1a3fd4">${esc(w.net)}</text>` : `<text x="${X(x)}" y="${Y(y)}" font-size="8" fill="#1a3fd4" transform="rotate(-90 ${X(x)} ${Y(y)})" text-anchor="end">${esc(w.net)}</text>`);
	}

	for (const c of st.components) {
		if (c.type === 'part') {
			const bb = c.bbox;
			if (bb) out.push(`<rect x="${X(bb.minX)}" y="${Y(bb.maxY)}" width="${bb.maxX - bb.minX}" height="${bb.maxY - bb.minY}" fill="#fff6e0" stroke="#a01818" stroke-width="1.1"/>`);
			for (const p of c.pins) {
				const o = pinOutward(p.rotation);
				const len = (p as any).pinLength ?? 10;
				const ix = p.x - o[0] * len,
					iy = p.y - o[1] * len;
				out.push(`<line x1="${X(p.x)}" y1="${Y(p.y)}" x2="${X(ix)}" y2="${Y(iy)}" stroke="#a01818" stroke-width="1"/>`);
				if ((p as any).noConnected) out.push(`<path d="M${X(p.x) - 3} ${Y(p.y) - 3}l6 6m0 -6l-6 6" stroke="#c00" stroke-width="1"/>`);
				const big = c.pins.length > 2;
				if (big) {
					// pin number outside, name inside the body
					const nx = X(p.x - o[0] * len * 0.5),
						ny = Y(p.y - o[1] * len * 0.5);
					out.push(`<text x="${nx}" y="${ny - 1.5}" font-size="5" fill="#a01818" text-anchor="middle">${esc(p.number)}</text>`);
					if (p.name && p.name !== p.number) {
						const tx = X(ix - o[0] * 2),
							ty = Y(iy - o[1] * 2);
						const anchor = o[0] > 0 ? 'end' : o[0] < 0 ? 'start' : 'middle';
						const rot = o[1] !== 0 ? ` transform="rotate(-90 ${tx} ${ty})"` : '';
						const a2 = o[1] > 0 ? 'end' : o[1] < 0 ? 'start' : anchor;
						out.push(`<text x="${tx}" y="${ty + 2.5}" font-size="6.5" fill="#222" text-anchor="${o[1] !== 0 ? a2 : anchor}"${rot}>${esc(p.name)}</text>`);
					}
				}
			}
			if (bb) {
				out.push(`<text x="${X(bb.maxX) + 2}" y="${Y(bb.maxY) + 7}" font-size="8" fill="#0b2a8a" font-weight="bold">${esc(c.designator)}</text>`);
				if (c.value) out.push(`<text x="${X(bb.maxX) + 2}" y="${Y(bb.maxY) + 15}" font-size="7" fill="#2050d0">${esc(c.value)}</text>`);
			}
		} else if (c.type === 'netflag' || c.type === 'netport') {
			const p = c.pins[0] ?? { x: c.x, y: c.y };
			const isGnd = /GND|VSS|EARTH/i.test(c.net || '');
			const flip = Math.round((c.rotation || 0) / 180) % 2 === 1;
			const dir = (isGnd ? -1 : 1) * (flip ? -1 : 1);
			const x = X(p.x),
				y = Y(p.y);
			if (c.type === 'netport') {
				out.push(`<rect x="${x}" y="${y - 5}" width="${(c.net || '').length * 5 + 8}" height="10" fill="#fff" stroke="#a01818"/><text x="${x + 4}" y="${y + 3}" font-size="7">${esc(c.net)}</text>`);
			} else if (isGnd) {
				const by = y - dir * 8;
				out.push(`<line x1="${x}" y1="${y}" x2="${x}" y2="${by}" stroke="#a01818"/><path d="M${x - 8} ${by}h16M${x - 5} ${by - dir * 3}h10M${x - 2} ${by - dir * 6}h4" stroke="#a01818" stroke-width="1.2"/>`);
				out.push(`<text x="${x}" y="${by - dir * 14 + (dir > 0 ? 0 : 6)}" font-size="7" fill="#0b2a8a" text-anchor="middle">${esc(c.net)}</text>`);
			} else {
				const by = y - dir * 8;
				out.push(`<line x1="${x}" y1="${y}" x2="${x}" y2="${by}" stroke="#a01818"/><line x1="${x - 7}" y1="${by}" x2="${x + 7}" y2="${by}" stroke="#a01818" stroke-width="1.5"/>`);
				out.push(`<text x="${x}" y="${by - dir * 4 + (dir > 0 ? 0 : 7)}" font-size="7.5" fill="#0b2a8a" text-anchor="middle">${esc(c.net)}</text>`);
			}
		} else if (c.pins.length) {
			for (const p of c.pins) out.push(`<circle cx="${X(p.x)}" cy="${Y(p.y)}" r="2" fill="none" stroke="#888"/>`);
		}
	}
	out.push(`<text x="4" y="${f.h - 4}" font-size="7" fill="#999">EasyEDA MCP render (data view) — use mode "native" for EasyEDA's own drawing when the window is visible</text>`);
	out.push(`</svg>`);
	return { svg: out.join(''), width: f.W, height: f.H };
}

/* ------------------------------ PCB ------------------------------ */

export interface PcbRenderData {
	board: Region | null;
	outline?: [number, number][];
	comps: { designator: string; x: number; y: number; bbox?: Region; side?: string; pads: { x: number; y: number; w: number; h: number; rotation: number; shape: string; layer: number; net: string; hole?: any; number?: string }[]; label?: { x: number; y: number } }[];
	freePads: { x: number; y: number; w: number; h: number; rotation: number; shape: string; layer: number; hole?: any; net: string }[];
	tracks: { layer: number; x1: number; y1: number; x2: number; y2: number; w: number; net: string }[];
	vias: { x: number; y: number; d: number; hole?: number; net: string }[];
	pours: { layer: number; net: string; points: [number, number][] }[];
	fills?: { layer: number; net: string; points: [number, number][] }[];
	texts?: { x: number; y: number; text: string; size: number; bottom?: boolean; rot?: number }[];
}

export function pcbSvg(d: PcbRenderData, region?: Region, opts: { maxPx?: number; layers?: 'all' | 'top' | 'bottom'; netNames?: boolean } = {}) {
	const r = region ?? d.board ?? { minX: 0, minY: 0, maxX: 50, maxY: 50 };
	const f = frame(r, region ? 1 : 1.5, opts.maxPx ?? 1600);
	const X = (x: number) => x - f.x0;
	const Y = (y: number) => f.y1 - y;
	const show = (l: number) => opts.layers === 'top' ? l !== 1 : opts.layers === 'bottom' ? l !== 0 : true; // l: 0 top, 1 bottom
	const COL = ['#d62020', '#2a55d8'];
	const out: string[] = [];
	out.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${f.W}" height="${f.H}" viewBox="0 0 ${f.w} ${f.h}" font-family="Arial, Helvetica, sans-serif">`);
	out.push(`<rect width="${f.w}" height="${f.h}" fill="#141414"/>`);
	if (d.outline && d.outline.length > 2) out.push(`<polygon points="${d.outline.map(([x, y]) => `${X(x)},${Y(y)}`).join(' ')}" fill="#0f2a16" stroke="#c040c0" stroke-width="0.25"/>`);
	else if (d.board) out.push(`<rect x="${X(d.board.minX)}" y="${Y(d.board.maxY)}" width="${d.board.maxX - d.board.minX}" height="${d.board.maxY - d.board.minY}" fill="#0f2a16" stroke="#c040c0" stroke-width="0.25"/>`);
	// bottom first, then top
	for (const layer of [1, 0]) {
		if (!show(layer)) continue;
		const op = layer === 1 && opts.layers !== 'bottom' ? 0.55 : 0.9;
		for (const p of [...d.pours, ...(d.fills ?? [])].filter((p) => p.layer === layer))
			if (p.points.length > 2) out.push(`<polygon points="${p.points.map(([x, y]) => `${X(x)},${Y(y)}`).join(' ')}" fill="${COL[layer]}" fill-opacity="${0.18 * op}" stroke="${COL[layer]}" stroke-opacity="${op}" stroke-width="0.12" stroke-dasharray="0.6 0.4"/>`);
		out.push(`<g stroke="${COL[layer]}" stroke-linecap="round" opacity="${op}">`);
		for (const t of d.tracks.filter((t) => t.layer === layer)) out.push(`<line x1="${X(t.x1)}" y1="${Y(t.y1)}" x2="${X(t.x2)}" y2="${Y(t.y2)}" stroke-width="${t.w}"/>`);
		out.push(`</g>`);
	}
	const padSvg = (p: any, color: string) => {
		const x = X(p.x),
			y = Y(p.y);
		const tr = p.rotation ? ` transform="rotate(${-p.rotation} ${x} ${y})"` : '';
		let s = '';
		if (p.shape === 'ELLIPSE' || p.shape === 'OVAL') {
			const rr = Math.min(p.w, p.h) / 2;
			s = `<rect x="${x - p.w / 2}" y="${y - p.h / 2}" width="${p.w}" height="${p.h}" rx="${rr}" fill="${color}"${tr}/>`;
		} else s = `<rect x="${x - p.w / 2}" y="${y - p.h / 2}" width="${p.w}" height="${p.h}" fill="${color}"${tr}/>`;
		if (p.hole && p.hole[1]) s += `<circle cx="${x}" cy="${y}" r="${p.hole[1] / 2}" fill="#141414"/>`;
		return s;
	};
	for (const c of d.comps)
		for (const p of c.pads) {
			const top = p.layer === 1,
				bot = p.layer === 2,
				th = !top && !bot;
			if ((top && !show(0)) || (bot && !show(1))) continue;
			out.push(padSvg(p, th ? '#c8a020' : top ? '#e03030' : '#3060e0'));
		}
	for (const p of d.freePads) out.push(padSvg(p, '#b0b0b0'));
	for (const v of d.vias) out.push(`<circle cx="${X(v.x)}" cy="${Y(v.y)}" r="${v.d / 2}" fill="#9a9a9a"/><circle cx="${X(v.x)}" cy="${Y(v.y)}" r="${(v.hole ?? v.d / 2) / 2}" fill="#141414"/>`);
	// component outlines + designators
	for (const c of d.comps) {
		if (!c.bbox) continue;
		const b = c.bbox;
		const col = c.side === 'bottom' ? '#8ab0ff' : '#f0d040';
		out.push(`<rect x="${X(b.minX)}" y="${Y(b.maxY)}" width="${b.maxX - b.minX}" height="${b.maxY - b.minY}" fill="none" stroke="${col}" stroke-width="0.12" opacity="0.8"/>`);
		const lx = c.label?.x ?? (b.minX + b.maxX) / 2,
			ly = c.label?.y ?? b.maxY + 0.6;
		out.push(`<text x="${X(lx)}" y="${Y(ly) + 0.35}" font-size="0.9" fill="${col}" text-anchor="middle" font-weight="bold">${esc(c.designator)}</text>`);
	}
	for (const t of d.texts ?? []) {
		if ((t.bottom && !show(1)) || (!t.bottom && !show(0))) continue;
		const rot = t.rot ? ` transform="rotate(${-t.rot} ${X(t.x)} ${Y(t.y)})"` : '';
		out.push(`<text x="${X(t.x)}" y="${Y(t.y) + t.size * 0.35}" font-size="${t.size}" fill="${t.bottom ? '#8ab0ff' : '#f0f0f0'}" text-anchor="middle"${rot}>${esc(t.text)}</text>`);
	}
	if (opts.netNames !== false && f.scale > 18) {
		// pad net names when zoomed in
		for (const c of d.comps) for (const p of c.pads) if (p.net) out.push(`<text x="${X(p.x)}" y="${Y(p.y) + 0.15}" font-size="${Math.min(0.45, Math.min(p.w, p.h) * 0.4)}" fill="#fff" text-anchor="middle">${esc(p.net)}</text>`);
	}
	out.push(`<text x="0.5" y="${f.h - 0.5}" font-size="${Math.max(0.6, 10 / f.scale)}" fill="#777">EasyEDA MCP render (data view) · top red · bottom blue · TH gold</text>`);
	out.push(`</svg>`);
	return { svg: out.join(''), width: f.W, height: f.H };
}

/** Points of an EasyEDA polygon source array ('R' rect or numeric pairs with 'L' / 'ARC' commands). */
export function polygonPoints(src: any[]): [number, number][] {
	if (!Array.isArray(src)) return [];
	const flat = src.flat(3);
	if (flat[0] === 'R') {
		const [, x, y, w, h] = flat as number[];
		return [
			[x, y],
			[x + w, y],
			[x + w, y - h],
			[x, y - h],
		];
	}
	if (flat[0] === 'CIRCLE') {
		const [, cx, cy, r] = flat as number[];
		return Array.from({ length: 24 }, (_, i) => [cx + r * Math.cos((i * Math.PI) / 12), cy + r * Math.sin((i * Math.PI) / 12)] as [number, number]);
	}
	const nums = flat.filter((v: any) => typeof v === 'number');
	const pts: [number, number][] = [];
	for (let i = 0; i + 1 < nums.length; i += 2) pts.push([nums[i], nums[i + 1]]);
	return pts;
}
