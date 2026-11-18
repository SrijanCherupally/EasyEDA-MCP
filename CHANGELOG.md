# Changelog

## 1.0.0
- Standalone hub: many agents and EasyEDA windows at once, endless auto-reconnect, heartbeat, version hand-over.
- Thin in-editor runtime (eval + serializer + chunking) with self-update from the server.
- Full API access (`easyeda_run_script`) and API reference search.
- Schematic: batch placement, attribute-safe modify, readable auto-wiring (`sch_connect`), flags/labels/no-connects, computed netlist, ERC + readability checks, snapshots, annotation.
- Live JLCPCB data: search, part details, BOM audit (stock, class, fees, value/package mismatches).
- PCB: sync, outline, mounting holes, auto-placement, built-in autorouter, pours + stitching, silkscreen tidy, DRC, routing status, rules, snapshots.
- Exports: Gerber, BOM, CPL, PDF, STEP, DXF, DSN, netlist, iBOM, project; JLCPCB bundle.
