const express = require('express');
const twilio = require('twilio');
const fetch = require('node-fetch');
const mongoose = require('mongoose');
const Conversation = require('../models/conversationModel');
require('dotenv').config();


const router = express.Router();

// In-memory storage for conversations
const ongoingConversations = {};

// Twilio webhook to handle the start of the call
router.post('/incoming-call', (req, res) => {
    const twiml = new twilio.twiml.VoiceResponse();

    // Start a conversation in memory when the call starts
    const callSid = req.body.CallSid;
    ongoingConversations[callSid] = {
        callSid: callSid,
        logs: []
    };

    twiml.say('Hello! Please ask me your question.');

    // Gather speech input
    twiml.gather({
        input: 'speech',
        action: '/process-speech', // After speech is captured, send it here
        timeout: 5,
    });

    res.type('text/xml');
    res.send(twiml.toString());
});

// Process the speech input from the user
router.post('/process-speech', async (req, res) => {
    const userSpeech = req.body.SpeechResult; // Captured speech from user
    const callSid = req.body.CallSid; // Unique Call SID for the session
    console.log('User said:', userSpeech);

    // Send the user's speech to ChatGPT API
    const chatgptResponse = await sendToChatGPT(userSpeech);

    // Store conversation in-memory
    if (ongoingConversations[callSid]) {
        ongoingConversations[callSid].logs.push({ role: 'user', content: userSpeech });
        ongoingConversations[callSid].logs.push({ role: 'chatGPT', content: chatgptResponse });
    }

    console.log(`Conversation for CallSid ${callSid}:`, ongoingConversations[callSid]);

    // Respond to the user via Twilio
    const twiml = new twilio.twiml.VoiceResponse();
    twiml.say(chatgptResponse);

    // Gather more input for a two-way conversation
    twiml.gather({
        input: 'speech',
        action: '/process-speech',
        timeout: 5,
    });

    res.type('text/xml');
    res.send(twiml.toString());
});

// Function to send data to ChatGPT API
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

// Twilio webhook to handle the call hangup (end of the call)
router.post('/call-ended', async (req, res) => {
    const callSid = req.body.CallSid; // Get the Call SID of the ended call

    // If there is an ongoing conversation, save it to the database
    if (ongoingConversations[callSid]) {
        const conversationData = ongoingConversations[callSid];

        // Save conversation to MongoDB
        const conversation = new Conversation({
            callSid: conversationData.callSid,
            logs: conversationData.logs,
        });

        try {
            await conversation.save();
            console.log(`Conversation for CallSid ${callSid} saved to the database.`);
            // Clean up in-memory data
            delete ongoingConversations[callSid];
            res.status(200).send('Conversation saved to database.');
        } catch (error) {
            console.error('Error saving conversation:', error);
            res.status(500).send('Failed to save conversation.');
        }
    } else {
        res.status(404).send('No ongoing conversation found.');
    }
});

module.exports = router;
