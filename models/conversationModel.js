const mongoose = require('mongoose');


const conversationSchema = new mongoose.Schema({
    callSid: { type: String, required: true, unique: true },
    logs: [
        {
            role: { type: String, enum: ['user', 'chatGPT'], required: true },
            content: { type: String, required: true },
            timestamp: { type: Date, default: Date.now }
        }
    ],
}, { timestamps: true });

// Create Conversation Model
const Conversation = mongoose.model('Conversation', conversationSchema);

module.exports = Conversation;
