// zombie-shooter.js - Advanced 2D Zombie Shooter Game

document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');

    // UI Elements
    const playerHealthSpan = document.getElementById('playerHealth');
    const playerCashSpan = document.getElementById('playerCash');
    const currentRoundSpan = document.getElementById('currentRound');
    const zombiesRemainingSpan = document.getElementById('zombiesRemaining');
    const playerAmmoSpan = document.getElementById('playerAmmo');
    const playerMaxAmmoSpan = document.getElementById('playerMaxAmmo');
    const reloadText = document.getElementById('reloadText');

    const buyDamageUpgradeBtn = document.getElementById('buyDamageUpgrade');
    const buyHealthUpgradeBtn = document.getElementById('buyHealthUpgrade');
    const buyFireRateUpgradeBtn = document.getElementById('buyFireRateUpgrade');
    const buyMaxAmmoUpgradeBtn = document.getElementById('buyMaxAmmoUpgrade');
    const shopMessageDiv = document.getElementById('shopMessage');

    const startScreen = document.getElementById('start-screen');
    const startGameButton = document.getElementById('startGameButton');
    const gameOverScreen = document.getElementById('game-over-screen');
    const finalRoundSpan = document.getElementById('finalRound');
    const restartGameButton = document.getElementById('restartGameButton');
    const damageOverlay = document.getElementById('damageOverlay');

    const devConsoleInput = document.getElementById('devConsoleInput');
    const devOptions = document.getElementById('devOptions');
    const moneySetValueInput = document.getElementById('moneySetValue');

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
    let mouseDown = false; // To track mouse button for auto-fire
    let mouseX = 0; // Current mouse X position relative to canvas
    let mouseY = 0; // Current mouse Y position relative to canvas
    let lastBulletTime = 0; // For fire rate control
    let gameLoopInterval; // To control game loop
    let isReloading = false;
    let reloadTimer = null; // Use null for timer ID
    const RELOAD_TIME = 800; // 0.8 seconds

    // Cheat Flags
    let infiniteAmmo = false;
    let infiniteHealth = false;
    let invincible = false;
    let oneDollarEverything = false;

    // Game Constants
    const GRAVITY = 0.5;
    const PLAYER_WIDTH = 40;
    const PLAYER_HEIGHT = 60;
    const PLAYER_SPEED = 5;
    const JUMP_POWER = 10;
    const BULLET_RADIUS = 3;
    const BULLET_SPEED = 15;
    const BASE_FIRE_RATE = 150;
    const ZOMBIE_WIDTH = 35;
    const ZOMBIE_HEIGHT = 50;
    const ZOMBIE_SPEED = 1;

    // --- Game Objects ---

    function Player() {
        this.x = canvas.width / 4;
        this.y = canvas.height - PLAYER_HEIGHT - 10;
        this.width = PLAYER_WIDTH;
        this.height = PLAYER_HEIGHT;
        this.color = 'white'; // Player is white
        this.velocityY = 0;
        this.isJumping = false;
        this.health = 100;
        this.maxHealth = 100;
        this.cash = 0;
        this.damage = 30; // M4 default damage
        this.fireRate = BASE_FIRE_RATE;
        this.bodyDirection = 1; // 1 for right, -1 for left (body direction)
        this.gunAngle = 0; // Angle for the gun based on mouse position
        this.ammo = 30;
        this.maxAmmo = 30;
        this.lastHitTime = 0;

        this.draw = function() {
            // Draw player body (pixel art style)
            ctx.fillStyle = this.color;
            // Example of very basic pixel art:
            // Head
            ctx.fillRect(this.x + this.width * 0.25, this.y, this.width * 0.5, this.height * 0.2);
            // Body
            ctx.fillRect(this.x + this.width * 0.1, this.y + this.height * 0.2, this.width * 0.8, this.height * 0.5);
            // Legs
            ctx.fillRect(this.x + this.width * 0.1, this.y + this.height * 0.7, this.width * 0.35, this.height * 0.3);
            ctx.fillRect(this.x + this.width * 0.55, this.y + this.height * 0.7, this.width * 0.35, this.height * 0.3);


            // Calculate gun angle based on mouse position
            const playerCenterX = this.x + this.width / 2;
            const playerCenterY = this.y + this.height / 2;
            this.gunAngle = Math.atan2(mouseY - playerCenterY, mouseX - playerCenterX);

            ctx.save();
            ctx.translate(playerCenterX, playerCenterY);
            ctx.rotate(this.gunAngle);

            // Draw M4-like gun (more detailed programmatic drawing)
            ctx.fillStyle = '#444'; // Gun body color
            const gunBarrelLength = 40;
            const gunStockLength = 20;
            const gunHeight = 8;
            const gunYOffset = -gunHeight / 2; // Centered vertically at player's center

            // Main body/receiver
            ctx.fillRect(-10, gunYOffset, 30, gunHeight); // Receiver part
            // Barrel
            ctx.fillRect(20, gunYOffset + gunHeight * 0.2, gunBarrelLength, gunHeight * 0.6);
            // Stock
            ctx.fillRect(-10 - gunStockLength, gunYOffset + gunHeight * 0.5, gunStockLength, gunHeight * 0.5);
            // Handle/grip
            ctx.fillRect(5, gunYOffset + gunHeight, 8, 15);
            // Muzzle flash hint
            // ctx.fillStyle = 'orange';
            // ctx.fillRect(20 + gunBarrelLength, gunYOffset + gunHeight * 0.3, 5, gunHeight * 0.4);

            ctx.restore();


            // Draw health bar above player
            const healthBarWidth = this.width + 10;
            const healthBarHeight = 5;
            const healthBarX = this.x - 5;
            const healthBarY = this.y - 15;

            // Background of health bar
            ctx.fillStyle = 'red';
            ctx.fillRect(healthBarX, healthBarY, healthBarWidth, healthBarHeight);
            // Current health
            ctx.fillStyle = 'lime';
            ctx.fillRect(healthBarX, healthBarY, (this.health / this.maxHealth) * healthBarWidth, healthBarHeight);
            // Border
            ctx.strokeStyle = '#555';
            ctx.lineWidth = 1;
            ctx.strokeRect(healthBarX, healthBarY, healthBarWidth, healthBarHeight);
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

            // Horizontal movement (body direction)
            if (keys['a'] || keys['ArrowLeft']) {
                this.x -= PLAYER_SPEED;
                this.bodyDirection = -1;
            }
            if (keys['d'] || keys['ArrowRight']) {
                this.x += PLAYER_SPEED;
                this.bodyDirection = 1;
            }

            // Keep player within canvas bounds
            if (this.x < 0) this.x = 0;
            if (this.x + this.width > canvas.width) this.x = canvas.width - this.width;

            // Handle auto-fire if mouse is down and not reloading, and has ammo
            if (mouseDown && !isReloading && (this.ammo > 0 || infiniteAmmo)) {
                const currentTime = Date.now();
                if (currentTime - lastBulletTime > this.fireRate) {
                    this.shoot();
                    lastBulletTime = currentTime;
                }
            } else if (this.ammo <= 0 && !isReloading && !infiniteAmmo) {
                this.reload(); // Automatic reload if out of ammo
            }
        };

        this.jump = function() {
            if (!this.isJumping) {
                this.velocityY = -JUMP_POWER;
                this.isJumping = true;
            }
        };

        this.shoot = function() {
            if (isReloading || (this.ammo <= 0 && !infiniteAmmo)) {
                showShopMessage('Out of ammo or reloading!', 'red');
                return;
            }

            const playerCenterX = this.x + this.width / 2;
            const playerCenterY = this.y + this.height / 2;

            // Calculate bullet start position based on gun angle
            const barrelTipX = playerCenterX + Math.cos(this.gunAngle) * 45; // 45 is roughly barrel length from center
            const barrelTipY = playerCenterY + Math.sin(this.gunAngle) * 45;

            bullets.push(new Bullet(barrelTipX, barrelTipY, this.gunAngle, this.damage));
            if (!infiniteAmmo) {
                this.ammo--;
            }
            updateUI();
        };

        this.takeDamage = function(amount) {
            if (invincible) return; // Ignore damage if invincible

            this.health -= amount;
            this.lastHitTime = Date.now(); // Record hit time
            damageOverlay.classList.add('active');
            setTimeout(() => {
                damageOverlay.classList.remove('active');
            }, 100); // Briefly show red tint

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

        this.reload = function() {
            if (!isReloading && this.ammo < this.maxAmmo && !infiniteAmmo) {
                isReloading = true;
                reloadText.style.display = 'block'; // Show reloading text
                reloadTimer = setTimeout(() => {
                    this.ammo = this.maxAmmo;
                    isReloading = false;
                    reloadText.style.display = 'none'; // Hide reloading text
                    updateUI();
                }, RELOAD_TIME);
            }
        };
    }

    function Bullet(x, y, angle, damage) {
        this.x = x;
        this.y = y;
        this.radius = BULLET_RADIUS;
        this.color = 'yellow';
        this.speedX = BULLET_SPEED * Math.cos(angle);
        this.speedY = BULLET_SPEED * Math.sin(angle);
        this.damage = damage;

        this.draw = function() {
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fill();
        };

        this.update = function() {
            this.x += this.speedX;
            this.y += this.speedY;
        };
    }

    function Zombie(x, y, health, speed) {
        this.x = x;
        this.y = y;
        this.width = ZOMBIE_WIDTH;
        this.height = ZOMBIE_HEIGHT;
        this.color = 'darkgreen'; // Darker green for zombie
        this.health = health;
        this.maxHealth = health;
        this.speed = speed;
        this.damage = 10;
        this.attackCooldown = 60;
        this.currentAttackCooldown = 0;

        this.draw = function() {
            // Draw zombie body (pixel art style with bones/blood hints)
            ctx.fillStyle = this.color;
            // Body
            ctx.fillRect(this.x + this.width * 0.1, this.y + this.height * 0.2, this.width * 0.8, this.height * 0.7);
            // Head
            ctx.fillRect(this.x + this.width * 0.25, this.y, this.width * 0.5, this.height * 0.2);

            // Add pixelated bones/blood hints
            ctx.fillStyle = '#8B4513'; // Brown for bones
            ctx.fillRect(this.x + this.width * 0.2, this.y + this.height * 0.4, 5, 10);
            ctx.fillRect(this.x + this.width * 0.7, this.y + this.height * 0.5, 5, 10);
            ctx.fillStyle = '#8B0000'; // Dark red for blood
            ctx.fillRect(this.x + this.width * 0.3, this.y + this.height * 0.3, 7, 7);
            ctx.fillRect(this.x + this.width * 0.6, this.y + this.height * 0.6, 6, 6);


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
        player.health = player.maxHealth;
        player.cash = 0;
        player.damage = 30; // M4 default damage
        player.fireRate = BASE_FIRE_RATE;
        player.ammo = player.maxAmmo;
        player.maxAmmo = 30; // Reset max ammo for new game
        isReloading = false;
        if (reloadTimer) clearTimeout(reloadTimer);
        reloadText.style.display = 'none';

        // Reset shop costs
        buyDamageUpgradeBtn.dataset.cost = 50;
        buyDamageUpgradeBtn.textContent = `Upgrade Damage ($50)`;
        buyHealthUpgradeBtn.dataset.cost = 100;
        buyHealthUpgradeBtn.textContent = `Upgrade Max Health ($100)`;
        buyFireRateUpgradeBtn.dataset.cost = 75;
        buyFireRateUpgradeBtn.textContent = `Upgrade Fire Rate ($75)`;
        buyMaxAmmoUpgradeBtn.dataset.cost = 75;
        buyMaxAmmoUpgradeBtn.textContent = `Upgrade Max Ammo ($75)`;

        // Reset cheat flags
        infiniteAmmo = false;
        infiniteHealth = false;
        invincible = false;
        oneDollarEverything = false;
        devOptions.style.display = 'none'; // Hide dev options

        gameOverScreen.style.display = 'none';
        startScreen.style.display = 'flex'; // Show start screen initially
        gameRunning = false; // Game not running until start button clicked
        paused = false;
        updateUI();
    }

    function startGame() {
        startScreen.style.display = 'none'; // Hide start screen
        gameRunning = true;
        startGameLoop();
        startNextRound();
    }

    function startGameLoop() {
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
            // Remove bullets that go off-screen
            if (bullets[i].x < -BULLET_RADIUS || bullets[i].x > canvas.width + BULLET_RADIUS ||
                bullets[i].y < -BULLET_RADIUS || bullets[i].y > canvas.height + BULLET_RADIUS) {
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
            if (gameRunning) {
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
        const pauseIndicator = document.getElementById('pauseIndicator');
        if (paused) {
            if (!pauseIndicator) {
                const newPauseIndicator = document.createElement('div');
                newPauseIndicator.id = 'pauseIndicator';
                newPauseIndicator.textContent = 'PAUSED';
                document.querySelector('.game-wrapper').appendChild(newPauseIndicator);
            }
            document.getElementById('pauseIndicator').style.display = 'block';
        } else {
            if (pauseIndicator) {
                pauseIndicator.style.display = 'none';
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
        roundData.current++; //
        currentRoundSpan.textContent = roundData.current; //
        player.health = infiniteHealth ? player.maxHealth : player.maxHealth; // Regenerate health each round (or stay inf)
        player.ammo = infiniteAmmo ? player.maxAmmo : player.maxAmmo; // Refill ammo at start of round (or stay inf)

        let numZombiesToSpawn = roundData.current * 2;
        if (roundData.current > 10) numZombiesToSpawn += (roundData.current - 10) * 0.5;
        numZombiesToSpawn = Math.floor(numZombiesToSpawn);
        if (numZombiesToSpawn < 1) numZombiesToSpawn = 1;

        roundData.zombieCount = numZombiesToSpawn;

        const currentZombieHealth = roundData.initialZombieHealth + (roundData.current - 1) * roundData.zombieHealthIncreasePerRound; //

        for (let i = 0; i < numZombiesToSpawn; i++) {
            const spawnSide = Math.random() < 0.5 ? -1 : 1;
            const spawnX = spawnSide === -1 ? -ZOMBIE_WIDTH - Math.random() * 100 : canvas.width + Math.random() * 100;
            const spawnY = canvas.height - ZOMBIE_HEIGHT - 10;

            const zombieSpeed = ZOMBIE_SPEED + (roundData.current * 0.05);

            zombies.push(new Zombie(spawnX, spawnY, currentZombieHealth, zombieSpeed));
        }
        updateUI();
    }

    function getRandomCashPerKill() { //
        if (roundData.current >= roundData.highRoundThreshold) {
            return Math.floor(Math.random() * (roundData.highRoundCashPerKill.max - roundData.highRoundCashPerKill.min + 1)) + roundData.highRoundCashPerKill.min;
        } else {
            return Math.floor(Math.random() * (roundData.baseCashPerKill.max - roundData.baseCashPerKill.min + 1)) + roundData.baseCashPerKill.min;
        }
    }

    function updateUI() {
        playerHealthSpan.textContent = infiniteHealth ? 'INF' : player.health;
        playerCashSpan.textContent = player.cash; //
        currentRoundSpan.textContent = roundData.current; //
        zombiesRemainingSpan.textContent = zombies.length;
        playerAmmoSpan.textContent = infiniteAmmo ? 'INF' : player.ammo;
        playerMaxAmmoSpan.textContent = infiniteAmmo ? 'INF' : player.maxAmmo;
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
        const existingPauseIndicator = document.getElementById('pauseIndicator');
        if (existingPauseIndicator) {
            existingPauseIndicator.style.display = 'none';
        }
    }

    function togglePause() {
        paused = !paused;
        if (paused) {
            clearInterval(gameLoopInterval);
        } else {
            startGameLoop();
        }
        draw();
    }


    // --- Event Listeners ---

    // Keyboard controls
    document.addEventListener('keydown', (e) => {
        keys[e.key.toLowerCase()] = true;
        if (e.key === ' ' || e.key === 'ArrowUp') {
            e.preventDefault();
            player.jump();
        }
        if (e.key.toLowerCase() === 'p') {
            togglePause();
        }
        if (e.key.toLowerCase() === 'r') {
            player.reload();
        }
        // Enter key for shooting (if not mouse-controlled)
        if (e.key === 'Enter') {
            if (!gameRunning || paused || isReloading || (player.ammo <= 0 && !infiniteAmmo)) return;
            const currentTime = Date.now();
            if (currentTime - lastBulletTime > player.fireRate) {
                player.shoot();
                lastBulletTime = currentTime;
            }
        }
    });

    document.addEventListener('keyup', (e) => {
        keys[e.key.toLowerCase()] = false;
    });

    // Mouse movement to determine gun angle
    canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        mouseX = e.clientX - rect.left;
        mouseY = e.clientY - rect.top;
    });

    // Mouse click for auto-fire
    canvas.addEventListener('mousedown', (e) => {
        if (!gameRunning || paused) return; // Allow shooting even if reloading for auto-reload to kick in after first empty click
        mouseDown = true;
        // Initial shot on mousedown if conditions met
        if (!isReloading && (player.ammo > 0 || infiniteAmmo)) {
            const currentTime = Date.now();
            if (currentTime - lastBulletTime > player.fireRate) {
                player.shoot();
                lastBulletTime = currentTime;
            }
        }
    });

    canvas.addEventListener('mouseup', () => {
        mouseDown = false;
    });

    // Shop Buttons
    buyDamageUpgradeBtn.addEventListener('click', () => {
        let cost = parseInt(buyDamageUpgradeBtn.dataset.cost);
        if (oneDollarEverything) cost = 1;

        if (player.cash >= cost) {
            player.cash -= cost;
            player.damage += 15; // Increase damage by a good amount
            if (!oneDollarEverything) {
                buyDamageUpgradeBtn.dataset.cost = cost + 20; // Increase cost by $20 per round
            }
            buyDamageUpgradeBtn.textContent = `Upgrade Damage ($${Math.ceil(buyDamageUpgradeBtn.dataset.cost)})`;
            showShopMessage('Damage upgraded!', 'lime');
            updateUI();
        } else {
            showShopMessage('Not enough cash!', 'red');
        }
    });

    buyHealthUpgradeBtn.addEventListener('click', () => {
        let cost = parseInt(buyHealthUpgradeBtn.dataset.cost);
        if (oneDollarEverything) cost = 1;

        if (player.cash >= cost) {
            player.cash -= cost;
            player.maxHealth += 50; // Increase max health by more
            player.health = player.maxHealth; // Also heal for the amount increased
            if (!oneDollarEverything) {
                buyHealthUpgradeBtn.dataset.cost = cost * 1.5; // Continue compounding health cost
            }
            buyHealthUpgradeBtn.textContent = `Upgrade Max Health ($${Math.ceil(buyHealthUpgradeBtn.dataset.cost)})`;
            showShopMessage('Max Health upgraded!', 'lime');
            updateUI();
        } else {
            showShopMessage('Not enough cash!', 'red');
        }
    });

    buyFireRateUpgradeBtn.addEventListener('click', () => {
        let cost = parseInt(buyFireRateUpgradeBtn.dataset.cost);
        if (oneDollarEverything) cost = 1;

        if (player.cash >= cost) {
            player.cash -= cost;
            player.fireRate = Math.max(30, player.fireRate - 15); // Decrease fire rate by more (make it faster), with a minimum of 30ms
            if (!oneDollarEverything) {
                buyFireRateUpgradeBtn.dataset.cost = cost * 1.5; // Continue compounding fire rate cost
            }
            buyFireRateUpgradeBtn.textContent = `Upgrade Fire Rate ($${Math.ceil(buyFireRateUpgradeBtn.dataset.cost)})`;
            showShopMessage('Fire Rate upgraded!', 'lime');
            updateUI();
        } else {
            showShopMessage('Not enough cash!', 'red');
        }
    });

    buyMaxAmmoUpgradeBtn.addEventListener('click', () => {
        let cost = parseInt(buyMaxAmmoUpgradeBtn.dataset.cost);
        if (oneDollarEverything) cost = 1;

        if (player.cash >= cost) {
            player.cash -= cost;
            player.maxAmmo += 6; // Increase max ammo by 6
            player.ammo = player.maxAmmo; // Refill ammo
            if (!oneDollarEverything) {
                buyMaxAmmoUpgradeBtn.dataset.cost = cost + 10; // Increase cost by $10
            }
            buyMaxAmmoUpgradeBtn.textContent = `Upgrade Max Ammo ($${Math.ceil(buyMaxAmmoUpgradeBtn.dataset.cost)})`;
            showShopMessage('Max Ammo upgraded!', 'lime');
            updateUI();
        } else {
            showShopMessage('Not enough cash!', 'red');
        }
    });

    startGameButton.addEventListener('click', startGame); //
    restartGameButton.addEventListener('click', initGame);

    // Dev Console Logic
    devConsoleInput.addEventListener('input', () => {
        if (devConsoleInput.value.toLowerCase() === 'dev&') {
            devOptions.style.display = 'flex'; // Show dev options
        } else {
            devOptions.style.display = 'none'; // Hide if code is removed or incorrect
        }
    });

    devOptions.addEventListener('click', (e) => {
        const cheatType = e.target.dataset.cheat;
        if (cheatType) {
            switch (cheatType) {
                case 'maxAmmo':
                    infiniteAmmo = !infiniteAmmo;
                    e.target.textContent = infiniteAmmo ? 'Infinite Ammo ON' : 'Max Ammo/Inf';
                    if (infiniteAmmo) player.ammo = player.maxAmmo; // Fill up if turned on
                    break;
                case 'maxHealth':
                    infiniteHealth = !infiniteHealth;
                    e.target.textContent = infiniteHealth ? 'Infinite Health ON' : 'Max Health/Inf';
                    if (infiniteHealth) player.health = player.maxHealth; // Fill up if turned on
                    break;
                case 'maxDamage':
                    player.damage = 9999; // Set to very high damage
                    showShopMessage('Max Damage Activated!', 'cyan');
                    break;
                case 'oneDollar':
                    oneDollarEverything = !oneDollarEverything;
                    e.target.textContent = oneDollarEverything ? '1$ Everything ON' : '1$ Everything';
                    showShopMessage(oneDollarEverything ? 'Shop prices are $1!' : 'Shop prices are normal.', 'cyan');
                    // Update shop buttons to reflect new prices
                    buyDamageUpgradeBtn.textContent = `Upgrade Damage ($${oneDollarEverything ? 1 : Math.ceil(buyDamageUpgradeBtn.dataset.cost)})`;
                    buyHealthUpgradeBtn.textContent = `Upgrade Max Health ($${oneDollarEverything ? 1 : Math.ceil(buyHealthUpgradeBtn.dataset.cost)})`;
                    buyFireRateUpgradeBtn.textContent = `Upgrade Fire Rate ($${oneDollarEverything ? 1 : Math.ceil(buyFireRateUpgradeBtn.dataset.cost)})`;
                    buyMaxAmmoUpgradeBtn.textContent = `Upgrade Max Ammo ($${oneDollarEverything ? 1 : Math.ceil(buyMaxAmmoUpgradeBtn.dataset.cost)})`;
                    break;
                case 'invincible':
                    invincible = !invincible;
                    e.target.textContent = invincible ? 'Invincible ON' : 'Invincible';
                    showShopMessage(invincible ? 'Invincibility ON!' : 'Invincibility OFF!', 'cyan');
                    break;
                case 'setMoney':
                    const amount = parseInt(moneySetValueInput.value);
                    if (!isNaN(amount) && amount >= 0) {
                        player.cash = amount;
                        showShopMessage(`Cash set to $${amount}!`, 'cyan');
                    } else {
                        showShopMessage('Invalid money amount!', 'red');
                    }
                    break;
            }
            updateUI(); // Refresh UI for cheat changes
        }
    });


    // Initial game setup (shows start screen)
    initGame();
});
