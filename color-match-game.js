// color-match-game.js - Complete Sliding Color Puzzle Logic with Animation

document.addEventListener('DOMContentLoaded', function() {

    const targetGridElement = document.getElementById('target-grid');
    const playerGridElement = document.getElementById('player-grid');
    const resetButton = document.getElementById('reset-button');
    const moveCounterElement = document.getElementById('move-counter');
    const scoreElement = document.getElementById('score');
    const gameStatusElement = document.getElementById('game-status'); // Corrected ID lookup


    // --- Game Configuration ---
    const GRID_SIZE = 3; // e.g., 3x3 puzzle (GRID_SIZE x GRID_SIZE)
    // Define the palette of colors to use for the tiles
    const COLOR_PALETTE = [
        '#FF0000', '#00FF00', '#0000FF', // Red, Green, Blue
        '#FFFF00', '#FFA500', '#800080', // Yellow, Orange, Purple
        '#00FFFF', '#FFC0CB', '#A52A2A', // Cyan, Pink, Brown
        '#808080', '#C0C0C0', '#FFD700'  // Gray, Silver, Gold (Adding more colors)
    ];
     // Ensure the palette has AT LEAST GRID_SIZE * GRID_SIZE - 1 colors
    if (COLOR_PALETTE.length < GRID_SIZE * GRID_SIZE - 1) {
        console.error(`Color palette needs at least ${GRID_SIZE * GRID_SIZE - 1} colors for a ${GRID_SIZE}x${GRID_SIZE} grid.`);
        // The game may not work correctly with a small palette
    }


    // --- Game State ---
    let targetColors = []; // 2D array for the randomized target color pattern
    let playerColors = []; // 2D array storing the player's current tile colors (colors or EMPTY_SLOT_MARKER)
    let emptyTilePosition = { row: -1, col: -1 }; // Track the position of the empty slot {row, col}
    let isGameSolved = false;
    let moveCount = 0;
    let score = 0;
    const EMPTY_SLOT_MARKER = 'EMPTY'; // Define a unique marker for the empty slot

    // --- Animation/Rendering State ---
    let currentTileSize = 0;
    let currentGap = 0;
    // We will get padding from CSS when rendering

    const SLIDE_DURATION = 300; // Match this to the CSS transition duration in ms


    // --- Functions ---

    // Initialize the game (called on page load and reset)
    function initializeGame() {
         isGameSolved = false; // Ensure game state is reset
         generateRandomTarget(); // Create a new random target pattern
         generateSolvableShuffledPlayerGrid(); // Create a new solvable shuffled player grid based on target colors

         // Render both the target and player grids
         renderGrid(targetGridElement, targetColors, false); // Render target (not interactive)
         renderGrid(playerGridElement, playerColors, true);  // Render player (interactive)

         // Reset game state variables for the new puzzle
         moveCount = 0;
         updateDisplay();
         updateGameStatus("Playing...");
    }


    // 1. Generate a new random target color pattern
    function generateRandomTarget() {
        targetColors = [];
        // Get the required number of unique colors from the palette
        const colorsForTarget = COLOR_PALETTE.slice(0, GRID_SIZE * GRID_SIZE - 1);

        // Shuffle the colors
        for (let i = colorsForTarget.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [colorsForTarget[i], colorsForTarget[j]] = [colorsForTarget[j], colorsForTarget[i]]; // Fisher-Yates Shuffle
        }

        // Reshape into the 2D targetColors array and add the empty marker at the last position
        let colorIndex = 0;
        for (let row = 0; row < GRID_SIZE; row++) {
            targetColors[row] = [];
            for (let col = 0; col < GRID_SIZE; col++) {
                // The last tile in the target doesn't have a color, it represents the empty slot
                if (row === GRID_SIZE - 1 && col === GRID_SIZE - 1) {
                     targetColors[row][col] = EMPTY_SLOT_MARKER; // Use the marker for the target's empty position
                 } else {
                     targetColors[row][col] = colorsForTarget[colorIndex++];
                 }
            }
        }
    }

    // 2. Generate a solvable shuffled player grid based on the target colors
    function generateSolvableShuffledPlayerGrid() {
        // Start playerColors in the solved state (matching target colors)
        playerColors = targetColors.map(row => [...row]); // Create a deep copy

        // Find the initial empty slot position in the solved state
        let currentRow = GRID_SIZE - 1;
        let currentCol = GRID_SIZE - 1;
        emptyTilePosition = { row: currentRow, col: currentCol }; // Assuming last slot is target empty position


        // Perform many random *valid* slides to shuffle the grid, guaranteeing solvability
        const movesToPerform = GRID_SIZE * GRID_SIZE * 100; // Perform a sufficient number of shuffles

        for (let i = 0; i < movesToPerform; i++) {
            const possibleMoves = [];
            // Check adjacent positions (up, down, left, right) from the *current empty position*
            if (currentRow > 0) possibleMoves.push({ row: currentRow - 1, col: currentCol }); // Tile above empty
            if (currentRow < GRID_SIZE - 1) possibleMoves.push({ row: currentRow + 1, col: currentCol }); // Tile below empty
            if (currentCol > 0) possibleMoves.push({ row: currentRow, col: currentCol - 1 }); // Tile left of empty
            if (currentCol < GRID_SIZE - 1) possibleMoves.push({ row: currentRow, col: currentCol + 1 }); // Tile right of empty

            // Select a random valid move (a tile adjacent to the empty slot)
            const randomMove = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
            const tileToMoveRow = randomMove.row;
            const tileToMoveCol = randomMove.col;

            // Swap the color/marker in the playerColors state
            const colorToMove = playerColors[tileToMoveRow][tileToMoveCol];
            playerColors[currentRow][currentCol] = colorToMove; // Move the tile's color to the empty slot's position
            playerColors[tileToMoveRow][tileToMoveCol] = EMPTY_SLOT_MARKER; // Put the empty marker in the tile's old position

            // Update the empty tile position
            currentRow = tileToMoveRow;
            currentCol = tileToMoveCol;
            emptyTilePosition = { row: currentRow, col: currentCol };
        }
        // The playerColors array is now shuffled and solvable, and emptyTilePosition is correct
    }


    // 3. Render the grid in the DOM based on the current state
    function renderGrid(gridElement, colorsState, isInteractive) {
        gridElement.innerHTML = ''; // Clear previous tiles

        // Calculate tile size based on container width for responsiveness
         const containerWidth = gridElement.parentElement.clientWidth;
         const computedStyles = getComputedStyle(gridElement);
         currentGap = parseInt(computedStyles.gap); // Get gap from CSS
         currentPadding = parseInt(computedStyles.padding) || 0; // Get padding from CSS, default to 0 if undefined

         const totalGapWidth = (GRID_SIZE - 1) * currentGap;
         const totalPadding = currentPadding * 2;
         const availableWidth = containerWidth - totalGapWidth - totalPadding;
         currentTileSize = availableWidth / GRID_SIZE; // Store calculated tile size


         gridElement.style.gridTemplateColumns = `repeat(${GRID_SIZE}, ${currentTileSize}px)`;
         gridElement.style.gridTemplateRows = `repeat(${GRID_SIZE}, ${currentTileSize}px)`;
         gridElement.style.width = `${containerWidth}px`; // Make grid fill its container width
         // gridElement.style.height = `auto`; // Height will adjust based on rows - handled by grid default


        for (let row = 0; row < GRID_SIZE; row++) {
            for (let col = 0; col < GRID_SIZE; col++) {
                const tileDiv = document.createElement('div');
                tileDiv.classList.add('game-tile');
                tileDiv.dataset.row = row;
                tileDiv.dataset.col = col; // Store position data

                const colorOrMarker = colorsState[row][col];

                if (colorOrMarker === EMPTY_SLOT_MARKER) {
                    // This is the empty tile slot
                    tileDiv.classList.add('empty');
                     // Ensure the empty slot has correct grid positioning from the start
                    tileDiv.style.gridRow = row + 1;
                    tileDiv.style.gridColumn = col + 1;
                } else {
                    // This is a color tile
                    tileDiv.style.backgroundColor = colorOrMarker;
                     // Set initial grid positioning
                    tileDiv.style.gridRow = row + 1;
                    tileDiv.style.gridColumn = col + 1;

                    if (isInteractive) {
                        // Add click listener only to player tiles
                        tileDiv.addEventListener('click', handleTileClick);
                    } else {
                         // Make target tiles non-interactive
                        tileDiv.style.cursor = 'default';
                        tileDiv.style.pointerEvents = 'none'; // Prevent clicks
                    }
                }

                gridElement.appendChild(tileDiv);
            }
        }
    }

    // 4. Handle a click on a player tile
    function handleTileClick(event) {
        if (isGameSolved) return;

        const clickedTile = event.target;
        const clickedRow = parseInt(clickedTile.dataset.row);
        const clickedCol = parseInt(clickedTile.dataset.col);

        // Check if the clicked tile is adjacent to the empty slot
        const rowDiff = Math.abs(clickedRow - emptyTilePosition.row);
        const colDiff = Math.abs(clickedCol - emptyTilePosition.col);

        const isAdjacent = (rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1);

        if (isAdjacent) {
            // --- Perform the slide (update state and animate DOM) ---

            // 1. Update the state (swap values in the playerColors array)
            const colorToMove = playerColors[clickedRow][clickedCol];
            playerColors[emptyTilePosition.row][emptyTilePosition.col] = colorToMove; // Move color to empty slot's old position in state
            playerColors[clickedRow][clickedCol] = EMPTY_SLOT_MARKER; // Put empty marker in clicked tile's original position in state


            // 2. Calculate the translation distance for the animation
            let deltaX = (emptyTilePosition.col - clickedCol) * (currentTileSize + currentGap);
            let deltaY = (emptyTilePosition.row - clickedRow) * (currentTileSize + currentGap);

            // 3. Get the DOM element for the empty slot's old position
            // We need this to update its appearance after the clicked tile slides into it
            const emptySlotDomElement = playerGridElement.querySelector('.game-tile.empty');


            // 4. Apply transform to the clicked tile DOM element to start the animation
            clickedTile.style.transform = `translate(${deltaX}px, ${deltaY}px)`;

            // 5. Use setTimeout to wait for the animation to finish before updating the DOM structure/classes
            // This makes the animation smooth, then snaps to the final state
            setTimeout(() => {
                // Reset transform after animation
                clickedTile.style.transform = '';

                // Update DOM elements' grid positions to their new logical positions
                // Get the new logical position of the clicked tile (which is where the empty slot was)
                clickedTile.style.gridRow = emptyTilePosition.row + 1;
                clickedTile.style.gridColumn = emptyTilePosition.col + 1;

                // Get the new logical position of the empty slot (which is where the clicked tile was)
                 emptySlotDomElement.style.gridRow = clickedRow + 1;
                 emptySlotDomElement.style.gridColumn = clickedCol + 1;


                // Update classes and background color after the move
                clickedTile.classList.remove('empty'); // The clicked tile is no longer empty
                emptySlotDomElement.classList.add('empty'); // The old empty slot is now empty
                 emptySlotDomElement.style.backgroundColor = ''; // Ensure the new empty slot looks empty

                 // The clicked tile now has the color, set its background color
                 clickedTile.style.backgroundColor = colorToMove;


                // Update the empty tile's recorded position in state
                emptyTilePosition = { row: clickedRow, col: clickedCol }; // The empty slot is now where the clicked tile was

                // Increment move counter
                moveCount++;
                updateDisplay();

                // Check if the game is won
                checkWinCondition();

            }, SLIDE_DURATION); // Match this duration to the CSS transition-duration
        }
    }


    // 5. Check if the grid is in the solved state
    function checkWinCondition() {
        if (isGameSolved) return;

        let isSolved = true;
        for (let row = 0; row < GRID_SIZE; row++) {
            for (let col = 0; col < GRID_SIZE; col++) {
                // Compare player tile value with target tile value
                if (playerColors[row][col] !== targetColors[row][col]) {
                    isSolved = false;
                    break;
                }
            }
            if (!isSolved) break;
        }

        if (isSolved) {
            isGameSolved = true;
            score++; // Increment score
             updateDisplay();
            updateGameStatus("Puzzle Complete!"); // Update status
            // Optional: Trigger animation or celebration (e.g., adding a class)
             playerGridElement.classList.add('won'); // Add a class for visual feedback


            // Start a new random puzzle automatically after a delay
            setTimeout(startNewPuzzle, 2000);
        }
    }

    // 6. Update score and move counter displays
    function updateDisplay() {
        moveCounterElement.textContent = moveCount;
        scoreElement.textContent = score;
    }

    // 7. Update the game status text
    function updateGameStatus(message) {
         gameStatusElement.textContent = message;
         if (isGameSolved) {
             gameStatusElement.classList.add('won');
         } else {
             gameStatusElement.classList.remove('won');
         }
    }

    // 8. Start a new random puzzle (generates new target and shuffled player grid)
    function startNewPuzzle() {
         playerGridElement.classList.remove('won'); // Remove win class from previous game
        initializeGame(); // Re-run initialization to get a new puzzle
    }


    // --- Event Listeners ---
    // Reset button now triggers starting a new puzzle
    resetButton.addEventListener('click', startNewPuzzle);


    // --- Initial Game Setup ---
    initializeGame(); // Start the first game when the page loads

     // Optional: Handle window resize to make the grid responsive
    window.addEventListener('resize', () => {
        // Re-render the grids on resize to adjust tile sizes
        renderGrid(targetGridElement, targetColors, false);
        renderGrid(playerGridElement, playerColors, true);
    });

});
