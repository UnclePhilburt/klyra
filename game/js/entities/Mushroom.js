// Mushroom Enemy Entity
class Mushroom {
    constructor(scene, data) {
        this.scene = scene;
        this.data = data;
        this.health = data.health;
        this.maxHealth = data.maxHealth;
        this.isAlive = data.isAlive !== false;
        this.damage = data.damage || 5;
        this.isAttacking = false; // Track if currently playing attack animation
        this.lastAttackTime = 0; // Track when last attack started

        if (!this.isAlive) {
            console.warn(`⚠️ Mushroom ${data.id} created with isAlive: false`);
        }

        this.createSprite();
    }

    createSprite() {
        const tileSize = GameConfig.GAME.TILE_SIZE;
        const x = this.data.position.x * tileSize + tileSize / 2;
        const y = this.data.position.y * tileSize + tileSize / 2;

        // Get variant data from server
        const variant = this.data.variant || 'normal';

        // Mushrooms are 80x64 pixels - scale to about 2 tiles tall (64px)
        // 64px sprite → 64px = scale 1.0
        const scale = 1.0;

        // Create mushroom sprite
        this.sprite = this.scene.add.sprite(x, y, 'mushroom-idle', 0);
        this.sprite.setOrigin(0.5);
        this.sprite.setScale(scale);
        this.sprite.setDepth(2);

        // Add physics
        this.scene.physics.add.existing(this.sprite);

        if (!this.sprite.body) {
            console.error(`❌ Mushroom ${this.data.id}: Physics body failed to create!`);
            return;
        }

        // Set hitbox (2 tiles = 64px)
        const hitboxSize = 64;
        this.sprite.body.setSize(hitboxSize, hitboxSize);
        this.sprite.body.setCollideWorldBounds(false);
        this.sprite.body.setImmovable(true); // Don't respond to physics collisions
        // Note: body.moves = true (default) allows velocity-based movement

        // Store reference for collision detection (use 'enemyEntity' for compatibility)
        this.sprite.enemyEntity = this;
        this.sprite.mushroomEntity = this;

        // Prevent camera culling
        this.sprite.setScrollFactor(1, 1);

        // Play idle animation (check if it exists first)
        if (this.scene.anims.exists('mushroom_idle')) {
            this.sprite.play('mushroom_idle');
        } else {
            console.warn('⚠️ Animation mushroom_idle does not exist yet');
        }

        // Track movement
        this.lastX = x;

        // Initialize target position to current position (prevent undefined)
        this.targetX = x;
        this.targetY = y;

        // Store variant
        this.variant = variant;
        this.scale = scale;

        // Add boss crown for boss variants
        if (variant === 'boss') {
            // Crown position above mushroom
            this.crownText = this.scene.add.text(x, y - 40, '👑', {
                font: '20px Arial',
                fill: '#FFD700'
            });
            this.crownText.setOrigin(0.5);
            this.crownText.setDepth(3);
            this.crownText.setScrollFactor(1, 1);
        }
    }

    attack() {
        // Prevent attack spam - enforce minimum cooldown (833ms to match animation)
        const now = Date.now();
        if (this.isAttacking || now - this.lastAttackTime < 833) {
            return; // Still attacking or on cooldown
        }

        console.log(`⚔️ Mushroom attack() called`);
        // Play attack animation
        if (this.sprite && this.sprite.anims && this.isAlive) {
            console.log(`   Checking animation exists...`);
            if (this.scene.anims.exists('mushroom_attack')) {
                console.log(`   ✅ Playing mushroom_attack`);
                this.isAttacking = true;
                this.lastAttackTime = now;
                this.sprite.play('mushroom_attack');
            } else {
                console.warn(`   ❌ mushroom_attack animation does NOT exist`);
            }
            // Return to previous animation after attack (10 frames at 12fps = ~833ms)
            this.scene.time.delayedCall(833, () => {
                this.isAttacking = false;
                if (this.sprite && this.sprite.active && this.isAlive) {
                    const wasMoving = this.currentState === 'running';
                    const animKey = wasMoving ? 'mushroom_run' : 'mushroom_idle';
                    if (this.scene.anims.exists(animKey)) {
                        this.sprite.play(animKey);
                    }
                }
            });
        } else {
            console.warn(`   ❌ Cannot attack - sprite:${!!this.sprite}, anims:${!!(this.sprite?.anims)}, alive:${this.isAlive}`);
        }
    }

    takeDamage(amount) {
        this.health -= amount;
        if (this.health <= 0) {
            this.health = 0;
        }

        // Blood splatter effect
        this.showBloodEffect();

        // Play damage animation
        if (this.sprite && this.sprite.anims && this.health > 0) {
            if (this.scene.anims.exists('mushroom_damage')) {
                this.sprite.play('mushroom_damage');
            }
            // Return to previous animation after damage (5 frames at 12fps = ~417ms)
            this.scene.time.delayedCall(417, () => {
                if (this.sprite && this.sprite.active && this.health > 0) {
                    const wasMoving = this.currentState === 'running';
                    const animKey = wasMoving ? 'mushroom_run' : 'mushroom_idle';
                    if (this.scene.anims.exists(animKey)) {
                        this.sprite.play(animKey);
                    }
                }
            });
        }

        // Damage flash
        this.sprite.setTint(0xffffff);
        this.scene.time.delayedCall(100, () => {
            if (this.sprite) this.sprite.clearTint();
        });
    }

    showBloodEffect() {

        // ANIMATED SPORE EXPLOSIONS - brown blood splatters for mushrooms!
        const splashCount = 10; // Lots of spore splashes

        for (let i = 0; i < splashCount; i++) {
            const angle = (Math.PI * 2 * i) / splashCount + (Math.random() - 0.5) * 0.8;
            const speed = 55 + Math.random() * 70;

            // Pick random blood splash animation
            const splashAnims = ['blood_splash_1_anim', 'blood_splash_2_anim', 'blood_splash_3_anim'];
            const randomAnim = splashAnims[Math.floor(Math.random() * splashAnims.length)];

            const splash = this.scene.add.sprite(
                this.sprite.x,
                this.sprite.y,
                'blood_splash_1'
            );
            splash.setDepth(9999);
            splash.setScale(0.7 + Math.random() * 0.9); // Size 0.7-1.6x
            splash.setRotation(Math.random() * Math.PI * 2);
            splash.setAlpha(0.85);

            // Tint brown for spores!
            const brownTints = [0x8b4513, 0xa0522d, 0xd2691e, 0x6b4423];
            splash.setTint(brownTints[Math.floor(Math.random() * brownTints.length)]);

            // Play animation
            splash.play(randomAnim);

            // Animate outward
            this.scene.tweens.add({
                targets: splash,
                x: this.sprite.x + Math.cos(angle) * speed,
                y: this.sprite.y + Math.sin(angle) * speed,
                alpha: 0,
                duration: 450 + Math.random() * 350,
                ease: 'Cubic.easeOut',
                onComplete: () => splash.destroy()
            });
        }

        // Add more spore splash variety
        for (let i = 0; i < 6; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 35 + Math.random() * 50;

            const splashAnims = ['blood_splash_1_anim', 'blood_splash_2_anim', 'blood_splash_3_anim'];
            const randomAnim = splashAnims[Math.floor(Math.random() * splashAnims.length)];

            const splash = this.scene.add.sprite(
                this.sprite.x,
                this.sprite.y,
                'blood_splash_1'
            );
            splash.setDepth(9999);
            splash.setScale(0.4 + Math.random() * 0.7);
            splash.setRotation(Math.random() * Math.PI * 2);
            splash.setAlpha(0.8);

            const brownTints = [0x8b4513, 0xa0522d, 0xd2691e, 0x6b4423];
            splash.setTint(brownTints[Math.floor(Math.random() * brownTints.length)]);
            splash.play(randomAnim);

            this.scene.tweens.add({
                targets: splash,
                x: this.sprite.x + Math.cos(angle) * speed,
                y: this.sprite.y + Math.sin(angle) * speed,
                alpha: 0,
                duration: 400 + Math.random() * 300,
                ease: 'Cubic.easeOut',
                onComplete: () => splash.destroy()
            });
        }

        // GROUND SPORE POOLS
        const puddleCount = 8 + Math.floor(Math.random() * 5);
        for (let i = 0; i < puddleCount; i++) {
            const offsetX = (Math.random() - 0.5) * 40;
            const offsetY = (Math.random() - 0.5) * 40;

            const splashSprites = ['blood_splash_1', 'blood_splash_2', 'blood_splash_3'];
            const randomSprite = splashSprites[Math.floor(Math.random() * splashSprites.length)];
            const randomFrame = Math.floor(Math.random() * 12);

            const puddle = this.scene.add.sprite(
                this.sprite.x + offsetX,
                this.sprite.y + offsetY,
                randomSprite,
                randomFrame + 4
            );
            puddle.setDepth(1);
            puddle.setAlpha(0);
            puddle.setScale(0.6 + Math.random() * 0.8);
            puddle.setRotation(Math.random() * Math.PI * 2);

            // Tint brown for spores
            const puddleTints = [0x8b7355, 0xa0826d, 0x6b5d4f, 0x9a8478];
            puddle.setTint(puddleTints[Math.floor(Math.random() * puddleTints.length)]);

            this.scene.tweens.add({
                targets: puddle,
                alpha: 0.7,
                duration: 200,
                ease: 'Cubic.easeOut'
            });

            this.scene.tweens.add({
                targets: puddle,
                alpha: 0,
                duration: 3000 + Math.random() * 2000,
                delay: 800,
                ease: 'Linear',
                onComplete: () => puddle.destroy()
            });
        }
    }

    die() {
        this.isAlive = false;

        // Blood splatter effect on death
        this.showBloodEffect();

        // Play death sound (40% chance)
        if (Math.random() < 0.4 && this.scene.sound) {
            const deathSounds = [
                'death_bone_snap', 'death_crunch', 'death_crunch_quick',
                'death_crunch_splat', 'death_crunch_splat_2', 'death_kick',
                'death_punch', 'death_punch_2', 'death_punch_3', 'death_slap',
                'death_splat_double', 'death_squelch_1', 'death_squelch_2',
                'death_squelch_3', 'death_squelch_4'
            ];
            const randomSound = deathSounds[Math.floor(Math.random() * deathSounds.length)];
            this.scene.sound.play(randomSound, { volume: 0.15 });
        }

        // Play death animation
        if (this.sprite && this.sprite.anims && this.scene.anims.exists('mushroom_death')) {
            this.sprite.play('mushroom_death');
        }

        // Death particles (brown spores for mushroom)
        const particleColor = 0x8b4513; // Saddle brown
        const particleCount = this.variant === 'boss' ? 25 : 15;

        for (let i = 0; i < particleCount; i++) {
            const angle = (Math.PI * 2 * i) / particleCount;
            const distance = this.variant === 'boss' ? 70 : 50;
            const particle = this.scene.add.circle(
                this.sprite.x,
                this.sprite.y,
                this.variant === 'boss' ? 4 : 2,
                particleColor
            );

            this.scene.tweens.add({
                targets: particle,
                x: this.sprite.x + Math.cos(angle) * distance,
                y: this.sprite.y + Math.sin(angle) * distance,
                alpha: 0,
                duration: this.variant === 'boss' ? 700 : 400,
                onComplete: () => particle.destroy()
            });
        }

        // Fade out after death animation (15 frames at 10fps = 1500ms)
        const deathAnimDuration = 1500;
        const targets = [this.sprite];
        if (this.crownText) targets.push(this.crownText);

        this.scene.tweens.add({
            targets: targets,
            alpha: 0,
            duration: 300,
            delay: deathAnimDuration,
            onComplete: () => {
                if (this.sprite) this.sprite.destroy();
                if (this.crownText) this.crownText.destroy();
            }
        });
    }

    setTargetPosition(x, y) {
        if (!this.sprite) return;

        // DEBUG: Log when target is set
        if (Math.random() < 0.05) {
            console.log(`🎯 Mushroom setTargetPosition: (${x}, ${y})`);
        }

        this.targetX = x;
        this.targetY = y;
    }

    update() {
        if (!this.sprite || !this.sprite.active || !this.isAlive) return;

        // Check if stunned - don't move if stunned
        if (this.isStunned && Date.now() < this.stunnedUntil) {
            // Stop physics velocity
            if (this.sprite.body) {
                this.sprite.body.setVelocity(0, 0);
            }
            return; // Skip movement while stunned
        }

        // Clear stun flag if expired
        if (this.isStunned && Date.now() >= this.stunnedUntil) {
            this.isStunned = false;
            this.stunnedUntil = 0;
        }

        // Smooth movement using Phaser physics (same as Minions)
        if (this.targetX !== undefined && this.targetY !== undefined) {
            const dx = this.targetX - this.sprite.x;
            const dy = this.targetY - this.sprite.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            // Use larger threshold to avoid jittering
            if (dist > 3) {
                // Use Phaser's physics for smooth movement
                const speed = 200; // pixels per second
                const angle = Math.atan2(dy, dx);

                this.sprite.body.setVelocity(
                    Math.cos(angle) * speed,
                    Math.sin(angle) * speed
                );
            } else {
                // Close enough, stop movement
                this.sprite.body.setVelocity(0, 0);
            }

            // Animation state - only run if moving significantly
            const shouldRun = dist > 3;

            // Only change animation if state actually changed (and not attacking!)
            if (!this.isAttacking) {
                if (shouldRun && this.currentState !== 'running') {
                    this.currentState = 'running';
                    if (this.scene.anims.exists('mushroom_run')) {
                        this.sprite.play('mushroom_run', true);
                    }
                } else if (!shouldRun && this.currentState !== 'idle') {
                    this.currentState = 'idle';
                    if (this.scene.anims.exists('mushroom_idle')) {
                        this.sprite.play('mushroom_idle', true);
                    }
                }
            }

            // Flip sprite based on movement direction (inverted because sprite faces wrong way)
            if (Math.abs(dx) > 0.5) {
                this.sprite.setFlipX(dx > 0);
            }
        }

        // Update crown for boss variants
        if (this.crownText && this.crownText.active) {
            this.crownText.setPosition(this.sprite.x, this.sprite.y - 40);
        }
    }

    destroy() {
        if (this.sprite) {
            this.sprite.destroy();
            this.sprite = null;
        }
        if (this.crownText) {
            this.crownText.destroy();
            this.crownText = null;
        }
        this.isAlive = false;
    }
}
