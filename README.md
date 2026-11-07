# GOTHIC ISLAND — American Gothic survival

A cinematic, free-to-play 3D survival prototype for phone and desktop browsers.

**Status:** playable vertical slice. Three.js, HTML/CSS/JavaScript. No build system, login, or paid assets required.

## Live deployment

**Play:** https://gothic-island.vercel.app/  
**Hosting:** Vercel Hobby, linked to the production `main` branch of this repository. Commits to `main` trigger automatic deployments.

## Play

Serve the repository root with a static HTTP server:

```sh
python -m http.server 8000
```

Open http://localhost:8000, or publish the main branch as a GitHub Pages site (Settings → Pages → Deploy from a branch → main / root).

An Internet connection is currently required to load the Three.js library and optionally Kenney's CC0 models from jsDelivr. Original geometry is used when optional models fail to load. Procedural PBR-like surfaces and a cinematic world pass are included in `cinematic.js`.

## Controls

| Action | Desktop | Phone |
| --- | --- | --- |
| Move | WASD / arrows | Left joystick |
| Sprint | Shift | RUN button |
| Interact | E | ACTION button |
| Eat berries | F | BERRY button |
| Inventory / crafting | I / C | HUD buttons |
| Zoom | Mouse wheel or + / − controls | + / − controls |
| Close menu | Esc | Close button |

## Graphics and scene

The cinematic pass provides procedurally textured soil, wood, stone, shingles and rust, an evolving sky with moon and stars, grasses via instancing, animated crows, atmospheric motes, water tower, grain silo, windmill, church and farmhouse dressing, and optimized asset caching for Kenney models. More features and polish are planned.

## Gameplay

Explore an abandoned Midwestern farm at dusk. Collect wood, stone and scrap; forage berries; craft a hatchet, lantern and repair kit; search near the barn for a fuel can and the chapel for a key; repair the stranded pickup truck and escape. Hunger, stamina, fog, lighting and a day/night cycle keep the farm oppressive. The HUD points to the current objective and the map shows remaining supplies. The farmhouse porch restores health and stamina at a hunger cost. Cold rain thickens the fog and makes sprinting more tiring. Opening a menu pauses survival and movement. Progress is saved locally and can be resumed from the title screen.

## Free assets and license

- **Three.js** — MIT, https://threejs.org/
- **Kenney Graveyard Kit / Nature Kit** — CC0, https://kenney.nl/assets/graveyard-kit. Optional external models loaded from https://github.com/Hidencod/tge-assets (CC0 Kenney model mirror).
- World geometry, procedural textures, game logic, interface and generated ambience are created for this prototype. The code in this repository is offered under the MIT license (see LICENSE). No paid models or music.

Kenney assets are requested at runtime, not redistributed in this source tree. The game remains playable without them; the corresponding procedural gravestones remain visible.

## Browser support

Recent Chrome, Edge, Safari and Firefox with WebGL2. For older or lower-end phones, shadows and pixel ratio are automatically reduced. This prototype is a foundation, not yet a content-complete commercial game.

## Roadmap

Interior rooms, enemy AI, larger farm town, physical animations, offline asset bundling, accessibility improvements and automated performance testing.
