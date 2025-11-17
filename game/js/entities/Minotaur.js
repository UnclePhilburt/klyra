// Minotaur Enemy Entity
class Minotaur {
    constructor(scene, data) {
        this.scene = scene;
        this.data = data;
        this.health = data.health;
        this.maxHealth = data.maxHealth;
        this.isAlive = data.isAlive !== false;
        this.damage = data.damage || 12;
        this.isAttacking = false; // Track if currently playing attack animation
        this.lastAttackTime = 0; // Track when last attack started

        if (!this.isAlive) {
            console.warn(`⚠️ Minotaur ${data.id} created with isAlive: false`);
        }

        this.createSprite();
    }

    createSprite() {
        const tileSize = GameConfig.GAME.TILE_SIZE;
        const x = this.data.position.x * tileSize + tileSize / 2;
        const y = this.data.position.y * tileSize + tileSize / 2;

        // Get variant data from server
        const variant = this.data.variant || 'normal';

        // Minotaur sprite is 96px (3 tiles)
        // Keep at 1:1 scale for 96px size
        const scale = 1.0;

        // Create minotaur sprite
        this.sprite = this.scene.add.sprite(x, y, 'minotaur', 0);
        this.sprite.setOrigin(0.5);
        this.sprite.setScale(scale);
        this.sprite.setDepth(2);

        // Add physics
        this.scene.physics.add.existing(this.sprite);

        if (!this.sprite.body) {
            console.error(`❌ Minotaur ${this.data.id}: Physics body failed to create!`);
            return;
        }

        // Set hitbox (3 tiles = 96px)
        const hitboxSize = 96;
        this.sprite.body.setSize(hitboxSize, hitboxSize);
        this.sprite.body.setCollideWorldBounds(false);

        // Store reference for collision detection
        this.sprite.enemyEntity = this;
        this.sprite.wolfEntity = this; // Legacy compatibility

        // Prevent camera culling
        this.sprite.setScrollFactor(1, 1);

        // Play idle animation
        if (this.scene.anims.exists('minotaur_idle')) {
            this.sprite.play('minotaur_idle');
        } else {
            console.warn('⚠️ Animation minotaur_idle does not exist yet');
        }

        // Track movement
        this.lastX = x;

        // Store variant
        this.variant = variant;
        this.scale = scale;

        // Add boss crown for boss variants
        if (variant === 'boss') {
            this.crownText = this.scene.add.text(x, y - 60, '👑', {
                font: '24px Arial',
                fill: '#FFD700'
            });
            this.crownText.setOrigin(0.5);
            this.crownText.setDepth(3);
            this.crownText.setScrollFactor(1, 1);
        }
    }

    attack() {
        // Prevent attack spam - enforce minimum cooldown (750ms to match animation)
        const now = Date.now();
        if (this.isAttacking || now - this.lastAttackTime < 750) {
            return; // Still attacking or on cooldown
        }

        console.log(`⚔️ Minotaur attack() called`);
        // Play attack animation
        if (this.sprite && this.sprite.anims && this.isAlive) {
            if (this.scene.anims.exists('minotaur_attack')) {
                console.log(`   ✅ Playing minotaur_attack`);
                this.isAttacking = true;
                this.lastAttackTime = now;
                this.sprite.play('minotaur_attack');
            } else {
                console.warn(`   ❌ minotaur_attack animation does NOT exist`);
            }
            // Return to previous animation after attack (9 frames at 12fps = 750ms)
            this.scene.time.delayedCall(750, () => {
                this.isAttacking = false;
                if (this.sprite && this.sprite.active && this.isAlive) {
                    const wasMoving = this.currentState === 'running';
                    const animKey = wasMoving ? 'minotaur_run' : 'minotaur_idle';
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
            if (this.scene.anims.exists('minotaur_damage')) {
                this.sprite.play('minotaur_damage');
            }
            // Return to previous animation after damage (3 frames at 12fps = 250ms)
            this.scene.time.delayedCall(250, () => {
                if (this.sprite && this.sprite.active && this.health > 0) {
                    const wasMoving = this.currentState === 'running';
                    const animKey = wasMoving ? 'minotaur_run' : 'minotaur_idle';
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
        if (this.sprite && this.sprite.anims && this.scene.anims.exists('minotaur_death')) {
            this.sprite.play('minotaur_death');
        }

        // Death particles - MUCH BLOODIER
        const particleColor = 0x8b0000; // Dark blood red instead of brown
        const particleCount = this.variant === 'boss' ? 30 : 20; // Increased from 16/12

        for (let i = 0; i < particleCount; i++) {
            const angle = (Math.PI * 2 * i) / particleCount;
            const distance = this.variant === 'boss' ? 120 : 80;
            const particle = this.scene.add.circle(
                this.sprite.x,
                this.sprite.y,
                this.variant === 'boss' ? 5 : 4,
                particleColor
            );

            this.scene.tweens.add({
                targets: particle,
                x: this.sprite.x + Math.cos(angle) * distance,
                y: this.sprite.y + Math.sin(angle) * distance,
                alpha: 0,
                duration: this.variant === 'boss' ? 800 : 600,
                onComplete: () => particle.destroy()
            });
        }

        // Fade out after death animation (6 frames at 10fps = 600ms)
        const deathAnimDuration = 600;
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

            // Animation state - only run if moving significantly
            const shouldRun = dist > 3;

            // Only change animation if state actually changed (and not attacking!)
            if (!this.isAttacking) {
                if (shouldRun && this.currentState !== 'running') {
                    this.currentState = 'running';
                    if (this.scene.anims.exists('minotaur_run')) {
                        this.sprite.play('minotaur_run', true);
                    }
                } else if (!shouldRun && this.currentState !== 'idle') {
                    this.currentState = 'idle';
                    if (this.scene.anims.exists('minotaur_idle')) {
                        this.sprite.play('minotaur_idle', true);
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
            this.crownText.setPosition(this.sprite.x, this.sprite.y - 60);
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
