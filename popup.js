document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById("popup-modal");
    const closeButton = document.getElementsByClassName("close-button")[0];
    const popupContent = document.getElementById("popup-content");

    const quotes = [
        {
            quote: "The beautiful thing about learning is that no one can take it away from you.",
            author: "B.B. King"
        },
        {
            quote: "Education is the most powerful weapon which you can use to change the world.",
            author: "Nelson Mandela"
        },
        {
            quote: "Live as if you were to die tomorrow. Learn as if you were to live forever.",
            author: "Mahatma Gandhi"
        },
        {
            quote: "The expert in anything was once a beginner.",
            author: "Helen Hayes"
        },
        {
            quote: "The only thing that interferes with my learning is my education.",
            author: "Albert Einstein"
        }
    ];

    let quoteInterval;

    function showPopup() {
        if (!sessionStorage.getItem('popupShown')) {
            setTimeout(() => {
                modal.style.display = "block";
                sessionStorage.setItem('popupShown', 'true');

                // Start cycling quotes after 10 seconds
                setTimeout(startQuoteCycle, 10000);
            }, 3000); // Show initial popup after 3 seconds
        }
    }

    function startQuoteCycle() {
        let quoteIndex = 0;

        function displayNextQuote() {
            if (modal.style.display !== "block") {
                clearInterval(quoteInterval);
                return;
            }
            popupContent.innerHTML = `
                <h2 style="font-style: italic;">"${quotes[quoteIndex].quote}"</h2>
                <p>- ${quotes[quoteIndex].author}</p>
            `;
            quoteIndex = (quoteIndex + 1) % quotes.length;
        }

        displayNextQuote(); // Show the first quote immediately
        quoteInterval = setInterval(displayNextQuote, 5000); // Change quote every 5 seconds
    }

    function closeModal() {
        modal.style.display = "none";
        clearInterval(quoteInterval);
    }

    closeButton.onclick = closeModal;
    window.onclick = function(event) {
        if (event.target == modal) {
            closeModal();
        }
    }

    showPopup();
});
