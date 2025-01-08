const fetch = require('node-fetch');

async function sendToChatGPT(userInput) {
    const apiKey = process.env.OPENAI_API_KEY;
    const url = 'https://api.openai.com/v1/chat/completions';

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model: 'gpt-3.5-turbo',
            messages: [{ role: 'user', content: userInput }],
        }),
    });

    const data = await response.json();
    return data.choices[0].message.content;
}

module.exports = { sendToChatGPT };
