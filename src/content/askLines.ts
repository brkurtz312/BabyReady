/**
 * The fixed lines the Ask panel speaks. scripts/make-narration.mjs records each
 * of these (and the safety messages) in the narrator's voice, so they play
 * instantly and offline. No imports, so plain Node can run this file.
 */

export const ASK_GREETING_WITH_MIC =
  'What would you like to ask about this lesson? Tap the microphone and ask me out loud, or type your question.';
export const ASK_GREETING_TYPED = 'What would you like to ask about this lesson? Type your question below.';
export const ASK_FOLLOW_UP = 'Is there anything else you’d like to ask?';
