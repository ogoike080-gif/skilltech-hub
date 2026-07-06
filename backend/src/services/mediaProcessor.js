// backend/src/services/mediaProcessor.js

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
const HF_WHISPER_URL =
  'https://api-inference.huggingface.co/models/openai/whisper-base';

async function downloadToTemp(url, extension = 'mp4') {
  if (!url) {
    throw new Error('Recording URL missing');
  }

  const tempPath = path.join(
    os.tmpdir(),
    `${uuidv4()}.${extension}`
  );

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Download failed (${response.status})`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());

  await fsp.writeFile(tempPath, buffer);

  return tempPath;
}

async function cleanup(...files) {
  for (const file of files) {
    if (!file) continue;

    try {
      await fsp.unlink(file);
    } catch {}
  }
}

async function ffmpegAvailable() {
  try {
    await execFileAsync('ffmpeg', ['-version']);
    return true;
  } catch {
    return false;
  }
}

async function removeNoise(input) {
  const output = path.join(
    os.tmpdir(),
    `${uuidv4()}-clean.mp4`
  );

  await execFileAsync('ffmpeg', [
    '-i',
    input,
    '-af',
    'afftdn=nf=-25',
    '-c:v',
    'copy',
    '-c:a',
    'aac',
    '-b:a',
    '128k',
    '-y',
    output,
  ]);

  return output;
}

async function extractAudio(input) {
  const output = path.join(
    os.tmpdir(),
    `${uuidv4()}.mp3`
  );

  await execFileAsync('ffmpeg', [
    '-i',
    input,
    '-vn',
    '-acodec',
    'libmp3lame',
    '-ar',
    '16000',
    '-ac',
    '1',
    '-y',
    output,
  ]);

  return output;
}

async function transcribeAudio(audioPath) {
  if (!HF_API_KEY) {
    logger.warn('No HuggingFace API key.');
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
    throw new Error(
      `Whisper failed (${response.status})`
    );
  }

  const json = await response.json();

  if (Array.isArray(json.chunks)) {
    return json.chunks.map((c) => ({
      text: c.text.trim(),
      start: c.timestamp?.[0] || 0,
      end: c.timestamp?.[1] || 0,
    }));
  }

  if (json.text) {
    return [
      {
        text: json.text,
        start: 0,
        end: 30,
      },
    ];
  }

  return null;
}

function ts(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor(seconds / 60) % 60;
  const s = Math.floor(seconds % 60);
  const ms = Math.round((seconds % 1) * 1000);

  return (
    String(h).padStart(2, '0') +
    ':' +
    String(m).padStart(2, '0') +
    ':' +
    String(s).padStart(2, '0') +
    '.' +
    String(ms).padStart(3, '0')
  );
}

function buildVtt(segments) {
  let out = 'WEBVTT\n\n';

  segments.forEach((seg, i) => {
    out += `${i + 1}\n`;
    out += `${ts(seg.start)} --> ${ts(seg.end)}\n`;
    out += `${seg.text}\n\n`;
  });

  return out;
}

async function processRecordingMedia(recordingUrl, sessionId) {
  let raw = null;
  let clean = null;
  let audio = null;

  let cleanedVideoUrl = null;
  let captionUrl = null;

  try {
    logger.info(`Processing recording ${sessionId}`);

    raw = await downloadToTemp(recordingUrl);

    if (!(await ffmpegAvailable())) {
      logger.warn('ffmpeg not installed.');

      return {
        cleanedVideoUrl: null,
        captionUrl: null,
      };
    }

    try {
      clean = await removeNoise(raw);

      const buffer = await fsp.readFile(clean);

      cleanedVideoUrl = await uploadVideo(
        buffer,
        `sessions/${sessionId}-clean`
      );
    } catch (err) {
      logger.error('Noise reduction failed');
      logger.error(err.message);
    }

    try {
      audio = await extractAudio(clean || raw);

      const transcript = await transcribeAudio(audio);

      if (transcript) {
        const vtt = buildVtt(transcript);

        captionUrl = await uploadBuffer(
          Buffer.from(vtt),
          `sessions/${sessionId}-captions`,
          'raw'
        );
      }
    } catch (err) {
      logger.error('Caption generation failed');
      logger.error(err.message);
    }
  } catch (err) {
    logger.error(err.message);
  } finally {
    await cleanup(raw, clean, audio);
  }

  return {
    cleanedVideoUrl,
    captionUrl,
  };
}

module.exports = {
  processRecordingMedia,
};