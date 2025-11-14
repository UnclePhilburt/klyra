// Start Screen Handler - Shows before main menu
class StartScreen {
    constructor() {
        this.startScreen = document.getElementById('startScreen');
        this.startButton = document.getElementById('startButton');
        this.lobbyScreen = document.getElementById('lobbyScreen');
        this.backgroundCanvas = document.getElementById('backgroundCanvas');
        this.gameInitialized = false;

        this.init();
    }

    init() {
        // Make entire start screen clickable
        this.startScreen.addEventListener('click', () => this.onStart());

        // Also handle keyboard (Enter or Space)
        document.addEventListener('keydown', (e) => {
            if (!this.gameInitialized && (e.key === 'Enter' || e.key === ' ')) {
                this.onStart();
            }
        });

        if (typeof debug !== 'undefined') {
            debug.info('CORE', 'Start screen ready');
        }
    }

    onStart() {
        if (this.gameInitialized) return;
        this.gameInitialized = true;

        if (typeof debug !== 'undefined') {
            debug.info('CORE', 'Start button pressed - initializing game');
        }

        // Add fade-out class
        this.startScreen.classList.add('fade-out');

        // Wait for fade animation, then initialize everything
        setTimeout(() => {
            // Hide start screen
            this.startScreen.style.display = 'none';

            // Show lobby screen
            this.lobbyScreen.style.display = 'block';

            // Show background canvas
            this.backgroundCanvas.style.opacity = '1';

            // Initialize main menu (this will start music)
            window.mainMenuInstance = new MainMenu();

            if (typeof debug !== 'undefined') {
                debug.info('CORE', 'Main menu initialized');
            }
        }, 500); // Match CSS transition duration
    }
}

// Initialize start screen immediately
document.addEventListener('DOMContentLoaded', () => {
    window.startScreenInstance = new StartScreen();
});
