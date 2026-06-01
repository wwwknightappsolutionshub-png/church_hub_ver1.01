/**
 * Load test — Devotional Hub AI endpoints (study outline, prayer, scripture).
 * Usage: ACCESS_TOKEN=... node scripts/load/devotional-ai.mjs
 */
import { parseLoadEnv, printSummary, requireToken, runLoad } from './_load-utils.mjs';

const { API_URL, TOKEN, CONCURRENCY, REQUESTS } = parseLoadEnv();
requireToken(TOKEN);

const endpoints = [
  {
    name: 'study-outline',
    url: `${API_URL}/devotional-hub/ai/study-outline`,
    body: {
      sourceType: 'CUSTOM_TOPIC',
      customTopic: 'Faith and perseverance',
      tone: 'ADULT',
      durationDays: 7,
    },
  },
  {
    name: 'prayer-points',
    url: `${API_URL}/devotional-hub/ai/prayer-points`,
    body: {
      source: 'TOPIC',
      prompt: 'Gratitude and hope',
    },
  },
  {
    name: 'ask-scripture',
    url: `${API_URL}/devotional-hub/ai/ask-scripture`,
    body: {
      question: 'What does it mean to abide in Christ?',
      depth: 'SIMPLE',
    },
  },
];

const pick = endpoints[parseInt(process.env.LOAD_AI_ENDPOINT ?? '0', 10) % endpoints.length];

const summary = await runLoad({
  url: pick.url,
  method: 'POST',
  body: pick.body,
  headers: { Authorization: `Bearer ${TOKEN}` },
  CONCURRENCY,
  REQUESTS,
});

printSummary({ ...summary, endpoint: pick.name });
