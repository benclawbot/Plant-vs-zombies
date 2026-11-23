# Plants vs. Zombies — Lawn Defense

This repository contains the complete application source, tests, and build configuration synchronized from the published Lawn Defense Site. Large generated media files (sprite atlases, app artwork, icons, and MP3 tracks) are not included in this GitHub copy; the published Site retains its complete runtime asset bundle. As a result, this copy can be inspected and its code can be built, but it needs the media bundle before it can run as a complete local game.

A browser fan recreation built with Three.js, generated sprite artwork, procedural mesh animation, and synthesized sound effects. Run with Node 20.19+ or 22.12+:

```sh
npm install
npm run dev
```

`npm test` runs deterministic simulation checks. `npm run build` produces the self-contained static site in `dist/`; `npm run preview` serves that build.

The game contains a 50-stage campaign, five environments, 49 plant definitions, 26 zombie definitions, 20 mini-game variants, puzzles, Survival, and a persistent garden/shop. Timing, campaign waves, extra-mode mechanics, and artwork are independently implemented approximations, not an exact port of PopCap's game. Character motion uses continuous vertex deformation and fixed-step rendering interpolation; the supplied atlases are static poses, not original animation frames.

Saves stay in browser local storage. A versioned recovery copy is retained when unreadable data is detected. The development-only `?qa` query isolates a test profile with unlocked content; production builds do not enable this profile.

Install from the menu's **Install game** button or Chrome/Edge's browser menu. On iPhone/iPad use Safari's **Share → Add to Home Screen**. The manifest requests fullscreen and landscape; platforms that do not lock orientation show a rotate prompt. The supplied splash artwork appears before the menu and is packaged into app icons without cropping or distortion. Tap to play starts the intro music.

Production builds generate a versioned service worker that downloads the complete game and music for offline use after the initial authenticated visit. The development server does not register it; use `npm run build` then `npm run preview` to test installation and caching. Updates activate after all open game windows close. Saved progress remains in local storage.

Asset crop metadata and generation prompts are in `public/assets`. All runtime art is local. The user-supplied MP3 files in `public/audio` play Crazy Dave on menu screens and Grasswalk during gameplay and Zen Garden. Tracks loop, follow Music volume and pause when the tab is hidden; playback starts after the first interaction. Plants vs. Zombies, its character designs, and its soundtrack belong to their respective owners.


## Behavior fidelity

See [BEHAVIOR_AUDIT.md](BEHAVIOR_AUDIT.md) for the 2009-game behavior review, fixed interactions, regression coverage, and remaining approximations across all plants and zombies.

Adjust **Difficulty** below the lawn while playing: **1** is gentlest and **10** hardest. The default is **3**. Changes immediately alter existing zombie walking speed and upcoming wave density/arrival pace, and are saved for your next game.
