# GitHub release report

Date: 2026-11-08

## Outcome

**GITHUB PUSH COMPLETATO**

The destination repository is [Gaston9779/hideseek_slot](https://github.com/Gaston9779/hideseek_slot). The owner explicitly authorised publication to this **public** repository and confirmed ownership of the project assets. Commit `062fa76d414a2218f5b7a3a25e391a52ed8aea44` was pushed to `main` without force and independently verified through both Git and the GitHub API.

`05-docs/ASSET_AUDIT.md` identifies supplied scenery/character material as Tripo-derived and records Mixamo skeleton naming. This report does not independently verify third-party redistribution terms; the public publication was performed under the owner's explicit confirmation and authorisation.

## Repository and backup

| Item | Result |
| --- | --- |
| Destination | `https://github.com/Gaston9779/hideseek_slot` |
| Visibility | Public |
| Published branch | `main` |
| Published commit | `062fa76d414a2218f5b7a3a25e391a52ed8aea44` |
| Remote state | `origin/main` verified at the published commit |
| Current local branch before report update | `main` / `062fa76` |
| Local release backup | `backups/skull-hunt-pre-github-release-20261107.tar.gz` |
| Backup SHA-256 | `e52efb6ada870c00dab8b4788dd7ef80fd1a0f75e52142a1427adcc09ee5a516` |
| Current tracked files | 706 |
| Runtime/source asset footprint | 141 files, 69.23 MiB (`assets-2d`, `public`, `models`, `textures`, `animations`) |
| Files over GitHub's 50 MiB advisory threshold | None found |
| Git LFS | Not required by current file sizes; not configured |

The backup preserves the complete working-tree content and excludes regenerable dependency/cache/output directories (`node_modules`, `dist`, `.tmp`), nested backups, and Git's internal metadata directory; it remains in the local ignored `backups/` directory.

## Publication inventory

The intended source set contains the TypeScript engine and renderer, V5.1 math and RNG, reel strips, paytable, Scatter/Chest/Buy Bonus logic, UI/animation/audio code, test suite, tools, specifications, QA evidence, and runtime 2D/3D/cinematic/audio assets. Required runtime samples were checked and are present: both intro video formats and poster, rigged Skull seeker assets, animated bonus chest, and the symbol sheet.

Ignored local material includes `node_modules/`, `dist/`, `.tmp/`, `backups/`, ZIP release archives, and macOS `.DS_Store` files. A targeted secret-pattern scan found no credential material; the sole pattern hit was the harmless `js-tokens` package name in `package-lock.json`. `tsconfig.tsbuildinfo` is currently tracked and modified; it should be removed from the Git index and ignored in a future publication commit, while preserving the local file.

## Mathematics V5.1

The current files match the approved baseline hashes:

| File | SHA-256 |
| --- | --- |
| `src/math/v4/config.ts` | `8d2e415ba2f1fdeb5a69e011343b3acca879af2eb24d4c355a79006908812b0b` |
| `src/math/v4/strips.ts` | `25dcf15b0583091204196994d7acf13fccf2300faf54a7b32003b7f924e50e40` |
| `src/math/v4/evaluate.ts` | `8303aa7f6def899fe076f92305f4d8e37539efc5f0d2a8061338323476bf3e74` |
| `src/engine/game.ts` | `1436b1042d013159d17cb0473b9da5f6aa6bd50a1392e99a30c9ebca4c476a88` |

The approved configuration remains 5×3, 20 paylines, 13 symbols, Scatter 12/15/20 initial spins and +5/+8/+10 retriggers, 12 Chest spins, `×1/×2/×5` packages across six equal permutations, 134× Buy Bonus, and a 5,000× maximum round win. No mathematical, RNG, reel-strip, paytable, or asset change was made by this release check.

## Local validation

| Check | Result |
| --- | --- |
| `npm ci --dry-run` | Pass; lockfile resolves |
| `npm test` | Pass: 20 files, 244 tests |
| `npm run typecheck` | Pass |
| `npm run build` | Pass |
| Absolute developer-path scan | One historical absolute path in `05-docs/RELEASE_REPORT.md`; no runtime source reference found |
| Build warning | Non-blocking Vite warning: main JS chunk exceeds 500 kB after minification |

The test run intentionally exercised the audio manager's missing-file fallback and printed an expected mocked 404 warning; the test passed.

## Residual note

No Git LFS migration was needed because no published file exceeded GitHub's 50 MiB advisory threshold. The asset-rights note above is retained for traceability; it is not a blocker for this owner-authorised publication.
