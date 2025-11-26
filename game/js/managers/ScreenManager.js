// Screen Manager - Single source of truth for UI state
// Handles transitions between START → LOBBY → GAME screens
class ScreenManager {
    constructor() {
        this.currentScreen = 'START';
        this.screens = {
            START: 'start',
            LOBBY: 'lobby',
            GAME: 'game'
        };

        // References to key elements
        this.startScreen = document.getElementById('startScreen');
        this.lobbyScreen = document.getElementById('lobbyScreen');
        this.gameContainer = document.getElementById('game-container');
        this.backgroundCanvas = document.getElementById('backgroundCanvas');

        // UI elements to hide in game
        this.menuElements = [
            document.getElementById('settingsBtn'),
            document.getElementById('charactersBtn'),
            document.getElementById('serverStatus')
        ];

        // State flags
        this.initialized = false;
        this.transitioning = false;

        this.init();
    }

    init() {
        // Check if user is already logged in
        const token = localStorage.getItem('klyra_token');
        const userData = localStorage.getItem('klyra_user');

        if (token && userData) {
            // User is logged in - skip start screen, go directly to lobby
            debug.info('CORE', 'User logged in - skipping start screen');
            this.setScreen('LOBBY', false);

            // Initialize main menu immediately
            if (!this.initialized) {
                window.mainMenuInstance = new MainMenu();
                this.initialized = true;
            }
        } else {
            // User not logged in - show start screen
            this.setScreen('START', false);

            // Setup start screen interaction
            this.setupStartScreen();
        }

        debug.info('CORE', 'ScreenManager initialized');
    }

    setupStartScreen() {
        // Click anywhere or press Enter/Space to start
        const startHandler = (e) => {
            if (this.currentScreen === 'START' && !this.transitioning) {
                if (e.type === 'click' || e.key === 'Enter' || e.key === ' ') {
                    this.transitionToLobby();
                }
            }
        };

        this.startScreen.addEventListener('click', startHandler);
        document.addEventListener('keydown', startHandler);

        // Controller support for start screen - any button press
        this.setupControllerStartScreen();
    }

    setupControllerStartScreen() {
        // Check for controller button presses
        const checkController = () => {
            if (this.currentScreen !== 'START' || this.transitioning) return;

            const gamepads = navigator.getGamepads();
            if (!gamepads) return;

            for (let gamepad of gamepads) {
                if (!gamepad) continue;

                // Check if any button is pressed
                for (let button of gamepad.buttons) {
                    if (button && button.pressed) {
                        console.log('🎮 Controller button pressed on start screen');
                        this.transitionToLobby();
                        return;
                    }
                }
            }
        };

        // Check controller input every frame when on start screen
        const controllerLoop = () => {
            checkController();
            requestAnimationFrame(controllerLoop);
        };
        controllerLoop();
    }

    // Transition from START → LOBBY
    async transitionToLobby() {
        if (this.transitioning) return;

        debug.info('CORE', 'Transitioning START → LOBBY');
        this.transitioning = true;

        // Fade out start screen
        await this.setScreen('LOBBY', true);

        // Initialize main menu (particles, music, server check)
        if (!this.initialized) {
            debug.info('CORE', 'Initializing main menu...');
            window.mainMenuInstance = new MainMenu();
            this.initialized = true;
        }

        this.transitioning = false;
    }

    // Transition from LOBBY → GAME
    async transitionToGame() {
        if (this.transitioning) return;

        debug.info('CORE', 'Transitioning LOBBY → GAME');
        this.transitioning = true;

        // Set to game screen
        await this.setScreen('GAME', true);

        // Hide menu UI elements
        this.hideMenuElements();

        // Stop menu music
        if (window.mainMenuInstance) {
            window.mainMenuInstance.stopMusic();
        }

        this.transitioning = false;
    }

    // Set current screen with optional animation
    setScreen(screen, animate = false) {
        return new Promise((resolve) => {
            const screenName = this.screens[screen];
            if (!screenName) {
                debug.error('CORE', `Invalid screen: ${screen}`);
                resolve();
                return;
            }

            // Update body data attribute (triggers CSS transitions)
            document.body.setAttribute('data-screen', screenName);
            this.currentScreen = screen;

            // Wait for CSS transition if animated
            if (animate) {
                setTimeout(resolve, 500); // Match CSS transition duration
            } else {
                resolve();
            }
        });
    }

    hideMenuElements() {
        this.menuElements.forEach(el => {
            if (el) el.style.display = 'none';
        });
    }

    showMenuElements() {
        this.menuElements.forEach(el => {
            if (el) el.style.display = '';
        });
    }

    // Get current screen
    getCurrentScreen() {
        return this.currentScreen;
    }

    // Check if in game
    isInGame() {
        return this.currentScreen === 'GAME';
    }

    // Check if transitioning
    isTransitioning() {
        return this.transitioning;
    }
}

// Create global instance
window.screenManager = new ScreenManager();
