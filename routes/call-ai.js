const express = require('express');
const router = express.Router();
const twilio = require('twilio');
const fetch = require('node-fetch'); // For ChatGPT API
const fs = require('fs'); // For logging
const Conversation = require('../models/conversationModel');
require('dotenv').config();

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const openAiApiKey = process.env.OPENAI_API_KEY;
const client = twilio(accountSid, authToken);

// Twilio webhook to handle incoming calls
router.post('/incoming-call', (req, res) => {
    const twiml = new twilio.twiml.VoiceResponse();

    // Enable recording and gather speech input
    twiml.record({
        transcribe: true,
        transcribeCallback: '/log-transcription',
        maxLength: 3600, // 1-hour max recording
        recordingStatusCallback: '/log-recording',
    });

    twiml.gather({
        input: 'speech',
        action: '/process-speech',
        timeout: 5,
    }).say('Hello! Please ask me your question.');

    res.type('text/xml');
    res.send(twiml.toString());
});


router.post('/process-speech', async (req, res) => {
    const userSpeech = req.body.SpeechResult; // Captured speech
    const callSid = req.body.CallSid; // Unique call identifier

    console.log('User said:', userSpeech);

    try {
        // Find or create a conversation document
        let conversation = await Conversation.findOne({ callSid });
        if (!conversation) {
            conversation = new Conversation({ callSid, logs: [] });
        }

        // Log the user's input
        conversation.logs.push({ role: 'user', content: userSpeech });

        // Send the speech to ChatGPT API
        const chatgptResponse = await sendToChatGPT(userSpeech);

        // Log the ChatGPT response
        conversation.logs.push({ role: 'chatGPT', content: chatgptResponse });

        // Save the updated conversation
        await conversation.save();

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
    } catch (error) {
        console.error('Error saving conversation:', error);
        res.status(500).send('Internal Server Error');
    }
});


// Log conversation to a file
function logConversation(logText) {
    const logFile = 'conversation_logs.txt';
    const timestamp = new Date().toISOString();
    const entry = `[${timestamp}] ${logText}\n`;

    fs.appendFile(logFile, entry, (err) => {
        if (err) console.error('Error logging conversation:', err.message);
    });
}

// Log transcription (optional for recorded calls)
router.post('/log-transcription', (req, res) => {
    const transcriptionText = req.body.TranscriptionText;
    console.log('Transcription received:', transcriptionText);

    logConversation(`Transcription: ${transcriptionText}`);
    res.sendStatus(200);
});

// Log recording (status callback)
router.post('/log-recording', (req, res) => {
    const recordingUrl = req.body.RecordingUrl;
    const recordingSid = req.body.RecordingSid;

    console.log('Recording available at:', recordingUrl);
    logConversation(`Recording URL: ${recordingUrl}`);

    res.sendStatus(200);
});

// Function to send data to ChatGPT
async function sendToChatGPT(userInput) {
    try {
        const url = 'https://api.openai.com/v1/chat/completions';

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${openAiApiKey}`,
            },
            body: JSON.stringify({
                model: 'gpt-3.5-turbo',
                messages: [{ role: 'user', content: userInput }],
            }),
        });

        if (!response.ok) {
            throw new Error(`ChatGPT API error: ${response.status} - ${response.statusText}`);
        }

        const data = await response.json();
        return data.choices[0].message.content || 'Sorry, I could not process your question.';
    } catch (error) {
        console.error('Error communicating with ChatGPT API:', error.message);
        return 'I am experiencing issues retrieving an answer. Please try again later.';
    }
}

module.exports = router;
