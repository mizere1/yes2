window.onload = function() {
    const modal = document.getElementById("popup-modal");
    if (!modal) {
        console.error("Popup modal not found!");
        return;
    }

    const closeButton = modal.querySelector(".close-button");
    if (!closeButton) {
        console.error("Close button not found inside modal!");
        return;
    }

    const popupContent = document.getElementById("popup-content");
    if (!popupContent) {
        console.error("Popup content area not found!");
        return;
    }

    const quotes = [
        { quote: "The beautiful thing about learning is that no one can take it away from you.", author: "B.B. King" },
        { quote: "Education is the most powerful weapon which you can use to change the world.", author: "Nelson Mandela" },
        { quote: "Live as if you were to die tomorrow. Learn as if you were to live forever.", author: "Mahatma Gandhi" },
        { quote: "The expert in anything was once a beginner.", author: "Helen Hayes" },
        { quote: "The only thing that interferes with my learning is my education.", author: "Albert Einstein" }
    ];

    let quoteInterval;

    function showPopup() {
        // Use try-catch for sessionStorage in case of security restrictions
        try {
            if (!sessionStorage.getItem('popupShown')) {
                setTimeout(() => {
                    modal.style.display = "block";
                    sessionStorage.setItem('popupShown', 'true');
                    setTimeout(startQuoteCycle, 10000);
                }, 3000);
            }
        } catch (e) {
            console.error("Session storage is not available.", e);
            // Fallback behavior: just show the popup without session storage logic
            setTimeout(() => {
                modal.style.display = "block";
                setTimeout(startQuoteCycle, 10000);
            }, 3000);
        }
    }

    function startQuoteCycle() {
        let quoteIndex = 0;
        function displayNextQuote() {
            if (modal.style.display !== "block") {
                if (quoteInterval) clearInterval(quoteInterval);
                return;
            }
            popupContent.innerHTML = `<h2 style="font-style: italic;">"${quotes[quoteIndex].quote}"</h2><p>- ${quotes[quoteIndex].author}</p>`;
            quoteIndex = (quoteIndex + 1) % quotes.length;
        }
        displayNextQuote();
        quoteInterval = setInterval(displayNextQuote, 5000);
    }

    function closeModal() {
        modal.style.display = "none";
        if (quoteInterval) {
            clearInterval(quoteInterval);
        }
    }

    closeButton.onclick = closeModal;
    window.onclick = function(event) {
        if (event.target == modal) {
            closeModal();
        }
    }

    showPopup();
};
