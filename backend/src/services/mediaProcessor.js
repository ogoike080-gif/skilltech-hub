// backend/src/services/mediaProcessor.js
//
// Post-processes a recorded live session: removes background noise
// from the audio (via ffmpeg) and generates captions (via Hugging
// Face's hosted Whisper inference API), then uploads both results
// to Cloudinary and returns their URLs.
//
// Both steps are best-effort — if either fails, we log and return
// whatever succeeded rather than throwing, since a partial result
// (e.g. cleaned video but no captions) is still useful and we never
// want this to crash the webhook handler that calls it.

const fs = require('fs');
const fsp = require('fs/promises');
const os = require('os');
const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');
const { v4: uuidv4 } = require('uuid');

const { uploadVideo, uploadBuffer } = require('./cloudinary');
const { logger } = require('../utils/logger');

const execFileAsync = promisify(execFile);

const HF_API_KEY = process.env.HUGGINGFACE_API_KEY;
const HF_WHISPER_URL = 'https://api-inference.huggingface.co/models/openai/whisper-base';

// ── Helpers ──────────────────────────────────────────────────

async function downloadToTemp(url, extension) {
  const tempPath = path.join(os.tmpdir(), `${uuidv4()}.${extension}`);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download ${url}: HTTP ${response.status}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  await fsp.writeFile(tempPath, buffer);
  return tempPath;
}

async function cleanupFiles(...paths) {
  for (const p of paths) {
    if (p) {
      await fsp.unlink(p).catch(() => {}); // ignore if already gone
    }
  }
}

// ── Step 1: Noise removal ───────────────────────────────────
// Runs ffmpeg's afftdn (FFT-based denoise) filter on the video's
// audio track, re-muxing the cleaned audio with the original video
// stream (video re-encoding is NOT needed — only audio is touched,
// which keeps this fast).

async function removeNoise(inputPath) {
  const outputPath = path.join(os.tmpdir(), `${uuidv4()}-clean.mp4`);

  await execFileAsync('ffmpeg', [
    '-i', inputPath,
    '-af', 'afftdn=nf=-25',     // FFT denoise filter, moderate strength
    '-c:v', 'copy',              // don't re-encode video — much faster
    '-c:a', 'aac',
    '-b:a', '128k',
    '-y',                        // overwrite output if it exists
    outputPath,
  ]);

  return outputPath;
}

// ── Step 2: Extract audio for transcription ─────────────────
// Whisper works on audio alone — pulling just the audio track
// keeps the upload to Hugging Face small and fast.

async function extractAudio(inputPath) {
  const outputPath = path.join(os.tmpdir(), `${uuidv4()}.mp3`);

  await execFileAsync('ffmpeg', [
    '-i', inputPath,
    '-vn',                       // no video
    '-acodec', 'libmp3lame',
    '-ar', '16000',              // 16kHz — what Whisper expects
    '-ac', '1',                  // mono
    '-y',
    outputPath,
  ]);

  return outputPath;
}

// ── Step 3: Transcribe via Hugging Face's hosted Whisper ────

async function transcribeAudio(audioPath) {
  if (!HF_API_KEY) {
    logger.warn('HUGGINGFACE_API_KEY not set — skipping transcription');
    return null;
  }

  const audioBuffer = await fsp.readFile(audioPath);

  const response = await fetch(HF_WHISPER_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${HF_API_KEY}`,
      'Content-Type': 'audio/mpeg',
    },
    body: audioBuffer,
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(`Hugging Face transcription failed: HTTP ${response.status} ${errText}`);
  }

  const result = await response.json();

  // The free inference API returns either { text } for short clips,
  // or { chunks: [{ text, timestamp: [start, end] }] } for longer
  // ones depending on model/request. Handle both.
  if (result.chunks && Array.isArray(result.chunks)) {
    return result.chunks.map(c => ({
      text: c.text.trim(),
      start: c.timestamp?.[0] ?? 0,
      end: c.timestamp?.[1] ?? 0,
    }));
  }

  if (result.text) {
    // No timestamps available — return as one block covering the
    // whole clip. Less useful as captions but still functional.
    return [{ text: result.text.trim(), start: 0, end: 0 }];
  }

  throw new Error('Unexpected response shape from Hugging Face transcription');
}

// ── Step 4: Format transcript as WebVTT ─────────────────────

function formatVttTimestamp(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.round((seconds % 1) * 1000);
  const pad = (n, len = 2) => String(n).padStart(len, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}.${pad(ms, 3)}`;
}

function buildVtt(segments) {
  let vtt = 'WEBVTT\n\n';

  segments.forEach((seg, i) => {
    // If we have no real timestamps (start === end === 0 for all
    // segments, the "no chunk data" fallback case), just show the
    // whole transcript as a single cue rather than fabricating fake
    // timing that would look broken in a video player.
    const hasTiming = seg.end > seg.start;
    const start = hasTiming ? formatVttTimestamp(seg.start) : '00:00:00.000';
    const end = hasTiming ? formatVttTimestamp(seg.end) : '00:00:30.000';

    vtt += `${i + 1}\n${start} --> ${end}\n${seg.text}\n\n`;
  });

  return vtt;
}

// ── Main entry point ─────────────────────────────────────────
// Call this with the raw recording URL and a unique identifier
// (e.g. the live session id) for naming the Cloudinary assets.
//
// Returns { cleanedVideoUrl, captionUrl } — either may be null if
// that step failed or was skipped (no Cloudinary/HF credentials).

async function processRecordingMedia(recordingUrl, sessionId) {
  let rawPath, cleanedPath, audioPath;

  let cleanedVideoUrl = null;
  let captionUrl = null;

  try {
    logger.info(`[mediaProcessor] Downloading recording for session ${sessionId}`);
    rawPath = await downloadToTemp(recordingUrl, 'mp4');

    // ── Noise removal ──
    try {
      logger.info(`[mediaProcessor] Running noise reduction for session ${sessionId}`);
      cleanedPath = await removeNoise(rawPath);

      const cleanedBuffer = await fsp.readFile(cleanedPath);
      cleanedVideoUrl = await uploadVideo(cleanedBuffer, `sessions/${sessionId}-clean`);
      logger.info(`[mediaProcessor] Uploaded cleaned video for session ${sessionId}`);
    } catch (err) {
      logger.error(`[mediaProcessor] Noise removal failed for session ${sessionId}:`, err.message);
    }

    // ── Captions ──
    try {
      logger.info(`[mediaProcessor] Extracting audio for transcription, session ${sessionId}`);
      // Use the cleaned video if we have it (better transcription
      // accuracy with less background noise), otherwise fall back
      // to the original.
      audioPath = await extractAudio(cleanedPath || rawPath);

      const segments = await transcribeAudio(audioPath);
      if (segments) {
        const vtt = buildVtt(segments);
        captionUrl = await uploadBuffer(
          Buffer.from(vtt, 'utf-8'),
          `sessions/${sessionId}-captions`,
          'raw'
        );
        logger.info(`[mediaProcessor] Uploaded captions for session ${sessionId}`);
      }
    } catch (err) {
      logger.error(`[mediaProcessor] Transcription failed for session ${sessionId}:`, err.message);
    }
  } catch (err) {
    logger.error(`[mediaProcessor] Fatal error processing session ${sessionId}:`, err.message);
  } finally {
    await cleanupFiles(rawPath, cleanedPath, audioPath);
  }

  return { cleanedVideoUrl, captionUrl };
}

module.exports = { processRecordingMedia };
