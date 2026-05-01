const JSON_HEADER = { 'Content-Type': 'application/json' };

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: JSON_HEADER,
      body: JSON.stringify({ error: 'Method not allowed. Use POST.' })
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

  return {
    statusCode: 200,
    headers: JSON_HEADER,
    body: JSON.stringify(data)
  };
};
