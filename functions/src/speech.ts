import { GoogleAuth } from 'google-auth-library';

import { splitSentences } from '../../src/lib/sentences';

/**
 * Speaks an Ask answer in the class narrator's voice with Google Cloud
 * Text-to-Speech (Chirp 3 HD "Sulafat", the voice the lessons were recorded in).
 * One clip per sentence, in the same split the app's captions use, so captions
 * follow the voice. Signs in as the function's own service account; the
 * Text-to-Speech API must be enabled in the project.
 */

export const NARRATOR_VOICE = 'en-US-Chirp3-HD-Sulafat';

/** Answers are short; anything longer than this is spoken by the phone instead. */
const MAX_SPOKEN_CHARS = 3000;
const TIMEOUT_MS = 8000;

const auth = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform'] });

async function synthesize(text: string, token: string): Promise<string> {
  const res = await fetch('https://texttospeech.googleapis.com/v1/text:synthesize', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify({
      input: { text },
      voice: { languageCode: 'en-US', name: NARRATOR_VOICE },
      audioConfig: { audioEncoding: 'MP3' },
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`Text-to-Speech ${res.status}`);
  const { audioContent } = (await res.json()) as { audioContent?: string };
  if (!audioContent) throw new Error('Text-to-Speech returned no audio');
  return audioContent;
}

/**
 * The answer as base64 MP3 clips, one per sentence, or null if it can't be
 * spoken (the app then uses the phone's voice). Never throws.
 */
export async function speakSentences(text: string): Promise<string[] | null> {
  const sentences = splitSentences(text);
  if (!sentences.length || text.length > MAX_SPOKEN_CHARS) return null;
  try {
    const token = await auth.getAccessToken();
    if (!token) return null;
    return await Promise.all(sentences.map((s) => synthesize(s, token)));
  } catch (error) {
    console.error('Answer speech failed', error instanceof Error ? error.message : 'unknown');
    return null;
  }
}
