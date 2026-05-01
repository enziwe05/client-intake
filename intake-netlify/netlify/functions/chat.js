const JSON_HEADER = { 'Content-Type': 'application/json' };

const RATE_LIMIT_MAX = 3;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const rateLimitStore = new Map(); // ip -> { count, resetTime }

function getClientIp(headers) {
  return (
    headers['x-nf-client-connection-ip'] ||
    headers['client-ip'] ||
    (headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    'unknown'
  );
}

function isRateLimited(ip) {
  const now = Date.now();

  // purge expired entries to prevent unbounded memory growth
  for (const [key, entry] of rateLimitStore) {
    if (now > entry.resetTime) rateLimitStore.delete(key);
  }

  const entry = rateLimitStore.get(ip);

  if (!entry || now > entry.resetTime) {
    rateLimitStore.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  if (entry.count >= RATE_LIMIT_MAX) return true;

  entry.count++;
  return false;
}

async function sendBriefEmail(briefContent) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`
    },
    body: JSON.stringify({
      from: 'Intake Bot <onboarding@resend.dev>',
      to: 'dlaminienziwe9@gmail.com',
      subject: 'New Project Brief Submitted',
      text: briefContent
    })
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.message || `Resend API error (HTTP ${response.status})`);
  }
}

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: JSON_HEADER,
      body: JSON.stringify({ error: 'Method not allowed. Use POST.' })
    };
  }

  const clientIp = getClientIp(event.headers);
  if (isRateLimited(clientIp)) {
    return {
      statusCode: 429,
      headers: JSON_HEADER,
      body: JSON.stringify({ error: "You've reached the maximum number of sessions. Please contact the developer directly." })
    };
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return {
      statusCode: 500,
      headers: JSON_HEADER,
      body: JSON.stringify({ error: 'Server configuration error: API key not set.' })
    };
  }

  let requestBody;
  try {
    requestBody = JSON.parse(event.body);
  } catch {
    return {
      statusCode: 400,
      headers: JSON_HEADER,
      body: JSON.stringify({ error: 'Invalid JSON in request body.' })
    };
  }

  if (!requestBody.model || !requestBody.messages) {
    return {
      statusCode: 400,
      headers: JSON_HEADER,
      body: JSON.stringify({ error: 'Request body must include "model" and "messages".' })
    };
  }

  let response;
  try {
    response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(requestBody)
    });
  } catch (err) {
    return {
      statusCode: 502,
      headers: JSON_HEADER,
      body: JSON.stringify({ error: 'Could not reach Anthropic API. Please try again.' })
    };
  }

  let data;
  try {
    data = await response.json();
  } catch {
    return {
      statusCode: 502,
      headers: JSON_HEADER,
      body: JSON.stringify({ error: `Anthropic API returned an unreadable response (HTTP ${response.status}).` })
    };
  }

  if (!response.ok) {
    const message = data?.error?.message || `Anthropic API error (HTTP ${response.status}).`;
    return {
      statusCode: response.status,
      headers: JSON_HEADER,
      body: JSON.stringify({ error: message })
    };
  }

  const replyText = data?.content?.[0]?.text || '';
  const briefMatch = replyText.match(/---BRIEF START---([\s\S]*?)---BRIEF END---/);

  if (briefMatch && process.env.RESEND_API_KEY) {
    try {
      await sendBriefEmail(briefMatch[1].trim());
    } catch (err) {
      console.error('Failed to send brief email:', err.message);
    }
  }

  return {
    statusCode: 200,
    headers: JSON_HEADER,
    body: JSON.stringify(data)
  };
};
