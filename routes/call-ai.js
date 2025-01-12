const express = require('express');
const twilio = require('twilio');
const fetch = require('node-fetch');
const mongoose = require('mongoose');
const Conversation = require('../models/conversationModel');
require('dotenv').config();

const router = express.Router();

// Twilio webhook to handle the start of the call
router.post('/incoming-call', (req, res) => {
    const twiml = new twilio.twiml.VoiceResponse();

    // Start a conversation in the database when the call starts
    const callSid = req.body.CallSid;
    
    // Initialize the conversation log in the database
    const newConversation = new Conversation({
        callSid: callSid,
        logs: [],
    });

    newConversation.save()
        .then(() => {
            console.log(`Conversation for CallSid ${callSid} started and saved.`);
        })
        .catch((error) => {
            console.error('Error starting conversation:', error);
        });

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
    const chatgptResponse = await sendToChatGPT(callSid, userSpeech);

    // Update the conversation in the database
    Conversation.findOne({ callSid: callSid })
        .then((conversation) => {
            if (conversation) {
                // Add the user's speech and ChatGPT response to the conversation logs
                conversation.logs.push({ role: 'user', content: userSpeech });
                conversation.logs.push({ role: 'chatGPT', content: chatgptResponse });

                // Save the updated conversation
                conversation.save()
                    .then(() => {
                        console.log(`Conversation for CallSid ${callSid} updated.`);
                    })
                    .catch((error) => {
                        console.error('Error updating conversation:', error);
                    });
            } else {
                console.error('Conversation not found for CallSid:', callSid);
            }
        })
        .catch((error) => {
            console.error('Error finding conversation:', error);
        });

    // Respond to the user via Twilio
    const twiml = new twilio.twiml.VoiceResponse();
    twiml.say(chatgptResponse);

    // Gather more input for a two-way conversation
    twiml.gather({
        input: 'speech',
        action: '/process-speech',
        timeout: 10,
    });

    res.type('text/xml');
    res.send(twiml.toString());
});

// In-memory storage for conversation history
const conversationHistory = {};

// Function to send data to ChatGPT API with conversation memory
async function sendToChatGPT(callSid, userInput) {
  const apiKey = process.env.OPENAI_API_KEY;
  const url = 'https://api.openai.com/v1/chat/completions';

  const firstUserInput = 'Hi ChatGPT! I’d like our conversations to be kind, casual, and to the point, like I’m chatting with a helpful customer care representative. Please keep your responses concise, clear, and avoid overexplaining unless I ask for more details. Let’s keep it friendly and efficient!'
  const firstAssistantReply = 'Got it, Let’s keep it friendly and efficient.'

  // Initialize conversation history for the user if it doesn't exist
  if (!conversationHistory[callSid]) {
    conversationHistory[callSid] = [];
    conversationHistory[callSid].push({ role: 'user', content: firstUserInput });
    conversationHistory[callSid].push({ role: 'assistant', content: firstAssistantReply });
  }

  // Add the user's input to the conversation history
  conversationHistory[callSid].push({ role: 'user', content: `answer it concisely "${userInput}"` });

  try {
    // Send the conversation history to ChatGPT API
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: conversationHistory[callSid],
      }),
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }

    const data = await response.json();
    const assistantReply = data.choices[0].message.content;

    // Add the assistant's reply to the conversation history
    conversationHistory[callSid].push({ role: 'assistant', content: assistantReply });

    return assistantReply;
  } catch (error) {
    console.error('Error communicating with ChatGPT:', error);
    return 'Sorry, I encountered an error while processing your request.';
  }
}

module.exports = router;
