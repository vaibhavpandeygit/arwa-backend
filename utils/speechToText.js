// Function to convert speech to text using Google Cloud Speech-to-Text
async function speechToText(audioBuffer) {
    const [operation] = await speechClient.longRunningRecognize({
        config: {
            languageCode: 'en-US',
            sampleRateHertz: 8000, // Twilio default sample rate
            encoding: 'LINEAR16',  // Twilio recordings are in LINEAR16
        },
        audio: {
            content: audioBuffer.toString('base64'), // Convert buffer to Base64
        },
    });

    // Wait for the operation to complete
    const [response] = await operation.promise();

    if (response.results.length > 0) {
        return response.results
            .map((result) => result.alternatives[0].transcript)
            .join('\n');
    } else {
        throw new Error('No transcription found');
    }
}
