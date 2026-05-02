Original prompt: i think the problem might still exist on mobile, can you check please?

- Investigated zoom artifact report (large black region during zoom/pinch).
- Root cause likely nested scroll container (`.stage` overflow-y auto) inside fixed-height shell (`.frame` height var(--app-height)) on mobile/Safari zoom.
- Applied mobile-safe layout adjustments in `index.html`:
  - On <=760px: disabled nested scrolling in `.stage`.
  - On <=520px: changed `.frame` from fixed `height` to `min-height + auto height`, and `overflow: visible`.
  - Added coarse-pointer safeguard (`@media (pointer: coarse) and (max-width: 900px)`) to enforce page-level scrolling.
- Next verification needed on physical mobile device after hard refresh/redeploy.

- Implemented cast-familiarity weighted answer selection.
- Added `FAMILIAR_CAST_NAMES` seed list and `getCastFamiliarityScore(movie)`.
- Added `JAM_MIN_VOTES`/`JAM_MIN_RATING` thresholds.
- `validateDataset` now builds:
  - `answerPool` (daily-ready mainstream)
  - `jamAnswerPool` (strong cast familiarity + stricter mainstream gate)
  - `castFamiliarCount` metric for diagnostics
- Answer picker now uses deterministic weighted selection (`pickWeightedMovie`) with stronger cast weighting in Jam mode.
- Updated Data Health modal to show Jam-ready pool count, Jam threshold, and high cast-familiarity count.
