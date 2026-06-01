/**
 * Load test — youth chat channels + messages.
 * Usage: node scripts/load/youth-chat.mjs
 * Env: ACCESS_TOKEN, CHANNEL_ID (for messages)
 */
const API_URL = process.env.API_URL ?? 'http://localhost:4000/api/v1';
const TOKEN = process.env.ACCESS_TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID;
const REQUESTS = parseInt(process.env.LOAD_REQUESTS ?? '100', 10);

if (!TOKEN) {
  console.error('Set ACCESS_TOKEN');
  process.exit(1);
}

const headers = { Authorization: `Bearer ${TOKEN}` };

async function run() {
  const start = Date.now();
  const channelsRes = await fetch(`${API_URL}/youth/chat/channels`, { headers });
  const channelsMs = Date.now() - start;

  let messagesMs = null;
  if (CHANNEL_ID) {
    const mStart = Date.now();
    const msgRes = await fetch(`${API_URL}/youth/chat/channels/${CHANNEL_ID}/messages`, {
      headers,
    });
    messagesMs = Date.now() - mStart;
    console.log(
      JSON.stringify(
        {
          channels: { status: channelsRes.status, ms: channelsMs },
          messages: { status: msgRes.status, ms: messagesMs, channelId: CHANNEL_ID },
          repeat: REQUESTS,
        },
        null,
        2,
      ),
    );

    const times = [];
    for (let i = 0; i < REQUESTS; i++) {
      const t0 = Date.now();
      await fetch(`${API_URL}/youth/chat/channels/${CHANNEL_ID}/messages`, { headers });
      times.push(Date.now() - t0);
    }
    times.sort((a, b) => a - b);
    console.log(
      JSON.stringify({
        messagesP95: times[Math.floor(times.length * 0.95)],
        messagesAvg: Math.round(times.reduce((a, b) => a + b, 0) / times.length),
      }),
    );
  } else {
    console.log(
      JSON.stringify(
        { channels: { status: channelsRes.status, ms: channelsMs }, hint: 'Set CHANNEL_ID for message load' },
        null,
        2,
      ),
    );
  }
}

run().catch(console.error);
