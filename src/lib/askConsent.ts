import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * The learner's permission for Ask your instructor to send questions to a
 * third-party AI (App Review Guideline 5.1.2(i)). Asked once on this device,
 * before the first question is sent, and never assumed: no answer means no.
 * The learner can turn it off again from the Ask panel.
 */
const KEY = 'babyready.ask-ai-consent.v1';

export async function hasAskConsent(): Promise<boolean> {
  const value = await AsyncStorage.getItem(KEY).catch(() => null);
  return value === 'granted';
}

export async function setAskConsent(granted: boolean): Promise<void> {
  await (granted ? AsyncStorage.setItem(KEY, 'granted') : AsyncStorage.removeItem(KEY)).catch(() => undefined);
}

/** What the consent screen says. Keep it in step with the privacy policy. */
export const ASK_CONSENT = {
  title: 'Answers from AI',
  body: [
    'Ask your instructor uses AI to answer your questions about this lesson.',
    "When you ask, BabyReady's server sends your question, your earlier questions in this conversation, and the text of this lesson to Anthropic, the company that makes the Claude AI model, which writes the answer. The answer is then read aloud using Google Cloud text-to-speech.",
    'Your name, email, and account details are not sent. If you ask out loud, only the text of your question is sent.',
    "Questions about urgent symptoms are never sent to the AI. You'll see safety steps right away instead.",
  ],
  allow: 'Allow',
  notNow: 'Not now',
  turnOff: 'Turn off AI answers',
};
