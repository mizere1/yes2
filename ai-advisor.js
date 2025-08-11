document.addEventListener('DOMContentLoaded', () => {
    // New elements for the floating widget
    const chatLauncher = document.getElementById('chat-launcher');
    const chatWindow = document.getElementById('advisor-chat-window');
    const closeChatButton = document.getElementById('close-chat');

    const chatForm = document.getElementById('chat-form');
    const chatInput = document.getElementById('chat-input');
    const chatMessages = document.getElementById('chat-messages');

    if (!chatLauncher || !chatWindow || !closeChatButton || !chatForm || !chatInput || !chatMessages) {
        console.error("One or more chat interface elements not found!");
        return;
    }

    // --- Widget Visibility ---
    chatLauncher.addEventListener('click', () => {
        chatWindow.classList.toggle('visible');
    });

    closeChatButton.addEventListener('click', () => {
        chatWindow.classList.remove('visible');
    });

    // --- Conversational Logic ---
    let userMessageCount = 0;
    let conversationHistory = [
        {
            role: "user",
            parts: [{ text: `
                You are a friendly and expert Education Advisor for the Royal African College. Your goal is to have a natural, human-like conversation with prospective students.
                Your responses MUST be concise and only a few sentences long.
                Start by introducing yourself and asking about their background and goals.
                Analyze their input and guide them towards a single, specific course of study (e.g., "Degree in Computer Science" or "Diploma in Business Administration").
                After you provide a recommendation, you MUST offer a way to contact a human advisor on WhatsApp for more details, using the exact phrase "For more detailed guidance, you can chat with a human advisor on WhatsApp."
                Do not make up course names; stick to common, plausible fields of study.
            `}]
        },
        {
            role: "model",
            parts: [{ text: "Hello! I'm your Education Advisor. Tell me a little about your educational background and what you'd like to achieve, and I'll recommend a path for you." }]
        }
    ];

    async function sendMessageToAI() {
        const userInput = chatInput.value.trim();
        if (!userInput) return;

        appendMessage(userInput, 'user');
        chatInput.value = '';

        userMessageCount++;

        if (userMessageCount >= 2) {
            const finalMessage = "For more detailed questions, please continue the conversation with a human advisor on WhatsApp.";
            appendMessage(finalMessage, 'bot');
            chatInput.disabled = true;
            chatForm.querySelector('button').disabled = true;

            // Auto-close after 10 seconds
            setTimeout(() => {
                chatWindow.classList.remove('visible');
            }, 10000);
            return;
        }

        conversationHistory.push({ role: "user", parts: [{ text: userInput }] });
        chatForm.querySelector('button').disabled = true;
        chatForm.querySelector('button').textContent = '...';

        appendMessage("Thinking...", 'bot', true);

        const GEMINI_API_KEYS = [
            "AIzaSyBy93HTPV7fk-XCUmukQJsWTxHcvYDWEeQ", // Primary
            "AIzaSyCD0aLp0KJdBYcAE33AsC3fJUYjjzgWMhY"  // Alternate
        ];
        let currentApiKeyIndex = 0;

        try {
            const response = await callGeminiWithHistory(conversationHistory, GEMINI_API_KEYS, currentApiKeyIndex);

            if(document.getElementById('typing-indicator')) document.getElementById('typing-indicator').remove();

            if (response) {
                appendMessage(response, 'bot');
                conversationHistory.push({ role: "model", parts: [{ text: response }] });
            } else {
                appendMessage("I'm sorry, I'm having trouble connecting right now. Please try again later.", 'bot');
            }
        } catch (error) {
            console.error("Error in sendMessageToAI:", error);
            if(document.getElementById('typing-indicator')) document.getElementById('typing-indicator').remove();
            appendMessage("My apologies, an error occurred. Please refresh and try again.", 'bot');
        } finally {
            chatForm.querySelector('button').disabled = false;
            chatForm.querySelector('button').textContent = 'Send';
        }
    }

    chatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        sendMessageToAI();
    });

    function appendMessage(text, sender, isTyping = false) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', `${sender}-message`);

        if (isTyping) {
            messageDiv.id = 'typing-indicator';
            messageDiv.innerHTML = `<p><i>${text}</i></p>`;
        } else {
            let formattedText = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            messageDiv.innerHTML = `<p>${formattedText}</p>`;

            // Check if the specific trigger phrase is in the bot's response
            if (sender === 'bot' && text.includes("chat with a human advisor on WhatsApp")) {
                const whatsappButton = document.createElement('a');
                whatsappButton.href = "https://wa.me/265996982449";
                whatsappButton.target = "_blank";
                whatsappButton.className = "btn";
                whatsappButton.textContent = "Chat on WhatsApp";
                whatsappButton.style.marginTop = "10px";
                messageDiv.appendChild(whatsappButton);
            }
        }

        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
});

async function callGeminiWithHistory(history, keys, keyIndex) {
    let attempts = 0;
    while (attempts < keys.length) {
        const apiKey = keys[keyIndex];
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: history })
            });

            if (response.ok) {
                const data = await response.json();
                return data.candidates[0].content.parts[0].text;
            } else {
                console.warn(`API key index ${keyIndex} failed with status ${response.status}. Trying next key.`);
                keyIndex = (keyIndex + 1) % keys.length;
                attempts++;
            }
        } catch (error) {
            console.warn(`Error with API key index ${keyIndex}:`, error);
            keyIndex = (keyIndex + 1) % keys.length;
            attempts++;
        }
    }
    return null; // All keys failed
}
