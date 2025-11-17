// Enemy Entity
class Enemy {
    constructor(scene, data) {
        this.scene = scene;
        this.data = data;
        this.health = data.health;
        this.maxHealth = data.maxHealth;
        this.isAlive = data.isAlive;
        this.isAttacking = false; // Track if currently playing attack animation
        this.lastAttackTime = 0; // Track when last attack started

        this.createSprite();
    }

    createSprite() {
        const tileSize = GameConfig.GAME.TILE_SIZE;
        const x = this.data.position.x * tileSize + tileSize / 2;
        const y = this.data.position.y * tileSize + tileSize / 2;

        // Create sprite (skullwolf)
        this.sprite = this.scene.add.sprite(x, y, 'skullwolf', 0);
        this.sprite.setOrigin(0.5);
        this.sprite.setScale(1.0); // 64x64 at 1:1 scale
        this.sprite.setDepth(2); // Above walkways (depth 1) but with walls (depth 2)
        this.scene.physics.add.existing(this.sprite);
        this.sprite.body.setSize(32, 32);

        // Prevent camera culling from making enemies flicker/disappear
        this.sprite.setScrollFactor(1, 1); // Follow camera normally

        // Play idle animation
        this.sprite.play('skullwolf_idle');

        // Track last position for movement detection
        this.lastX = x;

        // PERFORMANCE: Removed glow circle (saves 1 object per enemy)
        // PERFORMANCE: Removed name label (saves 1 object per enemy)

        // Health bar - only shown when damaged
        this.healthBarBg = this.scene.add.rectangle(x, y - 32, 30, 3, 0x000000);
        this.healthBarBg.setDepth(2);
        this.healthBarBg.setScrollFactor(1, 1);
        this.healthBarBg.setVisible(false); // Hidden by default

        this.healthBar = this.scene.add.rectangle(x, y - 32, 30, 3, 0xff0000);
        this.healthBar.setDepth(2);
        this.healthBar.setScrollFactor(1, 1);
        this.healthBar.setVisible(false); // Hidden by default

        this.updateHealthBar();
    }

    attack() {
        // Prevent attack spam - enforce minimum cooldown (500ms)
        const now = Date.now();
        if (this.isAttacking || now - this.lastAttackTime < 500) {
            return; // Still attacking or on cooldown
        }

        // Play attack animation if available
        if (this.sprite && this.sprite.anims && this.isAlive) {
            if (this.scene.anims.exists('skullwolf_attack')) {
                this.isAttacking = true;
                this.lastAttackTime = now;
                this.sprite.play('skullwolf_attack');

                // Return to walk/idle after attack completes
                this.scene.time.delayedCall(500, () => {
                    this.isAttacking = false;
                    if (this.sprite && this.sprite.active && this.isAlive) {
                        const isMoving = Math.abs(this.sprite.x - this.lastX) > 0.5;
                        const animKey = isMoving ? 'skullwolf_walk' : 'skullwolf_idle';
                        if (this.scene.anims.exists(animKey)) {
                            this.sprite.play(animKey, true);
                        }
                    }
                });
            }
        }
    }

    takeDamage(amount) {
        this.health -= amount;
        if (this.health <= 0) {
            this.health = 0;
        }

        // Damage flash
        this.sprite.setTint(0xffffff);
        this.scene.time.delayedCall(100, () => {
            this.sprite.clearTint();
        });

        // Blood splatter effect
        this.showBloodEffect();

        // PERFORMANCE: Removed damage numbers (saves text objects + tweens)

        // Show health bar when damaged
        this.healthBar.setVisible(true);
        this.healthBarBg.setVisible(true);
        this.updateHealthBar();
    }

    showBloodEffect() {
        // Spawn blood splash sprites (flying blood particles)
        const splashCount = 3 + Math.floor(Math.random() * 3); // 3-5 blood splashes
        for (let i = 0; i < splashCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = 20 + Math.random() * 30;

            // Random blood splash sprite (1, 2, or 3)
            const splashType = Math.floor(Math.random() * 3) + 1;
            const bloodSplash = this.scene.add.sprite(
                this.sprite.x,
                this.sprite.y,
                `blood_splash_${splashType}`
            );
            bloodSplash.setDepth(9999);
            bloodSplash.setScale(0.5 + Math.random() * 0.5);
            bloodSplash.play(`blood_splash_${splashType}_anim`);

            // Animate splash outward then fade
            this.scene.tweens.add({
                targets: bloodSplash,
                x: this.sprite.x + Math.cos(angle) * distance,
                y: this.sprite.y + Math.sin(angle) * distance,
                alpha: 0,
                duration: 400 + Math.random() * 200,
                ease: 'Cubic.easeOut',
                onComplete: () => bloodSplash.destroy()
            });
        }

        // Create permanent blood puddles on the ground using blood splash sprites
        const puddleCount = 2 + Math.floor(Math.random() * 3); // 2-4 permanent puddles
        for (let i = 0; i < puddleCount; i++) {
            const offsetX = (Math.random() - 0.5) * 40;
            const offsetY = (Math.random() - 0.5) * 40;

            // Random blood splash type for variety
            const splashType = Math.floor(Math.random() * 3) + 1;
            const puddle = this.scene.add.sprite(
                this.sprite.x + offsetX,
                this.sprite.y + offsetY,
                `blood_splash_${splashType}`
            );

            // Set to last frame (fully splattered look)
            const frameCount = splashType === 1 ? 16 : (splashType === 2 ? 15 : 12);
            puddle.setFrame(frameCount - 1);

            puddle.setDepth(1); // Below enemies but above ground
            puddle.setAlpha(0.8);
            puddle.setScale(0.6 + Math.random() * 0.4);
            puddle.setRotation(Math.random() * Math.PI * 2); // Random rotation for variety

            // PERMANENT - no destroy, blood stays forever!
            // Optional: very slow fade over long time
            this.scene.tweens.add({
                targets: puddle,
                alpha: 0.4,
                duration: 60000, // Fade to 40% over 1 minute
                ease: 'Linear'
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

        // Death animation - explosion effect - BIGGER EXPLOSION
        const particles = [];
        for (let i = 0; i < 20; i++) { // Increased from 8
            const angle = (Math.PI * 2 * i) / 20 + (Math.random() - 0.5) * 0.3;
            const particle = this.scene.add.circle(
                this.sprite.x,
                this.sprite.y,
                4 + Math.random() * 4, // Bigger particles
                0x8b0000 // Dark red blood
            );

            particles.push(particle);

            this.scene.tweens.add({
                targets: particle,
                x: this.sprite.x + Math.cos(angle) * (60 + Math.random() * 40),
                y: this.sprite.y + Math.sin(angle) * (60 + Math.random() * 40),
                alpha: 0,
                duration: 600 + Math.random() * 400,
                ease: 'Cubic.easeOut',
                onComplete: () => particle.destroy()
            });
        }

        // Fade out main sprite
        this.scene.tweens.add({
            targets: [this.sprite, this.healthBar, this.healthBarBg],
            alpha: 0,
            duration: 300,
            onComplete: () => {
                this.sprite.destroy();
                this.healthBar.destroy();
                this.healthBarBg.destroy();
            }
        });
    }

    updateHealthBar() {
        const healthPercent = this.health / this.maxHealth;
        this.healthBar.width = 30 * healthPercent;

        const color = healthPercent > 0.5 ? 0x00ff00 : healthPercent > 0.25 ? 0xffff00 : 0xff0000;
        this.healthBar.setFillStyle(color);
    }

    setTargetPosition(x, y) {
        this.targetPosition = { x, y };
    }

    updateInterpolation() {
        if (!this.targetPosition) return;

        // Check if stunned - don't move if stunned
        if (this.isStunned && Date.now() < this.stunnedUntil) {
            return; // Skip movement while stunned
        }

        // Clear stun flag if expired
        if (this.isStunned && Date.now() >= this.stunnedUntil) {
            this.isStunned = false;
            this.stunnedUntil = 0;
        }

        const lerpSpeed = 0.3; // Smooth interpolation (increased from 0.2 for better sync)
        const dx = this.targetPosition.x - this.sprite.x;
        const dy = this.targetPosition.y - this.sprite.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // If very close, snap to target
        if (distance < 2) {
            this.sprite.x = this.targetPosition.x;
            this.sprite.y = this.targetPosition.y;
            this.targetPosition = null;
        } else {
            // Smooth interpolation
            this.sprite.x += dx * lerpSpeed;
            this.sprite.y += dy * lerpSpeed;
        }
    }

    update() {
        // Interpolate to target position
        this.updateInterpolation();

        // Update positions of UI elements
        if (this.sprite && this.sprite.active) {
            // Track movement and update animation (but don't interrupt attacks!)
            if (!this.isAttacking) {
                const isMoving = Math.abs(this.sprite.x - this.lastX) > 0.5;

                if (isMoving) {
                    // Play walk animation when moving (ignoreIfPlaying prevents restart flicker)
                    if (this.sprite.anims.currentAnim?.key !== 'skullwolf_walk') {
                        this.sprite.play('skullwolf_walk', true); // true = ignoreIfPlaying
                    }

                    // Flip sprite based on direction (defaults to left, flip when moving right)
                    const movingRight = this.sprite.x > this.lastX;
                    this.sprite.setFlipX(movingRight);
                } else {
                    // Play idle animation when not moving (ignoreIfPlaying prevents restart flicker)
                    if (this.sprite.anims.currentAnim?.key !== 'skullwolf_idle') {
                        this.sprite.play('skullwolf_idle', true); // true = ignoreIfPlaying
                    }
                }
            }

            this.lastX = this.sprite.x;

            // Update health bar positions (only if visible)
            if (this.healthBarBg && this.healthBarBg.active && this.healthBarBg.visible) {
                this.healthBarBg.setPosition(this.sprite.x, this.sprite.y - 32);
            }
            if (this.healthBar && this.healthBar.active && this.healthBar.visible) {
                this.healthBar.setPosition(this.sprite.x - 15 + (30 * (this.health / this.maxHealth) / 2), this.sprite.y - 32);
            }
        }
    }
}
