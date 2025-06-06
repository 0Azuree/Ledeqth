// sniper-game.js
document.addEventListener('DOMContentLoaded', () => {

    // --- Game Setup ---
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');

    // UI elements
    const startScreen = document.getElementById('gameStartScreen');
    const gameOverScreen = document.getElementById('gameOverScreen');
    const startButton = document.getElementById('startButton');
    const restartButton = document.getElementById('restartButton');
    const scoreDisplay = document.getElementById('scoreDisplay');
    const finalScoreDisplay = document.getElementById('finalScoreDisplay');
    const ammoDisplay = document.getElementById('ammoDisplay');
    const windDisplay = document.getElementById('windDisplay');

    // Game state variables
    let gameStarted = false;
    let gameOver = false;
    let score = 0;
    let ammo = 10; // Limited ammo for sniper realism, can be infinite later
    let mouseX = 0;
    let mouseY = 0;
    let lastShotTime = 0;
    const SHOT_COOLDOWN = 500; // milliseconds between shots

    // Game physics constants
    const GRAVITY = 0.0005; // Pixel/ms^2 (adjust for bullet drop)
    let wind = 0; // Current wind affecting bullet horizontally (pixels/ms)
    let windChangeInterval = 5000; // How often wind changes (ms)
    let lastWindChangeTime = 0;

    // Bullet properties
    const BULLET_SPEED = 0.8; // Pixels per millisecond (speed of bullet)
    const BULLET_RADIUS = 2;
    let bullet = null; // Stores current bullet object if one is fired

    // Enemy properties
    let enemies = [];
    let enemySpawnInterval = 2000; // milliseconds between enemy spawns (decreases with difficulty)
    let lastEnemySpawnTime = 0;
    let baseEnemySize = 25; // Base size of pixel art enemies
    let minEnemySpeed = 0.05; // Base enemy speed (pixels/ms)
    let maxEnemySpeed = 0.15;

    // Particle properties (for blood)
    let particles = [];
    const PARTICLE_LIFETIME = 500; // ms
    const PARTICLE_GRAVITY = 0.0001; // Slower gravity for particles

    // Difficulty scaling
    const DIFFICULTY_THRESHOLD = 5; // Every X points, difficulty increases
    const DIFFICULTY_MULTIPLIER = 0.8; // Multiply spawn interval and enemy size by this
    const WIND_MAX_INCREASE = 0.00005; // Max increase in wind magnitude per difficulty level

    // --- Resizing Canvas ---
    const resizeCanvas = () => {
        // Set fixed aspect ratio (e.g., 16:9 for a shooting game)
        const aspectRatio = 16 / 9;
        let containerWidth = canvas.parentElement.clientWidth;
        let calculatedHeight = containerWidth / aspectRatio;

        // Ensure canvas width doesn't exceed maximum allowed (e.g., 800px)
        const maxWidth = 800; // Matches CSS max-width for canvas
        if (containerWidth > maxWidth) {
            containerWidth = maxWidth;
            calculatedHeight = containerWidth / aspectRatio;
        }

        canvas.width = containerWidth;
        canvas.height = calculatedHeight;
        console.log(`Canvas resized to: ${canvas.width}x${canvas.height}`);
    };

    window.addEventListener('resize', resizeCanvas);
    // Initial resize call
    resizeCanvas();

    // --- Game Objects ---

    // Player (Crosshair) - Visual representation of the sniper's aim
    const sniperCrosshair = {
        size: 30, // Size of the crosshair square
        draw: (x, y) => {
            ctx.strokeStyle = '#FFD700'; // Gold color
            ctx.lineWidth = 2;
            ctx.lineCap = 'round'; // Rounded ends for pixel feel

            // Horizontal line
            ctx.beginPath();
            ctx.moveTo(x - sniperCrosshair.size / 2, y);
            ctx.lineTo(x + sniperCrosshair.size / 2, y);
            ctx.stroke();

            // Vertical line
            ctx.beginPath();
            ctx.moveTo(x, y - sniperCrosshair.size / 2);
            ctx.lineTo(x, y + sniperCrosshair.size / 2);
            ctx.stroke();

            // Center dot
            ctx.fillStyle = '#FFD700';
            ctx.beginPath();
            ctx.arc(x, y, 2, 0, Math.PI * 2);
            ctx.fill();
        }
    };

    class Enemy {
        constructor(x, y, size, speed) {
            this.x = x;
            this.y = y;
            this.size = size;
            this.speed = speed * (Math.random() > 0.5 ? 1 : -1); // Random initial direction
            this.originalX = x; // For horizontal movement
            this.range = Math.random() * (canvas.width * 0.3) + canvas.width * 0.1; // Random movement range
            this.health = 1; // 1 hit kill
        }

        draw() {
            // Simple pixel art target: a red square with two "eyes"
            ctx.fillStyle = '#CC0000'; // Dark red
            ctx.fillRect(this.x - this.size / 2, this.y - this.size / 2, this.size, this.size);

            // "Eyes" - smaller darker squares
            ctx.fillStyle = '#000000';
            const eyeSize = this.size * 0.2;
            ctx.fillRect(this.x - this.size * 0.25, this.y - this.size * 0.25, eyeSize, eyeSize);
            ctx.fillRect(this.x + this.size * 0.05, this.y - this.size * 0.25, eyeSize, eyeSize);
        }

        update(deltaTime) {
            // Oscillate horizontally
            this.x = this.originalX + Math.sin(performance.now() * this.speed * 0.01) * this.range;

            // Ensure enemy stays within canvas bounds (simple clamp for now)
            this.x = Math.max(this.size / 2, Math.min(canvas.width - this.size / 2, this.x));
            this.y = Math.max(this.size / 2, Math.min(canvas.height - this.size / 2, this.y));
        }
    }

    class Bullet {
        constructor(startX, startY, targetX, targetY) {
            this.x = startX;
            this.y = startY;
            this.radius = BULLET_RADIUS;
            this.color = '#FFF'; // White bullet trail

            // Calculate initial velocities considering target and bullet drop
            const distanceX = targetX - startX;
            const distanceY = targetY - startY;
            const distance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);

            // Time to reach target if no gravity/wind (base time)
            const timeToTarget = distance / BULLET_SPEED;

            // Initial velocities
            this.vx = (distanceX / timeToTarget) + (wind * timeToTarget); // Add wind effect to initial horizontal velocity
            this.vy = (distanceY / timeToTarget) - (0.5 * GRAVITY * timeToTarget); // Account for gravity in initial vertical velocity

            this.life = 0; // Lifetime in ms
            this.active = true;
        }

        draw() {
            if (!this.active) return;
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fill();
        }

        update(deltaTime) {
            if (!this.active) return;

            this.life += deltaTime;

            // Apply gravity
            this.vy += GRAVITY * deltaTime;
            // Apply wind
            this.vx += wind * deltaTime; // Continuous wind effect

            this.x += this.vx * deltaTime;
            this.y += this.vy * deltaTime;

            // Deactivate if out of bounds
            if (this.x < 0 || this.x > canvas.width || this.y < 0 || this.y > canvas.height) {
                this.active = false;
            }
        }
    }

    class Particle {
        constructor(x, y, color) {
            this.x = x;
            this.y = y;
            this.size = Math.random() * 4 + 1; // Random size for blood splatters
            this.color = color;
            this.alpha = 1;
            this.vx = (Math.random() - 0.5) * 5; // Random horizontal velocity
            this.vy = (Math.random() - 0.5) * 5; // Random vertical velocity
            this.lifetime = PARTICLE_LIFETIME;
            this.birthTime = performance.now();
        }

        draw() {
            ctx.globalAlpha = this.alpha;
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1; // Reset global alpha
        }

        update(currentTime) {
            const elapsed = currentTime - this.birthTime;
            this.alpha = 1 - (elapsed / this.lifetime); // Fade out

            if (this.alpha <= 0) {
                return false; // Mark for removal
            }

            this.vy += PARTICLE_GRAVITY * (currentTime - this.birthTime); // Apply gravity to particles
            this.x += this.vx;
            this.y += this.vy;

            return true; // Keep
        }
    }


    // --- Game Functions ---

    function startGame() {
        gameStarted = true;
        gameOver = false;
        score = 0;
        ammo = 10;
        enemies = [];
        particles = [];
        bullet = null;
        enemySpawnInterval = 2000;
        lastEnemySpawnTime = performance.now();
        lastShotTime = 0;
        wind = 0; // Reset wind at start
        lastWindChangeTime = performance.now();

        updateUI();
        startScreen.classList.remove('active');
        gameOverScreen.classList.remove('active');
        canvas.style.cursor = 'crosshair'; // Change cursor to crosshair
        gameLoop();
    }

    function endGame() {
        gameOver = true;
        gameStarted = false;
        finalScoreDisplay.textContent = score;
        gameOverScreen.classList.add('active');
        canvas.style.cursor = 'default'; // Reset cursor
    }

    function updateUI() {
        scoreDisplay.textContent = score;
        ammoDisplay.textContent = ammo === Infinity ? '∞' : ammo;
        windDisplay.textContent = wind.toFixed(5); // Show wind with more precision
    }

    function spawnEnemy() {
        const padding = 50; // Keep enemies away from edges
        const x = Math.random() * (canvas.width - padding * 2) + padding;
        const y = Math.random() * (canvas.height - padding * 2) + padding;
        const size = baseEnemySize * (1 - Math.min(1, score / 100)); // Shrink with score
        const speed = minEnemySpeed + (maxEnemySpeed - minEnemySpeed) * (score / 100); // Increase speed with score
        enemies.push(new Enemy(x, y, Math.max(10, size), speed)); // Ensure min size of 10
    }

    function fireBullet() {
        const currentTime = performance.now();
        if (ammo <= 0 && ammo !== Infinity) {
            addMessage('No ammo!', 'red');
            return;
        }
        if (currentTime - lastShotTime < SHOT_COOLDOWN) {
            addMessage('Too fast!', 'yellow');
            return;
        }

        lastShotTime = currentTime;
        ammo--;
        updateUI();

        // Bullet always originates from the center-bottom of the canvas for a sniper perspective
        const startX = canvas.width / 2;
        const startY = canvas.height; // Assume sniper is at the bottom edge

        // Create bullet aiming towards mouseX, mouseY
        bullet = new Bullet(startX, startY, mouseX, mouseY);
        addMessage('Shot!', 'green');
    }

    function checkCollision(bullet, enemy) {
        // Simple circle-rectangle collision for bullet (circle) and enemy (rectangle)
        const closestX = Math.max(enemy.x - enemy.size / 2, Math.min(bullet.x, enemy.x + enemy.size / 2));
        const closestY = Math.max(enemy.y - enemy.size / 2, Math.min(bullet.y, enemy.y + enemy.size / 2));

        const distanceX = bullet.x - closestX;
        const distanceY = bullet.y - closestY;

        const distanceSquared = (distanceX * distanceX) + (distanceY * distanceY);
        return distanceSquared < (bullet.radius * bullet.radius);
    }

    function addBloodParticles(x, y) {
        const numParticles = 10 + Math.floor(Math.random() * 5); // 10-14 particles
        for (let i = 0; i < numParticles; i++) {
            particles.push(new Particle(x, y, '#FF0000')); // Red blood color
        }
    }

    function addMessage(text, color) {
        // Simple message display directly on canvas for game feedback
        const messageX = canvas.width / 2;
        const messageY = 20; // Top of the canvas
        ctx.font = '20px "Press Start 2P", cursive'; // Pixel art font
        ctx.textAlign = 'center';
        ctx.fillStyle = color;
        ctx.fillText(text, messageX, messageY);
    }


    // --- Game Loop ---
    let lastTime = 0;
    function gameLoop(currentTime) {
        if (!gameStarted) return;
        if (gameOver) return;

        const deltaTime = currentTime - lastTime;
        lastTime = currentTime;

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#333'; // Re-fill background
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Update wind
        if (currentTime - lastWindChangeTime > windChangeInterval) {
            wind = (Math.random() * 0.0001 - 0.00005) * (1 + score / DIFFICULTY_THRESHOLD * WIND_MAX_INCREASE); // Oscillate wind strength
            lastWindChangeTime = currentTime;
            updateUI(); // Update wind display
        }

        // Spawn enemies
        if (currentTime - lastEnemySpawnTime > enemySpawnInterval) {
            spawnEnemy();
            lastEnemySpawnTime = currentTime;
        }

        // Update and draw enemies
        enemies = enemies.filter(enemy => {
            enemy.update(deltaTime);
            enemy.draw();
            return true; // Keep all enemies for now
        });

        // Update and draw bullet
        if (bullet && bullet.active) {
            bullet.update(deltaTime);
            bullet.draw();

            // Check for bullet collision with enemies
            enemies = enemies.filter(enemy => {
                if (checkCollision(bullet, enemy)) {
                    addBloodParticles(bullet.x, bullet.y);
                    score++;
                    updateUI();
                    bullet.active = false; // Deactivate bullet on hit
                    return false; // Remove enemy
                }
                return true; // Keep enemy
            });
        }

        // Update and draw particles
        particles = particles.filter(p => p.update(currentTime));
        particles.forEach(p => p.draw());

        // Draw crosshair
        sniperCrosshair.draw(mouseX, mouseY);

        // Check for Game Over condition (e.g., ammo runs out)
        if (ammo === 0 && bullet === null) { // Only game over if ammo is 0 and no bullet is currently flying
             // Give a moment for bullet to clear, then check if enemies remain.
             // For simplicity, just end game when ammo is truly depleted.
             // A more complex game might allow melee or waiting for more ammo.
            endGame();
        }


        requestAnimationFrame(gameLoop);
    }

    // --- Event Listeners ---
    startButton.addEventListener('click', startGame);
    restartButton.addEventListener('click', startGame);

    canvas.addEventListener('mousemove', (e) => {
        // Adjust mouse coordinates relative to canvas
        const rect = canvas.getBoundingClientRect();
        mouseX = e.clientX - rect.left;
        mouseY = e.clientY - rect.top;
    });

    canvas.addEventListener('click', (e) => {
        if (gameStarted && !gameOver) {
            fireBullet();
        }
    });

    // Ensure initial snow animation starts if applicable
    if (typeof window.startSnowAnimation === 'function') {
        window.startSnowAnimation(); // If you have a global snow script
    }
});

