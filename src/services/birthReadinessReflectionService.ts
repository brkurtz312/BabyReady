import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  type Unsubscribe,
} from 'firebase/firestore';

import { db } from '../lib/firebase';
import {
  BIRTH_READINESS_REFLECTION_MAX_LENGTH,
  REFLECTION_ID_PART,
  reflectionDocumentId,
} from '../models/birthReadinessReflection';

/**
 * Reflection answers from the class player.
 *
 * When the learner has a Firebase session, answers are saved privately to
 * Firestore and appear in their Birth Readiness Brief on any device. A copy is
 * always kept on the device, so typing is never lost if the network drops or
 * Firebase is not configured.
 */

export type ReflectionKey = { courseId: string; lessonId: string; slideId: string };

export type SavedReflection = ReflectionKey & { text: string };

export type ReflectionSaveResult = 'saved' | 'saved-on-device';

const LOCAL_PREFIX = 'birthReadinessBrief:reflection:';

function localKey({ lessonId, slideId }: ReflectionKey) {
  return `${LOCAL_PREFIX}${lessonId}:${slideId}`;
}

function reflectionReference(userId: string, key: ReflectionKey) {
  const firestore = db;
  return firestore
    ? doc(firestore, 'users', userId, 'birthReadinessReflections', reflectionDocumentId(key.lessonId, key.slideId))
    : null;
}

function assertValidKey(key: ReflectionKey) {
  for (const part of [key.courseId, key.lessonId, key.slideId]) {
    if (!REFLECTION_ID_PART.test(part)) throw new Error('This reflection has an invalid lesson or slide id.');
  }
}

export function normalizeReflectionText(text: string): string {
  return text.trim().slice(0, BIRTH_READINESS_REFLECTION_MAX_LENGTH);
}

/** Loads one answer: the private saved copy if signed in, otherwise the device copy. */
export async function loadReflection(
  userId: string | null,
  key: ReflectionKey,
): Promise<{ text: string; source: ReflectionSaveResult }> {
  const reference = userId ? reflectionReference(userId, key) : null;
  if (reference) {
    try {
      const snapshot = await getDoc(reference);
      if (snapshot.exists()) return { text: String(snapshot.data().text ?? ''), source: 'saved' };
    } catch {
      // Fall back to the device copy below.
    }
  }
  const text = (await AsyncStorage.getItem(localKey(key)).catch(() => null)) ?? '';
  return { text, source: 'saved-on-device' };
}

/**
 * Saves one answer. An empty answer removes it. Throws only if neither the
 * private copy nor the device copy could be saved.
 */
export async function saveReflection(
  userId: string | null,
  key: ReflectionKey,
  rawText: string,
): Promise<ReflectionSaveResult> {
  assertValidKey(key);
  const text = normalizeReflectionText(rawText);

  const localSave = text
    ? AsyncStorage.setItem(localKey(key), text)
    : AsyncStorage.removeItem(localKey(key));
  const localOk = await localSave.then(
    () => true,
    () => false,
  );

  const reference = userId ? reflectionReference(userId, key) : null;
  if (!reference) {
    if (!localOk) throw new Error('Your answer could not be saved.');
    return 'saved-on-device';
  }

  try {
    if (text) {
      await setDoc(reference, { ...key, text, updatedAt: serverTimestamp() });
    } else {
      await deleteDoc(reference);
    }
    return 'saved';
  } catch (error) {
    if (!localOk) throw error;
    return 'saved-on-device';
  }
}

export type ReflectionsState =
  | { status: 'loading'; reflections: SavedReflection[]; error: null }
  | { status: 'ready'; reflections: SavedReflection[]; source: 'private' | 'device'; error: null }
  | { status: 'error'; reflections: SavedReflection[]; error: string };

async function loadDeviceReflections(): Promise<SavedReflection[]> {
  const keys = (await AsyncStorage.getAllKeys()).filter((k) => k.startsWith(LOCAL_PREFIX));
  const entries = await AsyncStorage.multiGet(keys);
  return entries.flatMap(([k, value]) => {
    const [lessonId, slideId] = k.slice(LOCAL_PREFIX.length).split(':');
    // Device copies don't record the course; the Brief matches them by lesson.
    return value && lessonId && slideId ? [{ courseId: '', lessonId, slideId, text: value }] : [];
  });
}

/** Watches all of a learner's reflection answers for the Birth Readiness Brief. */
export function subscribeToReflections(
  userId: string | null,
  onChange: (state: ReflectionsState) => void,
): Unsubscribe {
  let active = true;
  const firestore = db;
  onChange({ status: 'loading', reflections: [], error: null });

  const showDeviceCopies = () => {
    loadDeviceReflections()
      .then((reflections) => active && onChange({ status: 'ready', reflections, source: 'device', error: null }))
      .catch(() => active && onChange({ status: 'error', reflections: [], error: 'Your reflections could not be loaded.' }));
  };

  if (!firestore || !userId) {
    showDeviceCopies();
    return () => {
      active = false;
    };
  }

  const unsubscribe = onSnapshot(
    collection(firestore, 'users', userId, 'birthReadinessReflections'),
    (snapshot) => {
      const reflections = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          courseId: String(data.courseId ?? ''),
          lessonId: String(data.lessonId ?? ''),
          slideId: String(data.slideId ?? ''),
          text: String(data.text ?? ''),
        };
      });
      // Include answers that so far only reached this device (for example, typed offline).
      loadDeviceReflections()
        .catch(() => [] as SavedReflection[])
        .then((deviceCopies) => {
          if (!active) return;
          const saved = new Set(reflections.map((r) => `${r.lessonId}:${r.slideId}`));
          const deviceOnly = deviceCopies.filter((r) => !saved.has(`${r.lessonId}:${r.slideId}`));
          onChange({ status: 'ready', reflections: [...reflections, ...deviceOnly], source: 'private', error: null });
        });
    },
    // If the private copy can't be reached, still show what is saved on this device.
    showDeviceCopies,
  );
  return () => {
    active = false;
    unsubscribe();
  };
}
