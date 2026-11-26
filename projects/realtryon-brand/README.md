# RealTryOn brand episodes

White typographic ads for RealTryOn. The frame is original. The insets are the live site: official live-mirror recordings and screenshots of the fitting room and Photo Studio.

Episode 01 is a 23-second 1080×1920 film at `productions/episode-01/`. The playable file is `productions/episode-01/realtryon-episode-01.mp4`.

## What a later update video changes

Copy `productions/episode-01/` to `productions/episode-02/`. Edit only the new folder.

1. Replace files in `assets/` when the product UI or the live-mirror clip changed. Keep a note of the page URL and the date in `assets/PROVENANCE.md`.
2. Edit `authors/episode.svml`. Each `<brand:Beat>` is one card:
   - `at` and `hold` are seconds. At 30fps, `hold` must land on a frame (`4.5` does, `4.4` does not). Beats must meet with no gap.
   - `inset` is `mirror`, `glasses`, `fitting`, `studio`, or `none`.
   - `pills` is a `|` separated list.
   - The last beat writes the full URL `https://www.realtryon.com`.
3. Set `<time:Timeline end>` to the last beat's end.
4. Do not add a claim the live site does not make. Photo Studio compares a photo with an existing result. It does not generate a person, a runway, or a try-on from someone else's photo. Say that previews cannot determine physical fit or size.

Rebuild and render from the repository root:

```bash
pnpm install
pnpm --filter @realtryon/brand-film build
node bin/hypit.mjs check projects/realtryon-brand/productions/episode-01/authors/episode.svml --workspace projects/realtryon-brand
node bin/hypit.mjs runtime up --workspace projects/realtryon-brand --runtime projects/realtryon-brand/hypit.runtime.json
node bin/hypit.mjs build projects/realtryon-brand/productions/episode-01/runs/episode.svrun --workspace projects/realtryon-brand --runtime projects/realtryon-brand/hypit.runtime.json --follow
```

Copy `final.video` out of the build result into `productions/<episode>/realtryon-<episode>.mp4`. No model API key is required.

## Claims this system will say

Live camera try-on for clothes and glasses in the browser. No app. No personal photo for the live mirror. The camera stays off until the person starts it and agrees to share the camera video and the selected outfit. The preview is recorded in the browser without audio. Photo Studio compares saved live looks, or a photo beside an existing result. Sample people are reference images. The preview is not a size or fabric measurement.
