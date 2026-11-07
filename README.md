# GOTHIC ISLAND — The Last Harvest

A free 3D survival horror game set on an abandoned American farm in 1931. Explore Ashcroft County, avoid the harvesters, collect supplies, repair the stranded pickup, and escape.

**Play at https://gothic-island.vercel.app/**

## Run locally

Serve the repository root with a static HTTP server, then open http://localhost:8000.

```sh
python3 -m http.server 8000
```

No install or build step is needed. An internet connection loads Three.js from jsDelivr. Optional Kenney models and Google Fonts enhance the presentation, with procedural geometry and system fonts as fallbacks.

## The farm after dark

- Three harvesters patrol the farm, investigate footsteps, pursue visible players, and search the last place they saw you. Buildings block their sight.
- Crouching reduces visibility and noise. Sprinting buys distance but costs stamina. A dodge provides a short invulnerability window.
- Red flares repel nearby harvesters for 16 seconds. Herbal dressings recover 40 health. Both can be crafted.
- Rain masks footsteps. Thick fog limits enemy sight. Storms bring rain and lightning.
- The roadside camp, farmhouse porch, and pickup are refuges marked on the county map. Rest at the farmhouse to recover health and stamina at the cost of 15 hunger and one in-game hour.
- A tool shed offers renewable supplies every 90 active seconds. Repair materials remain obtainable after spending resources on survival tools.
- Five discoverable records tell the story of the county and offer survival clues. The ending records your exploration distance, time, recovered notes, and knockdowns.
- Story, Survivor, and Nightmare difficulty can be changed before starting or in the pause menu. Graphics, volume, and reduced-motion options are available there too.

## Controls

| Action | Keyboard / mouse | Touch |
| --- | --- | --- |
| Move | WASD / arrows | Left stick |
| Sprint | Hold Shift | Hold RUN |
| Crouch | Hold Ctrl | Toggle CROUCH |
| Dodge | Space | DODGE |
| Interact / rest / read | E | ACT |
| Eat berries | F | EAT |
| Deploy flare | Q | FLARE |
| Heal | R | HEAL |
| Toggle crafted lantern | L | LANTERN |
| Inventory | I | BAG |
| Crafting | C | CRAFT |
| Map | M | MAP |
| Journal | J | LOG |
| Pause / close panel | Esc | Ⅱ / close button |
| Zoom | Mouse wheel | — |

Light helps you see but makes you easier to spot. Lose a pursuer behind a building, crouch, or reach a safe light. The HUD points toward the current objective and missing repair materials. Gathering fuel, the key, and a repair kit unlocks escape at the pickup.

## Saving and accessibility

Progress saves locally every ten active seconds, after important actions, when opening a menu, and when leaving or hiding the page. Existing version-two saves are migrated with the new survival equipment defaults. Menus and hidden tabs pause simulation. Knockdowns return you to camp with your supplies intact.

Sound begins only after choosing SOUND. Reduced-motion mode suppresses lightning flashes and damage flashes, slows rain, and removes lamp flicker. Keyboard focus is visible and remains inside an open panel. Low graphics disables shadows and reduces rendering resolution.

## Validation

The simulation tests use Node.js 20 or later and have no package dependencies.

```sh
npm test
```

Tests cover detection, hearing, cover, safe zones, flares, dodging, attack cooldowns, weather, save validation, and respawning.

## Source structure

- `game.js` connects input, scene, UI, crafting, objectives, and saving.
- `survival.js` owns serializable pursuer AI, weather, combat timers, and survival statistics.
- `atmosphere.js` renders creatures, instanced rain, lightning, and flare effects.
- `audio.js` synthesizes wind, footsteps, heartbeat, and gameplay feedback with Web Audio.
- `cinematic.js` supplies procedural surfaces, the sky, foliage, crows, and farm dressing.

Repeated static meshes share geometry and are instanced. Animated characters, collectible objects, and cinematic effects retain their own scene nodes.

## Free assets and license

Three.js is MIT licensed. Kenney Graveyard Kit and Nature Kit are CC0, requested optionally from the Hidencod/tge-assets mirror on jsDelivr. Optional models are not redistributed in this repository. Original procedural world geometry, textures, creatures, effects, audio, interface, and game code are covered by the repository's MIT license.

Recent Chrome, Edge, Safari, or Firefox with WebGL2 is required. Hosting uses Vercel Hobby, with production deployments linked to `main`.
