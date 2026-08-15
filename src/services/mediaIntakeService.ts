import {
  addDoc,
  collection,
  doc,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  type Unsubscribe,
} from 'firebase/firestore';

import { mediaIntakeWorkerUrl } from '../config/env';
import { requireAuth, requireFirestore } from '../lib/firebase';
import type {
  MediaIntake,
  MediaIntakeAnalysis,
  MediaIntakeDisposition,
  MediaIntakeInputType,
} from '../models/course';

export type { MediaIntake, MediaIntakeAnalysis } from '../models/course';

export type MediaIntakeLibraryState =
  | { status: 'loading'; intakes: MediaIntake[] }
  | { status: 'ready'; intakes: MediaIntake[] }
  | { status: 'error'; intakes: MediaIntake[]; message: string };

export type MediaIntakeAnalysisState =
  | { status: 'loading'; analyses: MediaIntakeAnalysis[] }
  | { status: 'ready'; analyses: MediaIntakeAnalysis[] }
  | { status: 'error'; analyses: MediaIntakeAnalysis[]; message: string };

export type CreateMediaIntakeCandidateInput = {
  inputType: Extract<MediaIntakeInputType, 'web_url' | 'video_url'>;
  originalUrl: string;
  transcriptUrl?: string;
  submitterNote?: string;
  suggestedTopic?: string;
  attestedNoPatientInformation: true;
};

function validateHttpsUrl(value: string, label: string): string {
  const trimmed = value.trim();

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'https:' || !parsed.hostname) {
      throw new Error();
    }
  } catch {
    throw new Error(`${label} must be a complete HTTPS URL.`);
  }

  return trimmed;
}

function optionalText(value: string | undefined, maximumLength: number): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) {
    return undefined;
  }

  if (trimmed.length > maximumLength) {
    throw new Error(`Please keep this field to ${maximumLength} characters or fewer.`);
  }

  return trimmed;
}

async function requireAdminUser() {
  const auth = requireAuth();
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Sign in with a clinician administrator account before using Media Intake.');
  }

  const tokenResult = await user.getIdTokenResult();
  if (tokenResult.claims.admin !== true) {
    throw new Error('Media Intake is available only to clinician administrator accounts.');
  }

  return user;
}

export async function createMediaIntakeCandidate(
  input: CreateMediaIntakeCandidateInput,
): Promise<string> {
  const user = await requireAdminUser();
  const firestore = requireFirestore();

  if (!input.attestedNoPatientInformation) {
    throw new Error(
      'Confirm that the candidate and notes do not include patient information before saving.',
    );
  }

  const originalUrl = validateHttpsUrl(input.originalUrl, 'Candidate URL');
  const transcriptUrl = input.transcriptUrl
    ? validateHttpsUrl(input.transcriptUrl, 'Transcript URL')
    : undefined;

  const reference = await addDoc(collection(firestore, 'mediaIntakes'), {
    inputType: input.inputType,
    originalUrl,
    ...(transcriptUrl ? { transcriptUrl } : {}),
    ...(optionalText(input.submitterNote, 2_000)
      ? { submitterNote: optionalText(input.submitterNote, 2_000) }
      : {}),
    ...(optionalText(input.suggestedTopic, 240)
      ? { suggestedTopic: optionalText(input.suggestedTopic, 240) }
      : {}),
    attestedNoPatientInformation: true,
    status: 'queued',
    submittedBy: user.uid,
    submittedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return reference.id;
}

export async function requestMediaIntakeEvaluation(intakeId: string): Promise<void> {
  const user = await requireAdminUser();
  const firestore = requireFirestore();
  const intakeSnapshot = await getDoc(doc(firestore, 'mediaIntakes', intakeId));

  if (!intakeSnapshot.exists()) {
    throw new Error('This media candidate is no longer available.');
  }

  if (!mediaIntakeWorkerUrl) {
    throw new Error(
      'Media Intake evaluation is not configured yet. Set EXPO_PUBLIC_MEDIA_INTAKE_WORKER_URL to the trusted evaluation service URL before requesting analysis.',
    );
  }

  const token = await user.getIdToken();
  let response: Response;

  try {
    response = await fetch(`${mediaIntakeWorkerUrl.replace(/\/+$/, '')}/evaluate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ intakeId }),
    });
  } catch {
    throw new Error(
      'BabyReady could not reach the Media Intake evaluation service. Check the service URL and try again.',
    );
  }

  if (!response.ok) {
    throw new Error(
      'The Media Intake evaluation service could not accept this candidate. No learner content was created.',
    );
  }
}

export function subscribeToMediaIntakes(
  onState: (state: MediaIntakeLibraryState) => void,
): Unsubscribe | null {
  try {
    const firestore = requireFirestore();
    const intakeQuery = query(
      collection(firestore, 'mediaIntakes'),
      orderBy('updatedAt', 'desc'),
      limit(100),
    );
    onState({ status: 'loading', intakes: [] });

    return onSnapshot(
      intakeQuery,
      (snapshot) => {
        onState({
          status: 'ready',
          intakes: snapshot.docs.map((intake) => ({
            id: intake.id,
            ...(intake.data() as Omit<MediaIntake, 'id'>),
          })),
        });
      },
      () => {
        onState({
          status: 'error',
          intakes: [],
          message: 'BabyReady could not load the Media Intake queue.',
        });
      },
    );
  } catch {
    onState({
      status: 'error',
      intakes: [],
      message: 'Connect Firebase before opening the Media Intake queue.',
    });
    return null;
  }
}

export function subscribeToMediaIntakeAnalyses(
  intakeId: string,
  onState: (state: MediaIntakeAnalysisState) => void,
): Unsubscribe | null {
  try {
    const firestore = requireFirestore();
    const analysisQuery = query(
      collection(firestore, 'mediaIntakes', intakeId, 'analyses'),
      orderBy('createdAt', 'desc'),
      limit(20),
    );
    onState({ status: 'loading', analyses: [] });

    return onSnapshot(
      analysisQuery,
      (snapshot) => {
        onState({
          status: 'ready',
          analyses: snapshot.docs.map((analysis) => ({
            id: analysis.id,
            intakeId,
            ...(analysis.data() as Omit<MediaIntakeAnalysis, 'id' | 'intakeId'>),
          })),
        });
      },
      () => {
        onState({
          status: 'error',
          analyses: [],
          message: 'BabyReady could not load this candidate’s evaluation history.',
        });
      },
    );
  } catch {
    onState({
      status: 'error',
      analyses: [],
      message: 'Connect Firebase before viewing Media Intake evaluation history.',
    });
    return null;
  }
}

export async function recordMediaIntakeDisposition(
  intakeId: string,
  disposition: Extract<MediaIntakeDisposition, 'held' | 'rejected' | 'archived'>,
  decisionNote: string,
): Promise<void> {
  const user = await requireAdminUser();
  const firestore = requireFirestore();
  const note = optionalText(decisionNote, 2_000);

  if (!note) {
    throw new Error('Add a concise decision note before changing this candidate’s disposition.');
  }

  await updateDoc(doc(firestore, 'mediaIntakes', intakeId), {
    status: disposition,
    finalDisposition: disposition,
    decisionNote: note,
    decidedBy: user.uid,
    decidedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}
