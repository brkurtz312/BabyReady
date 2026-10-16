# BabyReady lesson artwork: style guide

This guide goes with `production-list.csv` in this folder. The list has one row for every picture and video still to make: 80 illustrations, 5 diagrams, and 15 short videos. Each row gives the slide's heading, a brief describing what to show, and the exact file name to deliver.

## The feel

- Calm, warm, and reassuring. These are people getting ready for birth, often a little anxious. Pictures should make them feel capable, not worried.
- Simple, flat illustration with soft shapes. Avoid photo-realism and busy backgrounds.
- No graphic imagery: no blood, no exposed genitals, no needles going into skin, no distress or emergencies shown dramatically. Medical diagrams use simple side-view silhouettes, like a patient handout, not a textbook.
- Show diverse families: a range of skin tones, body sizes, ages, and abilities; single parents, same-sex couples, and different kinds of support people. Across the full set, no single kind of family should dominate.
- Clinicians of different backgrounds, genders, and roles (doctors, midwives, nurses, doulas).

## Colors

Use the app's palette as the base. Some briefs mention other colors (for example "soft peach and sage"); treat those as small accents on top of this palette.

| Name | Hex | Use |
| --- | --- | --- |
| Teal | `#23716C` | Main color: clothing, key objects, lines |
| Soft teal | `#DCEDEA` | Backgrounds and large soft areas |
| Ink | `#1D2940` | Outlines, hair, dark details, any text |
| Marigold | `#E3A82B` | Warm highlights, used sparingly |

Keep backgrounds light so the picture sits well on the app's white slide cards.

## Words in pictures

The app already shows each slide's heading and key points as text, and that text is read aloud for people who use screen readers. So:

- Keep words inside pictures to a minimum.
- When a brief asks for a label (for example "400 mcg folic acid", "10 cm"), use exactly that wording and spelling.
- Never add numbers, time limits, or medical advice that isn't in the brief.

## Size and format

**Pictures (illustrations and diagrams)**

- 1600 × 1000 pixels (a 16:10 landscape shape; the app shows them at this shape).
- PNG, JPEG or WebP. Keep each file under about 500 KB. 1024 pixels wide is the least that looks sharp on phones.
- Keep anything important away from the outer 5% of the edges, which may be rounded off.

**Videos**

- 16:9 landscape, 1920 × 1080, MP4 (H.264 video, AAC audio), no longer than the length in the brief. Keep files small (about 10 MB or less) because they ship inside the app.
- Calm music or no music. The narration is handled separately, so no voice-over unless asked.
- Videos start only when the learner taps play, and the app's narration stops while a video plays.
- Same palette and style as the pictures.

## File names

Name each file exactly as the "target file name" column says:

```
assets/lessons/<lessonId>/<slideId>.png
assets/lessons/<lessonId>/<slideId>.mp4
```

For example, `assets/lessons/how-labor-begins/welcome.png`. Use lowercase and hyphens, no spaces.

## Clinical review

Every picture and video is checked by BabyReady's clinical reviewer before it goes into the app. Please send drafts or sketches for the 5 diagrams before final artwork, since they show anatomy or a map and are the most likely to need changes.

## After delivery (for the developer)

1. Save the file at its target file name.
2. Add a line for it in `src/content/artwork.ts` for a picture, or `src/content/videos.ts` for a video (each file explains how).
3. Run `node scripts/make-production-list.mjs` to refresh the list; that row's status changes to "Delivered".
