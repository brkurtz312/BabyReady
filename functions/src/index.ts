import Anthropic from '@anthropic-ai/sdk';
import { initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { defineSecret } from 'firebase-functions/params';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

import { MAX_QUESTION_LENGTH, routeQuestion } from '../../src/lib/askSafety';
import { findLesson, lessonText } from './lessons';

initializeApp();

const anthropicApiKey = defineSecret('ANTHROPIC_API_KEY');

/** Questions each learner can ask per day, to keep costs predictable. */
const DAILY_QUESTION_LIMIT = 30;

const SYSTEM_RULES = `You are the question helper inside BabyReady, a childbirth education class. Answer the learner's question using ONLY the lesson content provided.
Rules:
- Warm, plain language at about a 6th-grade reading level. 2 to 4 short sentences. No markdown, no lists.
- If the lesson does not cover the question, say so in one sentence and suggest asking their care team. Do not answer from outside knowledge.
- Never diagnose, never tell someone whether they are in labor, and never give medication or dosing advice.
- If the question describes a symptom happening right now, tell them to contact their care team, or call 911 if it feels like an emergency.
- On the final line write "From: " followed by the slide heading(s) you used, or "From: not covered in this lesson".`;

type AskRequest = { lessonId?: unknown; question?: unknown };

export type AskResponse =
  | { kind: 'safety'; route: 'crisis' | 'urgent' | 'water-broke' }
  | { kind: 'answer'; answer: string; from: string | null };

async function countQuestion(uid: string): Promise<boolean> {
  const day = new Date().toISOString().slice(0, 10);
  const ref = getFirestore().doc(`users/${uid}/askUsage/${day}`);
  return getFirestore().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const count = (snap.exists ? Number(snap.get('count')) : 0) || 0;
    if (count >= DAILY_QUESTION_LIMIT) return false;
    tx.set(ref, { count: FieldValue.increment(1), updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    return true;
  });
}

export const askLessonQuestion = onCall(
  { secrets: [anthropicApiKey], maxInstances: 5, timeoutSeconds: 60 },
  async (request): Promise<AskResponse> => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Sign in to ask a question.');
    }
    const { lessonId, question } = (request.data ?? {}) as AskRequest;
    if (typeof lessonId !== 'string' || typeof question !== 'string') {
      throw new HttpsError('invalid-argument', 'A lesson and a question are required.');
    }
    const trimmed = question.trim();
    if (!trimmed || trimmed.length > MAX_QUESTION_LENGTH) {
      throw new HttpsError('invalid-argument', `Questions must be 1 to ${MAX_QUESTION_LENGTH} characters.`);
    }

    // Safety routing runs before anything else and never reaches the AI.
    const route = routeQuestion(trimmed);
    if (route !== 'ok') return { kind: 'safety', route };

    const lesson = findLesson(lessonId);
    if (!lesson) {
      throw new HttpsError('not-found', 'That lesson was not found.');
    }

    if (!(await countQuestion(request.auth.uid))) {
      throw new HttpsError('resource-exhausted', 'You’ve reached today’s question limit. Please try again tomorrow.');
    }

    const client = new Anthropic({ apiKey: anthropicApiKey.value() });
    let response: Anthropic.Beta.BetaMessage;
    try {
      response = await client.beta.messages.create({
        model: 'claude-opus-5-5',
        max_tokens: 4000,
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        output_config: { effort: 'low' },
        system: [
          { type: 'text', text: SYSTEM_RULES },
          {
            type: 'text',
            text: `LESSON: ${lesson.title}\n\n${lessonText(lesson)}`,
            cache_control: { type: 'ephemeral' },
          },
        ],
        messages: [{ role: 'user', content: `LEARNER'S QUESTION: ${trimmed}` }],
      });
    } catch (error) {
      if (error instanceof Anthropic.RateLimitError) {
        throw new HttpsError('resource-exhausted', 'Lots of questions right now. Wait a moment, then ask again.');
      }
      if (error instanceof Anthropic.APIError) {
        console.error('Anthropic API error', error.status);
      } else {
        console.error('Ask question failed');
      }
      throw new HttpsError('unavailable', 'Something went wrong getting an answer. Try asking again.');
    }

    if (response.stop_reason === 'refusal') {
      return {
        kind: 'answer',
        answer: 'I can’t answer that one here. Please ask your care team.',
        from: null,
      };
    }

    const text = response.content
      .flatMap((block) => (block.type === 'text' ? [block.text] : []))
      .join('')
      .trim();
    const match = text.match(/\n?From:\s*(.+)\s*$/i);
    return {
      kind: 'answer',
      answer: (match ? text.slice(0, match.index) : text).trim(),
      from: match ? match[1].trim() : null,
    };
  },
);
