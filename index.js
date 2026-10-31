import express from 'express';
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { validateRequest, ValidationError } from './lib/validation.js';
import { createDemoResponse } from './lib/demo.js';
import { createGeminiGenerator, createGenerationRequest, validateGeneration, GenerationError } from './lib/gemini.js';

dotenv.config({ quiet: true });

const directory = path.dirname(fileURLToPath(import.meta.url));
const messages = {
  id: {
    invalid: 'Data latihan tidak valid. Periksa pengaturan dan mulai ulang sesi.',
    tooLarge: 'Data percakapan terlalu besar. Mulai sesi latihan baru.',
    contentType: 'Kirim data latihan dalam format JSON.',
    rate: 'Terlalu banyak permintaan. Coba lagi beberapa menit lagi.',
    auth: 'Akses Gemini ditolak. Periksa API key dan izin project pada konfigurasi server.',
    quota: 'Batas permintaan atau kuota Gemini tercapai. Tunggu sebelum mencoba lagi, atau periksa kuota project.',
    model: 'Model Gemini belum tersedia untuk project ini. Periksa GEMINI_MODEL pada konfigurasi server.',
    unavailable: 'Gemini belum dapat dihubungi. Coba lagi sebentar; jawaban Anda tetap tersimpan di halaman ini.',
    invalidResponse: 'Respons Gemini belum dapat dibaca. Silakan coba lagi.',
    timeout: 'Gemini membutuhkan waktu terlalu lama. Silakan coba lagi.',
    notFound: 'Endpoint tidak ditemukan.',
  },
  en: {
    invalid: 'Invalid practice data. Check your settings and restart the session.',
    tooLarge: 'This conversation is too large. Start a new practice session.',
    contentType: 'Send practice data as JSON.',
    rate: 'Too many requests. Please try again in a few minutes.',
    auth: 'Gemini access was denied. Check the server API key and project permissions.',
    quota: 'The Gemini request limit or quota has been reached. Wait before retrying, or check your project quota.',
    model: 'The Gemini model is unavailable for this project. Check GEMINI_MODEL in the server configuration.',
    unavailable: 'Gemini is unavailable. Please try again shortly; your answer remains on this page.',
    invalidResponse: 'The Gemini response could not be read. Please try again.',
    timeout: 'Gemini took too long to respond. Please try again.',
    notFound: 'Endpoint not found.',
  },
};

function languageFor(req) {
  return req.body?.settings?.language === 'en' ? 'en' : 'id';
}

function classifyGenerationError(error) {
  if (error?.code === 'TIMEOUT' || error?.name === 'AbortError' || error?.name === 'TimeoutError') {
    return { status: 504, code: 'AI_TIMEOUT', message: 'timeout' };
  }
  if (error instanceof GenerationError && error.code === 'INVALID_RESPONSE') {
    return { status: 502, code: 'AI_RESPONSE_INVALID', message: 'invalidResponse' };
  }
  const status = Number(error?.status ?? error?.statusCode);
  const invalidKey = status === 400 && typeof error?.message === 'string' && /API key not valid/i.test(error.message);
  if (status === 401 || status === 403 || invalidKey) {
    return { status: 502, code: 'AI_AUTH_FAILED', message: 'auth' };
  }
  if (status === 429) {
    return { status: 429, code: 'AI_RATE_LIMITED', message: 'quota', retryAfter: '60' };
  }
  if (status === 404) {
    return { status: 502, code: 'AI_MODEL_UNAVAILABLE', message: 'model' };
  }
  return { status: 502, code: 'AI_UNAVAILABLE', message: 'unavailable' };
}

// A bounded, process-local limiter is enough for this single-server learning project.
function createRateLimiter() {
  const clients = new Map();
  const windowMs = 10 * 60 * 1000;
  return (req, res, next) => {
    const now = Date.now();
    for (const [key, entry] of clients) {
      if (entry.until <= now) clients.delete(key);
    }
    const key = req.ip || 'local';
    let entry = clients.get(key);
    if (!entry) {
      if (clients.size >= 1000) {
        res.set('Retry-After', '60');
        return res.status(429).json({ error: messages[languageFor(req)].rate, code: 'RATE_LIMITED' });
      }
      entry = { count: 0, until: now + windowMs };
      clients.set(key, entry);
    }
    entry.count += 1;
    if (entry.count > 30) {
      res.set('Retry-After', String(Math.max(1, Math.ceil((entry.until - now) / 1000))));
      return res.status(429).json({ error: messages[languageFor(req)].rate, code: 'RATE_LIMITED' });
    }
    next();
  };
}

async function withTimeout(promise) {
  let timer;
  const deadline = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new GenerationError('TIMEOUT')), 60_000);
    timer.unref?.();
  });
  try {
    return await Promise.race([promise, deadline]);
  } finally {
    clearTimeout(timer);
  }
}

export function createApp({
  apiKey = process.env.GEMINI_API_KEY,
  model = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite',
  generate,
} = {}) {
  const app = express();
  const key = typeof apiKey === 'string' ? apiKey.trim() : '';
  const mode = key ? 'live' : 'demo';
  const generateContent = mode === 'live' ? (generate || createGeminiGenerator(key)) : null;

  app.disable('x-powered-by');
  app.use((req, res, next) => {
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('Referrer-Policy', 'same-origin');
    if (req.path.startsWith('/api/')) res.set('Cache-Control', 'no-store');
    next();
  });
  app.use(express.json({ limit: '100kb', strict: true }));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', mode, ...(mode === 'live' ? { model } : {}) });
  });

  app.post('/api/chat', createRateLimiter(), async (req, res) => {
    const localized = messages[languageFor(req)];
    if (!req.is('application/json')) {
      return res.status(415).json({ error: localized.contentType, code: 'JSON_REQUIRED' });
    }
    let input;
    try {
      input = validateRequest(req.body);
    } catch (error) {
      if (error instanceof ValidationError) {
        return res.status(400).json({ error: localized.invalid, code: 'INVALID_REQUEST' });
      }
      throw error;
    }

    if (mode === 'demo') return res.json(createDemoResponse(input));

    try {
      const generated = await withTimeout(Promise.resolve().then(() => generateContent(createGenerationRequest(input, model))));
      const result = validateGeneration(generated, input.action);
      // Credentials never belong in model output, even with an injected generator.
      if (key.length >= 8 && JSON.stringify(result).includes(key)) throw new GenerationError('INVALID_RESPONSE');
      return res.json({ mode: 'live', ...result });
    } catch (error) {
      const failure = classifyGenerationError(error);
      // Deliberately do not send/log provider messages: they can contain credentials or request data.
      if (failure.retryAfter) res.set('Retry-After', failure.retryAfter);
      return res.status(failure.status).json({
        error: localized[failure.message],
        code: failure.code,
      });
    }
  });

  app.use('/api', (req, res) => res.status(404).json({ error: messages[languageFor(req)].notFound, code: 'NOT_FOUND' }));
  app.use(express.static(path.join(directory, 'public')));
  app.use((error, req, res, _next) => {
    const localized = messages[languageFor(req)];
    if (error?.type === 'entity.too.large') {
      return res.status(413).json({ error: localized.tooLarge, code: 'BODY_TOO_LARGE' });
    }
    if (error?.type === 'entity.parse.failed') {
      return res.status(400).json({ error: localized.invalid, code: 'INVALID_JSON' });
    }
    return res.status(500).json({ error: localized.unavailable, code: 'SERVER_ERROR' });
  });
  return app;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const app = createApp();
  const port = Number(process.env.PORT) || 3000;
  app.listen(port, '127.0.0.1', () => {
    const mode = process.env.GEMINI_API_KEY?.trim() ? 'Gemini aktif' : 'demo contoh, belum dinilai AI';
    console.log(`SiapKerja berjalan di http://127.0.0.1:${port} (${mode})`);
  });
}
