// netlify/functions/ai-handler.js
const { GoogleGenerativeAI } = require("@google/generative-ai");

exports.handler = async function(event, context) {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ message: 'Method Not Allowed' })
    };
  }

  try {
    const { prompt, imageData, model } = JSON.parse(event.body);

    // Retrieve API keys from environment variables
    const primaryApiKey = process.env.GEMINI_API_KEY;
    const secondaryApiKey = process.env.GEMINI_API_KEY_2; // New secondary key

    // Check if primary key is missing (this causes the first error you saw)
    if (!primaryApiKey) {
      return {
        statusCode: 500,
        body: JSON.stringify({ message: 'Server configuration error: Primary Gemini API key not found.' })
      };
    }

    let apiKeysToTry = [];
    const targetModel = "gemini-2.0-flash"; // Force all requests to use gemini-2.0-flash

    if (model === 'gemini-2.0-flash') {
      // If AI-1 is selected, try primary then secondary key
      apiKeysToTry.push(primaryApiKey);
      if (secondaryApiKey) { // Only add secondary key if it exists
        apiKeysToTry.push(secondaryApiKey);
      }
    } else if (model === 'gemini-1.5-pro') { // This value now means "AI-2"
      // If AI-2 is selected, only use the primary key
      apiKeysToTry.push(primaryApiKey);
    } else {
      // Fallback: if model is not specified or unrecognized, use primary key
      apiKeysToTry.push(primaryApiKey);
    }

    if (apiKeysToTry.length === 0) {
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'No valid API keys configured for the selected AI option.' })
        };
    }

    let aiResponseText = null;
    let lastError = null;

    // Try each API key until a successful response is received
    for (const apiKey of apiKeysToTry) {
        try {
            const genAI = new GoogleGenerativeAI(apiKey);
            const generativeModel = genAI.getGenerativeModel({ model: targetModel }); // Use targetModel here

            let parts = [];
            if (prompt) {
                parts.push({ text: prompt });
            }
            if (imageData && imageData.data && imageData.mimeType) {
                parts.push({
                    inlineData: {
                        mimeType: imageData.mimeType,
                        data: imageData.data
                    }
                });
            }

            if (parts.length === 0) {
                return {
                    statusCode: 400,
                    body: JSON.stringify({ message: 'No prompt or image data provided.' })
                };
            }

            const result = await generativeModel.generateContent({ contents: [{ role: "user", parts: parts }] });
            const response = await result.response;
            aiResponseText = response.text();
            break; // Exit loop on first successful response
        } catch (error) {
            console.warn(`Attempt with API key failed for model ${targetModel}. Trying next if available. Error: ${error.message}`);
            lastError = error; // Store the last error
        }
    }

    if (aiResponseText !== null) {
      return {
        statusCode: 200,
        body: JSON.stringify({ text: aiResponseText })
      };
    } else {
      // If all API key attempts failed
      return {
        statusCode: 500,
        body: JSON.stringify({ message: `Failed to get AI response after trying all available keys. Last error: ${lastError ? lastError.message : 'Unknown error'}` })
      };
    }

  } catch (error) {
    console.error("Error in Netlify AI function (outer catch):", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: `Failed to process request: ${error.message}` })
    };
  }
};
