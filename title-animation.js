// title-animation.js

document.addEventListener('DOMContentLoaded', () => {
    const targetElement = document.getElementById('animated-title');
    const textToAnimate = "Ledeqth";
    const animationDelay = 100; // Milliseconds between each letter
    const pauseBeforeStart = 1000; // Milliseconds to wait before starting animation

    if (targetElement) {
        setTimeout(() => {
            let i = 0;
            const interval = setInterval(() => {
                if (i < textToAnimate.length) {
                    targetElement.textContent = textToAnimate.substring(0, i + 1);
                    i++;
                } else {
                    clearInterval(interval);
                    // Optionally, you can add a class to make it fully visible
                    // targetElement.style.opacity = 1;
                }
            }, animationDelay);
        }, pauseBeforeStart);
    }
});
