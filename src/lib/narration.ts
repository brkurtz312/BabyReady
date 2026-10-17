import * as Speech from 'expo-speech';

/**
 * Placeholder narration using the device's built-in voice. The plan is to
 * replace this with pre-generated audio per slide once content is final.
 */

export const NARRATION_RATE = 0.97;

export { splitSentences } from './sentences';

const PREFERRED_VOICE_NAMES = [
  /premium/i,
  /enhanced/i,
  /natural/i,
  /neural/i,
  /\bava\b/i,
  /\bzoe\b/i,
  /samantha/i,
  /aria/i,
  /jenny/i,
  /google us english/i,
  /allison/i,
];

/** Picks the most natural-sounding English voice available, if any. */
export async function pickNarrationVoice(): Promise<string | undefined> {
  try {
    const voices = (await Speech.getAvailableVoicesAsync()).filter((v) => /^en([-_]|$)/i.test(v.language));
    const enhanced = voices.find((v) => v.quality === Speech.VoiceQuality.Enhanced && /en[-_]US/i.test(v.language));
    if (enhanced) return enhanced.identifier;
    for (const pattern of PREFERRED_VOICE_NAMES) {
      const match =
        voices.find((v) => pattern.test(v.name) && /en[-_]US/i.test(v.language)) ??
        voices.find((v) => pattern.test(v.name));
      if (match) return match.identifier;
    }
    return (voices.find((v) => /en[-_]US/i.test(v.language)) ?? voices[0])?.identifier;
  } catch {
    return undefined;
  }
}
