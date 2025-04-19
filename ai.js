// ai.js

document.addEventListener('DOMContentLoaded', function() {
    const promptTextarea = document.getElementById('user-prompt');
    const sendButton = document.getElementById('send-prompt-button');
    const responseDiv = document.getElementById('ai-response');

    // Add event listener to the button
    sendButton.addEventListener('click', async function() {
        const prompt = promptTextarea.value.trim(); // Get user input and remove leading/trailing whitespace

        if (prompt === '') {
            responseDiv.innerHTML = '<p style="color: #ff6666;">Please enter a prompt.</p>'; // Display an error message
            return; // Stop if prompt is empty
        }

        // Clear previous response and show loading message
        responseDiv.innerHTML = '<p>Loading...</p>';
        responseDiv.classList.add('loading'); // Add loading class for styling

        // --- SECURITY WARNING ---
        // *** DO NOT PUT YOUR API KEY HERE IN CLIENT-SIDE JAVASCRIPT ***
        // Exposing your API key in the browser is a major security risk.

        // --- Conceptual Secure Server-Side API Call ---
        // In a real application, you would send the 'prompt' to your own server.
        // Your server would then use your API key to call the actual AI service (e.g., Google's API).
        // The server would then send the AI's response back to this front-end JavaScript.

        // Example of how you *might* fetch from your own secure backend endpoint:
        /*
        const secureBackendEndpoint = '/api/get-ai-response'; // Replace with your actual backend endpoint

        try {
            const response = await fetch(secureBackendEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ prompt: prompt }) // Send the user's prompt to your server
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json(); // Assuming your server sends back JSON

            // Display the AI's response
            if (data && data.response) {
                responseDiv.innerHTML = `<p>${data.response.replace(/\n/g, '<br>')}</p>`; // Display response, handling newlines
            } else {
                responseDiv.innerHTML = '<p style="color: #ff6666;">Error: No valid response from server.</p>';
            }

        } catch (error) {
            console.error('Error fetching AI response:', error);
            responseDiv.innerHTML = `<p style="color: #ff6666;">Error: Could not get response. Please try again later.</p>`;
        } finally {
            responseDiv.classList.remove('loading'); // Remove loading class
        }
        */

        // --- Placeholder Simulation (REMOVE IN REAL APP) ---
        // This simulates an AI response without using an API key directly.
        // Replace this entire simulation block with the secure server-side fetch logic above.
        console.log("Simulating AI response for prompt:", prompt);
        setTimeout(() => {
            const simulatedResponse = `Thank you for your prompt: "${prompt}".\n\nThis is a simulated AI response. To get a real response, you need a secure backend to handle the API call with your key.`;
            responseDiv.innerHTML = `<p>${simulatedResponse.replace(/\n/g, '<br>')}</p>`; // Display simulation
            responseDiv.classList.remove('loading');
        }, 1500); // Simulate a delay

        // --- End Placeholder Simulation ---


        promptTextarea.value = ''; // Clear the textarea after sending
    });

    // Optional: Allow sending prompt with Enter key
    promptTextarea.addEventListener('keypress', function(event) {
        if (event.key === 'Enter' && !event.shiftKey) { // Check for Enter key, but not Shift + Enter
            event.preventDefault(); // Prevent default newline behavior
            sendButton.click(); // Trigger button click
        }
    });

});
