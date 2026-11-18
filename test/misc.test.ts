import { describe, it, expect } from './expect.js';
import { parseValue, jlcPrimaryValue, normalize } from '../src/jlc.js';
import { normalizeJunctions } from '../src/pcb/junctions.js';
import { schematicSvg, pcbSvg, polygonPoints } from '../src/render/svg.js';
import { place } from '../src/pcb/placer.js';

describe('value parsing', () => {
	it('parses common notations', () => {
		const near = (a: number | undefined, b: number) => expect(Math.abs((a ?? NaN) - b) / b < 1e-9).toBeTruthy();
		near(parseValue('10kΩ'), 10e3);
		near(parseValue('4k7'), 4.7e3);
		near(parseValue('4.7uF'), 4.7e-6);
		near(parseValue('100nF'), 100e-9);
		near(parseValue('2R2'), 2.2);
		near(parseValue('1M'), 1e6);
		expect(parseValue('banana')).toBeUndefined();
	});
	it('reads the value of a JLC part', () => {
		const p = normalize({ componentCode: 'C25804', componentLibraryType: 'base', componentTypeEn: 'Chip Resistor - Surface Mount', describe: '100mW 10kΩ ±1% 0603', componentPrices: [] });
		expect(p.class).toBe('Basic');
		expect(jlcPrimaryValue(p)?.value).toBe(10000);
	});
});

describe('junction splitting', () => {
	it('splits a track where another same-net track or via lands mid-segment', () => {
		const r = normalizeJunctions(
			[
				{ net: 'A', layer: 0, x1: 0, y1: 0, x2: 10, y2: 0, w: 0.3, id: 'old' },
				{ net: 'A', layer: 0, x1: 5, y1: 0, x2: 5, y2: 5, w: 0.3 },
				{ net: 'B', layer: 0, x1: 7, y1: -3, x2: 7, y2: 0, w: 0.3 },
			],
			[{ net: 'A', x: 2, y: 0, d: 0.6 }],
		);
		expect(r.replaced).toEqual(['old']);
		expect(r.splits).toBe(2); // at x=2 (via) and x=5 (T), not at x=7 (other net)
		expect(r.segments.filter((s) => s.net === 'A' && s.y1 === 0 && s.y2 === 0).length).toBe(3);
	});
});

describe('renderers', () => {
	it('renders a schematic and a PCB to SVG', () => {
		const sch = schematicSvg({
			components: [{ id: 'r', designator: 'R1', type: 'part', x: 100, y: 100, rotation: 0, value: '10k', bbox: { minX: 90, minY: 95, maxX: 110, maxY: 105 }, pins: [{ ref: 'R1.1', designator: 'R1', number: '1', name: '1', x: 80, y: 100, rotation: 180 }] }],
			wires: [{ id: 'w', net: 'SDA', segs: [[80, 100, 50, 100]] }],
		} as any);
		expect(sch.svg.includes('SDA')).toBeTruthy();
		const pcb = pcbSvg({ board: { minX: 0, minY: 0, maxX: 10, maxY: 10 }, comps: [], freePads: [], tracks: [{ layer: 0, x1: 1, y1: 1, x2: 9, y2: 9, w: 0.3, net: 'A' }], vias: [], pours: [] });
		expect(pcb.svg.startsWith('<svg')).toBeTruthy();
		expect(polygonPoints(['R', 0, 10, 5, 5, 0, 0]).length).toBe(4);
	});
});

describe('placer', () => {
	it('places parts inside the board without overlaps', () => {
		const comps = Array.from({ length: 8 }, (_, i) => ({ ref: 'R' + i, w: 2, h: 1, cx: 0, cy: 0, x: 0, y: 0, rot: 0, pads: [{ net: 'N' + i, dx: -0.8, dy: 0 }, { net: 'N' + ((i + 1) % 8), dx: 0.8, dy: 0 }] }));
		const r = place(comps, { board: { minX: 0, minY: 0, maxX: 20, maxY: 15 }, iterations: 2000 });
		expect(r.unplaced).toEqual([]);
		for (const a of r.comps)
			for (const b of r.comps) {
				if (a === b) continue;
				const ox = Math.abs(a.x - b.x) < (a.rot % 180 ? 1 : 2) / 2 + (b.rot % 180 ? 1 : 2) / 2;
				const oy = Math.abs(a.y - b.y) < (a.rot % 180 ? 2 : 1) / 2 + (b.rot % 180 ? 2 : 1) / 2;
				expect(ox && oy).toBe(false);
			}
	});
});
