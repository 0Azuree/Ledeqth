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
    // API Key (provided by user)
    const apiKey = "AIzaSyDK1zFOQKQGm_htraELnA9lQRBxtLlgdcE";

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
            const reader = new FileReader();
            reader.onload = (e) => {
                uploadedImageBase64 = e.target.result.split(',')[1]; // Get base64 part
                uploadedImagePreview.src = e.target.result;
                uploadedImagePreview.style.display = 'block';
                imagePreviewArea.style.display = 'flex'; // Show the preview area
                removeImageButton.style.display = 'block';
            };
            reader.readAsDataURL(file);
        }
    });

    removeImageButton.addEventListener('click', () => {
        uploadedImageBase64 = null;
        uploadedImagePreview.src = '#';
        uploadedImagePreview.style.display = 'none';
        imagePreviewArea.style.display = 'none'; // Hide the preview area
        removeImageButton.style.display = 'none';
        imageUploadInput.value = ''; // Clear the file input value
    });

    async function sendPrompt() {
        const prompt = userPromptInput.value.trim();
        if (!prompt && !uploadedImageBase64) {
            aiResponseDiv.innerHTML = '<p style="color: red;">Please enter a prompt or upload an image.</p>';
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
            let chatHistory = [];
            let parts = [{ text: prompt }];

            if (uploadedImageBase64) {
                parts.push({
                    inlineData: {
                        mimeType: "image/png", // Assuming PNG, adjust if needed
                        data: uploadedImageBase64
                    }
                });
            }
            chatHistory.push({ role: "user", parts: parts });

            const payload = { contents: chatHistory };

            // Determine the model to use based on selection
            const modelToUse = selectedAIModel;

            // Construct the API URL
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelToUse}:generateContent?key=${apiKey}`;

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const result = await response.json();

            if (result.candidates && result.candidates.length > 0 &&
                result.candidates[0].content && result.candidates[0].content.parts &&
                result.candidates[0].content.parts.length > 0) {
                const text = result.candidates[0].content.parts[0].text;
                aiResponseDiv.innerHTML = `<p>${text}</p>`;
            } else {
                aiResponseDiv.innerHTML = '<p style="color: red;">No response or unexpected format from AI. Please try again.</p>';
                console.error("AI response structure unexpected:", result);
            }
        } catch (error) {
            aiResponseDiv.innerHTML = `<p style="color: red;">Error: ${error.message}. Please try again.</p>`;
            console.error("Error calling Gemini API:", error);
        } finally {
            aiResponseDiv.classList.remove('loading');
            sendPromptButton.disabled = false;
            userPromptInput.disabled = false;
            uploadImageButton.disabled = false;
            removeImageButton.disabled = false;
            aiModelSelect.disabled = false; // Re-enable dropdown
            userPromptInput.value = ''; // Clear prompt input
            removeImageButton.click(); // Clear image preview
        }
    }
});
