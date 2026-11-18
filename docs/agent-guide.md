# Agent guide — designing boards with EasyEDA MCP

The workflow below produces clean, DRC-passing boards with readable schematics, without disturbing the person working in EasyEDA.

## Ground rules
- **Never disturb the user.** `sch_snapshot` / `pcb_snapshot` render from design data (no window raising, no view change). Use `mode:"native"` only if asked. Tools put the user back on the tab they were on.
- **Everything saves itself.** Tools that change the design save the document they changed; `easyeda_project {action:"save"}` saves every page and the PCB.
- **Look after every step** with a snapshot and verify with `sch_check` / `pcb_drc`.

## 1. Parts (live JLCPCB data)
`jlc_search {keyword, basicOnly|noFeeOnly, package}` → prefer **Basic** / **Preferred Extended** with high stock. Place by **LCSC code** (exact match).

## 2. Schematic — readable by humans
Units 0.01 inch, Y up; A4 ≈ 1170 × 825, A3 ≈ 1650 × 1170.
- **Pages:** `sch_page {action:"add", name:"Power"}` — one page per function for bigger designs (Power, MCU, Sensors, Connectors…). Nets connect across pages by name (same label / power symbol / net port name).
- **Blocks:** lay out each functional block compactly and keep ~60–80 units between blocks. Signal flow left → right; power rails up, ground down; everything on the 10-unit grid.
- Rotate passives so pins face what they connect to; mirror connectors so pins face the circuit. `near:{pin}` drops a decoupling cap / pull-up right at an IC pin.
- **Wiring:** `sch_connect` with all nets in one call — power/ground → symbols (neighbouring same-net pins share one), short local nets → real wires, long/many-pin nets → labels. It never shorts nets; if it reports "no room", move parts apart and reconnect that net.
- **Sections:** `sch_section {title:"3V3 REGULATOR", designators:[…]}` frames each block with a title. Warnings tell you when a frame overlaps another block — move the block (`sch_modify dx/dy`) and redo.
- `sch_check` must show no errors; mark unused pins `sch_flag {kind:"noconnect", pin}`. `bom_check` before the PCB.

## 3. PCB setup
1. `pcb_sync`
2. `pcb_rules {action:"read"}` then `set` for the board type: `clearance`, `pourClearance`, `boardEdgeClearance`, `track{min,default}`, `via{diameter,hole}`, `copperWeight:"2oz"` for high current, `padConnection:"thermal"|"direct"`. 4-layer: `{action:"layers", layers:4}` and `{action:"layer_modify", layer:"Inner1", type:"PLANE", name:"GND"}`.
3. `pcb_outline`, `pcb_holes {size:"M3"}` (before placement).
4. Place connectors yourself facing an edge (`pcb_place … lock:true`), `pcb_auto_place`, then refine by hand — keep power stages compact (input cap → regulator → output cap in a tight loop), decoupling caps at their pins.

## 4. Routing — by hand first
- **Power & critical nets manually:** `pcb_tracks {tracks:[{points:["U1.3",[x,y],"C2.1"], width:0.8}]}` — pad references snap exactly to pads; wide tracks for current (≈0.5 mm per 1 A on 1 oz outer copper as a rough guide).
- **Power copper areas:** `pcb_copper {kind:"pour", net:"VIN", layer:"top", polygon:[…]}` for input/output/switch-node islands; `kind:"fill"` for solid heat-sink copper; `kind:"keepout"` to protect areas.
- **Ground (2-layer default):** `pcb_fanout {net:"GND"}` (stub + via for every ground pad) **before** routing signals, then GND pours on top & bottom. 4-layer: inner GND plane. Ground is not routed as tracks unless you ask (`routeGround:true`).
- **Leftover small signals:** `pcb_autoroute` (skips ground automatically; `nets:[…]` to limit).
- `pcb_pour {net:"GND", layers:"both", stitchPitch:6}` — fills, stitches, and fixes any ground pad the pour cannot reach.

## 5. Finish
`pcb_silkscreen {action:"tidy"}`, then `move` / `text` / `line` / `hide` for board name, version, connector labels, polarity marks. `pcb_drc` → 0 violations; `pcb_status` → all nets connected. `export_files {kinds:["jlcpcb"]}`.

## Anything else
`easyeda_api_search {query}` + `easyeda_run_script`. Use `lib.safeModifySch` / `lib.safeModifyPcb` for components and `lib.createVia` for vias, and create vias **before** the tracks that end on them.
