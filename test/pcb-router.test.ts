import { describe, it, expect } from './expect.js';
import { PcbRouter, segDist } from '../src/pcb/router.js';

const pad = (net: string, x: number, y: number, layers = [0], ref = '') => ({ net, x, y, w: 0.8, h: 0.9, rot: 0, shape: 'RECT', layers, ref });

describe('pcb router', () => {
	it('routes a simple 2-net board without violating clearance', () => {
		const r = new PcbRouter(
			{
				board: { minX: 0, minY: 0, maxX: 20, maxY: 15 },
				pads: [pad('A', 2, 7.5, [0], 'R1.1'), pad('A', 18, 7.5, [0], 'R2.1'), pad('B', 10, 2, [0], 'R3.1'), pad('B', 10, 13, [0], 'R4.1')],
				tracks: [],
				vias: [],
			},
			{ track: 0.25, clearance: 0.2, viaDiameter: 0.6, viaHole: 0.3, edgeClearance: 0.3 },
		);
		const res = r.route();
		expect(res.failed).toEqual([]);
		expect(res.routed.sort()).toEqual(['A', 'B']);
		// A and B must cross → at least one via
		expect(res.vias.length).toBeGreaterThan(0);
		// clearance between different-net segments on the same layer
		for (const a of res.segments)
			for (const b of res.segments) {
				if (a.net === b.net || a.layer !== b.layer) continue;
				const d = Math.min(segDist(a.x1, a.y1, b.x1, b.y1, b.x2, b.y2), segDist(a.x2, a.y2, b.x1, b.y1, b.x2, b.y2), segDist(b.x1, b.y1, a.x1, a.y1, a.x2, a.y2), segDist(b.x2, b.y2, a.x1, a.y1, a.x2, a.y2));
				expect(d).toBeGreaterThanOrEqual(0.25 + 0.2 - 0.01);
			}
	});

	it('routes a multi-pin net as a tree', () => {
		const r = new PcbRouter(
			{ board: { minX: 0, minY: 0, maxX: 30, maxY: 20 }, pads: [pad('GND', 3, 3), pad('GND', 27, 3), pad('GND', 15, 17), pad('GND', 15, 10)], tracks: [], vias: [] },
			{ track: 0.3, clearance: 0.2, viaDiameter: 0.6, viaHole: 0.3, edgeClearance: 0.3 },
		);
		const res = r.route();
		expect(res.failed).toEqual([]);
		expect(res.stats.connections).toBe(3);
	});
});
