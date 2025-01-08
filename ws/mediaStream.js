const WebSocket = require('ws');
const fs = require('fs');
const { sendToChatGPT } = require('../utils/openai');

function setupMediaStream(server) {
    const wss = new WebSocket.Server({ server });

    wss.on('connection', (ws) => {
        console.log('WebSocket connection established with Twilio Media Stream.');

        ws.on('message', async (data) => {
            // Save raw audio (PCM data) for analysis
            fs.appendFileSync('./audio/audio.raw', data);

            // Placeholder for processing or sending to a speech-to-text service
            console.log('Received audio data chunk.');

            // Simulate sending query to OpenAI and respond
            const response = await sendToChatGPT('What the user said based on audio');
            console.log('AI Response:', response);
        });

        ws.on('close', () => {
            console.log('WebSocket connection closed.');
        });
    });
}

module.exports = { setupMediaStream };
