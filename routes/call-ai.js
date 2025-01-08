const express = require('express');
const router = express.Router();
const twilio = require('twilio');
const fetch = require('node-fetch'); // For downloading audio and ChatGPT API
const fs = require('fs'); // File system for saving audio locally
const { spawn } = require('child_process'); // For speech-to-text processing
require('dotenv').config();

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);

// Twilio webhook to handle incoming calls
router.post('/incoming-call', (req, res) => {
    const twiml = new twilio.twiml.VoiceResponse();

    // Gather speech input
    twiml.gather({
        input: 'speech',
        action: '/process-speech', // After speech is captured, send it here
        timeout: 5,
    }).say('Hello! Please ask me your question.');

    res.type('text/xml');
    res.send(twiml.toString());
});

// Process the speech
router.post('/process-speech', async (req, res) => {
    const userSpeech = req.body.SpeechResult; // Captured speech
    console.log('User said:', userSpeech);

    // Send the speech to ChatGPT API
    const chatgptResponse = await sendToChatGPT(userSpeech);

    // Respond to the user
    const twiml = new twilio.twiml.VoiceResponse();
    twiml.say(chatgptResponse); // Twilio says the ChatGPT response

    // Gather more input for a two-way conversation
    twiml.gather({
        input: 'speech',
        action: '/process-speech',
        timeout: 5,
    });

    res.type('text/xml');
    res.send(twiml.toString());
});

// Function to send data to ChatGPT
async function sendToChatGPT(userInput) {
    // Use your OpenAI API key and endpoint
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

module.exports = router;