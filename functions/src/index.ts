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

const SYSTEM_RULES = `You are the instructor of BabyReady, a childbirth education class, talking with a learner after a lesson. Your answers are read aloud in the same voice that narrates the class, so the learner hears them as a continuation of the class. Answer using ONLY the lesson content provided.
Rules:
- Speak as the instructor, in the first person: warm, calm, plain language at about a 6th-grade reading level. 2 to 4 short sentences. No markdown, lists, symbols, or abbreviations that sound odd aloud; write numbers the way you would say them.
- Earlier turns of the conversation are included so you can understand follow-up questions. Still answer only from the lesson.
- Don't end with a question; the class asks the learner if there's anything else.
- If the lesson does not cover the question, say so in one sentence and suggest asking their care team. Do not answer from outside knowledge.
- Never diagnose, never tell someone whether they are in labor, and never give medication or dosing advice.
- If the question describes a symptom happening right now, tell them to contact their care team, or call 911 if it feels like an emergency.
- On the final line write "From: " followed by the slide heading(s) you used, or "From: not covered in this lesson".`;

type AskRequest = { lessonId?: unknown; question?: unknown; history?: unknown };

type Turn = { role: 'learner' | 'instructor'; text: string };

/** Earlier turns sent for context on follow-up questions, kept short. */
const MAX_HISTORY_TURNS = 8;
const MAX_TURN_LENGTH = 1500;

function readHistory(value: unknown): Turn[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > MAX_HISTORY_TURNS) {
    throw new HttpsError('invalid-argument', 'The conversation history is not valid.');
  }
  return value.map((turn) => {
    const t = turn as Partial<Turn>;
    if ((t.role !== 'learner' && t.role !== 'instructor') || typeof t.text !== 'string' || t.text.length > MAX_TURN_LENGTH) {
      throw new HttpsError('invalid-argument', 'The conversation history is not valid.');
    }
    return { role: t.role, text: t.text };
  });
}

/** Earlier turns as alternating user/assistant messages, starting with the learner. */
function historyMessages(history: Turn[]): Anthropic.Beta.BetaMessageParam[] {
  const messages: Anthropic.Beta.BetaMessageParam[] = [];
  for (const turn of history) {
    const role = turn.role === 'learner' ? 'user' : 'assistant';
    if (messages.length === 0 && role === 'assistant') continue;
    const last = messages[messages.length - 1];
    if (last && last.role === role) {
      last.content = `${last.content as string}
${turn.text}`;
    } else {
      messages.push({ role, content: turn.text });
    }
  }
  // The new question is added as the next user turn.
  if (messages.length && messages[messages.length - 1].role === 'user') messages.pop();
  return messages;
}

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
    const { lessonId, question, history: rawHistory } = (request.data ?? {}) as AskRequest;
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

    const history = readHistory(rawHistory);

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
        messages: [...historyMessages(history), { role: 'user', content: `LEARNER'S QUESTION: ${trimmed}` }],
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
