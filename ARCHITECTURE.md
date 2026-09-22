# LAST 72 HOURS — Codebase Architecture

## Canonical runtime

`game.js` owns the playable canvas loop and strategic state. It is the only file that should create the primary player/camera/game loop.

Public runtime boundary:
- `window.Last72State` — shared simulation state
- `window.Last72ZoneData` — zone data
- `window.Last72TakeAction(action, source)` — strategic command entry point
- `window.Last72SelectZone(zone)` — active operational target
- `window.Last72Camera` — current world-to-screen camera position

## Feature layers

### 1. Core game — `game.js`
- player movement
- vehicle control
- camera
- city rendering
- cyclone progression
- strategic actions
- base missions
- landfall/report flow

### 2. Field systems — `gameplay-systems.js`
This layer adds supporting gameplay pressure rather than creating a second game.
- live incidents
- response XP and reputation
- field actions
- autosave
- system HUD

### 3. Living city — `dynamic-world.js`
This layer is responsible for emergent city behaviour.
- civilian distress
- fires and spread
- emergency crews
- inaccessible buildings
- consequence-driven mission selection
- mission history

The living-city canvas follows `Last72Camera`, so world-space targets stay aligned with the main game camera.

### 4. Tutorial — `tutorial.js`
Only onboarding/navigation UI belongs here. It must not create movement, mission or simulation loops.

## Removed legacy architecture

The earlier DOM field-operation loop was disabled and has now been removed from `game.js`. The canvas engine is the single active field game.

The redundant `ux-polish.js` overlay was also removed so pause/help behaviour is not implemented by two independent layers.

## UI rule

The player-facing game should prioritise:
1. current mission
2. waypoint/location
3. available interaction
4. immediate consequences
5. essential resources

Large dashboard-style panels should remain secondary or hidden during active field gameplay.

## Change discipline

When adding a new feature:
- extend the canonical game loop only if it changes core movement/world simulation;
- otherwise add a focused feature layer;
- communicate through the public runtime API instead of reading or mutating unrelated DOM;
- do not add a second `requestAnimationFrame` loop for core movement;
- do not create another independent player/camera state;
- keep competition-facing prompts and documentation updated.

## Validation checklist

- `game.js` parses without syntax errors.
- every script referenced by `index.html` exists.
- no legacy field-operation loop is active.
- dynamic-world coordinates follow the main camera.
- tutorial controls match actual controls.
- no duplicate pause system is loaded.
- the repository can run as static HTML/CSS/JS.