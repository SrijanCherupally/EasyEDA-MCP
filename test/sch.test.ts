import { describe, it, expect } from './expect.js';
import { analyze } from '../src/sch/connectivity.js';
import { SchRouter } from '../src/sch/router.js';

const res = (d: string, x: number, y: number, vertical = false) => ({
	id: d, designator: d, type: 'part', x, y, rotation: vertical ? 90 : 0,
	bbox: vertical ? { minX: x - 4.5, maxX: x + 4.5, minY: y - 10.5, maxY: y + 10.5 } : { minX: x - 10.5, maxX: x + 10.5, minY: y - 4.5, maxY: y + 4.5 },
	pins: vertical
		? [{ ref: `${d}.1`, designator: d, number: '1', name: '1', x, y: y + 20, rotation: 90 }, { ref: `${d}.2`, designator: d, number: '2', name: '2', x, y: y - 20, rotation: 270 }]
		: [{ ref: `${d}.1`, designator: d, number: '1', name: '1', x: x - 20, y, rotation: 180 }, { ref: `${d}.2`, designator: d, number: '2', name: '2', x: x + 20, y, rotation: 0 }],
});

describe('schematic connectivity', () => {
	it('connects through wires, junctions and global names; flags name conflicts', () => {
		const st: any = {
			components: [res('R1', 100, 100), res('R2', 200, 100), { id: 'f', designator: 'gnd', type: 'netflag', net: 'GND', x: 300, y: 100, rotation: 0, pins: [{ ref: 'f.1', number: '1', x: 300, y: 100 }] }],
			wires: [
				{ id: 'w1', net: '', segs: [[120, 100, 180, 100]] },
				{ id: 'w2', net: '', segs: [[220, 100, 300, 100]] },
			],
		};
		const r = analyze(st);
		expect(r.pinNet['R1.2']).toBe(r.pinNet['R2.1']);
		expect(r.pinNet['R2.2']).toBe('GND');
		expect(r.issues.find((i) => i.kind === 'multiple_names')).toBeUndefined();
	});

	it('crossing wires do not connect; T-junctions do', () => {
		const st: any = {
			components: [res('R1', 100, 100), res('R2', 300, 100)],
			wires: [
				{ id: 'a', net: 'X', segs: [[120, 100, 280, 100]] },
				{ id: 'b', net: 'Y', segs: [[200, 50, 200, 150]] },
			],
		};
		const r = analyze(st);
		expect(r.pinNet['R1.2']).toBe('X');
		expect(r.issues.find((i) => i.kind === 'multiple_names')).toBeUndefined();
		st.wires[1].segs = [[200, 100, 200, 150]];
		const r2 = analyze(st);
		expect(r2.issues.find((i) => i.kind === 'multiple_names')).toBeDefined();
	});
});

describe('schematic router', () => {
	it('routes around a body and never through foreign pins', () => {
		const st: any = { components: [res('R1', 100, 100), res('R2', 300, 100), res('R3', 200, 100, true)], wires: [] };
		const router = new SchRouter(st, {}, {});
		const out = router.route({ net: 'N1', pins: ['R1.2', 'R2.1'] });
		expect(out.failed).toEqual([]);
		expect(out.polylines.length).toBe(1);
		// the path must avoid R3's body box
		for (const pl of out.polylines)
			for (let i = 1; i < pl.length; i++) {
				const [x1, y1] = pl[i - 1], [x2, y2] = pl[i];
				const insideX = Math.max(x1, x2) > 195.5 && Math.min(x1, x2) < 204.5;
				const insideY = Math.max(y1, y2) > 89.5 && Math.min(y1, y2) < 110.5;
				expect(insideX && insideY).toBe(false);
			}
		const a = analyze({ ...st, wires: out.polylines.map((pl, i) => ({ id: 'w' + i, net: '', segs: pl.slice(1).map((p, j) => [pl[j][0], pl[j][1], p[0], p[1]]) })) });
		expect(a.pinNet['R1.2']).toBe(a.pinNet['R2.1']);
		expect(a.pinNet['R3.1']).not.toBe(a.pinNet['R1.2']);
	});
});
