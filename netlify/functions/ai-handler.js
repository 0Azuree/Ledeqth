// netlify/functions/ai-handler.js
// This function handles incoming requests from the frontend AI page,
// processes both text and optional image data, and interacts with the
// Google Generative AI API.

// Import the Google Generative AI library
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Netlify Functions handler function
// event: Contains information about the request (headers, body, etc.)
// context: Provides information about the execution environment
exports.handler = async (event, context) => {
    // Only allow POST requests, as the frontend sends data via POST
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405, // Method Not Allowed
            body: JSON.stringify({ message: "Method Not Allowed" })
        };
    }

    let body;
    try {
        // Parse the JSON body sent from the frontend
        body = JSON.parse(event.body);
    } catch (error) {
        console.error("Error parsing request body:", error);
        return {
            statusCode: 400, // Bad Request
            body: JSON.stringify({ message: "Invalid JSON body." })
        };
    }

    // Extract prompt text, base64 image data, and image MIME type from the body
    const prompt = body.prompt || ""; // Prompt text (can be empty)
    const imageData = body.image; // Base64 image data (optional)
    const mimeType = body.mimeType; // Image MIME type (optional)

    // Ensure at least text or image data is provided
    if (!prompt && !imageData) {
        console.warn("Received request with no prompt or image data.");
        return {
            statusCode: 400, // Bad Request
            body: JSON.stringify({ message: "Please provide text or an image." })
        };
    }

    // Get the Google AI API key from Netlify Environment Variables
    const API_KEY = process.env.GOOGLE_API_KEY;

    if (!API_KEY) {
        console.error("GOOGLE_API_KEY environment variable not set in Netlify!");
        return {
            statusCode: 500, // Internal Server Error
            body: JSON.stringify({ message: "Server configuration error: API key not available." })
        };
    }

    try {
        // Initialize the Google Generative AI client with the API key
        const genAI = new GoogleGenerativeAI({ apiKey: API_KEY });

        // Get the generative model instance
        // Use a model that supports multimodal input (like gemini-2.0-flash)
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        // Construct the 'parts' array for the multimodal content
        const parts = [];

        // Add the text prompt part if it exists
        if (prompt) {
            parts.push({ text: prompt });
        }

        // Add the image data part if it exists
        if (imageData && mimeType) {
            // The inlineData format requires only the base64 string, not the "data:image/...;base64," prefix
            const base64DataOnly = imageData.split(',')[1];
            parts.push({
                inlineData: {
                    data: base64DataOnly, // The base64 string
                    mimeType: mimeType // The image MIME type (e.g., "image/jpeg", "image/png")
                }
            });
        }

        // Make the API call with the constructed multimodal content
        const result = await model.generateContent({ contents: [{ parts }] });

        // Extract the response text from the result
        const responseText = result.response?.text || "No response text returned.";

        console.log("Successfully received AI response.");

        // Return the AI's response text to the frontend
        return {
            statusCode: 200, // OK
            headers: {
                "Content-Type": "application/json",
                // Add CORS headers if needed (Netlify usually handles this, but explicit headers can help)
                // "Access-Control-Allow-Origin": "*", // Allow requests from any origin
                // "Access-Control-Allow-Headers": "Content-Type",
                // "Access-Control-Allow-Methods": "POST, OPTIONS"
            },
            body: JSON.stringify({ response: responseText })
        };

    } catch (error) {
        console.error("Error calling Google AI API:", error);
        // Return an error response to the frontend
        return {
            statusCode: 500, // Internal Server Error
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: "Error processing AI request.", error: error.message })
        };
    }
};
