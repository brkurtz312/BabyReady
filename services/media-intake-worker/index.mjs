import https from 'node:https';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

import express from 'express';
import { applicationDefault, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { GoogleAuth } from 'google-auth-library';
import { z } from 'zod';

const PORT = Number.parseInt(process.env.PORT ?? '8080', 10);
const PROJECT_ID = process.env.FIREBASE_PROJECT_ID?.trim() || process.env.GOOGLE_CLOUD_PROJECT?.trim();
const VERTEX_LOCATION = process.env.VERTEX_AI_LOCATION?.trim() || 'us-central1';
const VERTEX_MODEL = process.env.VERTEX_AI_MODEL?.trim() || 'gemini-2.5-flash';
const WORKER_VERSION = 'media-intake-v1';
const MAX_FETCHED_BYTES = 1_000_000;
const MAX_EXTRACTED_CHARS = 20_000;
const ALLOWED_ORIGINS = new Set(
  (process.env.MEDIA_INTAKE_ALLOWED_ORIGINS ||
    `https://babyready.app,https://${PROJECT_ID}.web.app,https://${PROJECT_ID}.firebaseapp.com`)
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
);

if (!PROJECT_ID) {
  throw new Error('FIREBASE_PROJECT_ID or GOOGLE_CLOUD_PROJECT must be set.');
}

const firebaseApp =
  getApps()[0] ??
  initializeApp({
    credential: applicationDefault(),
    projectId: PROJECT_ID,
  });
const auth = getAuth(firebaseApp);
const firestore = getFirestore(firebaseApp);
const googleAuth = new GoogleAuth({
  scopes: ['https://www.googleapis.com/auth/cloud-platform'],
});

const evaluateRequestSchema = z.object({
  intakeId: z.string().trim().min(1).max(200),
});

const aiAnalysisSchema = z.object({
  suitability: z.object({
    recommendation: z.enum([
      'review_favorably',
      'review_with_cautions',
      'adapt_only',
      'source_only',
      'not_recommended',
    ]),
    summary: z.string().trim().min(1).max(2_000),
    reasons: z.array(
      z.object({
        category: z.enum([
          'authority',
          'currency',
          'clinical_fit',
          'claims',
          'bias',
          'accessibility',
          'rights',
          'scope',
        ]),
        finding: z.string().trim().min(1).max(1_000),
        evidence: z.array(
          z.object({
            quote: z.string().trim().min(1).max(1_000),
            locator: z.string().trim().min(1).max(240),
          }),
        ).max(4),
      }),
    ).max(12),
    flags: z.array(
      z.object({
        severity: z.enum(['info', 'caution', 'blocker']),
        code: z.string().trim().min(1).max(80),
        message: z.string().trim().min(1).max(1_000),
        evidence: z.array(
          z.object({
            quote: z.string().trim().min(1).max(1_000),
            locator: z.string().trim().min(1).max(240),
          }),
        ).max(4).optional(),
      }),
    ).max(12),
  }),
  placement: z.array(
    z.object({
      educationPhase: z.enum([
        'early_pregnancy',
        'second_trimester',
        'preparing_for_labor',
        'labor_and_birth',
        'newborn_care_and_feeding',
        'recovery_and_postpartum',
      ]),
      courseId: z.string().trim().max(200).optional(),
      moduleId: z.string().trim().max(200).optional(),
      lessonId: z.string().trim().max(200).optional(),
      contentFormat: z.enum([
        'source_only',
        'external_video',
        'figure_backed_card',
        'slide_style_lesson',
        'learner_content_draft',
      ]),
      confidence: z.enum(['high', 'medium', 'low']),
      rationale: z.string().trim().min(1).max(1_000),
    }),
  ).max(6),
  relatedContent: z.array(
    z.object({
      courseId: z.string().trim().min(1).max(200),
      moduleId: z.string().trim().max(200).optional(),
      lessonId: z.string().trim().max(200).optional(),
      contentBlockId: z.string().trim().max(200).optional(),
      relationship: z.enum(['overlaps', 'extends', 'fills_gap']),
      rationale: z.string().trim().min(1).max(1_000),
    }),
  ).max(12),
  proposedDraft: z.object({
    source: z.object({
      organization: z.string().trim().max(500).optional(),
      title: z.string().trim().max(500).optional(),
      url: z.string().url().optional(),
    }),
    externalVideo: z.object({
      title: z.string().trim().max(500).optional(),
      originalVideoUrl: z.string().url().optional(),
      transcriptUrl: z.string().url().optional(),
      publisher: z.string().trim().max(500).optional(),
      durationSeconds: z.number().int().positive().max(86_400).optional(),
      language: z.string().trim().max(40).optional(),
      learnerCaption: z.string().trim().max(2_000).optional(),
      altText: z.string().trim().max(2_000).optional(),
      eligibleForExternalVideoDraft: z.boolean(),
      ineligibilityReasons: z.array(z.string().trim().min(1).max(500)).max(8).optional(),
    }).optional(),
  }),
});

function safeMessage(error) {
  if (error instanceof Error && error.message.startsWith('SAFE:')) {
    return error.message.replace(/^SAFE:\s*/, '');
  }
  return 'The evaluation service could not complete this candidate. No learner content was created.';
}

function failSafe(message) {
  throw new Error(`SAFE: ${message}`);
}

function normalizeWhitespace(value) {
  return value.replace(/\s+/g, ' ').trim();
}

function decodeHtml(value) {
  return normalizeWhitespace(
    value
      .replace(/&amp;/gi, '&')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;|&apos;/gi, "'")
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>'),
  );
}

function isPublicIp(address) {
  const family = isIP(address);
  if (family === 4) {
    const [a, b] = address.split('.').map(Number);
    if (a === 0 || a === 10 || a === 127 || a >= 224) return false;
    if (a === 100 && b >= 64 && b <= 127) return false;
    if (a === 169 && b === 254) return false;
    if (a === 172 && b >= 16 && b <= 31) return false;
    if (a === 192 && (b === 0 || b === 168)) return false;
    if (a === 198 && (b === 18 || b === 19)) return false;
    return true;
  }
  if (family === 6) {
    const normalized = address.toLowerCase();
    if (
      normalized === '::' ||
      normalized === '::1' ||
      normalized.startsWith('fe80:') ||
      normalized.startsWith('fc') ||
      normalized.startsWith('fd')
    ) {
      return false;
    }
    const mappedV4 = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    return mappedV4 ? isPublicIp(mappedV4[1]) : true;
  }
  return false;
}

async function resolvePublicAddress(hostname) {
  const results = await lookup(hostname, { all: true, verbatim: true });
  if (results.length === 0 || results.some(({ address }) => !isPublicIp(address))) {
    failSafe('The candidate URL does not resolve to a permitted public internet address.');
  }
  return results[0];
}

async function validatePublicHttpsUrl(rawUrl, label) {
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    failSafe(`${label} is not a valid URL.`);
  }
  if (
    parsed.protocol !== 'https:' ||
    !parsed.hostname ||
    parsed.username ||
    parsed.password ||
    (parsed.port && parsed.port !== '443')
  ) {
    failSafe(`${label} must be a public HTTPS URL without embedded credentials.`);
  }
  await resolvePublicAddress(parsed.hostname);
  return parsed;
}

function requestText(url, redirectsRemaining = 3) {
  return new Promise(async (resolve, reject) => {
    try {
      const parsed = await validatePublicHttpsUrl(url, 'Candidate URL');
      const address = await resolvePublicAddress(parsed.hostname);
      const request = https.request(
        {
          hostname: parsed.hostname,
          port: 443,
          path: `${parsed.pathname}${parsed.search}`,
          method: 'GET',
          servername: parsed.hostname,
          timeout: 12_000,
          headers: {
            Accept: 'text/html, text/plain;q=0.9',
            'User-Agent': 'BabyReady-Media-Intake/1.0 (+https://babyready.app)',
          },
          lookup: (_hostname, _options, callback) =>
            callback(null, address.address, address.family),
        },
        (response) => {
          const statusCode = response.statusCode ?? 0;
          const location = response.headers.location;
          if ([301, 302, 303, 307, 308].includes(statusCode) && location) {
            response.resume();
            if (redirectsRemaining <= 0) {
              reject(new Error('SAFE: The candidate URL redirects too many times.'));
              return;
            }
            requestText(new URL(location, parsed).toString(), redirectsRemaining - 1)
              .then(resolve)
              .catch(reject);
            return;
          }
          if (statusCode < 200 || statusCode >= 300) {
            response.resume();
            reject(new Error('SAFE: The source website did not return a readable page.'));
            return;
          }
          const contentType = String(response.headers['content-type'] ?? '').toLowerCase();
          if (!contentType.includes('text/html') && !contentType.includes('text/plain')) {
            response.resume();
            reject(new Error('SAFE: This URL does not provide a readable web page for URL/video intake.'));
            return;
          }

          let received = 0;
          const chunks = [];
          response.on('data', (chunk) => {
            received += chunk.length;
            if (received > MAX_FETCHED_BYTES) {
              request.destroy(new Error('SAFE: The source page is too large to evaluate safely.'));
              return;
            }
            chunks.push(chunk);
          });
          response.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
        },
      );
      request.on('timeout', () => request.destroy(new Error('SAFE: The source website took too long to respond.')));
      request.on('error', reject);
      request.end();
    } catch (error) {
      reject(error);
    }
  });
}

function attribute(tag, name) {
  const match = tag.match(new RegExp(`${name}\\s*=\\s*(["'])(.*?)\\1`, 'i'));
  return match?.[2] ? decodeHtml(match[2]) : '';
}

function extractPage(html, originalUrl) {
  const meta = {};
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    const name = attribute(tag, 'property') || attribute(tag, 'name');
    const content = attribute(tag, 'content');
    if (name && content && !meta[name.toLowerCase()]) {
      meta[name.toLowerCase()] = content;
    }
  }
  const titleMatch = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  const title = normalizeWhitespace(
    meta['og:title'] || meta['twitter:title'] || decodeHtml(titleMatch?.[1] ?? ''),
  );
  const publisher = normalizeWhitespace(
    meta['og:site_name'] || meta.publisher || meta['article:publisher'] || '',
  );
  const description = normalizeWhitespace(
    meta['og:description'] || meta.description || meta['twitter:description'] || '',
  );
  const language = (html.match(/<html\b[^>]*\blang=(["'])(.*?)\1/i)?.[2] ?? '').trim();
  const text = normalizeWhitespace(
    decodeHtml(
      html
        .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
        .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, ' ')
        .replace(/<[^>]+>/g, ' '),
    ),
  ).slice(0, MAX_EXTRACTED_CHARS);
  return {
    canonicalUrl: meta['og:url'] || originalUrl,
    title: title || undefined,
    publisher: publisher || undefined,
    description: description || undefined,
    publicationDate: meta['article:published_time'] || undefined,
    updatedDate: meta['article:modified_time'] || undefined,
    language: language || undefined,
    text,
  };
}

function videoProvider(url) {
  const host = new URL(url).hostname.toLowerCase();
  if (['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be'].includes(host)) return 'youtube';
  if (['vimeo.com', 'www.vimeo.com'].includes(host)) return 'vimeo';
  return undefined;
}

function buildContentKind(intake, originalUrl) {
  if (intake.inputType === 'video_url') return 'video';
  const url = originalUrl.toLowerCase();
  if (url.includes('guideline') || url.includes('committee-opinion')) return 'guideline';
  if (url.includes('handout') || url.includes('patient')) return 'handout';
  return 'web_page';
}

async function invokeVertexAi(payload) {
  const client = await googleAuth.getClient();
  const accessToken = await client.getAccessToken();
  if (!accessToken.token) {
    failSafe('The evaluation service could not obtain its AI authorization token.');
  }
  const endpoint =
    `https://${VERTEX_LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}` +
    `/locations/${VERTEX_LOCATION}/publishers/google/models/${VERTEX_MODEL}:generateContent`;
  const instructions = [
    'You are an internal clinical educational-content intake assistant for BabyReady.',
    'Evaluate only the supplied public source metadata and excerpt. Do not infer missing facts or medical guidance.',
    'AI output is clinician-facing decision support. It must not recommend publication or make patient-specific recommendations.',
    'Favor source-only or adapt-only when rights, currency, accessibility, clinical scope, captions, transcript, or claim support is uncertain.',
    'Do not reproduce long source passages. Evidence quotes must be short and grounded in the excerpt.',
    'Return JSON only matching the requested schema.',
  ].join('\n');
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: instructions }] },
      contents: [{ role: 'user', parts: [{ text: JSON.stringify(payload) }] }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 4_000,
        responseMimeType: 'application/json',
      },
    }),
  });
  if (!response.ok) {
    failSafe('The AI evaluation service is unavailable. No learner content was created.');
  }
  const body = await response.json();
  const text = body?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof text !== 'string') {
    failSafe('The AI evaluation service returned an unusable assessment.');
  }
  try {
    return aiAnalysisSchema.parse(JSON.parse(text));
  } catch {
    failSafe('The AI evaluation service returned an assessment that did not pass BabyReady validation.');
  }
}

async function evaluate(intakeId) {
  const intakeRef = firestore.collection('mediaIntakes').doc(intakeId);
  let stage = 'validation';
  const intake = await firestore.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(intakeRef);
    if (!snapshot.exists) {
      failSafe('This media candidate no longer exists.');
    }
    const candidate = snapshot.data();
    if (!['web_url', 'video_url'].includes(candidate.inputType) || typeof candidate.originalUrl !== 'string') {
      failSafe('This candidate is not a supported URL or video intake record.');
    }
    if (candidate.status !== 'queued') {
      failSafe('This candidate is already being evaluated or has an editorial disposition.');
    }
    transaction.update(intakeRef, {
      status: 'extracting',
      evaluationRequestedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      failure: FieldValue.delete(),
    });
    return candidate;
  });

  try {
    const originalUrl = (await validatePublicHttpsUrl(intake.originalUrl, 'Candidate URL')).toString();
    stage = 'fetch';
    const html = await requestText(originalUrl);
    stage = 'extract';
    const page = extractPage(html, originalUrl);
    const provider = intake.inputType === 'video_url' ? videoProvider(originalUrl) : undefined;
    const transcriptUrl =
      typeof intake.transcriptUrl === 'string'
        ? (await validatePublicHttpsUrl(intake.transcriptUrl, 'Transcript URL')).toString()
        : undefined;
    const contentKind = buildContentKind(intake, originalUrl);
    const extractionWarnings = [];
    if (!page.text) extractionWarnings.push('The page did not provide readable body text.');
    if (intake.inputType === 'video_url' && !transcriptUrl) {
      extractionWarnings.push('No transcript or captions URL was supplied; confirm accessibility before using a video.');
    }
    if (intake.inputType === 'video_url' && !provider) {
      extractionWarnings.push('Only YouTube or Vimeo can become an external-video draft in the current media workflow.');
    }

    stage = 'analysis';
    const aiResult = await invokeVertexAi({
    schemaVersion: 1,
    candidate: {
      inputType: intake.inputType,
      originalUrl,
      submitterNote: typeof intake.submitterNote === 'string' ? intake.submitterNote : undefined,
      suggestedTopic: typeof intake.suggestedTopic === 'string' ? intake.suggestedTopic : undefined,
      sourceFingerprint: {
        canonicalUrl: page.canonicalUrl,
        title: page.title,
        publisher: page.publisher,
        publicationDate: page.publicationDate,
        updatedDate: page.updatedDate,
        language: page.language,
        contentKind,
        ...(intake.inputType === 'video_url'
          ? {
              video: {
                originalVideoUrl: originalUrl,
                host: new URL(originalUrl).hostname,
                captionsAvailable: transcriptUrl ? true : 'unknown',
                transcriptUrl,
              },
            }
          : {}),
      },
      extraction: {
        textAvailable: Boolean(page.text),
        transcriptAvailable: intake.inputType === 'video_url' ? (transcriptUrl ? true : 'unknown') : 'unknown',
        extractionWarnings,
      },
      sourceExcerpt: page.text,
    },
    });

    const analysisRef = intakeRef.collection('analyses').doc();
    const hasBlocker = aiResult.suitability.flags.some((flag) => flag.severity === 'blocker');
    await firestore.runTransaction(async (transaction) => {
      const current = await transaction.get(intakeRef);
      if (!current.exists || current.data().status !== 'extracting') {
        failSafe('This candidate changed while it was being evaluated; no assessment was saved.');
      }
      transaction.create(analysisRef, {
      id: analysisRef.id,
      intakeId,
      schemaVersion: 1,
      status: 'complete',
      createdAt: FieldValue.serverTimestamp(),
      workerVersion: WORKER_VERSION,
      sourceFingerprint: {
        canonicalUrl: page.canonicalUrl,
        title: page.title,
        publisher: page.publisher,
        publicationDate: page.publicationDate,
        updatedDate: page.updatedDate,
        language: page.language,
        contentKind,
        ...(intake.inputType === 'video_url'
          ? {
              video: {
                originalVideoUrl: originalUrl,
                host: new URL(originalUrl).hostname,
                captionsAvailable: transcriptUrl ? true : 'unknown',
                transcriptUrl,
              },
            }
          : {}),
      },
      extraction: {
        textAvailable: Boolean(page.text),
        transcriptAvailable: intake.inputType === 'video_url' ? (transcriptUrl ? true : 'unknown') : 'unknown',
        extractionWarnings,
      },
      ...aiResult,
      });
      transaction.update(intakeRef, {
        status: hasBlocker ? 'needs_attention' : 'evaluated',
        activeAnalysisId: analysisRef.id,
        evaluationCompletedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    });
  } catch (error) {
    await firestore.runTransaction(async (transaction) => {
      const current = await transaction.get(intakeRef);
      if (!current.exists || current.data().status !== 'extracting') {
        return;
      }
      transaction.update(intakeRef, {
        status: 'failed',
        failure: {
          stage: ['validation', 'fetch', 'extract', 'analysis'].includes(stage)
            ? stage
            : 'analysis',
          safeMessage: safeMessage(error),
        },
        updatedAt: FieldValue.serverTimestamp(),
      });
    });
    throw error;
  }
}

async function verifyAdmin(req) {
  const header = req.header('authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice('Bearer '.length) : '';
  if (!token) {
    const error = new Error('Missing Firebase authorization token.');
    error.statusCode = 401;
    throw error;
  }
  const decodedToken = await auth.verifyIdToken(token);
  if (decodedToken.admin !== true) {
    const error = new Error('Clinician administrator access is required.');
    error.statusCode = 403;
    throw error;
  }
  return decodedToken;
}

const app = express();
app.disable('x-powered-by');
app.use((req, res, next) => {
  const origin = req.header('origin');
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  }
  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }
  next();
});
app.use(express.json({ limit: '16kb', type: 'application/json' }));

app.get('/healthz', (_req, res) => {
  res.status(200).json({ ok: true, workerVersion: WORKER_VERSION });
});

app.post('/evaluate', async (req, res) => {
  try {
    await verifyAdmin(req);
    const { intakeId } = evaluateRequestSchema.parse(req.body);
    // Evaluation writes only clinician-visible records. The app can safely
    // show the job as queued while this request is in flight.
    await evaluate(intakeId);
    res.status(202).json({ accepted: true, intakeId });
  } catch (error) {
    const statusCode =
      typeof error === 'object' && error && 'statusCode' in error
        ? Number(error.statusCode)
        : 400;
    res.status(Number.isInteger(statusCode) ? statusCode : 400).json({
      accepted: false,
      message: safeMessage(error),
    });
  }
});

app.listen(PORT, () => {
  console.log(`BabyReady Media Intake worker listening on ${PORT}`);
});
