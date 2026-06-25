const { logger } = require('../utils/logger');

let client = null;
let redisAvailable = false;

// In-memory fallback for when Redis is not running (local dev)
const memCache = new Map();
const memExpiry = new Map();

const fallback = {
  get: async (key) => {
    const exp = memExpiry.get(key);
    if (exp && Date.now() > exp) { memCache.delete(key); memExpiry.delete(key); return null; }
    return memCache.get(key) || null;
  },
  setEx: async (key, ttl, val) => { memCache.set(key, val); memExpiry.set(key, Date.now() + ttl * 1000); },
  del:   async (key) => { memCache.delete(key); memExpiry.delete(key); },
  keys:  async (pattern) => {
    const re = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    return [...memCache.keys()].filter(k => re.test(k));
  },
  incr:  async (key) => { const v = parseInt(memCache.get(key) || '0') + 1; memCache.set(key, String(v)); return v; },
 sAdd: async (key, val) => {
  let s = memCache.get(key);

  // Ensure the stored value is always a Set
  if (!(s instanceof Set)) {
    s = new Set();
  }

  s.add(String(val));
  memCache.set(key, s);

  return s.size;
},

sRem: async (key, val) => {
  const s = memCache.get(key);

  if (s instanceof Set) {
    s.delete(String(val));
  }
},

sCard: async (key) => {
  const s = memCache.get(key);

  return s instanceof Set ? s.size : 0;
},
  lPush: async (key, val) => { const a = memCache.get(key) || []; a.unshift(val); memCache.set(key, a); return a.length; },
  lTrim: async (key, s, e) => { const a = memCache.get(key) || []; memCache.set(key, a.slice(s, e + 1)); },
  on: () => {},
  connect: async () => {},
};

async function connectRedis() {
  if (!process.env.REDIS_URL) {
    logger.warn('REDIS_URL not set — using in-memory fallback (not suitable for production)');
    client = fallback;
    return client;
  }

  try {
    const { createClient } = require('redis');
    client = createClient({
      url: process.env.REDIS_URL,
      password: process.env.REDIS_PASSWORD || undefined,
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 3) {
            logger.warn('Redis unavailable after 3 retries — switching to in-memory fallback');
            client = fallback;
            redisAvailable = false;
            return false; // stop retrying
          }
          return Math.min(retries * 200, 1000);
        },
        connectTimeout: 3000,
      },
    });

    client.on('error', (err) => {
      if (redisAvailable) logger.warn('Redis error — falling back to memory:', err.message);
      redisAvailable = false;
      client = fallback;
    });

    await Promise.race([
      client.connect(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000)),
    ]);

    redisAvailable = true;
    logger.info('Redis connected');
  } catch (err) {
    logger.warn(`Redis unavailable (${err.message}) — using in-memory fallback. OK for local dev.`);
    client = fallback;
  }

  return client;
}

function getRedis() {
  return client || fallback;
}

async function cacheGet(key) {
  try { const v = await getRedis().get(key); return v ? JSON.parse(v) : null; } catch { return null; }
}
async function cacheSet(key, value, ttlSeconds = 300) {
  try { await getRedis().setEx(key, ttlSeconds, JSON.stringify(value)); } catch {}
}
async function cacheDel(key) {
  try { await getRedis().del(key); } catch {}
}
async function cacheInvalidatePattern(pattern) {
  try { const keys = await getRedis().keys(pattern); if (keys.length) { for (const k of keys) await getRedis().del(k); } } catch {}
}

module.exports = { connectRedis, getRedis, cacheGet, cacheSet, cacheDel, cacheInvalidatePattern };
