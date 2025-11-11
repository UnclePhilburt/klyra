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
        
        console.log('✅ Character Select Manager initialized');
    }

    loadCharacterDefinitions() {
        // Characters are loaded from characters/index.js which sets window.CharacterSystem.CHARACTERS
        if (window.CharacterSystem && window.CharacterSystem.CHARACTERS) {
            this.characters = window.CharacterSystem.CHARACTERS;
            console.log('✅ Character definitions loaded:', Object.keys(this.characters).length, 'characters');
        } else {
            console.error('❌ Character definitions not found!');
            console.log('⏳ Retrying in 100ms...');
            // Retry after a short delay in case modules are still loading
            setTimeout(() => this.loadCharacterDefinitions(), 100);
            this.characters = {};
        }
    }

    setProgressionSystem(progressionSystem) {
        this.progressionSystem = progressionSystem;
        this.updateSelectedCharacterDisplay();
        console.log('✅ Progression system connected to character select');
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
                this.updateVolumeBar(30); // Default
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
            
            console.log('✅ Volume bar initialized:', {
                slider: !!this.musicVolume,
                bar: !!this.volumeBar,
                currentValue: this.musicVolume.value
            });
        } else {
            console.warn('⚠️ Volume elements not found:', {
                slider: !!this.musicVolume,
                bar: !!this.volumeBar
            });
        }
    }

    openModal() {
        this.modal.classList.add('active');
        this.renderCharacters();
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
        
        console.log('🔊 Volume bar updated:', filledSegments + '/10 segments');
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

        const selectedCharacterId = this.progressionSystem
            ? this.progressionSystem.getSelectedCharacter()
            : 'ALDRIC';

        console.log('🎨 Rendering characters, selected:', selectedCharacterId);
        console.log('📊 Available characters:', Object.keys(this.characters));
        console.log('📊 Character system loaded:', !!window.CharacterSystem);

        // Create character cards
        for (const charId in this.characters) {
            const char = this.characters[charId];
            const isUnlocked = this.progressionSystem
                ? this.progressionSystem.isCharacterUnlocked(charId)
                : true; // Default to unlocked if no progression system
            const isSelected = charId === selectedCharacterId;

            console.log(`  - ${charId}: locked=${!isUnlocked}, selected=${isSelected}, color=#${char.display.color.toString(16).padStart(6, '0')}, avatar=${char.display.avatar || 'none'}`);

            const card = this.createCharacterCard(char, isUnlocked, isSelected);
            this.characterGrid.appendChild(card);
        }

        console.log('✅ Character cards rendered');
    }

    createCharacterCard(char, isUnlocked, isSelected) {
        const card = document.createElement('div');
        card.className = 'character-card';

        if (isSelected) card.classList.add('selected');
        if (!isUnlocked) card.classList.add('locked');

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

        // Check if character has avatar image
        if (char.display.avatar) {
            const avatarUrl = `url('${char.display.avatar}')`;
            visual.style.backgroundImage = avatarUrl;
            visual.style.backgroundSize = 'cover';
            visual.style.backgroundPosition = 'center';
            visual.style.imageRendering = 'pixelated';
            console.log(`      🖼️ Using avatar image: ${avatarUrl}`);
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
        stats.innerHTML = `
            <div class="character-stat-line">
                <span class="stat-label">HP</span>
                <span class="stat-value">${char.stats.base.maxHP}</span>
            </div>
            <div class="character-stat-line">
                <span class="stat-label">DMG</span>
                <span class="stat-value">${char.stats.base.damage}</span>
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

        // Assemble card
        card.appendChild(visual);
        card.appendChild(name);
        card.appendChild(description);
        card.appendChild(stats);
        card.appendChild(weapon);

        // Click handler
        if (isUnlocked) {
            card.addEventListener('click', () => {
                this.selectCharacter(char.id);
            });
        } else {
            // Locked character - show tooltip or message
            card.addEventListener('click', () => {
                console.log(`🔒 ${char.display.name} is locked`);
                // Future: Show unlock requirements
            });
        }

        return card;
    }

    selectCharacter(characterId) {
        if (!this.progressionSystem) {
            console.warn('⚠️ No progression system - cannot select character');
            return;
        }

        const success = this.progressionSystem.selectCharacter(characterId);
        
        if (success) {
            console.log(`✅ Selected character: ${characterId}`);
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
        if (!this.progressionSystem) return 'ALDRIC';
        return this.progressionSystem.getSelectedCharacter();
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