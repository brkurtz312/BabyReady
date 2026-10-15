import { FirebaseError } from 'firebase/app';
import { httpsCallable } from 'firebase/functions';

import { routeQuestion, type AskSafetyRoute } from '../lib/askSafety';
import { functions } from '../lib/firebase';

export type AskResult =
  | { kind: 'safety'; route: Exclude<AskSafetyRoute, 'ok'> }
  | { kind: 'answer'; answer: string; from: string | null }
  | { kind: 'error'; message: string };

type AskResponse =
  | { kind: 'safety'; route: Exclude<AskSafetyRoute, 'ok'> }
  | { kind: 'answer'; answer: string; from: string | null };

const UNAVAILABLE = 'Questions aren’t available right now. For anything about your own care, contact your care team.';

/**
 * Asks a question about the current lesson. Safety routing runs here first,
 * so urgent questions are answered without any network call. The server runs
 * the same check again before it calls the AI.
 */
export async function askLessonQuestion(lessonId: string, question: string): Promise<AskResult> {
  const route = routeQuestion(question);
  if (route !== 'ok') return { kind: 'safety', route };

  if (!functions) return { kind: 'error', message: UNAVAILABLE };

  try {
    const call = httpsCallable<{ lessonId: string; question: string }, AskResponse>(
      functions,
      'askLessonQuestion',
    );
    const { data } = await call({ lessonId, question: question.trim() });
    return data;
  } catch (error) {
    if (error instanceof FirebaseError) {
      switch (error.code) {
        // A function that isn't deployed or can't be reached shows up as one of these.
        case 'functions/not-found':
        case 'functions/unimplemented':
        case 'functions/internal':
        case 'functions/unavailable':
          return { kind: 'error', message: UNAVAILABLE };
        case 'functions/resource-exhausted':
        case 'functions/invalid-argument':
          return { kind: 'error', message: error.message };
        case 'functions/unauthenticated':
          return { kind: 'error', message: 'BabyReady is still starting your private session. Try again in a moment.' };
      }
    }
    return { kind: 'error', message: 'Something went wrong getting an answer. Try asking again.' };
  }
}
