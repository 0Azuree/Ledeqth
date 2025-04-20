// color-match-game.js (Outline for Sliding Color Puzzle)

document.addEventListener('DOMContentLoaded', function() {

    const targetGridElement = document.getElementById('target-grid');
    const playerGridElement = document.getElementById('player-grid');
    const resetButton = document.getElementById('reset-button');
    const moveCounterElement = document.getElementById('move-counter');
    const scoreElement = document.getElementById('score');
    const gameStatusElement = document.getElementById('game-status');

    // --- Game Configuration ---
    const GRID_SIZE = 3; // e.g., 3x3 puzzle (GRID_SIZE x GRID_SIZE)
    // Define the palette of colors to use for the tiles
    const COLOR_PALETTE = [
        '#FF0000', '#00FF00', '#0000FF', // Red, Green, Blue
        '#FFFF00', '#FFA500', '#800080', // Yellow, Orange, Purple
        '#00FFFF', '#FFC0CB', '#A52A2A', // Cyan, Pink, Brown
        // Add more colors if GRID_SIZE * GRID_SIZE - 1 is greater than 9
    ];
    // Ensure the palette has enough colors for GRID_SIZE * GRID_SIZE - 1 tiles
    if (COLOR_PALETTE.length < GRID_SIZE * GRID_SIZE - 1) {
        console.error("Color palette is too small for the selected GRID_SIZE.");
        // You might want to add more colors or reduce GRID_SIZE
    }


    // --- Game State ---
    let targetColors = []; // 2D array for the randomized target color pattern
    let playerColors = []; // 2D array storing the player's current tile colors
    let emptyTilePosition = { row: -1, col: -1 }; // Track the position of the empty slot
    let isGameSolved = false;
    let moveCount = 0;
    let score = 0;

    // --- Functions ---

    // Initialize the game (called on page load and reset)
    function initializeGame() {
         generateRandomTarget(); // Create a new random target pattern
         generateShuffledPlayerGrid(); // Create a new shuffled player grid based on target colors

         // Render both the target and player grids
         renderGrid(targetGridElement, targetColors, false); // Render target (not interactive)
         renderGrid(playerGridElement, playerColors, true);  // Render player (interactive)

         // Reset game state variables
         moveCount = 0;
         isGameSolved = false;
         updateDisplay();
         updateGameStatus("Playing...");
    }


    // 1. Generate a new random target color pattern
    function generateRandomTarget() {
        targetColors = [];
        // Create a flat array of colors needed for the target (size*size - 1 colors)
        const colorsForTarget = COLOR_PALETTE.slice(0, GRID_SIZE * GRID_SIZE - 1);
        // Shuffle the colors
        for (let i = colorsForTarget.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [colorsForTarget[i], colorsForTarget[j]] = [colorsForTarget[j], colorsForTarget[i]];
        }
        // Reshape into the 2D targetColors array
        let colorIndex = 0;
        for (let row = 0; row < GRID_SIZE; row++) {
            targetColors[row] = [];
            for (let col = 0; col < GRID_SIZE; col++) {
                // The last tile in the target doesn't have a color from the palette, it's the empty slot marker
                if (row === GRID_SIZE - 1 && col === GRID_SIZE - 1) {
                     targetColors[row][col] = null; // Use null or a special marker for the empty target position
                 } else {
                     targetColors[row][col] = colorsForTarget[colorIndex++];
                 }
            }
        }
    }

    // 2. Generate a solvable shuffled player grid based on the target colors
    function generateShuffledPlayerGrid() {
        // Get all the colors that will be in the player grid (same as target colors, excluding the last/empty one)
        const colorsForPlayerGrid = [];
        for (let row = 0; row < GRID_SIZE; row++) {
             for (let col = 0; col < GRID_SIZE; col++) {
                 if (targetColors[row][col] !== null) { // Exclude the empty target position
                     colorsForPlayerGrid.push(targetColors[row][col]);
                 }
             }
         }

        // Add a marker for the empty slot to this flat array
        const EMPTY_SLOT_MARKER = 'EMPTY'; // Define a unique marker for the empty slot
        colorsForPlayerGrid.push(EMPTY_SLOT_MARKER);


        // Shuffle the flat array of colors + empty marker
         // Note: A simple shuffle might result in an unsolvable puzzle.
         // For guaranteed solvability, start with the solved state and perform random *valid* slides.
         // The code below shows a simple shuffle approach, but be aware of solvability issues.
        for (let i = colorsForPlayerGrid.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [colorsForPlayerGrid[i], colorsForPlayerGrid[j]] = [colorsForPlayerGrid[j], colorsForPlayerGrid[i]];
        }

        // Reshape the shuffled array into the playerColors 2D array
        playerColors = [];
        let flatIndex = 0;
        for (let row = 0; row < GRID_SIZE; row++) {
            playerColors[row] = [];
            for (let col = 0; col < GRID_SIZE; col++) {
                const colorOrMarker = colorsForPlayerGrid[flatIndex++];
                playerColors[row][col] = colorOrMarker;
                // Record the position of the empty slot
                if (colorOrMarker === EMPTY_SLOT_MARKER) {
                    emptyTilePosition = { row: row, col: col };
                }
            }
        }

        // --- Optional: Implement a shuffle based on random valid slides instead ---
         // This guarantees a solvable puzzle but is more complex to implement.
         /*
         // 1. Start playerColors in the solved state (matching target colors)
         playerColors = targetColors.map(row => [...row]);
         // 2. Find the initial empty slot position (should match target's empty position)
         emptyTilePosition = { row: GRID_SIZE - 1, col: GRID_SIZE - 1 }; // Assuming last slot is target empty
         // 3. Perform many random valid slides
         const movesToPerform = GRID_SIZE * GRID_SIZE * 100;
         let currentRow = emptyTilePosition.row;
         let currentCol = emptyTilePosition.col;

          for (let i = 0; i < movesToPerform; i++) {
              const possibleMoves = [];
              // Check adjacent positions (up, down, left, right)
              if (currentRow > 0) possibleMoves.push({ row: currentRow - 1, col: currentCol }); // Up
              if (currentRow < GRID_SIZE - 1) possibleMoves.push({ row: currentRow + 1, col: currentCol }); // Down
              if (currentCol > 0) possibleMoves.push({ row: currentRow, col: currentCol - 1 }); // Left
              if (currentCol < GRID_SIZE - 1) possibleMoves.push({ row: currentRow, col: currentCol + 1 }); // Right

               // Select a random valid move
               const randomMove = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];

               // Swap colors in playerColors state
               const colorToMove = playerColors[randomMove.row][randomMove.col];
               playerColors[currentRow][currentCol] = colorToMove;
               playerColors[randomMove.row][randomCol.col] = EMPTY_SLOT_MARKER; // Move the empty slot marker

               // Update the empty tile position
               currentRow = randomMove.row;
               currentCol = randomMove.col;
               emptyTilePosition = { row: currentRow, col: currentCol };
           }
         */

    }


    // 3. Render the grid in the DOM based on the current state
    function renderGrid(gridElement, colorsState, isInteractive) {
        gridElement.innerHTML = ''; // Clear previous tiles

        // Set grid dimensions in CSS based on size (assuming tiles are square)
         // This could be dynamic based on container width for responsiveness
         const containerWidth = gridElement.parentElement.clientWidth;
         const gap = parseInt(getComputedStyle(gridElement).gap); // Get gap from CSS
         const padding = parseInt(getComputedStyle(gridElement).padding) || 0; // Get padding from CSS, default to 0 if undefined

         // Calculate tile size based on container width, gaps, and padding
         const totalGapWidth = (GRID_SIZE - 1) * gap;
         const totalPadding = padding * 2;
         const availableWidth = containerWidth - totalGapWidth - totalPadding;
         const tileSize = availableWidth / GRID_SIZE;

         gridElement.style.gridTemplateColumns = `repeat(${GRID_SIZE}, ${tileSize}px)`;
         gridElement.style.gridTemplateRows = `repeat(${GRID_SIZE}, ${tileSize}px)`;
         gridElement.style.width = `${containerWidth}px`; // Make grid fill its container width
         gridElement.style.height = `auto`; // Height will adjust based on rows


        for (let row = 0; row < GRID_SIZE; row++) {
            for (let col = 0; col < GRID_SIZE; col++) {
                const tileDiv = document.createElement('div');
                tileDiv.classList.add('game-tile');
                tileDiv.dataset.row = row;
                tileDiv.dataset.col = col;

                const colorOrMarker = colorsState[row][col];

                if (colorOrMarker === EMPTY_SLOT_MARKER) {
                    // This is the empty tile slot
                    tileDiv.classList.add('empty');
                } else {
                    // This is a color tile
                    tileDiv.style.backgroundColor = colorOrMarker;

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
         // Note: For sliding animation, instead of re-rendering the whole grid,
         // you would update the positions of the specific tiles involved in the swap
         // using CSS transforms and update the empty class.
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
            // --- Perform the slide (swap colors in the state) ---
            const colorToMove = playerColors[clickedRow][clickedCol];
            playerColors[emptyTilePosition.row][emptyTilePosition.col] = colorToMove; // Move color to empty slot's old position
            playerColors[clickedRow][clickedCol] = EMPTY_SLOT_MARKER; // Put empty marker in clicked tile's position

            // Update the empty tile's recorded position
            emptyTilePosition = { row: clickedRow, col: clickedCol };

            // Increment move counter
            moveCount++;
            updateDisplay();

            // Re-render the player grid to show the new state
             renderGrid(playerGridElement, playerColors, true);

            // Check if the game is won
            checkWinCondition();
        }
    }


    // 5. Check if the player's grid matches the target grid pattern
    function checkWinCondition() {
        if (isGameSolved) return;

        let isSolved = true;
        for (let row = 0; row < GRID_SIZE; row++) {
            for (let col = 0; col < GRID_SIZE; col++) {
                // Compare player tile color (or marker) with target color (or marker)
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
            // Optional: Trigger animation or celebration

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
        initializeGame(); // Re-run initialization to get a new puzzle
    }


    // --- Event Listeners ---
    // Reset button now triggers starting a new puzzle
    resetButton.addEventListener('click', startNewPuzzle);


    // --- Initial Game Setup ---
    initializeGame(); // Start the first game when the page loads

});
