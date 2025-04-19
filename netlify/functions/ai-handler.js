// netlify/functions/ai-handler.js

// --- IMPORTANT SECURITY NOTE ---
// DO NOT PUT YOUR ACTUAL API KEY DIRECTLY IN THIS CODE FILE.
// We will access it securely via Netlify Environment Variables.

const { GoogleGenerativeAI } = require("@google/generative-ai"); // You might need to install this package

// Get your API key from Netlify Environment Variables
// The variable name 'GOOGLE_API_KEY' is just an example; you'll set this in Netlify settings.
const API_KEY = process.env.GOOGLE_API_KEY;

// Ensure the API key is set
if (!API_KEY) {
  console.error("GOOGLE_API_KEY environment variable not set!");
  // This will cause the function to fail if the key isn't configured in Netlify
  throw new Error("Server configuration error: API key not available.");
}

// Initialize the Google Generative AI client
const genAI = new GoogleGenerativeAI(API_KEY);
// Choose the model you want to use (e.g., 'gemini-pro', 'gemini-1.5-flash-latest')
// Check Google's documentation for available models and pricing.
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" }); // Changed the model name


// This is the main function that Netlify runs
exports.handler = async function(event, context) {
    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405, // Method Not Allowed
            body: JSON.stringify({ message: "Method Not Allowed" }),
        };
    }

    let prompt;
    try {
        // Parse the JSON body from the request sent by your frontend
        const body = JSON.parse(event.body);
        prompt = body.prompt;

        if (!prompt || typeof prompt !== 'string') {
             return {
                statusCode: 400, // Bad Request
                body: JSON.stringify({ message: "Missing or invalid 'prompt' in request body." }),
            };
        }

    } catch (error) {
        console.error("Error parsing request body:", error);
        return {
            statusCode: 400, // Bad Request
            body: JSON.stringify({ message: "Invalid JSON body." }),
        };
    }

    console.log("Received prompt:", prompt); // Log the prompt (optional)

    try {
        // *** THIS IS WHERE THE ACTUAL AI API CALL HAPPENS ***
        // Use the Google AI SDK to send the prompt to the model
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text(); // Get the plain text response from the AI

        console.log("AI response:", text); // Log the response (optional)

        // Send the AI's response back to your frontend
        return {
            statusCode: 200, // OK
            headers: {
                "Content-Type": "application/json",
                // You might need CORS headers if your Netlify function domain is different from your GitHub Pages domain
                // For simple cases, Netlify often handles this, but you might need:
                // "Access-Control-Allow-Origin": "*", // Allows requests from any domain
                // "Access-Control-Allow-Headers": "Content-Type",
                // "Access-Control-Allow-Methods": "POST, OPTIONS"
            },
            body: JSON.stringify({ response: text }), // Send the AI text back in a JSON object
        };

    } catch (error) {
        console.error("Error calling AI API:", error);
        // Return an error response to the frontend
        return {
            statusCode: 500, // Internal Server Error
            body: JSON.stringify({ message: "Error processing AI request.", error: error.message }),
        };
    }
};

// Note: You will also need a package.json file in the netlify/functions folder
// that declares "@google/generative-ai" as a dependency. See Step 2b.
