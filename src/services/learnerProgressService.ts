import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';

import { db } from '../lib/firebase';
import { EMPTY_PROGRESS, mergeProgress, parseProgress, type LearnerProgress } from '../models/learnerProgress';

/**
 * Lesson progress for the home screen's table of contents.
 *
 * A copy is always kept on the device. When the learner has a Firebase session,
 * progress is also saved privately at users/{uid}/courseProgress/class, so it
 * follows them to another device. Loading merges the two copies.
 */

const LOCAL_KEY = 'babyready:learnerProgress';

function progressReference(userId: string) {
  const firestore = db;
  return firestore ? doc(firestore, 'users', userId, 'courseProgress', 'class') : null;
}

async function loadDeviceProgress(): Promise<LearnerProgress> {
  try {
    const stored = await AsyncStorage.getItem(LOCAL_KEY);
    return stored ? parseProgress(JSON.parse(stored)) : EMPTY_PROGRESS;
  } catch {
    return EMPTY_PROGRESS;
  }
}

export async function loadProgress(userId: string | null): Promise<LearnerProgress> {
  const device = await loadDeviceProgress();
  const reference = userId ? progressReference(userId) : null;
  if (!reference) return device;
  try {
    const snapshot = await getDoc(reference);
    return snapshot.exists() ? mergeProgress(device, parseProgress(snapshot.data())) : device;
  } catch {
    return device;
  }
}

/** Saves progress to the device and, when signed in, the private account copy. Never throws. */
export async function saveProgress(userId: string | null, progress: LearnerProgress): Promise<void> {
  await AsyncStorage.setItem(LOCAL_KEY, JSON.stringify(progress)).catch(() => undefined);
  const reference = userId ? progressReference(userId) : null;
  if (!reference) return;
  await setDoc(reference, { ...progress, updatedAt: serverTimestamp() }).catch(() => undefined);
}

/** Removes the device copy of progress. Used when the learner deletes their data. */
export async function clearDeviceProgress(): Promise<void> {
  await AsyncStorage.removeItem(LOCAL_KEY);
}
