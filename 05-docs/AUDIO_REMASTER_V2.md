# Skull Hunt Audio Remaster V2

## Integration record

The active runtime package is `assets-2d/audio/skull_hunt_audio_pack/`. Remaster V2 replaces the same 35 sound IDs in their original relative paths: 35 OGG deployment files plus 35 WAV fallback files. `src/audio/index.ts` resolves OGG first where supported and otherwise selects WAV; the URL is imported by Vite, so no obsolete public copy is used at runtime.

The original tracked package was preserved before replacement in `backups/skull-hunt-audio-pre-remaster-v2-20261108.tar.gz` (SHA-256 `59d58487b8850d0925d8ec1c4f1399d3408ee3f8e48cb8fbb33cd25734c7a442`). The backup remains local and ignored.

## Playback and mix

- A single Web Audio context is unlocked only by the first user interaction.
- The base ambience loop starts after unlock, persists over ordinary spins, and has only one active instance.
- Chest entry crossfades from `ambient/amb_spooky_graveyard_loop.ogg` to `ambient/amb_bonus_chest_loop.ogg`; the Chest loop is explicitly retained for all 12 Chest Free Spins and crossfades back only when that feature completes. Native Web Audio looping preserves the authored 20-second loop boundary without restarting on spins.
- Four independently adjustable buses are available: Music, Effects, Skull Voice, and Cinematics. Priority events pre-empt lower-priority one-shots on their own bus, avoiding fast-spin accumulation.
- Visibility changes suspend/resume the context; master mute and each bus setting are persisted locally.

## Commercial-distribution note

The two ambient tracks were rendered with the TimGM6mb.sf2 soundfont, recorded in the supplied manifest and `README_IT.txt` as GPL-2.0-related material. They are **to be verified before commercial distribution**. This repository makes no claim that those two rendered tracks are fully proprietary or commercially cleared.
