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

    // Shop Buttons
    const buyPistolBtn = document.getElementById('buyPistol');
    const upgradePistolDamageBtn = document.getElementById('upgradePistolDamage');
    const buyM4Btn = document.getElementById('buyM4');
    const upgradeM4DamageBtn = document.getElementById('upgradeM4Damage');
    const buyMac11Btn = document.getElementById('buyMac11');
    const upgradeMac11DamageBtn = document.getElementById('upgradeMac11Damage');

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
    const roundCountdownOverlay = document.getElementById('roundCountdownOverlay');
    const roundCountdownText = document.getElementById('roundCountdownText');
    const inventoryPanel = document.getElementById('inventoryPanel'); // New inventory panel

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

    let isRoundStarting = false;
    let roundCountdown = 0;
    let countdownInterval;

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
    const ZOMBIE_WIDTH = 35;
    const ZOMBIE_HEIGHT = 50;
    const ZOMBIE_SPEED = 1;

    // --- Gun Definitions ---
    // baseDamage is the starting damage for the gun
    // damage is the CURRENT calculated damage (base + upgrades)
    const guns = {
        Pistol: {
            name: "Pistol",
            baseDamage: 15,
            fireRate: 300,
            magazineSize: 10,
            bulletSpeed: 12,
            cost: 0, // Starting gun
            upgradeDamageCost: 50 // Cost for one damage upgrade level for Pistol
        },
        M4: {
            name: "M4",
            baseDamage: 30,
            fireRate: 150,
            magazineSize: 30,
            bulletSpeed: 15,
            cost: 500,
            upgradeDamageCost: 100 // Cost for one damage upgrade level for M4
        },
        Mac11: {
            name: "Mac11",
            baseDamage: 20, // Lower damage per shot than M4
            fireRate: 80, // Very fast fire rate
            magazineSize: 40,
            bulletSpeed: 13,
            cost: 750,
            upgradeDamageCost: 120 // Cost for one damage upgrade level for Mac11
        }
    };

    // --- Player Object ---
    function Player() {
        this.x = canvas.width / 4;
        this.y = canvas.height - PLAYER_HEIGHT - 10;
        this.width = PLAYER_WIDTH;
        this.height = PLAYER_HEIGHT;
        this.color = 'white';
        this.velocityY = 0;
        this.isJumping = false;
        this.health = 100;
        this.maxHealth = 100;
        this.cash = 0;
        this.bodyDirection = 1; // 1 for right, -1 for left (body direction)
        this.gunAngle = 0; // Angle for the gun based on mouse position
        this.equippedGun = null; // Will be set in initGame
        this.animationFrame = 0;
        this.animationTimer = 0;
        this.isWalking = false;

        // Inventory of owned guns with their state (upgrades, current ammo)
        this.gunsOwned = {};
        for (const gunName in guns) {
            this.gunsOwned[gunName] = {
                owned: (gunName === 'Pistol'), // Pistol is owned by default
                damageUpgrades: 0,
                currentAmmo: guns[gunName].magazineSize,
                currentDamage: guns[gunName].baseDamage // Store current damage (base + upgrades)
            };
        }

        this.draw = function() {
            ctx.save();
            ctx.translate(this.x + this.width / 2, this.y + this.height / 2); // Translate to player center

            // Player Body (Pixel Art - 2 frames for walking)
            ctx.fillStyle = this.color;
            const bodyWidth = this.width * 0.6;
            const bodyHeight = this.height * 0.7;
            const headSize = this.width * 0.4;
            const legWidth = this.width * 0.2;
            const legHeight = this.height * 0.3;

            // Head
            ctx.fillRect(-headSize / 2, -this.height / 2, headSize, headSize);
            // Body
            ctx.fillRect(-bodyWidth / 2, -this.height / 2 + headSize, bodyWidth, bodyHeight);

            // Legs (simple animation)
            if (this.isWalking) {
                if (this.animationFrame === 0) {
                    // Frame 0: one leg forward, one back
                    ctx.fillRect(-legWidth / 2 - legWidth * 0.5, this.height / 2 - legHeight, legWidth, legHeight); // Back leg
                    ctx.fillRect(legWidth / 2 + legWidth * 0.5, this.height / 2 - legHeight, legWidth, legHeight); // Front leg
                } else {
                    // Frame 1: other leg forward, other back
                    ctx.fillRect(legWidth / 2 + legWidth * 0.5, this.height / 2 - legHeight, legWidth, legHeight); // Back leg
                    ctx.fillRect(-legWidth / 2 - legWidth * 0.5, this.height / 2 - legHeight, legWidth, legHeight); // Front leg
                }
            } else {
                // Standing pose
                ctx.fillRect(-legWidth * 0.8, this.height / 2 - legHeight, legWidth, legHeight);
                ctx.fillRect(legWidth * 0.2, this.height / 2 - legHeight, legWidth, legHeight);
            }

            // Gun Drawing (Rotated)
            ctx.rotate(this.gunAngle); // Rotate canvas for gun drawing

            // Draw current gun
            const gun = this.equippedGun;
            ctx.fillStyle = '#444'; // Gun color

            if (gun) { // Ensure a gun is equipped before drawing
                if (gun.name === "Pistol") {
                    // Pistol: small block with a handle
                    ctx.fillRect(0, -4, 20, 8); // Body
                    ctx.fillRect(5, 4, 5, 10); // Handle
                } else if (gun.name === "M4") {
                    // M4: longer barrel, stock, sight
                    ctx.fillRect(0, -4, 30, 8); // Receiver
                    ctx.fillRect(30, -2, 40, 4); // Barrel
                    ctx.fillRect(-15, 0, 15, 6); // Stock
                    ctx.fillRect(20, -8, 5, 5); // Sight
                } else if (gun.name === "Mac11") {
                    // Mac11: compact, wide body, short barrel
                    ctx.fillRect(0, -6, 25, 12); // Wide body
                    ctx.fillRect(25, -4, 10, 4); // Short barrel
                    ctx.fillRect(5, 6, 5, 10); // Handle
                }
            }

            ctx.restore(); // Restore canvas state

            // Draw health bar above player (not rotated)
            const healthBarWidth = this.width + 10;
            const healthBarHeight = 5;
            const healthBarX = this.x - 5;
            const healthBarY = this.y - 15;

            ctx.fillStyle = 'red';
            ctx.fillRect(healthBarX, healthBarY, healthBarWidth, healthBarHeight);
            ctx.fillStyle = 'lime';
            ctx.fillRect(healthBarX, healthBarY, (this.health / this.maxHealth) * healthBarWidth, healthBarHeight);
            ctx.strokeStyle = '#555';
            ctx.lineWidth = 1;
            ctx.strokeRect(healthBarX, healthBarY, healthBarWidth, healthBarHeight);
        };

        this.update = function() {
            // Update animation frame
            this.animationTimer++;
            if (this.animationTimer >= 10) { // Change frame every 10 updates
                this.animationFrame = 1 - this.animationFrame; // Toggle between 0 and 1
                this.animationTimer = 0;
            }

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
            this.isWalking = false;
            if (keys['a'] || keys['ArrowLeft']) {
                this.x -= PLAYER_SPEED;
                this.bodyDirection = -1;
                this.isWalking = true;
            }
            if (keys['d'] || keys['ArrowRight']) {
                this.x += PLAYER_SPEED;
                this.bodyDirection = 1;
                this.isWalking = true;
            }

            // Keep player within canvas bounds
            if (this.x < 0) this.x = 0;
            if (this.x + this.width > canvas.width) this.x = canvas.width - this.width;

            // Update gun angle based on mouse position
            const playerCenterX = this.x + this.width / 2;
            const playerCenterY = this.y + this.height / 2;
            this.gunAngle = Math.atan2(mouseY - playerCenterY, mouseX - playerCenterX);


            // Handle auto-fire if mouse is down and not reloading, and has ammo
            if (mouseDown && !isReloading && (this.equippedGun.ammo > 0 || infiniteAmmo)) {
                const currentTime = Date.now();
                if (currentTime - lastBulletTime > this.equippedGun.fireRate) {
                    this.shoot();
                    lastBulletTime = currentTime;
                }
            } else if (this.equippedGun.ammo <= 0 && !isReloading && !infiniteAmmo) {
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
            if (!this.equippedGun) { // Don't shoot if no gun is equipped (shouldn't happen)
                return;
            }
            if (isReloading || (this.equippedGun.ammo <= 0 && !infiniteAmmo)) {
                showShopMessage('Out of ammo or reloading!', 'red');
                return;
            }

            const playerCenterX = this.x + this.width / 2;
            const playerCenterY = this.y + this.height / 2;

            const barrelTipX = playerCenterX + Math.cos(this.gunAngle) * 45;
            const barrelTipY = playerCenterY + Math.sin(this.gunAngle) * 45;

            bullets.push(new Bullet(barrelTipX, barrelTipY, this.gunAngle, this.equippedGun.damage, this.equippedGun.bulletSpeed));
            if (!infiniteAmmo) {
                this.equippedGun.ammo--;
                // Also update the stored ammo in gunsOwned for the current gun
                this.gunsOwned[this.equippedGun.name].currentAmmo = this.equippedGun.ammo;
            }
            updateUI();
        };

        this.takeDamage = function(amount) {
            if (invincible) return;

            this.health -= amount;
            this.lastHitTime = Date.now();
            damageOverlay.classList.add('active');
            setTimeout(() => {
                damageOverlay.classList.remove('active');
            }, 100);

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
            if (!this.equippedGun) return; // Cannot reload if no gun
            if (!isReloading && this.equippedGun.ammo < this.equippedGun.magazineSize && !infiniteAmmo) {
                isReloading = true;
                reloadText.style.display = 'block';
                reloadTimer = setTimeout(() => {
                    this.equippedGun.ammo = this.equippedGun.magazineSize;
                    this.gunsOwned[this.equippedGun.name].currentAmmo = this.equippedGun.magazineSize; // Update stored ammo
                    isReloading = false;
                    reloadText.style.display = 'none';
                    updateUI();
                }, RELOAD_TIME);
            }
        };

        this.equipGun = function(gunName) {
            const targetGunDefinition = guns[gunName];
            const ownedGunState = this.gunsOwned[gunName];

            if (!targetGunDefinition || !ownedGunState.owned) {
                showShopMessage(`You don't own the ${gunName}!`, 'red');
                return false;
            }

            if (this.equippedGun && this.equippedGun.name === gunName) {
                showShopMessage(`${gunName} is already equipped!`, 'grey');
                return true; // Already equipped
            }

            // Save state of currently equipped gun before switching
            if (this.equippedGun) {
                this.gunsOwned[this.equippedGun.name].currentAmmo = this.equippedGun.ammo;
            }

            // Create a new object for equippedGun to avoid modifying gun definitions directly
            this.equippedGun = { ...targetGunDefinition };
            // Load specific state for this gun
            this.equippedGun.ammo = ownedGunState.currentAmmo;
            this.equippedGun.damage = targetGunDefinition.baseDamage + ownedState.damageUpgrades * 15; // 15 damage per upgrade level

            // Clear any active reload timer for the old gun
            if (reloadTimer) {
                clearTimeout(reloadTimer);
                isReloading = false;
                reloadText.style.display = 'none';
            }

            updateUI();
            showShopMessage(`${gunName} equipped!`, 'lightblue');
            return true;
        };
    }

    // --- Bullet Object ---
    function Bullet(x, y, angle, damage, speed) {
        this.x = x;
        this.y = y;
        this.radius = BULLET_RADIUS;
        this.color = 'yellow';
        this.speedX = speed * Math.cos(angle);
        this.speedY = speed * Math.sin(angle);
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

    // --- Zombie Object ---
    function Zombie(x, y, health, speed, type = 'normal') {
        this.x = x;
        this.y = y;
        this.width = ZOMBIE_WIDTH;
        this.height = ZOMBIE_HEIGHT;
        this.color = 'darkgreen';
        this.health = health;
        this.maxHealth = health;
        this.speed = speed;
        this.damage = 10;
        this.attackCooldown = 60;
        this.currentAttackCooldown = 0;
        this.type = type; // 'normal' or 'boss'
        this.animationFrame = 0;
        this.animationTimer = 0;
        this.isWalking = true; // Zombies are always walking

        if (this.type === 'boss') {
            this.color = 'purple'; // Boss zombie color
            this.width = ZOMBIE_WIDTH * 1.5; // Bigger
            this.height = ZOMBIE_HEIGHT * 1.5;
            this.damage = 40; // Stronger
            this.speed = speed * 0.8; // Slightly slower to compensate for damage/size
        }

        this.draw = function() {
            ctx.fillStyle = this.color;
            const bodyWidth = this.width * 0.8;
            const bodyHeight = this.height * 0.7;
            const headSize = this.width * 0.5;
            const legWidth = this.width * 0.3;
            const legHeight = this.height * 0.3;

            // Update animation frame
            this.animationTimer++;
            if (this.animationTimer >= 15) { // Slower animation than player
                this.animationFrame = 1 - this.animationFrame;
                this.animationTimer = 0;
            }

            ctx.save();
            ctx.translate(this.x + this.width / 2, this.y + this.height / 2); // Center for drawing

            // Body
            ctx.fillRect(-bodyWidth / 2, -this.height / 2 + headSize, bodyWidth, bodyHeight);
            // Head
            ctx.fillRect(-headSize / 2, -this.height / 2, headSize, headSize);

            // Legs (simple animation)
            if (this.animationFrame === 0) {
                ctx.fillRect(-legWidth * 0.8, this.height / 2 - legHeight, legWidth, legHeight);
                ctx.fillRect(legWidth * 0.2, this.height / 2 - legHeight, legWidth, legHeight);
            } else {
                ctx.fillRect(legWidth * 0.2, this.height / 2 - legHeight, legWidth, legHeight);
                ctx.fillRect(-legWidth * 0.8, this.height / 2 - legHeight, legWidth, legHeight);
            }

            // Bones and Blood (simplified)
            ctx.fillStyle = '#8B4513'; // Brown for bones
            ctx.fillRect(-this.width * 0.1, -this.height * 0.1, 5, 10);
            ctx.fillRect(this.width * 0.1, this.height * 0.1, 5, 10);
            ctx.fillStyle = '#8B0000'; // Dark red for blood
            ctx.fillRect(-this.width * 0.2, this.height * 0.05, 7, 7);
            ctx.fillRect(this.width * 0.05, this.height * 0.2, 6, 6);

            ctx.restore(); // Restore canvas state to prevent health bar rotation

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
            if (invincible) return;

            this.health -= amount;
            this.lastHitTime = Date.now();
            damageOverlay.classList.add('active');
            setTimeout(() => {
                damageOverlay.classList.remove('active');
            }, 100);

            if (this.health <= 0) {
                this.health = 0;
                gameOver();
            }
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
        isReloading = false;
        if (reloadTimer) clearTimeout(reloadTimer);
        reloadText.style.display = 'none';

        // Reset gun ownership and upgrades
        for (const gunName in guns) {
            player.gunsOwned[gunName] = {
                owned: (gunName === 'Pistol'),
                damageUpgrades: 0,
                currentAmmo: guns[gunName].magazineSize,
                currentDamage: guns[gunName].baseDamage
            };
        }
        player.equipGun('Pistol'); // Equip Pistol at start

        // Reset shop costs and button texts for upgrades
        buyHealthUpgradeBtn.dataset.cost = 100;
        buyHealthUpgradeBtn.textContent = `Upgrade Max Health ($100)`;
        buyFireRateUpgradeBtn.dataset.cost = 75;
        buyFireRateUpgradeBtn.textContent = `Upgrade Fire Rate ($75)`;
        buyMaxAmmoUpgradeBtn.dataset.cost = 75;
        buyMaxAmmoUpgradeBtn.textContent = `Upgrade Max Ammo ($75)`;

        // Reset gun specific damage upgrade buttons and costs
        upgradePistolDamageBtn.dataset.cost = guns.Pistol.upgradeDamageCost;
        upgradePistolDamageBtn.textContent = `+Damage ($${guns.Pistol.upgradeDamageCost})`;
        upgradePistolDamageBtn.style.display = 'none';

        upgradeM4DamageBtn.dataset.cost = guns.M4.upgradeDamageCost;
        upgradeM4DamageBtn.textContent = `+Damage ($${guns.M4.upgradeDamageCost})`;
        upgradeM4DamageBtn.style.display = 'none';

        upgradeMac11DamageBtn.dataset.cost = guns.Mac11.upgradeDamageCost;
        upgradeMac11DamageBtn.textContent = `+Damage ($${guns.Mac11.upgradeDamageCost})`;
        upgradeMac11DamageBtn.style.display = 'none';
        
        // Reset cheat flags
        infiniteAmmo = false;
        infiniteHealth = false;
        invincible = false;
        oneDollarEverything = false;
        devOptions.style.display = 'none'; // Hide dev options
        devConsoleInput.value = ''; // Clear dev console input

        gameOverScreen.style.display = 'none';
        startScreen.style.display = 'flex';
        roundCountdownOverlay.style.display = 'none';
        gameRunning = false;
        paused = false;
        isRoundStarting = false;
        if (countdownInterval) clearInterval(countdownInterval);
        updateUI();
    }

    function startGame() {
        startScreen.style.display = 'none';
        gameRunning = true;
        startGameLoop();
        startNextRoundCountdown();
    }

    function startGameLoop() {
        if (gameLoopInterval) {
            clearInterval(gameLoopInterval);
        }
        gameLoopInterval = setInterval(gameLoop, 1000 / 60); // 60 FPS
    }

    function gameLoop() {
        // Game logic (movement, shooting, zombie AI) is paused during round start countdown
        if (!gameRunning || paused || isRoundStarting) return;

        update();
        draw();
    }

    function update() {
        player.update();

        for (let i = bullets.length - 1; i >= 0; i--) {
            bullets[i].update();
            if (bullets[i].x < -BULLET_RADIUS || bullets[i].x > canvas.width + BULLET_RADIUS ||
                bullets[i].y < -BULLET_RADIUS || bullets[i].y > canvas.height + BULLET_RADIUS) {
                bullets.splice(i, 1);
            }
        }

        for (let i = zombies.length - 1; i >= 0; i--) {
            zombies[i].update();

            for (let j = bullets.length - 1; j >= 0; j--) {
                if (checkCollision(bullets[j], zombies[i])) {
                    const zombieDied = zombies[i].takeDamage(bullets[j].damage);
                    bullets.splice(j, 1);
                    if (zombieDied) {
                        player.cash += getRandomCashPerKill();
                        zombies.splice(i, 1);
                        roundData.zombieCount--;
                        updateUI();
                        break;
                    }
                }
            }
        }

        if (zombies.length === 0 && roundData.zombieCount === 0 && gameRunning && !isRoundStarting) {
            startNextRoundCountdown();
        }
    }

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        ctx.strokeStyle = '#666';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, canvas.height - 10);
        ctx.lineTo(canvas.width, canvas.height - 10);
        ctx.stroke();

        player.draw();

        bullets.forEach(bullet => bullet.draw());
        zombies.forEach(zombie => zombie.draw());

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
        if (obj1.radius && obj2.width) { // Bullet-Zombie collision
            const distX = Math.abs(obj1.x - obj2.x - obj2.width / 2);
            const distY = Math.abs(obj1.y - obj2.y - obj2.height / 2);

            if (distX > (obj2.width / 2 + obj1.radius)) { return false; }
            if (distY > (obj2.height / 2 + obj1.radius)) { return false; }

            if (distX <= (obj2.width / 2)) { return true; }
            if (distY <= (obj2.height / 2)) { return true; }

            const dx = distX - obj2.width / 2;
            const dy = distY - obj2.height / 2;
            return (dx * dx + dy * dy <= (obj1.radius * obj1.radius));
        } else { // Player-Zombie collision (AABB)
            return obj1.x < obj2.x + obj2.width &&
                   obj1.x + obj1.width > obj2.x &&
                   obj1.y < obj2.y + obj2.height &&
                   obj1.y + obj1.height > obj2.y;
        }
    }

    function startNextRoundCountdown() {
        isRoundStarting = true;
        roundCountdown = 10; // 10-second countdown
        roundCountdownOverlay.style.display = 'flex';
        roundCountdownText.textContent = `Round Starting in ${roundCountdown}...`;

        if (countdownInterval) clearInterval(countdownInterval);
        countdownInterval = setInterval(() => {
            roundCountdown--;
            if (roundCountdown > 0) {
                roundCountdownText.textContent = `Round Starting in ${roundCountdown}...`;
            } else {
                clearInterval(countdownInterval);
                roundCountdownOverlay.style.display = 'none';
                startNextRound(); // Start the actual round
            }
        }, 1000);
    }

    function quickStartRound() {
        if (isRoundStarting) {
            clearInterval(countdownInterval);
            roundCountdownOverlay.style.display = 'none';
            startNextRound();
        }
    }

    function startNextRound() {
        isRoundStarting = false; // End countdown state
        roundData.current++;
        currentRoundSpan.textContent = roundData.current;
        player.health = infiniteHealth ? player.maxHealth : player.maxHealth; // Heal to full or stay infinite

        // Ammo does NOT refill automatically (players must reload or buy ammo)

        let numNormalZombiesToSpawn = roundData.current * 2;
        if (roundData.current > 10) numNormalZombiesToSpawn += (roundData.current - 10) * 0.5;
        numNormalZombiesToSpawn = Math.floor(numNormalZombiesToSpawn);
        if (numNormalZombiesToSpawn < 1) numNormalZombiesToSpawn = 1;

        roundData.zombieCount = numNormalZombiesToSpawn; // Initialize count with normal zombies

        const currentZombieHealth = roundData.initialZombieHealth + (roundData.current - 1) * roundData.zombieHealthIncreasePerRound;
        const zombieSpeed = ZOMBIE_SPEED + (roundData.current * 0.05);

        zombies = []; // Clear zombies from previous round

        // Spawn normal zombies
        for (let i = 0; i < numNormalZombiesToSpawn; i++) {
            const spawnSide = Math.random() < 0.5 ? -1 : 1;
            const spawnX = spawnSide === -1 ? -ZOMBIE_WIDTH - Math.random() * 100 : canvas.width + Math.random() * 100;
            const spawnY = canvas.height - ZOMBIE_HEIGHT - 10;
            zombies.push(new Zombie(spawnX, spawnY, currentZombieHealth, zombieSpeed, 'normal'));
        }

        // Spawn Boss Zombies
        if (roundData.current >= 20) {
            let numBossZombies = 0;
            // From Round 20 to 29, 1 boss per round.
            if (roundData.current < 30) {
                numBossZombies = 1;
            } else {
            // From Round 30 onwards, increases by 1 for every 10 rounds after 20.
            // Example: R30 (20 + 10): (30-20)/10 + 1 = 1 + 1 = 2 bosses
            // R40 (20 + 20): (40-20)/10 + 1 = 2 + 1 = 3 bosses
                numBossZombies = Math.floor((roundData.current - 20) / 10) + 1;
            }
            roundData.zombieCount += numBossZombies; // Add boss zombies to total count

            for (let i = 0; i < numBossZombies; i++) {
                const spawnSide = Math.random() < 0.5 ? -1 : 1;
                const spawnX = spawnSide === -1 ? -ZOMBIE_WIDTH * 2 - Math.random() * 100 : canvas.width + Math.random() * 100;
                const spawnY = canvas.height - ZOMBIE_HEIGHT * 1.5 - 10; // Adjust for larger boss
                const bossHealth = currentZombieHealth * 5; // Boss is much tougher
                const bossSpeed = ZOMBIE_SPEED * 0.8; // Boss is slower
                zombies.push(new Zombie(spawnX, spawnY, bossHealth, bossSpeed, 'boss'));
            }
        }

        updateUI();
    }

    function getRandomCashPerKill() {
        if (roundData.current >= roundData.highRoundThreshold) {
            return Math.floor(Math.random() * (roundData.highRoundCashPerKill.max - roundData.highRoundCashPerKill.min + 1)) + roundData.highRoundCashPerKill.min;
        } else {
            return Math.floor(Math.random() * (roundData.baseCashPerKill.max - roundData.baseCashPerKill.min + 1)) + roundData.baseCashPerKill.min;
        }
    }

    function updateUI() {
        playerHealthSpan.textContent = infiniteHealth ? 'INF' : player.health;
        playerCashSpan.textContent = player.cash;
        currentRoundSpan.textContent = roundData.current;
        zombiesRemainingSpan.textContent = zombies.length;
        playerAmmoSpan.textContent = infiniteAmmo ? 'INF' : (player.equippedGun ? player.equippedGun.ammo : 0);
        playerMaxAmmoSpan.textContent = infiniteAmmo ? 'INF' : (player.equippedGun ? player.equippedGun.magazineSize : 0);

        // Update gun purchase/equip buttons and their upgrade buttons
        const updateGunButton = (gunName, button, upgradeButton) => {
            const gunDef = guns[gunName];
            const ownedState = player.gunsOwned[gunName];
            let cost = gunDef.cost;
            if (oneDollarEverything) cost = 1;

            if (ownedState.owned) {
                button.textContent = `${gunDef.name} (Equip)`;
                button.disabled = player.equippedGun.name === gunName; // Disable if already equipped
                if (upgradeButton) {
                    upgradeButton.style.display = 'inline-block';
                    let upgradeCost = gunDef.upgradeDamageCost + (ownedState.damageUpgrades * 20); // Each upgrade costs more
                    if (oneDollarEverything) upgradeCost = 1;
                    upgradeButton.textContent = `+Damage ($${Math.ceil(upgradeCost)})`;
                    upgradeButton.dataset.cost = upgradeCost; // Update dataset cost for logic
                    upgradeButton.disabled = player.cash < upgradeCost && !oneDollarEverything;
                }
            } else {
                button.textContent = `Buy ${gunDef.name} ($${gunDef.cost})`;
                button.disabled = player.cash < gunDef.cost && !oneDollarEverything;
                if (upgradeButton) {
                    upgradeButton.style.display = 'none'; // Hide upgrade if gun not owned
                }
            }
        };

        updateGunButton('Pistol', buyPistolBtn, upgradePistolDamageBtn);
        updateGunButton('M4', buyM4Btn, upgradeM4DamageBtn);
        updateGunButton('Mac11', buyMac11Btn, upgradeMac11DamageBtn);

        // Update general upgrade buttons
        const updateGeneralUpgradeButton = (button, baseCostMultiplier, increment) => {
            let cost = parseInt(button.dataset.cost);
            if (oneDollarEverything) cost = 1;
            button.disabled = player.cash < cost && !oneDollarEverything;

            if (oneDollarEverything) {
                button.textContent = `${button.textContent.split('(')[0].trim()} ($1)`;
            } else {
                button.textContent = `${button.textContent.split('(')[0].trim()} ($${Math.ceil(button.dataset.cost)})`;
            }
        };

        updateGeneralUpgradeButton(buyHealthUpgradeBtn, 1.5, 0); // Cost increases by 1.5 multiplier
        updateGeneralUpgradeButton(buyFireRateUpgradeBtn, 1.5, 0); // Cost increases by 1.5 multiplier
        updateGeneralUpgradeButton(buyMaxAmmoUpgradeBtn, 0, 10); // Cost increases by 10 linear

        // Update inventory display
        inventoryPanel.innerHTML = ''; // Clear existing
        let keyNumber = 1;
        for (const gunName in player.gunsOwned) {
            const ownedState = player.gunsOwned[gunName];
            if (ownedState.owned) {
                const itemDiv = document.createElement('div');
                itemDiv.classList.add('inventory-item');
                if (player.equippedGun && player.equippedGun.name === gunName) {
                    itemDiv.classList.add('equipped');
                }
                itemDiv.dataset.gunName = gunName; // For click handler
                itemDiv.innerHTML = `<span class="key-number">${keyNumber}</span>${gunName}`;
                inventoryPanel.appendChild(itemDiv);
                keyNumber++;
            }
        }
    }

    function showShopMessage(message, color = 'yellow') {
        shopMessageDiv.textContent = message;
        shopMessageDiv.style.color = color;
        clearTimeout(shopMessageDiv.timer); // Clear any existing timer
        shopMessageDiv.timer = setTimeout(() => {
            shopMessageDiv.textContent = '';
        }, 3000);
    }

    function gameOver() {
        gameRunning = false;
        clearInterval(gameLoopInterval);
        if (countdownInterval) clearInterval(countdownInterval); // Stop countdown if active
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
            if (isRoundStarting) clearInterval(countdownInterval); // Pause countdown too
        } else {
            startGameLoop();
            if (isRoundStarting) { // Resume countdown if it was active
                countdownInterval = setInterval(() => {
                    roundCountdown--;
                    if (roundCountdown > 0) {
                        roundCountdownText.textContent = `Round Starting in ${roundCountdown}...`;
                    } else {
                        clearInterval(countdownInterval);
                        roundCountdownOverlay.style.display = 'none';
                        startNextRound();
                    }
                }, 1000);
            }
        }
        draw();
    }


    // --- Event Listeners ---

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
        if (e.key.toLowerCase() === 'tab') { // Tab for quick start
            e.preventDefault(); // Prevent browser tab behavior
            quickStartRound();
        }
        // Gun switching by number keys
        if (e.key === '1') {
            player.equipGun('Pistol');
        } else if (e.key === '2') {
            player.equipGun('M4');
        } else if (e.key === '3') {
            player.equipGun('Mac11');
        }
    });

    document.addEventListener('keyup', (e) => {
        keys[e.key.toLowerCase()] = false;
    });

    canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        mouseX = e.clientX - rect.left;
        mouseY = e.clientY - rect.top;
    });

    canvas.addEventListener('mousedown', (e) => {
        if (!gameRunning || paused || isRoundStarting) return;
        mouseDown = true;
        if (!isReloading && (player.equippedGun.ammo > 0 || infiniteAmmo)) {
            const currentTime = Date.now();
            if (currentTime - lastBulletTime > player.equippedGun.fireRate) {
                player.shoot();
                lastBulletTime = currentTime;
            }
        }
    });

    canvas.addEventListener('mouseup', () => {
        mouseDown = false;
    });

    // Shop Buttons (General Upgrades)
    buyHealthUpgradeBtn.addEventListener('click', () => {
        let cost = parseInt(buyHealthUpgradeBtn.dataset.cost);
        if (oneDollarEverything) cost = 1;

        if (player.cash >= cost) {
            player.cash -= cost;
            player.maxHealth += 50;
            player.health = player.maxHealth;
            if (!oneDollarEverything) {
                buyHealthUpgradeBtn.dataset.cost = cost * 1.5;
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
            player.equippedGun.fireRate = Math.max(30, player.equippedGun.fireRate - 15);
            if (!oneDollarEverything) {
                buyFireRateUpgradeBtn.dataset.cost = cost * 1.5;
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
            // Update equipped gun's magazine size
            player.equippedGun.magazineSize += 6;
            // Update the base magazine size in the gun definition (for all future equips)
            guns[player.equippedGun.name].magazineSize = player.equippedGun.magazineSize;
            
            player.equippedGun.ammo = player.equippedGun.magazineSize; // Refill ammo
            // Update the stored currentAmmo for this gun in gunsOwned
            player.gunsOwned[player.equippedGun.name].currentAmmo = player.equippedGun.ammo;

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

    // Gun Purchase and Specific Damage Upgrade Buttons
    const handleGunAction = (gunName, actionType) => {
        const gunDef = guns[gunName];
        const ownedState = player.gunsOwned[gunName];

        if (actionType === 'buy') {
            let cost = gunDef.cost;
            if (oneDollarEverything) cost = 1;

            if (player.cash >= cost && !ownedState.owned) {
                player.cash -= cost;
                ownedState.owned = true;
                player.equipGun(gunName);
                showShopMessage(`${gunName} purchased and equipped!`, 'lime');
                updateUI();
            } else if (ownedState.owned) {
                player.equipGun(gunName); // Equip if already owned
            } else {
                showShopMessage(`Not enough cash to buy ${gunName}!`, 'red');
            }
        } else if (actionType === 'upgradeDamage') {
            let cost = parseInt(document.getElementById(`upgrade${gunName}Damage`).dataset.cost);
            if (oneDollarEverything) cost = 1;

            if (player.cash >= cost) {
                player.cash -= cost;
                ownedState.damageUpgrades++;
                // Update the current gun's damage if it's the one equipped
                if (player.equippedGun.name === gunName) {
                    player.equippedGun.damage = gunDef.baseDamage + ownedState.damageUpgrades * 15;
                }
                // Update the stored damage in gunsOwned
                ownedState.currentDamage = gunDef.baseDamage + ownedState.damageUpgrades * 15;

                if (!oneDollarEverything) {
                    // Cost increases for next upgrade
                    document.getElementById(`upgrade${gunName}Damage`).dataset.cost = cost + (gunDef.upgradeDamageCost / 5); // Example: increase by 20% of base upgrade cost
                }
                showShopMessage(`${gunName} Damage upgraded!`, 'lime');
                updateUI();
            } else {
                showShopMessage('Not enough cash!', 'red');
            }
        }
    };

    buyPistolBtn.addEventListener('click', () => handleGunAction('Pistol', 'buy'));
    upgradePistolDamageBtn.addEventListener('click', () => handleGunAction('Pistol', 'upgradeDamage'));

    buyM4Btn.addEventListener('click', () => handleGunAction('M4', 'buy'));
    upgradeM4DamageBtn.addEventListener('click', () => handleGunAction('M4', 'upgradeDamage'));

    buyMac11Btn.addEventListener('click', () => handleGunAction('Mac11', 'buy'));
    upgradeMac11DamageBtn.addEventListener('click', () => handleGunAction('Mac11', 'upgradeDamage'));


    startGameButton.addEventListener('click', startGame);
    restartGameButton.addEventListener('click', initGame);

    // Inventory Panel Click Listener (for equipping by clicking)
    inventoryPanel.addEventListener('click', (e) => {
        const itemDiv = e.target.closest('.inventory-item');
        if (itemDiv) {
            const gunName = itemDiv.dataset.gunName;
            player.equipGun(gunName);
        }
    });

    // Dev Console Logic
    devConsoleInput.addEventListener('input', () => {
        if (devConsoleInput.value.toLowerCase() === 'dev&') {
            devOptions.style.display = 'flex';
        } else {
            devOptions.style.display = 'none';
        }
    });

    devOptions.addEventListener('click', (e) => {
        const cheatType = e.target.dataset.cheat;
        if (cheatType) {
            switch (cheatType) {
                case 'maxAmmo':
                    infiniteAmmo = !infiniteAmmo;
                    e.target.textContent = infiniteAmmo ? 'Infinite Ammo ON' : 'Max Ammo/Inf';
                    if (infiniteAmmo && player.equippedGun) player.equippedGun.ammo = player.equippedGun.magazineSize;
                    break;
                case 'maxHealth':
                    infiniteHealth = !infiniteHealth;
                    e.target.textContent = infiniteHealth ? 'Infinite Health ON' : 'Max Health/Inf';
                    if (infiniteHealth) player.health = player.maxHealth;
                    break;
                case 'maxDamage':
                    // Sets current equipped gun's damage to max
                    if (player.equippedGun) {
                        player.equippedGun.damage = 9999;
                        player.gunsOwned[player.equippedGun.name].currentDamage = 9999; // Store high damage
                        showShopMessage('Max Damage Activated!', 'cyan');
                    }
                    break;
                case 'oneDollar':
                    oneDollarEverything = !oneDollarEverything;
                    e.target.textContent = oneDollarEverything ? '1$ Everything ON' : '1$ Everything';
                    showShopMessage(oneDollarEverything ? 'Shop prices are $1!' : 'Shop prices are normal.', 'cyan');
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
