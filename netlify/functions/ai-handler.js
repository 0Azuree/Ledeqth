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

    if (!primaryApiKey) {
      return {
        statusCode: 500,
        body: JSON.stringify({ message: 'Server configuration error: Primary Gemini API key not found.' })
      };
    }

    let selectedApiKeys = [];
    let modelToUse = model;

    if (model === 'gemini-2.0-flash') {
      // For AI-1 (gemini-2.0-flash), try both keys if available
      selectedApiKeys.push(primaryApiKey);
      if (secondaryApiKey) {
        selectedApiKeys.push(secondaryApiKey);
      }
    } else if (model === 'gemini-1.5-pro') {
      // For AI-2 (gemini-1.5-pro), only use the primary key
      selectedApiKeys.push(primaryApiKey);
    } else {
      // Fallback if model is not specified or unrecognized, use primary key with default model
      selectedApiKeys.push(primaryApiKey);
      modelToUse = "gemini-2.0-flash"; // Default model
    }

    if (selectedApiKeys.length === 0) {
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'No valid API keys configured for the selected model.' })
        };
    }

    let aiResponseText = null;
    let lastError = null;

    // Try each API key until a successful response is received
    for (const apiKey of selectedApiKeys) {
        try {
            const genAI = new GoogleGenerativeAI(apiKey);
            const generativeModel = genAI.getGenerativeModel({ model: modelToUse });

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
            console.warn(`Attempt with API key failed. Trying next if available. Error: ${error.message}`);
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
