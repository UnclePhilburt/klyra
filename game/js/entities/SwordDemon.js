// Sword Demon Enemy Entity
class SwordDemon {
    constructor(scene, data) {
        this.scene = scene;
        this.data = data;
        this.health = data.health;
        this.maxHealth = data.maxHealth;
        this.isAlive = data.isAlive !== false;
        this.damage = data.damage || 8;
        this.isAttacking = false; // Track if currently playing attack animation
        this.lastAttackTime = 0; // Track when last attack started

        if (!this.isAlive) {
            console.warn(`⚠️ SwordDemon ${data.id} created with isAlive: false`);
        }

        this.createSprite();
    }

    createSprite() {
        const tileSize = GameConfig.GAME.TILE_SIZE;
        const x = this.data.position.x * tileSize + tileSize / 2;
        const y = this.data.position.y * tileSize + tileSize / 2;

        // Get variant data from server
        const glowColor = this.data.glowColor || 0xff0000;
        const variant = this.data.variant || 'normal';

        // All sword demons are same size: 124px tall (3.875 tiles)
        // 64px sprite → 124px = scale 1.9375
        const scale = 1.9375;

        // Create sword demon sprite
        this.sprite = this.scene.add.sprite(x, y, 'sworddemon', 0);
        this.sprite.setOrigin(0.5);
        this.sprite.setScale(scale);
        this.sprite.setDepth(2);

        // Add physics
        this.scene.physics.add.existing(this.sprite);

        if (!this.sprite.body) {
            console.error(`❌ SwordDemon ${this.data.id}: Physics body failed to create!`);
            return;
        }

        // Set hitbox (fixed at 3 tiles = 96px)
        const hitboxSize = 96;
        this.sprite.body.setSize(hitboxSize, hitboxSize);
        this.sprite.body.setCollideWorldBounds(false);

        // Store reference for collision detection (use 'enemyEntity' for compatibility)
        this.sprite.enemyEntity = this;
        this.sprite.wolfEntity = this; // Legacy compatibility

        // Prevent camera culling
        this.sprite.setScrollFactor(1, 1);

        // Play idle animation (check if it exists first)
        if (this.scene.anims.exists('sworddemon_idle')) {
            this.sprite.play('sworddemon_idle');
        } else {
            console.warn('⚠️ Animation sworddemon_idle does not exist yet');
        }

        // Track movement
        this.lastX = x;

        // Store variant
        this.variant = variant;
        this.scale = scale;

        // Add boss crown for boss variants
        if (variant === 'boss') {
            // Fixed crown position (124px tall, crown above)
            this.crownText = this.scene.add.text(x, y - 70, '👑', {
                font: '20px Arial',
                fill: '#FFD700'
            });
            this.crownText.setOrigin(0.5);
            this.crownText.setDepth(3);
            this.crownText.setScrollFactor(1, 1);
        }
    }

    attack() {
        // Prevent attack spam - enforce minimum cooldown (667ms to match animation)
        const now = Date.now();
        if (this.isAttacking || now - this.lastAttackTime < 667) {
            return; // Still attacking or on cooldown
        }

        console.log(`⚔️ SwordDemon attack() called`);
        // Play attack animation
        if (this.sprite && this.sprite.anims && this.isAlive) {
            console.log(`   Checking animation exists...`);
            if (this.scene.anims.exists('sworddemon_attack')) {
                console.log(`   ✅ Playing sworddemon_attack`);
                this.isAttacking = true;
                this.lastAttackTime = now;
                this.sprite.play('sworddemon_attack');
            } else {
                console.warn(`   ❌ sworddemon_attack animation does NOT exist`);
            }
            // Return to previous animation after attack (8 frames at 12fps = ~667ms)
            this.scene.time.delayedCall(667, () => {
                this.isAttacking = false;
                if (this.sprite && this.sprite.active && this.isAlive) {
                    const wasMoving = this.currentState === 'walking';
                    const animKey = wasMoving ? 'sworddemon_walk' : 'sworddemon_idle';
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
            if (this.scene.anims.exists('sworddemon_damage')) {
                this.sprite.play('sworddemon_damage');
            }
            // Return to previous animation after damage (2 frames at 12fps = ~167ms)
            this.scene.time.delayedCall(167, () => {
                if (this.sprite && this.sprite.active && this.health > 0) {
                    const wasMoving = this.currentState === 'walking';
                    const animKey = wasMoving ? 'sworddemon_walk' : 'sworddemon_idle';
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
        // Create dynamic blood particle effect - brighter and bigger
        const particleCount = 12;
        const particles = [];

        for (let i = 0; i < particleCount; i++) {
            const angle = (Math.PI * 2 * i) / particleCount + (Math.random() - 0.5) * 0.5;
            const speed = 30 + Math.random() * 40;
            const size = 4 + Math.random() * 5;

            const particle = this.scene.add.circle(
                this.sprite.x,
                this.sprite.y,
                size,
                0xff0000 // Bright red
            );
            particle.setDepth(9999);
            particles.push(particle);

            // Animate particle outward
            this.scene.tweens.add({
                targets: particle,
                x: this.sprite.x + Math.cos(angle) * speed,
                y: this.sprite.y + Math.sin(angle) * speed,
                alpha: 0,
                scale: 0.3,
                duration: 400 + Math.random() * 300,
                ease: 'Cubic.easeOut',
                onComplete: () => particle.destroy()
            });
        }

        // Add blood drip particles
        for (let i = 0; i < 5; i++) {
            const drip = this.scene.add.circle(
                this.sprite.x + (Math.random() - 0.5) * 20,
                this.sprite.y - 5,
                3,
                0xff0000 // Bright red
            );
            drip.setDepth(9999);

            this.scene.tweens.add({
                targets: drip,
                y: drip.y + 20 + Math.random() * 15,
                alpha: 0,
                duration: 500 + Math.random() * 300,
                ease: 'Sine.easeIn',
                onComplete: () => drip.destroy()
            });
        }

        // Create blood puddles on the ground
        const puddleCount = 3 + Math.floor(Math.random() * 3);
        for (let i = 0; i < puddleCount; i++) {
            const offsetX = (Math.random() - 0.5) * 30;
            const offsetY = (Math.random() - 0.5) * 30;
            const puddleSize = 5 + Math.random() * 8;

            const puddle = this.scene.add.circle(
                this.sprite.x + offsetX,
                this.sprite.y + offsetY,
                puddleSize,
                0xcc0000 // Dark red puddle
            );
            puddle.setDepth(1); // Below enemies but above ground
            puddle.setAlpha(0.7);

            // Fade out puddle after a few seconds
            this.scene.tweens.add({
                targets: puddle,
                alpha: 0,
                duration: 3000 + Math.random() * 2000,
                delay: 500,
                ease: 'Linear',
                onComplete: () => puddle.destroy()
            });
        }
    }

    die() {
        this.isAlive = false;

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
        if (this.sprite && this.sprite.anims && this.scene.anims.exists('sworddemon_death')) {
            this.sprite.play('sworddemon_death');
        }

        // Death particles (scaled for 124px size) - MUCH BLOODIER
        const particleColor = 0x8b0000; // Dark blood red
        const particleCount = this.variant === 'boss' ? 35 : 25; // Increased from 16/10

        for (let i = 0; i < particleCount; i++) {
            const angle = (Math.PI * 2 * i) / particleCount;
            const distance = this.variant === 'boss' ? 100 : 75;
            const particle = this.scene.add.circle(
                this.sprite.x,
                this.sprite.y,
                this.variant === 'boss' ? 5 : 3,
                particleColor
            );

            this.scene.tweens.add({
                targets: particle,
                x: this.sprite.x + Math.cos(angle) * distance,
                y: this.sprite.y + Math.sin(angle) * distance,
                alpha: 0,
                duration: this.variant === 'boss' ? 800 : 500,
                onComplete: () => particle.destroy()
            });
        }

        // Fade out after death animation (9 frames at 10fps = 900ms)
        const deathAnimDuration = 900;
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
        this.targetX = x;
        this.targetY = y;
    }

    update() {
        if (!this.sprite || !this.sprite.active) return;

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

        // Stop physics velocity
        if (this.sprite.body) {
            this.sprite.body.setVelocity(0, 0);
        }

        // Smooth movement towards target
        if (this.targetX !== undefined && this.targetY !== undefined) {
            const dx = this.targetX - this.sprite.x;
            const dy = this.targetY - this.sprite.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            // Faster lerp for smoother movement
            const lerpSpeed = 0.15;

            if (dist > 2) {
                this.sprite.x += dx * lerpSpeed;
                this.sprite.y += dy * lerpSpeed;
            } else {
                // Snap to target when close enough
                this.sprite.x = this.targetX;
                this.sprite.y = this.targetY;
            }

            // Animation state - only walk if moving significantly
            const shouldWalk = dist > 3;

            // Only change animation if state actually changed (and not attacking!)
            if (!this.isAttacking) {
                if (shouldWalk && this.currentState !== 'walking') {
                    this.currentState = 'walking';
                    if (this.scene.anims.exists('sworddemon_walk')) {
                        this.sprite.play('sworddemon_walk', true);
                    }
                } else if (!shouldWalk && this.currentState !== 'idle') {
                    this.currentState = 'idle';
                    if (this.scene.anims.exists('sworddemon_idle')) {
                        this.sprite.play('sworddemon_idle', true);
                    }
                }
            }

            // Flip sprite based on movement direction
            if (Math.abs(dx) > 0.5) {
                this.sprite.setFlipX(dx < 0);
            }
        }

        // Update crown for boss variants
        if (this.crownText && this.crownText.active) {
            this.crownText.setPosition(this.sprite.x, this.sprite.y - 70);
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
