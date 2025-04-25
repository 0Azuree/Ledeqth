// ai.js - Updated without History, with Image Input Logic

document.addEventListener('DOMContentLoaded', function() {
    const promptTextarea = document.getElementById('user-prompt');
    const sendButton = document.getElementById('send-prompt-button');
    const responseDiv = document.getElementById('ai-response');

    // Removed history elements
    // const historyListDiv = document.getElementById('history-list');
    // const clearHistoryButton = document.getElementById('clear-history-button');

    const imageUploadInput = document.getElementById('image-upload-input');
    const uploadImageButton = document.getElementById('upload-image-button');
    const imagePreviewArea = document.getElementById('image-preview-area');
    const uploadedImagePreview = document.getElementById('uploaded-image-preview');
    const removeImageButton = document.getElementById('remove-image-button');


    // Removed history storage key
    // const HISTORY_STORAGE_KEY = 'aiHistory';

    let currentImageFile = null; // To store the selected image file object

    // --- Removed History Functions ---
    // loadHistory, saveHistory, displayHistory, addHistoryItem, clearHistory
    // Removed clearHistoryButton event listener


    // --- Image Input Functions ---

    // Trigger file input click when upload button is clicked
    uploadImageButton.addEventListener('click', () => {
        imageUploadInput.click();
    });

    // Handle file selection from the input
    imageUploadInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file && file.type.startsWith('image/')) {
            currentImageFile = file; // Store the file object
            displayImagePreview(file);
        } else {
            currentImageFile = null;
            clearImagePreview();
            if (file) {
                 alert("Please select a valid image file.");
            }
        }
         // Clear the input value so selecting the same file again triggers change
         imageUploadInput.value = '';
    });

    // Handle image paste event
    document.addEventListener('paste', (event) => {
        const items = event.clipboardData.items;
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (item.type.startsWith('image/')) {
                event.preventDefault(); // Prevent default paste behavior (like pasting into textarea)
                const file = item.getAsFile();
                currentImageFile = file; // Store the file object
                displayImagePreview(file);
                break; // Process only the first image found
            }
        }
    });


    // Display the selected/pasted image preview
    function displayImagePreview(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            uploadedImagePreview.src = e.target.result; // Set the image source to the data URL
            uploadedImagePreview.style.display = 'block'; // Show the image
            removeImageButton.style.display = 'block'; // Show the remove button
             imagePreviewArea.style.display = 'flex'; // Show the preview container
             responseDiv.style.marginTop = '15px'; // Add space between preview and response
        };
        reader.readAsDataURL(file); // Read the file as a data URL (base64)
        // self.status_label.textContent = `Image selected: ${file.name}`; // Update status (if you had one)
    }

    // Clear the image preview
    function clearImagePreview() {
        currentImageFile = null;
        uploadedImagePreview.src = '#'; // Reset image source
        uploadedImagePreview.style.display = 'none'; // Hide the image
        removeImageButton.style.display = 'none'; // Hide the remove button
         imagePreviewArea.style.display = 'none'; // Hide the preview container
         responseDiv.style.marginTop = '0'; // Remove the added space
    }

    // Handle remove image button click
    removeImageButton.addEventListener('click', clearImagePreview);


    // --- AI Interaction Function (Modified to include image) ---

    sendButton.addEventListener('click', async function() {
        const prompt = promptTextarea.value.trim();

        // Check if either prompt text or an image is provided
        if (prompt === '' && !currentImageFile) {
            responseDiv.innerHTML = '<p style="color: #ff6666;">Please enter a prompt or upload/paste an image.</p>';
            return;
        }

        responseDiv.innerHTML = '<p>Loading...</p>';
        responseDiv.classList.add('loading');
        sendButton.disabled = true;
         uploadImageButton.disabled = true; // Disable upload button during request
         removeImageButton.disabled = true; // Disable remove button during request


        // Prepare the data to send to the backend
        const requestBody = {
            prompt: prompt // Always send the text prompt (can be empty)
        };

        if (currentImageFile) {
            // Read the image file as a Data URL (Base64)
            const reader = new FileReader();
            reader.onload = async (e) => {
                // Add image data to the request body
                requestBody.image = e.target.result; // Base64 Data URL
                requestBody.mimeType = currentImageFile.type; // Image MIME type

                // Now send the request with image data
                await sendToBackend(requestBody);
            };
            reader.onerror = (error) => {
                 console.error("Error reading image file:", error);
                 responseDiv.innerHTML = '<p style="color: #ff6666;">Error reading image file.</p>';
                 responseDiv.classList.remove('loading');
                 sendButton.disabled = false;
                 uploadImageButton.disabled = false;
                 removeImageButton.disabled = false;
            };
            reader.readAsDataURL(currentImageFile); // Start reading the file

        } else {
            // If no image, just send the text prompt
            await sendToBackend(requestBody);
        }
    });

    // Function to send the request to the backend
    async function sendToBackend(requestBody) {
         const functionEndpoint = '/.netlify/functions/ai-handler'; // Your Netlify Function endpoint

         try {
            const response = await fetch(functionEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody) // Send the prepared body (text + optional image)
            });

            if (!response.ok) {
                const errorBody = await response.json().catch(() => ({ message: `Error: ${response.status} ${response.statusText}` }));
                 throw new Error(errorBody.message || `HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (data && data.response) {
                const aiResponseText = data.response;
                responseDiv.innerHTML = `<p>${aiResponseText.replace(/\n/g, '<br>')}</p>`;

                // Removed history add call
                // addHistoryItem(requestBody.prompt, aiResponseText);

            } else {
                responseDiv.innerHTML = '<p style="color: #ff6666;">Error: Invalid response format from backend.</p>';
            }

        } catch (error) {
            console.error('Error calling AI backend function:', error);
            responseDiv.innerHTML = `<p style="color: #ff6666;">Error: Could not get AI response. Details: ${error.message}</p>`;
        } finally {
            responseDiv.classList.remove('loading');
            sendButton.disabled = false;
            uploadImageButton.disabled = false;
            removeImageButton.disabled = false;
            // Clear the image preview after sending (optional, but often desired)
            clearImagePreview();
            promptTextarea.value = ''; // Clear prompt text area
        }
    }


    // Allow sending prompt with Enter key (Shift+Enter for newline)
    promptTextarea.addEventListener('keypress', function(event) {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            sendButton.click();
        }
    });

    // --- Initial Setup ---
    // Removed history load and display on initial setup
    // displayHistory(loadHistory()); // Load and display history when the page loads

    // Removed event listener for the clear history button
    // clearHistoryButton.addEventListener('click', clearHistory);

});
