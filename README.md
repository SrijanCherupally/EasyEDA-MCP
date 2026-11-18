# EasyEDA MCP

**Live, end-to-end PCB design in EasyEDA Pro for AI agents** — schematic capture, readable wiring, live JLCPCB stock & part class, PCB placement, autorouting, copper pours, DRC and fab exports — through the [Model Context Protocol](https://modelcontextprotocol.io).

Works with Claude Code, Claude Desktop, Codex, Cursor and any MCP client. Several agents can be connected to the same EasyEDA window at the same time.

```
 Claude Code ─┐                          ┌───────────────────────────┐
 Codex ───────┼─ stdio ─ easyeda-mcp ─┐  │ EasyEDA Pro (desktop/web) │
 Cursor ──────┘      (tools, routers,  │  │  ┌─────────────────────┐  │
                      JLC live data)   ├──┼─▶│ EasyEDA MCP runtime │  │
                    hub (ws://127.0.0.1:18765)│  (thin extension)   │  │
                                          │  └─────────────────────┘  │
                                          └───────────────────────────┘
```

## Why this exists

Earlier EasyEDA bridges made an agent fight the tooling more than design the board. This project fixes every problem we hit in real projects:

| Problem with older bridges | What EasyEDA MCP does |
|---|---|
| Every edit needed a separate "prepare" + "confirm" round trip (hundreds of calls to wire one sheet) | Batch tools: place 80 parts or connect every net in **one call** |
| Schematics were a wall of net labels | `sch_connect` draws **real orthogonal wires** between nearby pins (A* router: never shorts other nets, avoids part bodies, minimises bends/crossings), **power/ground symbols** on tidy stubs, and labels only for long runs |
| Agent could not see the design, and screenshots kept pulling EasyEDA to the front | `sch_snapshot` / `pcb_snapshot` **render the design from data** (never touch your window, focus or view); native capture only on request |
| Outputs of 100k–800k characters | Compact, filterable outputs; huge results spill to a file automatically |
| "Extension is not connected" / Codex and Claude kicking each other off | Standalone **hub**: many agents + many EasyEDA windows at once, **infinite auto-reconnect**, heartbeat watchdog, version hand-over |
| Via / track / outline creation "broken", silkscreen not movable | All working: correct API arguments, units, layer ids, plus the hidden EasyEDA rules below |
| Updating a part wiped all its attributes and LCSC number | Attribute-safe modify: merges, re-sends, verifies |
| `getDeviceDetails` fuzzy-matched LCSC codes (C25950 → C259504) | Exact LCSC matching everywhere |
| Stock / Basic vs Extended had to be looked up by hand | `jlc_search`, `jlc_part`, `bom_check` use the live JLCPCB catalogue: stock, class, price breaks, fee estimate, value/package mismatch detection |
| Power routing / copper areas were not controllable | Manual-first routing: tracks snap to pad refs (`U1.3`), custom pours / fills / keepouts, ground fan-out + planes; a built-in autorouter only for leftover signals (skips ground) |
| Design rules, layers, copper settings out of reach | `pcb_rules`: clearances, pour/edge clearance, track & via sizes, 1/2 oz copper, thermal/direct, mask expansion, 2/4/6 layers, inner plane layers, net classes, diff pairs |
| One giant schematic page | `sch_page` (multi-page) and `sch_section` (framed, titled functional blocks) |
| Work lost / user yanked to another tab | Every modifying tool saves the document it changed; `easyeda_project save` saves everything; you are returned to the tab you were on |
| Any API not wrapped by a tool was unreachable | `easyeda_run_script` exposes the **entire** `eda.*` API (~95 modules); `easyeda_api_search` searches the full API reference |
| Extension updates needed manual re-import | The runtime self-updates from the MCP server (`easyeda_update_runtime`) |

### Hidden EasyEDA behaviours this server handles for you
- PCB API units are **mil**, schematic units are **0.01 inch**, both **Y-up**. Tools take mm on the PCB.
- A track only connects to objects that **already exist** when it is created → vias are always placed before tracks.
- A track ending in the **middle** of another track is not connected → T-junctions are split automatically.
- `modify()` on a component replaces `otherProperty` wholesale and resets the supplier part → always merged.
- Pours are only filled after `rebuildCopperRegion()`; islands are removed (`preserveSilos=false`).
- EasyEDA stops rendering when its window is hidden → snapshots are rendered from design data inside the page instead (no focus stealing).
- Rule-configuration writes need the inner `config` object; schematic rectangles read back with inverted Y; page renames only apply to an open page; API vias need `designRuleBlindViaName: null` — all handled.
- "Update PCB from schematic" opens a confirmation dialog → confirmed automatically.

## Install

### 1. MCP server

```bash
# Claude Code
claude mcp add easyeda -s user -- npx -y easyeda-live-mcp

# Codex (~/.codex/config.toml)
[mcp_servers.easyeda]
command = "npx"
args = ["-y", "easyeda-live-mcp"]
```

Claude Desktop / Cursor (`mcpServers` JSON):

```json
{ "mcpServers": { "easyeda": { "command": "npx", "args": ["-y", "easyeda-live-mcp"] } } }
```

Requires Node.js 20+.

### 2. EasyEDA Pro extension (once)

1. Get `easyeda-mcp.eext` from the [latest release](../../releases) (or `dist/easyeda-mcp.eext` after `npm run build`; `easyeda_status` prints the path of the bundled copy).
2. EasyEDA Pro → **Settings → Extensions → Extension Manager → Import** → choose the file.
3. In the extension's entry enable **Allow External Interaction** (and *Display in top menu*).

It connects by itself within seconds (top menu **MCP → Status**). Later runtime updates are pushed by the server — no re-import.

## Tools (41)

| Area | Tools |
|---|---|
| Connection & power tools | `easyeda_status`, `easyeda_run_script` (full API), `easyeda_api_search`, `easyeda_ui` (dialogs, window screenshot), `easyeda_update_runtime`, `easyeda_project` |
| Parts (live JLCPCB) | `jlc_search`, `jlc_part`, `easyeda_library_search`, `bom_check` |
| Schematic | `sch_page`, `sch_section`, `sch_read`, `sch_place`, `sch_modify`, `sch_delete`, `sch_connect`, `sch_wire`, `sch_flag`, `sch_netlist`, `sch_check`, `sch_snapshot`, `sch_annotate` |
| PCB | `pcb_sync`, `pcb_read`, `pcb_outline`, `pcb_place`, `pcb_auto_place`, `pcb_tracks`, `pcb_copper`, `pcb_fanout`, `pcb_autoroute`, `pcb_pour`, `pcb_holes`, `pcb_silkscreen`, `pcb_drc`, `pcb_status`, `pcb_delete`, `pcb_rules`, `pcb_snapshot` |
| Manufacturing | `export_files` (gerber, BOM, CPL, PDF, STEP, DXF, DSN, netlist, iBOM, project; `jlcpcb` bundle) |

## A full board, start to finish

```text
easyeda_status
easyeda_project {action:"create", name:"USB 555 Blinker"}
jlc_search {keyword:"NE555", noFeeOnly:true}
sch_place {parts:[{lcsc:"C7593", designator:"U2", x:750, y:330}, {lcsc:"C25819", designator:"R5", value:"47kΩ", x:620, y:310, rotation:90}, …]}
sch_connect {nets:[{name:"VBUS", pins:["J1.A9","U2.VCC",…]}, {name:"GND", pins:[…]}, {name:"THR", pins:["R5.1","U2.THRES","U2.TRIG","C4.2"]}, …]}
sch_section {title:"555 LED BLINKER", designators:["U2","R4","R5","C4"]}
sch_snapshot {full:true}  ·  sch_check  ·  bom_check {boards:5}
pcb_sync
pcb_rules {action:"set", clearance:0.15, track:{default:0.25}, via:{diameter:0.6, hole:0.3}}
pcb_outline {width:40, height:30, cornerRadius:2}
pcb_holes {size:"M3"}
pcb_place {items:[{ref:"J1", x:4.2, y:15, rotation:270, lock:true}]}  ·  pcb_auto_place
pcb_tracks {tracks:[{points:["U1.4","C2.2"], width:0.6}, {points:["U1.4",[17.2,11.3],"R3.1"], width:0.5}]}   # power by hand
pcb_fanout {net:"GND"}
pcb_autoroute                       # leftover signals only; ground skipped
pcb_pour {net:"GND", layers:"both", stitchPitch:6}
pcb_silkscreen {action:"tidy"}  ·  pcb_silkscreen {action:"text", text:"BLINKER v1.0", x:24, y:3}
pcb_drc                             # → 0 violations
export_files {kinds:["jlcpcb"]}
```

See [docs/agent-guide.md](docs/agent-guide.md) for the recommended workflow and layout conventions.

## Configuration (environment variables)

| Variable | Default | Meaning |
|---|---|---|
| `EASYEDA_MCP_PORT` | `18765` | hub port (set the same port in the extension: MCP → Set Hub Port) |
| `EASYEDA_MCP_AUTOSAVE` | `1` | `0` = do not save after modifying tools |
| `EASYEDA_MCP_KEEP_TAB` | – | `1` = stay on the document a tool opened instead of returning to the user's tab |
| `EASYEDA_MCP_ALLOW_RAISE` | – | `1` = allow bringing EasyEDA to the front (never done by default) |
| `EASYEDA_MCP_MAX_TEXT` | `24000` | max characters per tool result before spilling to a file |
| `EASYEDA_MCP_HOME` | `~/.easyeda-mcp` | output/export directory |

## Development

```bash
npm install
npm run build        # builds dist/ (server, hub, cli) and dist/easyeda-mcp.eext
npm test             # unit tests (routers, connectivity)
node dist/index.js cli status
node dist/index.js cli exec "return eda.sys_Environment.getEditorCurrentVersion()"
```

Layout: `extension/` in-editor runtime · `src/hub.ts` router · `src/client.ts` hub client · `src/eda/lib.edajs` helper library hot-installed into EasyEDA · `src/sch/*` schematic connectivity + router · `src/pcb/*` placer, router, connectivity · `src/tools/*` MCP tools.

## License

MIT
