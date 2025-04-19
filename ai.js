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
        sendButton.disabled = true; // Disable button while loading

        // *** THIS IS THE FETCH REQUEST TO YOUR NETLIFY FUNCTION ***
        // The path /.netlify/functions/ai-handler is the standard way to access Netlify functions
        const functionEndpoint = '/.netlify/functions/ai-handler';

        try {
            const response = await fetch(functionEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ prompt: prompt }) // Send the user's prompt to your backend function
            });

            if (!response.ok) {
                // Handle HTTP errors (e.g., 400, 500)
                const errorBody = await response.json().catch(() => ({ message: `Error: ${response.status} ${response.statusText}` }));
                 throw new Error(errorBody.message || `HTTP error! status: ${response.status}`);
            }

            const data = await response.json(); // Assuming your Netlify function sends back JSON { response: "AI text" }

            // Display the AI's response
            if (data && data.response) {
                // Replace newlines with <br> for HTML display
                responseDiv.innerHTML = `<p>${data.response.replace(/\n/g, '<br>')}</p>`;
            } else {
                responseDiv.innerHTML = '<p style="color: #ff6666;">Error: Invalid response format from backend.</p>';
            }

        } catch (error) {
            console.error('Error calling Netlify function:', error);
            responseDiv.innerHTML = `<p style="color: #ff6666;">Error: Could not get AI response. Details: ${error.message}</p>`;
        } finally {
            responseDiv.classList.remove('loading'); // Remove loading class
            sendButton.disabled = false; // Re-enable button
        }

        promptTextarea.value = ''; // Clear the textarea after sending
    });

    // Optional: Allow sending prompt with Enter key
    promptTextarea.addEventListener('keypress', function(event) {
        // Check for Enter key, but not Shift + Enter (which typically adds a newline)
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault(); // Prevent default newline behavior in textarea
            sendButton.click(); // Trigger button click
        }
    });

});
