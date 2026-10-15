# BabyReady handoff from Claude chat (October 2026)

Read this before changing anything. It records decisions made while planning
BabyReady in a Claude chat, after moving the project off Perplexity.

## Product direction
- BabyReady is a virtual childbirth class that should feel like attending a class:
  narrated slides (presentation style), short videos, check-in questions, a review
  quiz per lesson, and an "Ask a question" feature answered by AI.
- The previous heavy governance system (multi-stage approval queues, audit PDFs,
  QR verification, reconciliation and typo-purge scripts, clinician workspace)
  slowed progress. Set it aside on a separate branch; do not delete it.

## Lightweight quality model (replaces the governance workflow)
1. Every teaching slide cites at least one source. No source, no slide.
2. Approved organizations only: ACOG, AAP, CDC, NICHD, AAFP, ACNM, WHO, Lamaze, ICEA.
3. A lesson is "draft" or "reviewed". Reviewed lessons record reviewer name and
   credentials, review date, and a re-check date no more than 12 months later.
4. Lessons are JSON files in the repo. Git history is the audit trail.
5. Each source has `verifiedOn`: the date someone opened the page and confirmed it
   supports the slides. Most Module 2 sources are still null and need checking.

## Files in this handoff
- `src/models/lesson.ts`: the lesson data model (slide types: title, content,
  comparison, video, checkin, reflection, safety, summary).
- `content/lessons/labor-basics/01–06*.json`: Module 2, "Labor Basics and When to
  Call", six drafted lessons (~71 minutes). The old separate "Preparing for Labor"
  course is folded into this module.
- `reference/class-player-preview.html`: a working single-file prototype of the
  class player used to test the experience. Treat it as a behavior spec, not
  production code. It uses browser text-to-speech as a placeholder for narration.

## Player behavior to reproduce (see the preview)
- Slides auto-advance after narration on title, content, comparison, and summary slides.
- Check-in slides wait for an answer and show an explanation.
- Safety slides cannot be skipped until narration finishes ("Got it" button), show a
  Call 911 button, and are never AI-generated.
- Reflection slides save the learner's answer to the Birth Readiness Brief.
- Captions show one spoken sentence at a time; play/pause, back, captions, mute.
- Each lesson ends with its review quiz, then offers the next lesson.

## "Ask a question" rules
- Deterministic safety routing runs BEFORE any AI call: urgent phrases (bleeding,
  baby not moving, severe headache, trouble breathing, chest pain, fever, seizure,
  vision changes, thoughts of self-harm) show a "contact your care team or call 911"
  message and never reach the AI. "My water broke" routes to "call your care team now."
- The AI answers only from the current lesson's content, 2–4 plain sentences, names
  the slide it used, never diagnoses, never says whether someone is in labor, and
  never gives medication advice. Questions outside the lesson get "ask your care team."
- The API key must live server-side (for example a Firebase Function), never in the app.

## Narration audio (decided later)
- Plan: pre-generate natural-sounding audio per slide with a neural TTS service, or
  record a human narrator once content is final. Phone TTS is only a placeholder.

## Curriculum
- 6 modules, 37 lessons, ~6.5 hours. The full map lives in the "BabyReady Curriculum
  Map" Claude Doc. Production order after Module 2: 6.2 Postpartum Warning Signs,
  6.3 When to Call About Your Baby, 5.5 Safe Sleep, 5.6 Car Seat Safety, then
  Modules 4, 3, 5, 6, and 1.
