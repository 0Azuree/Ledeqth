// color-match-game.js

document.addEventListener('DOMContentLoaded', function() {

    const targetGridElement = document.getElementById('target-grid');
    const playerGridElement = document.getElementById('player-grid');
    const resetButton = document.getElementById('reset-button');
    const gameStatusElement = document.getElementById('game-status');

    // --- Game Configuration ---
    const GRID_SIZE = 3; // e.g., a 3x3 grid
    // Define the target colors as a 2D array (representing the image)
    // Example for a 3x3 grid:
    const TARGET_COLORS = [
        ['#FF0000', '#00FF00', '#0000FF'], // Row 1: Red, Green, Blue
        ['#FFFF00', '#FFA500', '#800080'], // Row 2: Yellow, Orange, Purple
        ['#00FFFF', '#FFC0CB', '#FFFFFF']  // Row 3: Cyan, Pink, White
    ];
    // You can define a palette of colors to cycle through,
    // or derive it from the target colors.
    const COLOR_PALETTE = ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FFA500', '#800080', '#00FFFF', '#FFC0CB', '#FFFFFF', '#333333']; // Example palette including a default dark color


    // --- Game State ---
    let playerColors = []; // 2D array to store the player's current tile colors
    let isGameWon = false;

    // --- Functions ---

    // Initialize the game grid dimensions in CSS using JS
    function setupGridCSS(gridElement, size, tileSize = 50, gap = 5, padding = 5) {
        gridElement.style.gridTemplateColumns = `repeat(${size}, ${tileSize}px)`;
        gridElement.style.gridTemplateRows = `repeat(${size}, ${tileSize}px)`;
        gridElement.style.gap = `${gap}px`;
        gridElement.style.padding = `${padding}px`;
        // Adjust tile size for media queries (optional, but good practice)
        // This needs to match CSS media queries or be handled dynamically
        const containerWidth = gridElement.parentElement.clientWidth;
        const maxGridWidth = size * tileSize + (size - 1) * gap + padding * 2;
         if (containerWidth < maxGridWidth) {
             const newTileSize = (containerWidth - (size - 1) * gap - padding * 2) / size;
              gridElement.style.gridTemplateColumns = `repeat(${size}, ${newTileSize}px)`;
             gridElement.style.gridTemplateRows = `repeat(${size}, ${newTileSize}px)`;
         }
         // Note: A more robust responsive grid might be needed for complex layouts
    }


    // Create and display the target grid tiles
    function renderTargetGrid() {
        targetGridElement.innerHTML = ''; // Clear previous grid
        setupGridCSS(targetGridElement, GRID_SIZE); // Set CSS grid properties

        for (let row = 0; row < GRID_SIZE; row++) {
            for (let col = 0; col < GRID_SIZE; col++) {
                const tile = document.createElement('div');
                tile.classList.add('game-tile');
                 // For the target, just set the background color directly
                tile.style.backgroundColor = TARGET_COLORS[row][col];
                // Make target tiles non-interactive
                 tile.style.cursor = 'default';
                 tile.style.pointerEvents = 'none';

                targetGridElement.appendChild(tile);
            }
        }
    }

    // Create and display the player's interactive grid tiles
    function renderPlayerGrid() {
         playerGridElement.innerHTML = ''; // Clear previous grid
         setupGridCSS(playerGridElement, GRID_SIZE); // Set CSS grid properties

         // Initialize or reset player colors (e.g., to a default color)
         playerColors = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill('#333333')); // Fill with a dark gray default

         for (let row = 0; row < GRID_SIZE; row++) {
            for (let col = 0; col < GRID_SIZE; col++) {
                const tile = document.createElement('div');
                tile.classList.add('game-tile');
                tile.dataset.row = row; // Store position data
                tile.dataset.col = col;
                tile.style.backgroundColor = playerColors[row][col]; // Set initial color

                // Add click listener
                tile.addEventListener('click', handleTileClick);

                playerGridElement.appendChild(tile);
            }
        }
         updateGameStatus(); // Set initial status
    }

    // Handle a click on a player tile
    function handleTileClick(event) {
        if (isGameWon) return; // Do nothing if game is already won

        const clickedTile = event.target;
        const row = parseInt(clickedTile.dataset.row);
        const col = parseInt(clickedTile.dataset.col);

        // --- Tile Interaction Logic (Cycling Colors) ---
        let currentColor = playerColors[row][col];
        let currentIndex = COLOR_PALETTE.indexOf(currentColor);
        let nextIndex = (currentIndex + 1) % COLOR_PALETTE.length;
        let nextColor = COLOR_PALETTE[nextIndex];

        playerColors[row][col] = nextColor; // Update state
        clickedTile.style.backgroundColor = nextColor; // Update appearance

        // Check if the game is won after every click
        checkWinCondition();
    }

    // Check if the player's grid matches the target grid
    function checkWinCondition() {
         if (isGameWon) return; // No need to check if already won

        let matches = true;
        for (let row = 0; row < GRID_SIZE; row++) {
            for (let col = 0; col < GRID_SIZE; col++) {
                if (playerColors[row][col] !== TARGET_COLORS[row][col]) {
                    matches = false;
                    break; // No need to check further
                }
            }
            if (!matches) break;
        }

        if (matches) {
            isGameWon = true;
            updateGameStatus(); // Update status to "Won!"
            // Optional: Add a visual fanfare or disable clicks
        }
    }

    // Update the game status text
    function updateGameStatus() {
         if (isGameWon) {
             gameStatusElement.textContent = "You Won!";
             gameStatusElement.classList.add('won');
         } else {
             gameStatusElement.textContent = "Matching...";
             gameStatusElement.classList.remove('won');
         }
    }

    // Reset the game
    function resetGame() {
         isGameWon = false;
         renderPlayerGrid(); // Re-render the player grid to reset colors
         // Optional: Shuffle player grid instead of starting with solid color
    }

    // --- Event Listeners ---
    resetButton.addEventListener('click', resetGame);

    // --- Initial Game Setup ---
    renderTargetGrid(); // Display the target colors
    renderPlayerGrid(); // Set up and display the initial player grid

});
