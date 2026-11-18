/*
 * Schematic connectivity computed from geometry, so it never depends on
 * EasyEDA's (slow / render-dependent) netlist export. Mirrors EasyEDA rules:
 *  - a wire endpoint touching a pin end connects;
 *  - a wire endpoint touching any point of another wire connects (T-junction);
 *  - two wires that merely cross mid-segment do NOT connect;
 *  - net flags / ports / labelled wires give names; equal names are global.
 */

export type Pt = [number, number];
export type Seg = [number, number, number, number];

export interface SchPin {
	ref: string; // e.g. "U1.3"
	designator: string;
	number: string;
	name: string;
	x: number;
	y: number;
	rotation?: number;
	type?: string;
}
export interface SchComp {
	id: string;
	designator: string;
	type: string; // part | netflag | netport | short | ...
	net?: string; // for flags / ports
	value?: string;
	lcsc?: string;
	x: number;
	y: number;
	rotation: number;
	mirror?: boolean;
	bbox?: { minX: number; minY: number; maxX: number; maxY: number };
	pins: SchPin[];
	addIntoBom?: boolean;
}
export interface SchWire {
	id: string;
	net?: string;
	segs: Seg[];
}
export interface SchState {
	components: SchComp[];
	wires: SchWire[];
}

export interface NetInfo {
	name: string;
	named: boolean;
	pins: string[];
	wires: string[];
	flags: string[];
}

export interface ConnectivityReport {
	nets: NetInfo[];
	pinNet: Record<string, string>;
	issues: Issue[];
}
export interface Issue {
	severity: 'error' | 'warning' | 'info';
	kind: string;
	message: string;
	at?: Pt;
	refs?: string[];
}

const EPS = 0.01;
const eq = (a: number, b: number) => Math.abs(a - b) < EPS;

export function onSegment(p: Pt, s: Seg): boolean {
	const [x1, y1, x2, y2] = s;
	if (eq(x1, x2)) return eq(p[0], x1) && p[1] >= Math.min(y1, y2) - EPS && p[1] <= Math.max(y1, y2) + EPS;
	if (eq(y1, y2)) return eq(p[1], y1) && p[0] >= Math.min(x1, x2) - EPS && p[0] <= Math.max(x1, x2) + EPS;
	// diagonal
	const cross = (p[0] - x1) * (y2 - y1) - (p[1] - y1) * (x2 - x1);
	if (Math.abs(cross) > EPS * Math.hypot(x2 - x1, y2 - y1)) return false;
	return p[0] >= Math.min(x1, x2) - EPS && p[0] <= Math.max(x1, x2) + EPS && p[1] >= Math.min(y1, y2) - EPS && p[1] <= Math.max(y1, y2) + EPS;
}

const isEndpoint = (p: Pt, s: Seg) => (eq(p[0], s[0]) && eq(p[1], s[1])) || (eq(p[0], s[2]) && eq(p[1], s[3]));

class DSU {
	p: number[] = [];
	add() {
		this.p.push(this.p.length);
		return this.p.length - 1;
	}
	find(a: number): number {
		while (this.p[a] !== a) a = this.p[a] = this.p[this.p[a]];
		return a;
	}
	union(a: number, b: number) {
		this.p[this.find(a)] = this.find(b);
	}
}

export const isGroundName = (n: string) => /^(GND|AGND|DGND|PGND|SGND|CGND|VSS|0V|GROUND|EARTH)\w*$/i.test(n) || /GND$/i.test(n);
export const isPowerName = (n: string) =>
	!isGroundName(n) && (/^(VCC|VDD|VBAT|VBUS|VIN|VSYS|VREF|AVDD|DVDD|VDDA|VDDIO|V\+|V-)/i.test(n) || /^[+-]?\d+V\d*$/i.test(n) || /^[+-]\d/.test(n) || /^\+/.test(n) || /^\d+V\d*_?/i.test(n));

export function analyze(state: SchState): ConnectivityReport {
	const dsu = new DSU();
	const issues: Issue[] = [];
	const pinNodes: { pin: SchPin; comp: SchComp; node: number }[] = [];
	const wireNodes: { wire: SchWire; node: number }[] = [];

	for (const comp of state.components) {
		for (const pin of comp.pins) pinNodes.push({ pin, comp, node: dsu.add() });
	}
	for (const wire of state.wires) wireNodes.push({ wire, node: dsu.add() });

	// spatial hash of wire segments
	const allSegs: { seg: Seg; w: number }[] = [];
	wireNodes.forEach((wn, i) => wn.wire.segs.forEach((seg) => allSegs.push({ seg, w: i })));

	// segments of the same wire primitive are connected only if they touch; but EasyEDA wires are polylines → treat as one node
	// wire-wire connectivity: endpoint of one on the other
	for (let a = 0; a < allSegs.length; a++) {
		const A = allSegs[a];
		const ends: Pt[] = [
			[A.seg[0], A.seg[1]],
			[A.seg[2], A.seg[3]],
		];
		for (let b = 0; b < allSegs.length; b++) {
			if (a === b) continue;
			const B = allSegs[b];
			if (A.w === B.w) continue;
			for (const e of ends) if (onSegment(e, B.seg)) dsu.union(wireNodes[A.w].node, wireNodes[B.w].node);
		}
	}

	// pins
	const pinAt = new Map<string, number[]>();
	pinNodes.forEach((pn, i) => {
		const k = `${Math.round(pn.pin.x * 100)},${Math.round(pn.pin.y * 100)}`;
		(pinAt.get(k) || pinAt.set(k, []).get(k)!).push(i);
	});
	for (const list of pinAt.values()) for (let i = 1; i < list.length; i++) dsu.union(pinNodes[list[0]].node, pinNodes[list[i]].node);

	for (const pn of pinNodes) {
		const p: Pt = [pn.pin.x, pn.pin.y];
		for (const s of allSegs) {
			if (onSegment(p, s.seg)) {
				dsu.union(pn.node, wireNodes[s.w].node);
				if (!isEndpoint(p, s.seg) && pn.comp.type === 'part') {
					issues.push({
						severity: 'warning',
						kind: 'pin_on_wire_middle',
						message: `${pn.pin.ref} touches the middle of a wire. Make sure this is intended — it is easy to create accidental connections this way.`,
						at: p,
						refs: [pn.pin.ref],
					});
				}
			}
		}
	}

	// names
	const names = new Map<number, Set<string>>();
	const addName = (node: number, n?: string) => {
		if (!n) return;
		const r = dsu.find(node);
		(names.get(r) || names.set(r, new Set()).get(r)!).add(n);
	};
	for (const pn of pinNodes) if (pn.comp.type !== 'part' && pn.comp.net) addName(pn.node, pn.comp.net);
	for (const wn of wireNodes) if (wn.wire.net) addName(wn.node, wn.wire.net);

	// global merge by name
	const byName = new Map<string, number>();
	for (const [root, set] of [...names.entries()]) {
		for (const n of set) {
			if (byName.has(n)) dsu.union(root, byName.get(n)!);
			else byName.set(n, root);
		}
	}
	const finalNames = new Map<number, Set<string>>();
	for (const [root, set] of names) {
		const r = dsu.find(root);
		const s = finalNames.get(r) || finalNames.set(r, new Set()).get(r)!;
		set.forEach((n) => s.add(n));
	}

	// collect nets
	const groups = new Map<number, NetInfo>();
	let anon = 0;
	const groupFor = (node: number) => {
		const r = dsu.find(node);
		let g = groups.get(r);
		if (!g) {
			const nm = finalNames.get(r);
			const list = nm ? [...nm].sort() : [];
			g = { name: list[0] || '', named: list.length > 0, pins: [], wires: [], flags: [] };
			if (list.length > 1) {
				issues.push({
					severity: 'error',
					kind: 'multiple_names',
					message: `One connected net carries several names: ${list.join(', ')}. EasyEDA will flag this. Rename or separate them (or use a Short symbol if the merge is intentional).`,
					refs: list,
				});
			}
			groups.set(r, g);
		}
		return g;
	};
	for (const pn of pinNodes) {
		const g = groupFor(pn.node);
		if (pn.comp.type === 'part') g.pins.push(pn.pin.ref);
		else g.flags.push(`${pn.comp.type}:${pn.comp.net ?? pn.comp.designator}`);
	}
	for (const wn of wireNodes) groupFor(wn.node).wires.push(wn.wire.id);

	const nets: NetInfo[] = [];
	for (const g of groups.values()) {
		if (!g.name) g.name = `$N${++anon}`;
		nets.push(g);
	}
	const pinNet: Record<string, string> = {};
	for (const n of nets) for (const p of n.pins) pinNet[p] = n.name;

	// issues
	for (const n of nets) {
		if (n.pins.length === 0 && n.wires.length > 0 && n.flags.length === 0) {
			issues.push({ severity: 'warning', kind: 'floating_wire', message: `Wire(s) ${n.wires.join(',')} connect to nothing.`, refs: n.wires });
		}
		if (n.pins.length === 1 && (n.wires.length > 0 || n.flags.length > 0) && !n.named) {
			issues.push({ severity: 'warning', kind: 'single_pin_net', message: `${n.pins[0]} is wired to nothing else.`, refs: n.pins });
		}
		if (n.pins.length === 1 && n.named && !isGroundName(n.name) && !isPowerName(n.name)) {
			issues.push({ severity: 'warning', kind: 'single_pin_named_net', message: `Net ${n.name} has only one pin (${n.pins[0]}). Is a label misspelled?`, refs: n.pins });
		}
	}
	// dangling wire ends
	for (const s of allSegs) {
		for (const e of [
			[s.seg[0], s.seg[1]],
			[s.seg[2], s.seg[3]],
		] as Pt[]) {
			let touches = 0;
			for (const t of allSegs) if (t !== s && onSegment(e, t.seg)) touches++;
			for (const pn of pinNodes) if (eq(pn.pin.x, e[0]) && eq(pn.pin.y, e[1])) touches++;
			if (!touches && !state.wires[s.w].net) {
				issues.push({ severity: 'info', kind: 'dangling_wire_end', message: `Wire ${state.wires[s.w].id} has a loose end at (${e[0]}, ${e[1]}).`, at: e, refs: [state.wires[s.w].id] });
			}
		}
	}
	// unconnected part pins
	const connected = new Set<string>();
	for (const n of nets) if (n.pins.length + n.flags.length > 1 || n.wires.length) n.pins.forEach((p) => connected.add(p));
	const unconnected: string[] = [];
	for (const pn of pinNodes) if (pn.comp.type === 'part' && !connected.has(pn.pin.ref) && !(pn.pin as any).noConnected) unconnected.push(pn.pin.ref);
	if (unconnected.length) {
		issues.push({
			severity: 'info',
			kind: 'unconnected_pins',
			message: `${unconnected.length} pin(s) are not connected: ${unconnected.slice(0, 60).join(', ')}${unconnected.length > 60 ? ' …' : ''}. Add a No-Connect flag to the ones left open on purpose.`,
			refs: unconnected,
		});
	}
	return { nets: nets.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true })), pinNet, issues };
}

/** Layout / readability checks (overlaps, off-sheet parts, wires through bodies). */
export function layoutIssues(state: SchState, sheet?: { width: number; height: number }): Issue[] {
	const issues: Issue[] = [];
	const parts = state.components.filter((c) => c.bbox && c.type === 'part');
	for (let i = 0; i < parts.length; i++) {
		const a = parts[i].bbox!;
		if (sheet && (a.minX < 0 || a.minY < 0 || a.maxX > sheet.width || a.maxY > sheet.height)) {
			issues.push({ severity: 'warning', kind: 'off_sheet', message: `${parts[i].designator} is outside the sheet border.`, refs: [parts[i].designator] });
		}
		for (let j = i + 1; j < parts.length; j++) {
			const b = parts[j].bbox!;
			const ox = Math.min(a.maxX, b.maxX) - Math.max(a.minX, b.minX);
			const oy = Math.min(a.maxY, b.maxY) - Math.max(a.minY, b.minY);
			if (ox > 1 && oy > 1) {
				issues.push({
					severity: 'warning',
					kind: 'overlap',
					message: `${parts[i].designator} overlaps ${parts[j].designator}.`,
					refs: [parts[i].designator, parts[j].designator],
				});
			}
		}
	}
	for (const w of state.wires) {
		for (const s of w.segs) {
			for (const c of parts) {
				if (c.type !== 'part') continue;
				const bb = c.bbox!;
				// shrink a bit so wires ending at pins are fine
				if (segIntersectsBox(s, { minX: bb.minX + 1, minY: bb.minY + 1, maxX: bb.maxX - 1, maxY: bb.maxY - 1 })) {
					issues.push({ severity: 'warning', kind: 'wire_through_part', message: `Wire ${w.id} runs through ${c.designator}'s body.`, refs: [w.id, c.designator] });
				}
			}
		}
	}
	// crossing wires of different nets are fine electrically but hurt readability: count them
	let crossings = 0;
	const segs = state.wires.flatMap((w) => w.segs.map((s) => ({ s, w })));
	for (let i = 0; i < segs.length; i++)
		for (let j = i + 1; j < segs.length; j++) {
			if (segs[i].w === segs[j].w) continue;
			if (properCross(segs[i].s, segs[j].s)) crossings++;
		}
	if (crossings) issues.push({ severity: 'info', kind: 'wire_crossings', message: `${crossings} wire crossing(s). Fewer crossings read better; consider moving parts or using net labels for long runs.` });
	return issues;
}

export function segIntersectsBox(s: Seg, b: { minX: number; minY: number; maxX: number; maxY: number }): boolean {
	if (b.maxX <= b.minX || b.maxY <= b.minY) return false;
	const [x1, y1, x2, y2] = s;
	if (Math.max(x1, x2) < b.minX || Math.min(x1, x2) > b.maxX || Math.max(y1, y2) < b.minY || Math.min(y1, y2) > b.maxY) return false;
	if (eq(x1, x2) || eq(y1, y2)) return true; // axis aligned & bbox overlaps
	// Liang–Barsky
	let t0 = 0,
		t1 = 1;
	const dx = x2 - x1,
		dy = y2 - y1;
	const clip = (p: number, q: number) => {
		if (p === 0) return q >= 0;
		const r = q / p;
		if (p < 0) {
			if (r > t1) return false;
			if (r > t0) t0 = r;
		} else {
			if (r < t0) return false;
			if (r < t1) t1 = r;
		}
		return true;
	};
	return clip(-dx, x1 - b.minX) && clip(dx, b.maxX - x1) && clip(-dy, y1 - b.minY) && clip(dy, b.maxY - y1);
}

function properCross(a: Seg, b: Seg): boolean {
	const aH = eq(a[1], a[3]),
		bH = eq(b[1], b[3]);
	const aV = eq(a[0], a[2]),
		bV = eq(b[0], b[2]);
	if (aH && bV) return strictlyBetween(b[0], a[0], a[2]) && strictlyBetween(a[1], b[1], b[3]);
	if (aV && bH) return strictlyBetween(a[0], b[0], b[2]) && strictlyBetween(b[1], a[1], a[3]);
	return false;
}
const strictlyBetween = (v: number, a: number, b: number) => v > Math.min(a, b) + EPS && v < Math.max(a, b) - EPS;
