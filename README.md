# LAST 72 HOURS

**You do not fight the cyclone. You prepare the city to survive it.**

A browser-based emergency strategy simulation created for **Prompt & Play**.

## Phase 1 — Playable Core

The player becomes the Emergency Operations Commander of the fictional Indian coastal city **Surya Nagar**.

Every turn represents 6 hours. The player chooses one command:
- Evacuate vulnerable families
- Prepare emergency shelters
- Send public warnings
- Reinforce hospital readiness
- Secure critical roads

Each command consumes a limited budget and changes city safety. Random events introduce uncertainty and force the player to adapt.

## Run

This phase is a static browser game. Open `index.html` directly or deploy the repository to GitHub Pages or Vercel.

## Prompt log

### PROMPT 01 — Game Designer

> Design an original browser-based strategy simulation game called Last 72 Hours. The player is the Emergency Operations Commander of a fictional Indian coastal city facing an approaching cyclone. The player has 72 in-game hours to prepare the city, evacuate vulnerable populations, manage shelters, hospitals, transport, communications and limited resources. Every decision must create measurable consequences. The game must be playable, strategic, understandable within 5 minutes, and designed around meaningful trade-offs rather than combat.


## Phase 2–10 — Competition Build

The current release includes:
- 8-zone city operations map with shelters, hospitals and evacuation routes
- Resource management for vehicles, teams, food, medical supplies, communications and power
- Human behaviour variables: trust, panic, congestion and misinformation
- Cascading disaster events and infrastructure failures
- Dynamic cyclone intelligence with landfall probability, rainfall, storm radius, pressure and forecast models
- Natural-language AI Emergency Commander using a local command interpreter
- Mission objectives, command history and commander achievements
- Judge Demo mode, guided briefing, decision-impact feedback, landfall cinematic and final report
- Deterministic cyclone forecast progression tied to the 72-hour mission state, so the dashboard does not change simply because the page re-renders

## Competition release checklist

1. Open the game and complete the briefing.
2. Test all five command buttons.
3. Test natural-language commands such as “Evacuate vulnerable residents” and “Reinforce hospitals”.
4. Click map zones, shelters and hospitals to inspect them.
5. Run JUDGE DEMO / RUN DEMO SEQUENCE for the presentation flow.
6. Reach landfall and verify the final report, objectives, cascading events and restart flow.
7. Deploy the static files through GitHub Pages or Vercel.

The game is intentionally dependency-free: index.html, styles.css, and game.js are sufficient to run it.
