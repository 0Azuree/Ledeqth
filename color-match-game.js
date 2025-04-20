// color-match-game.js (Outline for Sliding Puzzle)

document.addEventListener('DOMContentLoaded', function() {

    const targetImageElement = document.getElementById('target-image');
    const playerGridElement = document.getElementById('player-grid');
    const resetButton = document.getElementById('reset-button');
    const moveCounterElement = document.getElementById('move-counter');
    const scoreElement = document.getElementById('score');
    const gameStatusElement = document.getElementById('game-status');

    // --- Game Configuration ---
    const GRID_SIZE = 3; // e.g., 3x3 puzzle (GRID_SIZE x GRID_SIZE)
    const IMAGE_URL = targetImageElement.src; // Get the image URL from the HTML

    // --- Game State ---
    let playerGridState = []; // 2D array representing the puzzle grid state (stores tile indices)
    let emptyTilePosition = { row: -1, col: -1 }; // Track the position of the empty slot
    let isGameSolved = false;
    let moveCount = 0;
    let score = 0;

    // --- Functions ---

    // 1. Preload the image and set up the game
    function startGame() {
        // Ensure image is loaded before setting up the grid
        if (targetImageElement.complete) {
            setupGame(targetImageElement, GRID_SIZE);
        } else {
            targetImageElement.onload = () => {
                setupGame(targetImageElement, GRID_SIZE);
            };
        }
    }


    // 2. Set up the game grid based on the image and size
    function setupGame(imageElement, size) {
        const imageWidth = imageElement.naturalWidth;
        const imageHeight = imageElement.naturalHeight;
        const tileSize = Math.min(imageWidth, imageHeight) / size; // Calculate tile size based on smaller dimension

        // Set player grid CSS dimensions based on tile size
        playerGridElement.style.gridTemplateColumns = `repeat(${size}, ${tileSize}px)`;
        playerGridElement.style.gridTemplateRows = `repeat(${size}, ${tileSize}px)`;
         // You might need to adjust gap and padding here based on CSS
         // Example adjustment if gap is 5px and padding is 5px
         const gridTotalWidth = size * tileSize + (size - 1) * 5 + 5 * 2;
         const gridTotalHeight = size * tileSize + (size - 1) * 5 + 5 * 2;
         playerGridElement.style.width = `${gridTotalWidth}px`;
         playerGridElement.style.height = `${gridTotalHeight}px`;


        // Initialize the player grid state with tiles in the solved order (0 to size*size - 1)
        playerGridState = [];
        let tileIndex = 0;
        for (let row = 0; row < size; row++) {
            playerGridState[row] = [];
            for (let col = 0; col < size; col++) {
                playerGridState[row][col] = tileIndex++;
            }
        }

        // Set the empty tile position (usually the last one)
        emptyTilePosition = { row: size - 1, col: size - 1 };
        // Mark the last tile index as the 'empty' one visually (e.g., -1 or size*size - 1)
        // We'll use size*size - 1 as the index for the empty tile slot in state

        // Shuffle the grid (perform random valid moves)
        shuffleGrid(size * size * 100); // Perform many random moves to shuffle

        // Render the initial grid state
        renderGrid(imageElement, size, tileSize);

        // Reset game state variables
        moveCount = 0;
        isGameSolved = false;
        updateDisplay();
        updateGameStatus("Playing...");
    }

    // 3. Shuffle the grid by performing random valid moves
    function shuffleGrid(movesToPerform) {
        // Note: Simple random swaps can result in unsolvable puzzles.
        // Performing random *valid* slides from the solved state ensures solvability.
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

            // Swap the empty tile with the randomly selected adjacent tile in the state
            const tileToMoveIndex = playerGridState[randomMove.row][randomMove.col];
            playerGridState[currentRow][currentCol] = tileToMoveIndex;
            playerGridState[randomMove.row][randomMove.col] = GRID_SIZE * GRID_SIZE - 1; // Move the empty slot

            // Update the empty tile position
            currentRow = randomMove.row;
            currentCol = randomMove.col;
            emptyTilePosition = { row: currentRow, col: currentCol };
        }
    }


    // 4. Render the grid based on the current state
    function renderGrid(imageElement, size, tileSize) {
        playerGridElement.innerHTML = ''; // Clear previous tiles

        const imageWidth = imageElement.naturalWidth;
        const imageHeight = imageElement.naturalHeight;
        const tilePercentage = 100 / size; // Percentage for background-size

        for (let row = 0; row < size; row++) {
            for (let col = 0; col < size; col++) {
                const tileDiv = document.createElement('div');
                tileDiv.classList.add('game-tile');
                tileDiv.dataset.row = row;
                tileDiv.dataset.col = col;

                const tileIndex = playerGridState[row][col];

                if (tileIndex === size * size - 1) {
                    // This is the empty tile slot
                    tileDiv.classList.add('empty');
                } else {
                    // Calculate background position for this tile based on its solved position
                    const originalRow = Math.floor(tileIndex / size);
                    const originalCol = tileIndex % size;
                    const backgroundPositionX = originalCol * tilePercentage; // Percentage
                    const backgroundPositionY = originalRow * tilePercentage; // Percentage

                    tileDiv.style.width = `${tileSize}px`; // Set dimensions in pixels
                    tileDiv.style.height = `${tileSize}px`;
                    tileDiv.style.backgroundImage = `url('${IMAGE_URL}')`;
                    tileDiv.style.backgroundSize = `${size * 100}% ${size * 100}%`; // Size relative to original image
                    tileDiv.style.backgroundPosition = `${backgroundPositionX}% ${backgroundPositionY}%`; // Position in percentage

                    // Add click listener to interactive tiles
                    tileDiv.addEventListener('click', handleTileClick);
                }

                playerGridElement.appendChild(tileDiv);
            }
        }
         // Note: To animate movement, you'd typically calculate the difference
         // in position before/after the state swap and apply a CSS transform.
         // This simple render just redraws the grid in the new state.
    }

    // 5. Handle a click on a player tile
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
            // --- Perform the slide ---
            // Swap the clicked tile's index with the empty slot's index in the state
            const tileIndexToMove = playerGridState[clickedRow][clickedCol];
            playerGridState[emptyTilePosition.row][emptyTilePosition.col] = tileIndexToMove;
            playerGridState[clickedRow][clickedCol] = GRID_SIZE * GRID_SIZE - 1; // Move the empty slot's marker

            // Update the empty tile's recorded position
            emptyTilePosition = { row: clickedRow, col: clickedCol };

            // Increment move counter
            moveCount++;
            updateDisplay();

            // Re-render the grid to show the new state (or animate the swap)
             renderGrid(targetImageElement, GRID_SIZE, playerGridElement.clientWidth / GRID_SIZE); // Recalculate tile size based on current grid width

            // Check if the game is won
            checkWinCondition();
        }
    }


    // 6. Check if the grid is in the solved state
    function checkWinCondition() {
        if (isGameSolved) return;

        let isSolved = true;
        let expectedIndex = 0;
        for (let row = 0; row < GRID_SIZE; row++) {
            for (let col = 0; col < GRID_SIZE; col++) {
                // Check if the tile index at this position is the expected index
                // EXCEPT for the last tile (empty slot)
                 if (row === GRID_SIZE - 1 && col === GRID_SIZE - 1) {
                     // The last position should contain the empty tile marker
                     if (playerGridState[row][col] !== GRID_SIZE * GRID_SIZE - 1) {
                         isSolved = false;
                     }
                 } else {
                     // Other positions should contain tiles 0, 1, 2, ... in order
                     if (playerGridState[row][col] !== expectedIndex) {
                        isSolved = false;
                        break;
                    }
                 }
                expectedIndex++;
            }
            if (!isSolved) break;
        }

        if (isSolved) {
            isGameSolved = true;
            score++; // Increment score
             updateDisplay();
            updateGameStatus("Puzzle Complete!"); // Update status
            // Optional: Show the last tile image in the empty slot now that it's solved
            // Optional: Trigger animation or celebration
            // Optional: Automatically start a new random puzzle
            setTimeout(startNewRandomPuzzle, 2000); // Start new puzzle after a delay
        }
    }

    // 7. Update score and move counter displays
    function updateDisplay() {
        moveCounterElement.textContent = moveCount;
        scoreElement.textContent = score;
    }

    // 8. Update the game status text
    function updateGameStatus(message) {
         gameStatusElement.textContent = message;
         if (isGameSolved) {
             gameStatusElement.classList.add('won');
         } else {
             gameStatusElement.classList.remove('won');
         }
    }

    // 9. Start a new random puzzle (select random image, shuffle)
    function startNewRandomPuzzle() {
        // --- Random Image Selection (Requires a list of images) ---
        // Example: You'd have an array of image URLs
        const puzzleImages = ['puzzle-image.jpg', 'another-image.png', 'yet-another.gif']; // Add your image files here
        const randomImageIndex = Math.floor(Math.random() * puzzleImages.length);
        IMAGE_URL = puzzleImages[randomImageIndex]; // Update the image URL
        targetImageElement.src = IMAGE_URL; // Update the target image display

        // Ensure the new image is loaded before setting up the game
         targetImageElement.onload = () => {
            setupGame(targetImageElement, GRID_SIZE); // Setup game with the new image
         };
         // If the image is already cached, onload might not fire, so call setupGame directly too
         if (targetImageElement.complete) {
             setupGame(targetImageElement, GRID_SIZE);
         }

        // setupGame handles shuffling and resetting moves/status internally
    }


    // --- Event Listeners ---
    // Reset button now triggers starting a new puzzle
    resetButton.addEventListener('click', startNewRandomPuzzle);

    // --- Initial Game Setup ---
    startGame(); // Start the first game when the page loads

});
