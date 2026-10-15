/**
 * Example questions shown in the Ask panel for each lesson. Keep them to
 * questions the lesson answers, and avoid symptom words that safety routing
 * sends to the urgent message (for example "bleeding").
 */
export const ASK_SUGGESTIONS: Record<string, string[]> = {
  'how-labor-begins': ['What is bloody show?', 'How do I time contractions?', 'What are Braxton Hicks?', 'What does early term mean?'],
  'when-to-contact-your-care-team': ['What does 5-1-1 mean?', 'What is group B strep?', 'What will the nurse ask me?', 'Is it okay to call at night?'],
  'stages-of-labor': ['What is effacement?', 'When does active labor start?', 'What is transition?', 'How long does pushing take?'],
  'early-labor-at-home': ['Can I eat during early labor?', 'Should I rest or walk?', 'Can I take a bath?', 'How often should I time contractions?'],
  'pushing-and-birth': ['What does crowning feel like?', 'Will I tear?', 'What is an episiotomy?', 'Can I push with an epidural?'],
  'placenta-and-first-hour': ['Why wait to clamp the cord?', 'What is skin to skin?', 'What is an Apgar score?', 'What happens to the placenta?'],
};
