require('dotenv').config();
const axios = require('axios');

async function main() {
  console.log('start');
  const key = process.env.GROQ_API_KEY;
  console.log('has key:', Boolean(key), 'len:', key ? key.length : 0);
  console.log('base url:', process.env.GROQ_BASE_URL);
  console.log('model:', process.env.GROQ_MODEL);
  try {
    const resp = await axios.post(
      (process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1').replace(/\/$/, '') + '/chat/completions',
      {
        model: process.env.GROQ_MODEL,
        temperature: 0.1,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: 'Return JSON only: {"ok": true}' },
          { role: 'user', content: 'ping' },
        ],
      },
      { headers: { authorization: 'Bearer ' + key, 'content-type': 'application/json' }, timeout: 20000 },
    );
    console.log('SUCCESS status:', resp.status);
    console.log('content:', resp.data.choices?.[0]?.message?.content);
  } catch (err) {
    console.error('FAILED');
    console.error('message:', err.message);
    if (err.response) {
      console.error('http status:', err.response.status);
      console.error('response data:', JSON.stringify(err.response.data));
    }
  }
}
main();
