// zombie-shooter.js - Basic 2D Zombie Shooter Game Framework

document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');

    // UI Elements
    const playerHealthSpan = document.getElementById('playerHealth');
    const playerCashSpan = document.getElementById('playerCash');
    const currentRoundSpan = document.getElementById('currentRound');
    const zombiesRemainingSpan = document.getElementById('zombiesRemaining');
    const buyDamageUpgradeBtn = document.getElementById('buyDamageUpgrade');
    const buyHealthUpgradeBtn = document.getElementById('buyHealthUpgrade');
    const buyFireRateUpgradeBtn = document.getElementById('buyFireRateUpgrade');
    const shopMessageDiv = document.getElementById('shopMessage');
    const gameOverScreen = document.getElementById('game-over-screen');
    const finalRoundSpan = document.getElementById('finalRound');
    const restartGameButton = document.getElementById('restartGameButton');

    // Game State Variables
    let gameRunning = false;
    let paused = false;
    let player = {};
    let bullets = [];
    let zombies = [];
    let roundData = {
        current: 0,
        zombieCount: 0,
        initialZombieHealth: 10,
        zombieHealthIncreasePerRound: 5,
        baseCashPerKill: { min: 1, max: 20 },
        highRoundCashPerKill: { min: 20, max: 108 },
        highRoundThreshold: 20
    };
    let keys = {}; // To track pressed keys for movement
    let lastBulletTime = 0; // For fire rate control
    let gameLoopInterval; // To control game loop

    // Game Constants
    const GRAVITY = 0.5;
    const PLAYER_WIDTH = 40;
    const PLAYER_HEIGHT = 60;
    const PLAYER_SPEED = 5;
    const JUMP_POWER = 10;
    const BULLET_RADIUS = 5;
    const BULLET_SPEED = 10;
    const BASE_FIRE_RATE = 200; // ms between shots
    const ZOMBIE_WIDTH = 35;
    const ZOMBIE_HEIGHT = 50;
    const ZOMBIE_SPEED = 1; // Base zombie speed

    // --- Game Objects ---

    function Player() {
        this.x = canvas.width / 4;
        this.y = canvas.height - PLAYER_HEIGHT - 10; // Start on ground
        this.width = PLAYER_WIDTH;
        this.height = PLAYER_HEIGHT;
        this.color = 'blue';
        this.velocityY = 0;
        this.isJumping = false;
        this.health = 100;
        this.maxHealth = 100;
        this.cash = 0;
        this.damage = 10;
        this.fireRate = BASE_FIRE_RATE;
        this.facingDirection = 1; // 1 for right, -1 for left

        this.draw = function() {
            ctx.fillStyle = this.color;
            ctx.fillRect(this.x, this.y, this.width, this.height);
            // Draw gun (very simple representation)
            ctx.fillStyle = 'gray';
            if (this.facingDirection === 1) { // Facing right
                ctx.fillRect(this.x + this.width / 2, this.y + this.height / 3, 20, 5);
            } else { // Facing left
                ctx.fillRect(this.x - 10, this.y + this.height / 3, 20, 5);
            }
        };

        this.update = function() {
            // Apply gravity
            this.velocityY += GRAVITY;
            this.y += this.velocityY;

            // Ground collision
            const ground = canvas.height - this.height - 10;
            if (this.y >= ground) {
                this.y = ground;
                this.velocityY = 0;
                this.isJumping = false;
            }

            // Horizontal movement
            if (keys['a'] || keys['ArrowLeft']) {
                this.x -= PLAYER_SPEED;
                this.facingDirection = -1;
            }
            if (keys['d'] || keys['ArrowRight']) {
                this.x += PLAYER_SPEED;
                this.facingDirection = 1;
            }

            // Keep player within canvas bounds
            if (this.x < 0) this.x = 0;
            if (this.x + this.width > canvas.width) this.x = canvas.width - this.width;

            // Update UI
            playerHealthSpan.textContent = this.health;
            playerCashSpan.textContent = this.cash;
        };

        this.jump = function() {
            if (!this.isJumping) {
                this.velocityY = -JUMP_POWER;
                this.isJumping = true;
            }
        };

        this.takeDamage = function(amount) {
            this.health -= amount;
            if (this.health <= 0) {
                this.health = 0;
                gameOver();
            }
        };

        this.heal = function(amount) {
            this.health += amount;
            if (this.health > this.maxHealth) {
                this.health = this.maxHealth;
            }
        };
    }

    function Bullet(x, y, direction, damage) {
        this.x = x;
        this.y = y;
        this.radius = BULLET_RADIUS;
        this.color = 'yellow';
        this.speed = BULLET_SPEED;
        this.direction = direction; // 1 for right, -1 for left
        this.damage = damage;

        this.draw = function() {
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fill();
        };

        this.update = function() {
            this.x += this.speed * this.direction;
        };
    }

    function Zombie(x, y, health, speed) {
        this.x = x;
        this.y = y;
        this.width = ZOMBIE_WIDTH;
        this.height = ZOMBIE_HEIGHT;
        this.color = 'green';
        this.health = health;
        this.maxHealth = health;
        this.speed = speed;
        this.damage = 10; // Damage zombie deals to player
        this.attackCooldown = 60; // Frames between attacks
        this.currentAttackCooldown = 0;

        this.draw = function() {
            ctx.fillStyle = this.color;
            ctx.fillRect(this.x, this.y, this.width, this.height);
            // Draw health bar
            const healthBarWidth = this.width;
            const healthBarHeight = 5;
            ctx.fillStyle = 'red';
            ctx.fillRect(this.x, this.y - healthBarHeight - 5, healthBarWidth, healthBarHeight);
            ctx.fillStyle = 'lime';
            ctx.fillRect(this.x, this.y - healthBarHeight - 5, (this.health / this.maxHealth) * healthBarWidth, healthBarHeight);
        };

        this.update = function() {
            // Move towards player
            if (player.x < this.x) {
                this.x -= this.speed;
            } else if (player.x > this.x) {
                this.x += this.speed;
            }

            // Attack player if close enough
            if (checkCollision(this, player) && this.currentAttackCooldown <= 0) {
                player.takeDamage(this.damage);
                this.currentAttackCooldown = this.attackCooldown;
            } else {
                this.currentAttackCooldown--;
            }
        };

        this.takeDamage = function(amount) {
            this.health -= amount;
            if (this.health <= 0) {
                return true; // Zombie is dead
            }
            return false; // Zombie is still alive
        };
    }

    // --- Game Logic Functions ---

    function initGame() {
        player = new Player();
        bullets = [];
        zombies = [];
        roundData.current = 0;
        roundData.initialZombieHealth = 10;
        roundData.zombieHealthIncreasePerRound = 5;
        player.health = player.maxHealth; // Reset player health
        player.cash = 0; // Reset cash
        player.damage = 10; // Reset damage
        player.fireRate = BASE_FIRE_RATE; // Reset fire rate

        gameOverScreen.style.display = 'none';
        gameRunning = true;
        paused = false;
        startGameLoop();
        startNextRound();
        updateUI();
    }

    function startGameLoop() {
        // Clear any existing loop to prevent duplicates
        if (gameLoopInterval) {
            clearInterval(gameLoopInterval);
        }
        gameLoopInterval = setInterval(gameLoop, 1000 / 60); // 60 FPS
    }

    function gameLoop() {
        if (!gameRunning || paused) return;

        update();
        draw();
    }

    function update() {
        player.update();

        // Update and remove bullets
        for (let i = bullets.length - 1; i >= 0; i--) {
            bullets[i].update();
            if (bullets[i].x < 0 || bullets[i].x > canvas.width) {
                bullets.splice(i, 1);
            }
        }

        // Update and remove zombies
        for (let i = zombies.length - 1; i >= 0; i--) {
            zombies[i].update();

            // Bullet-zombie collision
            for (let j = bullets.length - 1; j >= 0; j--) {
                if (checkCollision(bullets[j], zombies[i])) {
                    const zombieDied = zombies[i].takeDamage(bullets[j].damage);
                    bullets.splice(j, 1); // Remove bullet
                    if (zombieDied) {
                        player.cash += getRandomCashPerKill(); // Add cash on kill
                        zombies.splice(i, 1); // Remove zombie
                        roundData.zombieCount--; // Decrement zombie count for round
                        updateUI();
                        break; // Zombie is dead, no need to check other bullets for this zombie
                    }
                }
            }
        }

        // Check for round completion
        if (zombies.length === 0 && roundData.zombieCount === 0) {
            if (gameRunning) { // Only start next round if game is still active
                startNextRound();
            }
        }
    }

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear canvas

        // Draw ground (simple line)
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, canvas.height - 10);
        ctx.lineTo(canvas.width, canvas.height - 10);
        ctx.stroke();

        player.draw();

        bullets.forEach(bullet => bullet.draw());
        zombies.forEach(zombie => zombie.draw());

        // Draw pause indicator if paused
        if (paused) {
            const pauseIndicator = document.createElement('div');
            pauseIndicator.id = 'pauseIndicator';
            pauseIndicator.textContent = 'PAUSED';
            document.querySelector('.game-wrapper').appendChild(pauseIndicator);
            pauseIndicator.style.display = 'block';
        } else {
            const existingPauseIndicator = document.getElementById('pauseIndicator');
            if (existingPauseIndicator) {
                existingPauseIndicator.style.display = 'none';
            }
        }
    }

    function checkCollision(obj1, obj2) {
        // AABB collision detection (for rectangles)
        if (obj1.radius && obj2.width) { // Bullet (circle) and Zombie/Player (rectangle)
            const distX = Math.abs(obj1.x - obj2.x - obj2.width / 2);
            const distY = Math.abs(obj1.y - obj2.y - obj2.height / 2);

            if (distX > (obj2.width / 2 + obj1.radius)) { return false; }
            if (distY > (obj2.height / 2 + obj1.radius)) { return false; }

            if (distX <= (obj2.width / 2)) { return true; }
            if (distY <= (obj2.height / 2)) { return true; }

            const dx = distX - obj2.width / 2;
            const dy = distY - obj2.height / 2;
            return (dx * dx + dy * dy <= (obj1.radius * obj1.radius));
        } else { // Rectangle-rectangle collision (Player-Zombie)
            return obj1.x < obj2.x + obj2.width &&
                   obj1.x + obj1.width > obj2.x &&
                   obj1.y < obj2.y + obj2.height &&
                   obj1.y + obj1.height > obj2.y;
        }
    }

    function startNextRound() {
        roundData.current++;
        currentRoundSpan.textContent = roundData.current;
        player.health = player.maxHealth; // Regenerate health each round

        let numZombiesToSpawn = roundData.current * 2; // More zombies each round
        roundData.zombieCount = numZombiesToSpawn;

        for (let i = 0; i < numZombiesToSpawn; i++) {
            // Spawn zombies off-screen, randomly left or right
            const spawnSide = Math.random() < 0.5 ? -1 : 1;
            const spawnX = spawnSide === -1 ? -ZOMBIE_WIDTH - Math.random() * 100 : canvas.width + Math.random() * 100;
            const spawnY = canvas.height - ZOMBIE_HEIGHT - 10; // On ground

            const zombieHealth = roundData.initialZombieHealth + (roundData.current - 1) * roundData.zombieHealthIncreasePerRound;
            const zombieSpeed = ZOMBIE_SPEED + (roundData.current * 0.05); // Zombies get slightly faster

            zombies.push(new Zombie(spawnX, spawnY, zombieHealth, zombieSpeed));
        }
        updateUI(); // Update UI after spawning
    }

    function getRandomCashPerKill() {
        if (roundData.current >= roundData.highRoundThreshold) {
            return Math.floor(Math.random() * (roundData.highRoundCashPerKill.max - roundData.highRoundCashPerKill.min + 1)) + roundData.highRoundCashPerKill.min;
        } else {
            return Math.floor(Math.random() * (roundData.baseCashPerKill.max - roundData.baseCashPerKill.min + 1)) + roundData.baseCashPerKill.min;
        }
    }

    function updateUI() {
        playerHealthSpan.textContent = player.health;
        playerCashSpan.textContent = player.cash;
        currentRoundSpan.textContent = roundData.current;
        zombiesRemainingSpan.textContent = zombies.length;
    }

    function showShopMessage(message, color = 'yellow') {
        shopMessageDiv.textContent = message;
        shopMessageDiv.style.color = color;
        setTimeout(() => {
            shopMessageDiv.textContent = '';
        }, 3000);
    }

    function gameOver() {
        gameRunning = false;
        clearInterval(gameLoopInterval);
        finalRoundSpan.textContent = roundData.current;
        gameOverScreen.style.display = 'flex';
        // Hide pause indicator if visible
        const existingPauseIndicator = document.getElementById('pauseIndicator');
        if (existingPauseIndicator) {
            existingPauseIndicator.style.display = 'none';
        }
    }

    function togglePause() {
        paused = !paused;
        draw(); // Redraw to show/hide pause indicator immediately
    }


    // --- Event Listeners ---

    // Keyboard controls
    document.addEventListener('keydown', (e) => {
        keys[e.key.toLowerCase()] = true;
        if (e.key === ' ' || e.key === 'ArrowUp') { // Space or Up Arrow for jump
            e.preventDefault(); // Prevent page scrolling
            player.jump();
        }
        if (e.key.toLowerCase() === 'p') { // P for pause
            togglePause();
        }
    });

    document.addEventListener('keyup', (e) => {
        keys[e.key.toLowerCase()] = false;
    });

    // Mouse click to shoot
    canvas.addEventListener('click', (e) => {
        if (!gameRunning || paused) return;

        const currentTime = Date.now();
        if (currentTime - lastBulletTime > player.fireRate) {
            const bulletX = player.x + player.width / 2;
            const bulletY = player.y + player.height / 3 + 2; // Align with gun
            // Determine bullet direction based on mouse position relative to player
            const mouseX = e.clientX - canvas.getBoundingClientRect().left;
            const direction = mouseX > player.x + player.width / 2 ? 1 : -1;
            bullets.push(new Bullet(bulletX, bulletY, direction, player.damage));
            lastBulletTime = currentTime;
        }
    });

    // Shop Buttons
    buyDamageUpgradeBtn.addEventListener('click', () => {
        const cost = parseInt(buyDamageUpgradeBtn.dataset.cost);
        if (player.cash >= cost) {
            player.cash -= cost;
            player.damage += 5; // Increase damage
            showShopMessage('Damage upgraded!', 'lime');
            updateUI();
        } else {
            showShopMessage('Not enough cash!', 'red');
        }
    });

    buyHealthUpgradeBtn.addEventListener('click', () => {
        const cost = parseInt(buyHealthUpgradeBtn.dataset.cost);
        if (player.cash >= cost) {
            player.cash -= cost;
            player.maxHealth += 25; // Increase max health
            player.health += 25; // Also heal for the amount increased
            showShopMessage('Max Health upgraded!', 'lime');
            updateUI();
        } else {
            showShopMessage('Not enough cash!', 'red');
        }
    });

    buyFireRateUpgradeBtn.addEventListener('click', () => {
        const cost = parseInt(buyFireRateUpgradeBtn.dataset.cost);
        if (player.cash >= cost) {
            player.cash -= cost;
            player.fireRate = Math.max(50, player.fireRate - 25); // Decrease fire rate (make it faster), with a minimum
            showShopMessage('Fire Rate upgraded!', 'lime');
            updateUI();
        } else {
            showShopMessage('Not enough cash!', 'red');
        }
    });

    restartGameButton.addEventListener('click', () => {
        initGame();
    });

    // Initial game setup
    initGame();
});
