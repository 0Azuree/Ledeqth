// color-match-game.js (Outline for Sliding Color Puzzle)

document.addEventListener('DOMContentLoaded', function() {

    const targetGridElement = document.getElementById('target-grid');
    const playerGridElement = document.getElementById('player-grid');
    const resetButton = document.getElementById('reset-button');
    const moveCounterElement = document.getElementById('move-counter');
    const scoreElement = document.getElementById('score');
    const gameStatusElement = document('game-status'); // Corrected: Should be getElementById


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
    const EMPTY_SLOT_MARKER = 'EMPTY'; // Define a unique marker for the empty slot


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


    // 1. Generate a new random target color pattern (Needs implementation)
    function generateRandomTarget() {
        targetColors = [];
        // TODO: Implement logic to generate a random 2D array (GRID_SIZE x GRID_SIZE)
        // using colors from COLOR_PALETTE, with one position marked as null or EMPTY_SLOT_MARKER.
        // Example Placeholder (replace with actual randomization):
         const colorsForTarget = COLOR_PALETTE.slice(0, GRID_SIZE * GRID_SIZE - 1);
         let colorIndex = 0;
         for (let row = 0; row < GRID_SIZE; row++) {
             targetColors[row] = [];
             for (let col = 0; col < GRID_SIZE; col++) {
                 if (row === GRID_SIZE - 1 && col === GRID_SIZE - 1) { // Last position is the empty slot in target
                      targetColors[row][col] = null; // Use null for the target's empty position
                  } else {
                     // Use colors from the shuffled list (implement shuffling of colorsForTarget)
                     // For now, just assign colors in order
                     targetColors[row][col] = colorsForTarget[colorIndex % colorsForTarget.length];
                     colorIndex++;
                 }
             }
         }
         // SHUFFLE colorsForTarget BEFORE assigning them to targetColors
         for (let i = colorsForTarget.length - 1; i > 0; i--) {
             const j = Math.floor(Math.random() * (i + 1));
             [colorsForTarget[i], colorsForTarget[j]] = [colorsForTarget[j], colorsForTarget[i]];
         }
         colorIndex = 0;
          for (let row = 0; row < GRID_SIZE; row++) {
             for (let col = 0; col < GRID_SIZE; col++) {
                  if (!(row === GRID_SIZE - 1 && col === GRID_SIZE - 1)) { // Skip the last position
                      targetColors[row][col] = colorsForTarget[colorIndex++];
                  }
             }
         }
         targetColors[GRID_SIZE - 1][GRID_SIZE - 1] = null; // Explicitly set the last one to null
    }

    // 2. Generate a solvable shuffled player grid based on the target colors (Needs implementation)
    function generateShuffledPlayerGrid() {
        playerColors = [];
        // TODO: Implement logic to generate a shuffled 2D array (GRID_SIZE x GRID_SIZE)
        // containing the same set of colors as targetColors (excluding the null/empty marker)
        // plus one EMPTY_SLOT_MARKER.
        // Ensure the generated puzzle is solvable (related to inversions and empty slot position).
        // A good approach is to start from the solved state and perform random valid moves.

        // Example Basic Implementation (May not guarantee solvability with simple shuffle):
        const colorsForPlayerGrid = [];
         for (let row = 0; row < GRID_SIZE; row++) {
             for (let col = 0; col < GRID_SIZE; col++) {
                 if (targetColors[row][col] !== null) {
                     colorsForPlayerGrid.push(targetColors[row][col]);
                 }
             }
         }
         colorsForPlayerGrid.push(EMPTY_SLOT_MARKER); // Add the empty slot marker

         // Simple Shuffle (Warning: May create unsolvable puzzles)
        for (let i = colorsForPlayerGrid.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [colorsForPlayerGrid[i], colorsForPlayerGrid[j]] = [colorsForPlayerGrid[j], colorsForPlayerGrid[i]];
        }

         // Reshape into 2D array and find empty slot position
        let flatIndex = 0;
        for (let row = 0; row < GRID_SIZE; row++) {
            playerColors[row] = [];
            for (let col = 0; col < GRID_SIZE; col++) {
                const colorOrMarker = colorsForPlayerGrid[flatIndex++];
                playerColors[row][col] = colorOrMarker;
                if (colorOrMarker === EMPTY_SLOT_MARKER) {
                    emptyTilePosition = { row: row, col: col };
                }
            }
        }

        // TODO: Replace the simple shuffle with a method that guarantees a solvable puzzle
        // by performing random valid slides from the solved state.

    }


    // 3. Render the grid in the DOM based on the current state (BASIC IMPLEMENTATION ADDED)
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
                tileDiv.dataset.col = col; // Store position data

                const colorOrMarker = colorsState[row][col];

                if (colorOrMarker === EMPTY_SLOT_MARKER || colorOrMarker === null) { // Check for both markers
                    // This is the empty tile slot or target's empty marker
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
         // TODO: For sliding animation, instead of re-rendering the whole grid,
         // update the DOM elements' positions using CSS transforms
         // after swapping the state in handleTileClick.
    }

    // 4. Handle a click on a player tile (Needs implementation)
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

             // TODO: Instead of re-rendering, animate the clicked tile moving into the empty slot's old position
             // and update the empty class on the tiles.
        }
    }


    // 5. Check if the grid is in the solved state (Needs implementation)
    function checkWinCondition() {
        if (isGameSolved) return;

        let isSolved = true;
        for (let row = 0; row < GRID_SIZE; row++) {
            for (let col = 0; col < GRID_SIZE; col++) {
                // Compare player tile color (or marker) with target color (or null)
                 if (playerColors[row][col] !== targetColors[row][col]) {
                     // Special case: If the player tile is the empty marker, it must match
                     // the target being null (the target's empty slot).
                     // If the player tile has a color, it must match the target's color.
                     const playerIsMarker = playerColors[row][col] === EMPTY_SLOT_MARKER;
                     const targetIsNull = targetColors[row][col] === null;

                     if (playerIsMarker !== targetIsNull) { // If one is a marker/null and the other isn't
                         isSolved = false;
                         break;
                     }
                     // If both are markers/null or both are colors, compare the colors
                     if (!playerIsMarker && !targetIsNull && playerColors[row][col] !== targetColors[row][col]) {
                          isSolved = false;
                         break;
                     }
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
