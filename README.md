# LAST 72 HOURS

**You do not fight the cyclone. You prepare the city to survive it.**

**LAST 72 HOURS** is an original browser game for the **Prompt & Play** competition. You play the Emergency Operations Commander of the fictional coastal city **Surya Nagar** during the final hours before a cyclone.

## What you actually play

This is a **top-down emergency-response game**, not a dashboard.

- Move through the city with **WASD / Arrow Keys**
- **E** — interact, rescue, or complete the current mission
- **V** — enter/exit a nearby emergency vehicle
- **1–5** — quick emergency commands
- **M** — tactical map
- **ESC** — pause
- **?** — reopen the interactive tutorial
- **R / F / G / H / B / Q** — resolve live field incidents
- **X / Z / T / P / C** — rescue, convoy, drone, pump, broadcast actions

The world changes while you play: civilians request help, traffic builds, fires spread, emergency crews respond, buildings can become inaccessible, floods affect corridors, and new missions are selected from the consequences of earlier decisions.

## Core game loop

**Observe → Travel → Respond → Decide → See consequences → Reassess → Repeat → Landfall**

The player is balancing:
- civilian safety
- evacuation
- hospitals and shelters
- roads and infrastructure
- public trust and misinformation
- limited resources
- changing cyclone intelligence

## Runtime architecture

The repository intentionally keeps the playable runtime dependency-free.

| Layer | File | Responsibility |
|---|---|---|
| Game state & strategic simulation | game.js | Mission state, cyclone progression, commands, canvas game loop, player, vehicles, map and core world simulation |
| Field systems | gameplay-systems.js | Live incidents, XP/reputation, response actions, autosave and field-system HUD |
| Living city AI | dynamic-world.js | Civilians, distress calls, fires, emergency crews, branching consequence missions |
| Tutorial | tutorial.js | First-time controls, mission tracker and navigation guidance |
| Base presentation | styles.css | Landing, briefing, responsive and command-center presentation |
| Field-system presentation | gameplay-systems.css | Live incident and response-system HUD |
| Living-city presentation | dynamic-world.css | Dynamic AI HUD and world overlay |
| Competition documentation | PROMPT_PLAY_STRUCTURE.md | Competition requirements and submission alignment |

### Runtime boundary

`game.js` is the canonical game runtime. It exposes a small public API:

- `window.Last72State`
- `window.Last72ZoneData`
- `window.Last72TakeAction`
- `window.Last72SelectZone`
- `window.Last72Camera`

Feature layers use those APIs instead of starting another legacy field-operation game loop.

## Competition alignment

The supplied Prompt & Play guidelines describe an open-ended game-build challenge: the game can use an original concept, genre, style or platform, and AI prompting is central to the build process. The submission requires **one PDF with exactly two pages**:

1. **Game Concept** — concept, gameplay and originality
2. **Complete prompts used** — in development order

The supplied guidelines do **not** state a specific game theme in the document beyond the stated theme-reveal date. See `PROMPT_PLAY_STRUCTURE.md` for the documented submission checklist.

## Run

No framework or package installation is required for the current build.

Open `index.html` in a modern browser, or deploy the repository as a static site through GitHub Pages/Vercel.

## Development principle

The game is intentionally inspired by the **structure of open-world games**—movement, vehicles, missions, NPC reactions and a changing world—while using its own city, characters, missions, mechanics and visual identity.

It does **not** reproduce another game's characters, map, story, assets or branding.

## Final demo flow

1. Start the tutorial.
2. Enter the city.
3. Follow the first waypoint to Coastal Ward.
4. Interact with the emergency.
5. Drive an emergency vehicle to the next mission.
6. Respond to a dynamic distress call or fire.
7. Use the tactical map when the city becomes difficult to navigate.
8. Resolve cascading incidents.
9. Continue through changing missions until landfall.
10. Show the final outcome and explain how player decisions changed the city.