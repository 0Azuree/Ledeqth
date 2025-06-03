// ai.js

document.addEventListener('DOMContentLoaded', () => {
    const userPromptInput = document.getElementById('user-prompt');
    const sendPromptButton = document.getElementById('send-prompt-button');
    const aiResponseDiv = document.getElementById('ai-response');
    const imageUploadInput = document.getElementById('image-upload');
    const uploadImageButton = document.getElementById('upload-image-button');
    const uploadedImagePreview = document.getElementById('uploaded-image-preview');
    const imagePreviewArea = document.getElementById('image-preview-area');
    const removeImageButton = document.getElementById('remove-image-button');
    const aiModelSelect = document.getElementById('aiModelSelect'); // New: AI model dropdown

    let uploadedImageBase64 = null;

    // Default to the first option in the dropdown
    let selectedAIModel = aiModelSelect.value;

    // Event listener for AI model selection change
    aiModelSelect.addEventListener('change', (event) => {
        selectedAIModel = event.target.value;
        console.log('Selected AI Model:', selectedAIModel);
        // You might want to clear the response or give a message here
        aiResponseDiv.innerHTML = '<p>AI model changed. Enter a new prompt!</p>';
        aiResponseDiv.classList.remove('loading');
    });


    sendPromptButton.addEventListener('click', sendPrompt);
    userPromptInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { // Allow Shift+Enter for new line
            e.preventDefault();
            sendPrompt();
        }
    });

    uploadImageButton.addEventListener('click', () => {
        imageUploadInput.click(); // Trigger the hidden file input
    });

    imageUploadInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            processImageFile(file);
        }
    });

    removeImageButton.addEventListener('click', () => {
        uploadedImageBase64 = null;
        uploadedImagePreview.src = '#';
        uploadedImagePreview.style.display = 'none';
        imagePreviewArea.style.display = 'none'; // Hide the preview area
        removeImageButton.style.display = 'none'; // Hide the button
        imageUploadInput.value = ''; // Clear the file input value
    });

    // NEW: Paste event listener for image pasting
    userPromptInput.addEventListener('paste', (event) => {
        const items = (event.clipboardData || event.originalEvent.clipboardData).items;
        let imageFound = false;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                const blob = items[i].getAsFile();
                if (blob) {
                    event.preventDefault(); // Prevent default paste behavior (e.g., pasting text)
                    processImageFile(blob);
                    imageFound = true;
                    break;
                }
            }
        }
        if (imageFound) {
            // Optionally, clear the text input if an image was pasted
            // userPromptInput.value = '';
        }
    });

    // Helper function to process image file (from upload or paste)
    function processImageFile(file) {
        if (file.size > 5 * 1024 * 1024) { // Limit to 5MB, adjust as needed
            aiResponseDiv.innerHTML = '<p style="color: red;">Image size exceeds 5MB limit.</p>';
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            uploadedImageBase64 = e.target.result.split(',')[1]; // Get base64 part
            uploadedImagePreview.src = e.target.result;
            uploadedImagePreview.style.display = 'block';
            imagePreviewArea.style.display = 'flex'; // Show the preview area
            removeImageButton.style.display = 'block';
            aiResponseDiv.innerHTML = '<p>Image uploaded/pasted. Enter your prompt.</p>';
            aiResponseDiv.classList.remove('loading');
        };
        reader.onerror = () => {
            aiResponseDiv.innerHTML = '<p style="color: red;">Failed to read image file.</p>';
        };
        reader.readAsDataURL(file);
    }


    async function sendPrompt() {
        const prompt = userPromptInput.value.trim();
        if (!prompt && !uploadedImageBase64) {
            aiResponseDiv.innerHTML = '<p style="color: red;">Please enter a prompt or upload/paste an image.</p>';
            return;
        }

        aiResponseDiv.innerHTML = '<p>Generating response...</p>';
        aiResponseDiv.classList.add('loading');
        sendPromptButton.disabled = true;
        userPromptInput.disabled = true;
        uploadImageButton.disabled = true;
        removeImageButton.disabled = true;
        aiModelSelect.disabled = true; // Disable dropdown during generation

        try {
            // Send request to Netlify Function instead of direct Gemini API
            const response = await fetch('/.netlify/functions/ai-handler', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: prompt,
                    imageData: uploadedImageBase64 ? {
                        mimeType: "image/png", // Assuming PNG for pasted, adjust if needed
                        data: uploadedImageBase64
                    } : null,
                    model: selectedAIModel // Pass the selected model to the function
                })
            });

            const result = await response.json();

            if (response.ok) {
                if (result.text) {
                    aiResponseDiv.innerHTML = `<p>${result.text}</p>`;
                } else {
                    aiResponseDiv.innerHTML = '<p style="color: red;">No text response from AI. Please try again.</p>';
                }
            } else {
                aiResponseDiv.innerHTML = `<p style="color: red;">Error from AI Function: ${result.message || 'Unknown error'}.</p>`;
                console.error("AI Function error:", result);
            }
        } catch (error) {
            aiResponseDiv.innerHTML = `<p style="color: red;">Network error: ${error.message}. Please try again.</p>`;
            console.error("Error calling Netlify AI Function:", error);
        } finally {
            aiResponseDiv.classList.remove('loading');
            sendPromptButton.disabled = false;
            userPromptInput.disabled = false;
            uploadImageButton.disabled = false;
            removeImageButton.disabled = false;
            aiModelSelect.disabled = false; // Re-enable dropdown
            userPromptInput.value = ''; // Clear prompt input
            removeImageButton.click(); // Clear image preview by simulating click
        }
    }
});
