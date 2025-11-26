// CHARACTER SELECT MANAGER
// Handles the character selection modal UI
// Works with ProgressionSystem for save/load
// Uses new modular character system from characters/index.js

class CharacterSelectManager {
    constructor() {
        this.modal = null;
        this.characterGrid = null;
        this.charactersBtn = null;
        this.closeBtn = null;
        this.progressionSystem = null;
        this.characters = null;

        // Settings modal
        this.settingsModal = null;
        this.settingsBtn = null;
        this.closeSettingsBtn = null;
        this.fullscreenToggle = null;
        this.musicVolume = null;
        this.volumeBar = null;

        // Bank data
        this.bankedSouls = 0;
        this.bankedSoulsDisplay = null;

        // Free character rotation
        this.freeCharacter = null;
        this.freeCharacterRotationTime = null;
        this.freeCharacterNameDisplay = null;
        this.rotationCountdownDisplay = null;
        this.countdownInterval = null;

        // Wait for page load
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }

    init() {
        // Load character definitions
        this.loadCharacterDefinitions();

        // Get DOM elements
        this.modal = document.getElementById('characterSelectModal');
        this.characterGrid = document.getElementById('characterGrid');
        this.charactersBtn = document.getElementById('charactersBtn');
        this.closeBtn = document.getElementById('closeCharacterSelect');
        this.bankedSoulsDisplay = document.getElementById('bankedSoulsCount');
        this.freeCharacterNameDisplay = document.getElementById('freeCharacterName');
        this.rotationCountdownDisplay = document.getElementById('rotationCountdown');

        // Settings elements
        this.settingsModal = document.getElementById('settingsModal');
        this.settingsBtn = document.getElementById('settingsBtn');
        this.closeSettingsBtn = document.getElementById('closeSettings');
        this.fullscreenToggle = document.getElementById('fullscreenToggle');
        this.musicVolume = document.getElementById('musicVolume');
        this.volumeBar = document.getElementById('volumeBar');

        if (!this.modal || !this.characterGrid || !this.charactersBtn) {
            console.warn('⚠️ Character select elements not found - modal disabled');
            return;
        }

        // Setup event listeners
        this.setupEventListeners();

        // Setup socket listeners for bank data
        this.setupSocketListeners();
    }

    loadCharacterDefinitions() {
        // Characters are loaded from characters/index.js which sets window.CharacterSystem.CHARACTERS
        if (window.CharacterSystem && window.CharacterSystem.CHARACTERS) {
            this.characters = window.CharacterSystem.CHARACTERS;
        } else {
            console.error('❌ Character definitions not found!');
            // Retry after a short delay in case modules are still loading
            setTimeout(() => this.loadCharacterDefinitions(), 100);
            this.characters = {};
        }
    }

    setProgressionSystem(progressionSystem) {
        this.progressionSystem = progressionSystem;
        this.updateSelectedCharacterDisplay();
    }

    setupEventListeners() {
        // Open modal
        this.charactersBtn.addEventListener('click', () => {
            this.openModal();
        });

        // Close modal
        this.closeBtn.addEventListener('click', () => {
            this.closeModal();
        });

        // Close on background click
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.closeModal();
            }
        });

        // Close on ESC key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modal.classList.contains('active')) {
                this.closeModal();
            }
            if (e.key === 'Escape' && this.settingsModal && this.settingsModal.classList.contains('active')) {
                this.closeSettingsModal();
            }
        });

        // Settings modal listeners
        if (this.settingsBtn && this.settingsModal) {
            this.settingsBtn.addEventListener('click', () => {
                this.openSettingsModal();
            });
        }

        if (this.closeSettingsBtn && this.settingsModal) {
            this.closeSettingsBtn.addEventListener('click', () => {
                this.closeSettingsModal();
            });
        }

        if (this.settingsModal) {
            this.settingsModal.addEventListener('click', (e) => {
                if (e.target === this.settingsModal) {
                    this.closeSettingsModal();
                }
            });
        }

        // Fullscreen toggle
        if (this.fullscreenToggle) {
            this.fullscreenToggle.addEventListener('click', () => {
                this.toggleFullscreen();
            });
            
            document.addEventListener('fullscreenchange', () => {
                this.updateFullscreenButton();
            });
        }

        // Music volume
        if (this.musicVolume && this.volumeBar) {
            // Create 10 bar segments
            this.createVolumeBarSegments();
            
            // Load saved volume
            const savedVolume = localStorage.getItem('menuMusicVolume');
            if (savedVolume) {
                this.musicVolume.value = savedVolume;
                this.updateVolumeBar(savedVolume);
            } else {
                this.updateVolumeBar(5); // Default 5%
            }
            
            // Use both 'input' and 'change' events for better compatibility
            const updateVolume = (e) => {
                const volume = e.target.value;
                console.log('🎵 Volume slider changed to:', volume);
                this.updateVolumeBar(volume);
                this.setMusicVolume(volume);
            };
            
            this.musicVolume.addEventListener('input', updateVolume);
            this.musicVolume.addEventListener('change', updateVolume);
        }
    }

    openModal() {
        this.modal.classList.add('active');
        this.renderCharacters();
        this.fetchBankData();
        console.log('🎮 Character select opened');
    }

    closeModal() {
        this.modal.classList.remove('active');
        console.log('🎮 Character select closed');
    }

    openSettingsModal() {
        if (this.settingsModal) {
            this.settingsModal.classList.add('active');
            this.updateFullscreenButton();
            // Update volume bar to match current slider value
            if (this.musicVolume) {
                this.updateVolumeBar(this.musicVolume.value);
            }
            console.log('⚙️ Settings opened');
        }
    }

    closeSettingsModal() {
        if (this.settingsModal) {
            this.settingsModal.classList.remove('active');
            console.log('⚙️ Settings closed');
        }
    }

    toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.error('Fullscreen error:', err);
            });
        } else {
            document.exitFullscreen();
        }
    }

    updateFullscreenButton() {
        if (!this.fullscreenToggle) return;
        
        if (document.fullscreenElement) {
            this.fullscreenToggle.textContent = 'EXIT FULLSCREEN';
            this.fullscreenToggle.classList.add('active');
        } else {
            this.fullscreenToggle.textContent = 'ENTER FULLSCREEN';
            this.fullscreenToggle.classList.remove('active');
        }
    }

    createVolumeBarSegments() {
        if (!this.volumeBar) return;
        
        // Create 10 segments for 8-bit style bar graph
        this.volumeBar.innerHTML = '';
        for (let i = 0; i < 10; i++) {
            const segment = document.createElement('div');
            segment.style.cssText = `
                width: 10px;
                height: 20px;
                background: #2C1B47;
                border: 2px solid #2C1B47;
                transition: background 0.1s ease;
            `;
            segment.dataset.index = i;
            this.volumeBar.appendChild(segment);
        }
    }

    updateVolumeBar(volume) {
        if (!this.volumeBar) return;

        const segments = this.volumeBar.children;
        const filledSegments = Math.floor(volume / 10); // 0-100 -> 0-10 segments

        for (let i = 0; i < segments.length; i++) {
            if (i < filledSegments) {
                // Filled segment - bright purple/pink
                segments[i].style.background = '#FC0FC0';
            } else {
                // Empty segment - dark
                segments[i].style.background = '#2C1B47';
            }
        }
    }

    setMusicVolume(volume) {
        // Save to localStorage
        localStorage.setItem('menuMusicVolume', volume);
        
        // Apply to music
        if (window.mainMenuInstance && window.mainMenuInstance.menuMusic) {
            window.mainMenuInstance.menuMusic.volume = volume / 100;
        }
        
        console.log('🎵 Music volume set to:', volume + '%');
    }

    renderCharacters() {
        if (!this.characterGrid) return;

        this.characterGrid.innerHTML = '';

        let selectedCharacterId = this.progressionSystem
            ? this.progressionSystem.getSelectedCharacter()
            : null;

        // If no character is selected, auto-select the free character
        if (!selectedCharacterId && this.freeCharacter) {
            selectedCharacterId = this.freeCharacter;
            console.log(`🎲 Auto-selected free character: ${this.freeCharacter}`);
        }

        console.log('🎨 Rendering characters, selected:', selectedCharacterId);
        console.log('📊 Available characters:', Object.keys(this.characters));
        console.log('📊 Character system loaded:', !!window.CharacterSystem);

        // Create character cards
        for (const charId in this.characters) {
            const char = this.characters[charId];
            const isUnlocked = this.progressionSystem
                ? this.progressionSystem.isCharacterUnlocked(charId)
                : true; // Default to unlocked if no progression system
            const isFree = charId === this.freeCharacter; // Check if this is the free character
            const isSelected = charId === selectedCharacterId;

            console.log(`  - ${charId}: locked=${!isUnlocked}, free=${isFree}, selected=${isSelected}, color=#${char.display.color.toString(16).padStart(6, '0')}, avatar=${char.display.avatar || 'none'}`);

            const card = this.createCharacterCard(char, isUnlocked, isSelected, isFree);
            this.characterGrid.appendChild(card);
        }

        console.log('✅ Character cards rendered');
    }

    createCharacterCard(char, isUnlocked, isSelected, isFree) {
        const card = document.createElement('div');
        card.className = 'character-card';
        card.style.position = 'relative'; // For absolute badge positioning

        if (isSelected) card.classList.add('selected');
        if (!isUnlocked && !isFree) card.classList.add('locked'); // Free characters are not locked even if not purchased

        console.log(`    🎴 Creating card for ${char.id}:`, {
            hasAvatar: !!char.display.avatar,
            avatarPath: char.display.avatar,
            color: `#${char.display.color.toString(16).padStart(6, '0')}`,
            isSelected,
            isUnlocked
        });

        // Character visual (with avatar if available)
        const visual = document.createElement('div');
        visual.className = 'character-visual';

        // Check if character has sprite sheet to extract frame from
        if (char.display.avatar && char.sprite) {
            // Create canvas to render specific sprite frame
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            // Set canvas size based on sprite config
            const frameWidth = char.sprite.frameWidth || 32;
            const frameHeight = char.sprite.frameHeight || 32;
            const scale = 4; // Scale up for visibility

            canvas.width = frameWidth * scale;
            canvas.height = frameHeight * scale;
            canvas.style.imageRendering = 'pixelated';

            // Load sprite sheet
            const img = new Image();
            img.src = char.display.avatar;

            // Animation state
            let currentFrame = 0;
            let animationFrames = [0]; // Default to single frame

            // Check if character has idle animation frames
            if (char.sprite.frames && char.sprite.frames.idle) {
                const idleFrames = char.sprite.frames.idle;
                if (idleFrames.start !== undefined && idleFrames.end !== undefined) {
                    // Generate array of frame numbers from start to end
                    animationFrames = [];
                    for (let i = idleFrames.start; i <= idleFrames.end; i++) {
                        animationFrames.push(i);
                    }
                }
            }

            img.onload = () => {
                ctx.imageSmoothingEnabled = false;

                // Animation loop
                const animate = () => {
                    // Calculate frame position in sprite sheet
                    const framesPerRow = Math.floor(img.width / frameWidth);
                    const frameIndex = animationFrames[currentFrame];
                    const frameX = (frameIndex % framesPerRow) * frameWidth;
                    const frameY = Math.floor(frameIndex / framesPerRow) * frameHeight;

                    // Draw current frame (no need to clear since we're drawing full frame)
                    ctx.drawImage(
                        img,
                        frameX, frameY, // Source x, y
                        frameWidth, frameHeight, // Source width, height
                        0, 0, // Dest x, y
                        frameWidth * scale, frameHeight * scale // Dest width, height (scaled)
                    );

                    // Move to next frame
                    currentFrame = (currentFrame + 1) % animationFrames.length;
                };

                // Initial draw
                animate();

                // Animate if more than one frame
                if (animationFrames.length > 1) {
                    setInterval(animate, 250); // 4 fps for idle animation
                }
            };

            // Center the canvas in the visual container
            canvas.style.display = 'block';
            canvas.style.margin = 'auto';
            canvas.style.position = 'absolute';
            canvas.style.top = '50%';
            canvas.style.left = '50%';
            canvas.style.transform = 'translate(-50%, -50%)';

            visual.appendChild(canvas);
            visual.style.position = 'relative';
            visual.style.overflow = 'hidden';
            console.log(`      🖼️ Using sprite animation (${animationFrames.length} frames) from: ${char.display.avatar}`);
        } else {
            // Fallback to colored background
            const bgColor = `#${char.display.color.toString(16).padStart(6, '0')}`;
            visual.style.backgroundColor = bgColor;
            console.log(`      🎨 Using color background: ${bgColor}`);
        }

        // Character name
        const name = document.createElement('div');
        name.className = 'character-name';
        name.textContent = char.display.name.toUpperCase();

        // Character description
        const description = document.createElement('div');
        description.className = 'character-description';
        description.textContent = char.display.description;

        // Character stats preview - horizontal bar format
        const stats = document.createElement('div');
        stats.className = 'character-stats';
        const defense = char.stats.base.defense || char.stats.base.armor || 0;
        stats.innerHTML = `
            <div class="character-stat-line">
                <span class="stat-label">HP</span>
                <span class="stat-value">${char.stats.base.maxHP}</span>
            </div>
            <div class="character-stat-line">
                <span class="stat-label">STR</span>
                <span class="stat-value">${char.stats.base.damage}</span>
            </div>
            <div class="character-stat-line">
                <span class="stat-label">DEF</span>
                <span class="stat-value">${defense}</span>
            </div>
            <div class="character-stat-line">
                <span class="stat-label">SPD</span>
                <span class="stat-value">${char.stats.base.moveSpeed}</span>
            </div>
        `;

        // Starting weapon
        const weapon = document.createElement('div');
        weapon.className = 'character-weapon';
        weapon.textContent = `⚔️ ${char.equipment.startingWeapon.replace(/_/g, ' ').toUpperCase()}`;

        // Free character badge
        if (isFree) {
            const freeBadge = document.createElement('div');
            freeBadge.className = 'character-free-badge';
            freeBadge.style.cssText = `
                position: absolute;
                top: 10px;
                left: 10px;
                background: linear-gradient(135deg, #FFD700, #FFA500);
                color: #000;
                padding: 5px 10px;
                border-radius: 15px;
                font-family: 'Press Start 2P', monospace;
                font-size: 9px;
                font-weight: bold;
                box-shadow: 0 0 10px rgba(255, 215, 0, 0.6);
                z-index: 10;
                text-shadow: none;
                border: 2px solid #FFD700;
            `;
            freeBadge.textContent = '⭐ FREE';
            card.appendChild(freeBadge);
        }

        // Assemble card
        card.appendChild(visual);
        card.appendChild(name);
        card.appendChild(description);
        card.appendChild(stats);
        card.appendChild(weapon);

        // Click handler and unlock button
        if (isUnlocked || isFree) {
            card.addEventListener('click', () => {
                this.selectCharacter(char.id, isFree);
            });
        } else {
            // Locked character - add buy button
            const buyButton = document.createElement('div');
            buyButton.className = 'character-buy-button';
            buyButton.style.cssText = `
                position: absolute;
                bottom: 20px;
                left: 50%;
                transform: translateX(-50%);
                background: linear-gradient(135deg, #9d00ff, #6b00b3);
                color: #fff;
                padding: 15px 30px;
                border-radius: 10px;
                font-family: 'Press Start 2P', monospace;
                font-size: 12px;
                font-weight: bold;
                cursor: pointer;
                border: 3px solid #fff;
                box-shadow: 0 0 15px rgba(157, 0, 255, 0.7);
                z-index: 10;
                transition: all 0.2s ease;
            `;
            const soulCost = char.display.soulCost || 0;
            buyButton.textContent = `UNLOCK: ${soulCost} SOULS`;

            buyButton.addEventListener('mouseenter', () => {
                buyButton.style.background = 'linear-gradient(135deg, #b000ff, #8000d0)';
                buyButton.style.transform = 'translateX(-50%) scale(1.05)';
            });

            buyButton.addEventListener('mouseleave', () => {
                buyButton.style.background = 'linear-gradient(135deg, #9d00ff, #6b00b3)';
                buyButton.style.transform = 'translateX(-50%) scale(1)';
            });

            buyButton.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent card click event
                this.unlockCharacter(char.id, soulCost);
            });

            card.appendChild(buyButton);
        }

        return card;
    }

    selectCharacter(characterId, isFree = false) {
        if (!this.progressionSystem) {
            console.warn('⚠️ No progression system - cannot select character');
            console.log('🔍 Debug info:', {
                progressionSystemExists: !!this.progressionSystem,
                windowProgressionSystem: !!window.progressionSystem,
                characterSelectManager: !!window.characterSelectManager
            });
            // Try to recover by getting it from window
            if (window.progressionSystem) {
                console.log('🔧 Attempting to reconnect progression system...');
                this.progressionSystem = window.progressionSystem;
            } else {
                return;
            }
        }

        const success = this.progressionSystem.selectCharacter(characterId, isFree);

        if (success) {
            if (isFree) {
                console.log(`✅ Selected FREE character: ${characterId}`);
            } else {
                console.log(`✅ Selected character: ${characterId}`);
            }
            this.updateSelectedCharacterDisplay();
            this.renderCharacters(); // Re-render to update selected state

            // Optional: Close modal after selection
            // this.closeModal();
        } else {
            console.warn(`⚠️ Failed to select character: ${characterId}`);
        }
    }

    updateSelectedCharacterDisplay() {
        if (!this.progressionSystem) return;

        const selectedId = this.progressionSystem.getSelectedCharacter();
        const selectedChar = this.characters[selectedId];

        if (!selectedChar) return;

        // Update display in modal
        const currentCharName = document.getElementById('currentCharacterName');
        if (currentCharName) {
            currentCharName.textContent = selectedChar.display.name.toUpperCase();
        }

        // Update display on main menu
        const selectedCharName = document.getElementById('selectedCharacterName');
        if (selectedCharName) {
            selectedCharName.textContent = selectedChar.display.name.toUpperCase();
            selectedCharName.style.color = `#${selectedChar.display.color.toString(16).padStart(6, '0')}`;
        }
    }

    getSelectedCharacter() {
        if (!this.progressionSystem) return 'MALACHAR';
        return this.progressionSystem.getSelectedCharacter();
    }

    setupSocketListeners() {
        // Create our own socket connection for the main menu
        // This connects before the game starts so we can show free character and bank data
        if (!window.io) {
            console.error('❌ Socket.IO not loaded');
            return;
        }

        const serverUrl = typeof GameConfig !== 'undefined' ? GameConfig.SERVER_URL : 'http://localhost:3002';
        console.log('🔌 Connecting to server for character data:', serverUrl);

        this.socket = window.io(serverUrl);

        this.socket.on('connect', () => {
            console.log('✅ Character select connected to server');
        });

        // Listen for bank data updates
        this.socket.on('bank:data', (data) => {
            console.log('💰 Received bank data:', data);
            this.bankedSouls = data.bankedSouls || 0;
            this.updateBankedSoulsDisplay();

            // Sync unlocked characters from server with local progression
            if (data.unlockedCharacters && this.progressionSystem) {
                const serverUnlocked = data.unlockedCharacters;
                const localUnlocked = this.progressionSystem.getUnlockedCharacters();

                // Add any characters that are unlocked on server but not locally
                serverUnlocked.forEach(charId => {
                    if (!localUnlocked.includes(charId)) {
                        this.progressionSystem.unlockCharacter(charId);
                        console.log(`🔄 Synced unlocked character from server: ${charId}`);
                    }
                });

                // Re-render characters if modal is open
                if (this.modal && this.modal.classList.contains('active')) {
                    this.renderCharacters();
                }
            }
        });

        // Listen for deposit confirmations
        this.socket.on('bank:depositConfirm', (data) => {
            console.log('✅ Deposit confirmed:', data);
            this.bankedSouls = data.bankedSouls || 0;
            this.updateBankedSoulsDisplay();
        });

        // Listen for free character rotation
        this.socket.on('freeCharacter:update', (data) => {
            console.log('🎲 Free character update:', data);
            this.freeCharacter = data.character;
            this.freeCharacterRotationTime = data.rotationTime;

            // Update the free character name display
            this.updateFreeCharacterDisplay();

            // Start the countdown timer
            this.startCountdownTimer();

            // Re-render characters to show the free character badge
            if (this.modal && this.modal.classList.contains('active')) {
                this.renderCharacters();
            }
        });

        console.log('✅ Socket listeners for character data set up');
    }

    fetchBankData() {
        const token = localStorage.getItem('klyra_token');
        if (!token) {
            console.log('⚠️ No token found - not logged in');
            this.bankedSouls = 0;
            this.updateBankedSoulsDisplay();
            return;
        }

        if (this.socket && this.socket.connected) {
            console.log('📡 Fetching bank data...');
            this.socket.emit('bank:getData', { token });
        } else {
            console.log('⚠️ Socket not connected yet, retrying...');
            // Retry after a delay
            setTimeout(() => this.fetchBankData(), 500);
        }
    }

    updateBankedSoulsDisplay() {
        if (this.bankedSoulsDisplay) {
            this.bankedSoulsDisplay.textContent = this.bankedSouls.toString();
            console.log(`💰 Updated banked souls display: ${this.bankedSouls}`);
        }
    }

    updateFreeCharacterDisplay() {
        if (this.freeCharacterNameDisplay && this.freeCharacter) {
            // Get the character display name from the character system
            const charData = this.characters[this.freeCharacter];
            if (charData) {
                this.freeCharacterNameDisplay.textContent = charData.display.name.toUpperCase();
            } else {
                this.freeCharacterNameDisplay.textContent = this.freeCharacter;
            }
        }
    }

    startCountdownTimer() {
        // Clear any existing interval
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
        }

        // Update immediately
        this.updateCountdown();

        // Then update every second
        this.countdownInterval = setInterval(() => {
            this.updateCountdown();
        }, 1000);
    }

    updateCountdown() {
        if (!this.rotationCountdownDisplay || !this.freeCharacterRotationTime) {
            return;
        }

        const now = Date.now();
        const rotationDuration = 30 * 60 * 1000; // 30 minutes in milliseconds
        const nextRotation = this.freeCharacterRotationTime + rotationDuration;
        const timeRemaining = nextRotation - now;

        if (timeRemaining <= 0) {
            this.rotationCountdownDisplay.textContent = 'Rotating...';
            return;
        }

        // Convert to minutes and seconds
        const minutes = Math.floor(timeRemaining / 60000);
        const seconds = Math.floor((timeRemaining % 60000) / 1000);

        // Format as MM:SS
        const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        this.rotationCountdownDisplay.textContent = formattedTime;
    }

    unlockCharacter(characterId, soulCost) {
        // Check if user is logged in
        const token = localStorage.getItem('klyra_token');
        if (!token) {
            this.showFeedback('You must be logged in to unlock characters!', '#ff6666');
            return;
        }

        // Check if character is already unlocked
        if (this.progressionSystem && this.progressionSystem.isCharacterUnlocked(characterId)) {
            this.showFeedback('Character already unlocked!', '#ffaa00');
            return;
        }

        // Check if player has enough banked souls
        if (this.bankedSouls < soulCost) {
            this.showFeedback(`Not enough souls! You need ${soulCost} souls (you have ${this.bankedSouls})`, '#ff6666');
            return;
        }

        // Send unlock request to server
        if (this.socket && this.socket.connected) {
            console.log(`🛒 Attempting to unlock ${characterId} for ${soulCost} souls`);
            this.socket.emit('character:unlock', {
                characterId,
                soulCost,
                token
            });

            // Listen for response
            this.socket.once('character:unlocked', (response) => {
                if (response.success) {
                    // Update local progression
                    if (this.progressionSystem) {
                        this.progressionSystem.unlockCharacter(characterId);
                    }

                    // Update banked souls display
                    this.bankedSouls = response.bankedSouls;
                    if (this.bankedSoulsDisplay) {
                        this.bankedSoulsDisplay.textContent = this.bankedSouls.toString();
                    }

                    // Re-render character grid to show unlocked state
                    this.renderCharacters();

                    this.showFeedback(`${characterId} unlocked successfully!`, '#00ff88');
                    console.log(`✅ ${characterId} unlocked! Remaining souls: ${this.bankedSouls}`);
                } else {
                    this.showFeedback(response.message || 'Failed to unlock character', '#ff6666');
                    console.error('❌ Failed to unlock character:', response.message);
                }
            });

            this.socket.once('character:unlock:error', (error) => {
                this.showFeedback(error.message || 'Error unlocking character', '#ff6666');
                console.error('❌ Error unlocking character:', error.message);
            });
        } else {
            this.showFeedback('Not connected to server!', '#ff6666');
        }
    }

    showFeedback(message, color = '#00ff88') {
        // Create feedback element if it doesn't exist
        if (!this.feedbackElement) {
            this.feedbackElement = document.createElement('div');
            this.feedbackElement.style.cssText = `
                position: fixed;
                top: 20px;
                left: 50%;
                transform: translateX(-50%);
                background: rgba(0, 0, 0, 0.9);
                color: ${color};
                padding: 15px 30px;
                border-radius: 8px;
                font-family: 'Press Start 2P', monospace;
                font-size: 11px;
                z-index: 10001;
                border: 2px solid ${color};
                box-shadow: 0 0 20px ${color}80;
                opacity: 0;
                transition: opacity 0.3s ease;
            `;
            document.body.appendChild(this.feedbackElement);
        }

        // Update message and color
        this.feedbackElement.textContent = message;
        this.feedbackElement.style.color = color;
        this.feedbackElement.style.borderColor = color;
        this.feedbackElement.style.boxShadow = `0 0 20px ${color}80`;
        this.feedbackElement.style.opacity = '1';

        // Clear any existing timeout
        if (this.feedbackTimeout) {
            clearTimeout(this.feedbackTimeout);
        }

        // Hide after 3 seconds
        this.feedbackTimeout = setTimeout(() => {
            this.feedbackElement.style.opacity = '0';
        }, 3000);
    }
}

// Create global instance
const characterSelectManager = new CharacterSelectManager();
window.characterSelectManager = characterSelectManager;

// Debug helper for volume issue
window.debugVolume = function() {
    const slider = document.getElementById('musicVolume');
    const bar = document.getElementById('volumeBar');
    
    console.log('🔍 Volume Debug Info:');
    console.log('  - Slider element:', slider);
    console.log('  - Bar element:', bar);
    console.log('  - Slider value:', slider?.value);
    console.log('  - Bar segments:', bar?.children.length);
    console.log('  - CharacterSelectManager slider:', characterSelectManager.musicVolume);
    console.log('  - CharacterSelectManager bar:', characterSelectManager.volumeBar);
    
    if (slider && bar) {
        console.log('✅ Elements found! Testing update...');
        characterSelectManager.updateVolumeBar(slider.value);
        console.log('  - Bar updated!');
    }
};

console.log('💡 Type window.debugVolume() in console to debug volume bar');