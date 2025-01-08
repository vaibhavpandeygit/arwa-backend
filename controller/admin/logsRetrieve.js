const twilio = require('twilio');
const Conversation = require('../../models/conversationModel');
require('dotenv').config();

// Initialize Twilio Client
const accountSid = process.env.TWILIO_ACCOUNT_SID; // Your Twilio Account SID
const authToken = process.env.TWILIO_AUTH_TOKEN;   // Your Twilio Auth Token
const client = twilio(accountSid, authToken);

// Retrieve Call Logs Controller
const getCallLogs = async (req, res) => {
  try {
    const calls = await client.calls.list({ limit: 20 }); // Limit the number of records fetched

    // Fetch call logs with conversations
    const callLogs = await Promise.all(
      calls.map(async call => {
        const recordings = await client.recordings.list({ callSid: call.sid });

        const conversations = await Promise.all(
          recordings.map(async recording => {
            const transcription = await client.transcriptions
              .list({ recordingSid: recording.sid, limit: 1 });

            return {
              recordingSid: recording.sid,
              transcriptionText: transcription.length > 0 ? transcription[0].transcriptionText : 'No transcription available',
              recordingUrl: recording.uri.replace('.json', '.mp3'), // MP3 URL
            };
          })
        );

        return {
          sid: call.sid,
          from: call.from,
          to: call.to,
          duration: call.duration,
          status: call.status,
          startTime: call.startTime,
          endTime: call.endTime,
          conversations,
        };
      })
    );

    // Respond with the call logs and their conversations
    res.status(200).json({
      message: 'Call logs and conversations retrieved successfully',
      data: callLogs,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to retrieve call logs and conversations', error: error.message });
  }
};

const getConversations = async (req, res) => {
  try {
      const { callSid } = req.query; // Get the CallSid from query parameters

      if (callSid) {
          // Fetch specific conversation by CallSid
          const conversation = await Conversation.findOne({ callSid });
          if (!conversation) {
              return res.status(404).json({ message: 'Conversation not found' });
          }

          res.status(200).json({
              message: 'Conversation retrieved successfully',
              data: conversation,
          });
      } else {
          // Fetch all conversations
          const conversations = await Conversation.find();
          res.status(200).json({
              message: 'All conversations retrieved successfully',
              data: conversations,
          });
      }
  } catch (error) {
      console.error('Error retrieving conversations:', error);
      res.status(500).json({ message: 'Failed to retrieve conversations', error: error.message });
  }
};

module.exports = { getCallLogs, getConversations };
