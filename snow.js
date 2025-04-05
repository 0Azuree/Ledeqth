document.addEventListener('DOMContentLoaded', function() {
    const snowContainer = document.getElementById('snow-container');
    const numberOfSnowflakes = 100; // Adjust density as needed

    if (!snowContainer) {
        console.error("Snow container not found!");
        return;
    }

    for (let i = 0; i < numberOfSnowflakes; i++) {
        createSnowflake();
    }

    function createSnowflake() {
        const snowflake = document.createElement('div');
        snowflake.classList.add('snowflake');

        // Random size
        const size = Math.random() * 4 + 1; // Size between 1px and 5px
        snowflake.style.width = `${size}px`;
        snowflake.style.height = `${size}px`;

        // Random horizontal starting position
        snowflake.style.left = `${Math.random() * 100}vw`;

        // Random animation duration (controls speed)
        const duration = Math.random() * 10 + 8; // Duration between 8s and 18s
        snowflake.style.animationDuration = `${duration}s`;

        // Random animation delay (stagger start times)
        const delay = Math.random() * 5; // Delay up to 5s
        snowflake.style.animationDelay = `${delay}s`;

        // Random horizontal drift within animation (subtle effect using keyframes)
        // Note: More complex drift requires more complex JS or multiple keyframes

        // Random opacity
        snowflake.style.opacity = Math.random() * 0.5 + 0.3; // Opacity between 0.3 and 0.8

        snowContainer.appendChild(snowflake);

        // Optional: Remove snowflake after animation ends to prevent buildup
        // This is good practice but may not be strictly necessary if opacity fades to 0
        snowflake.addEventListener('animationiteration', () => {
            // Reset snowflake to top with new random properties if you want continuous infinite snow
            // Or simply remove it if you have performance concerns (less likely with 100)
            // For simplicity, we rely on the infinite animation loop defined in CSS
        });
         // Alternative: remove after one full duration + delay (approximate)
         // setTimeout(() => {
         //    snowflake.remove();
         //    createSnowflake(); // Optionally create a new one to replace it
         // }, (duration + delay) * 1000);
    }
});
