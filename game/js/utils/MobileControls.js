// Mobile Controls - Virtual Joystick (converted from klyra2)
class MobileControls {
    constructor() {
        this.joystick = null;
        this.joystickActive = false;
        this.joystickVector = { x: 0, y: 0 };
        this.isMobile = this.detectMobile();
        this.isTouch = 'ontouchstart' in window;

        if (this.isMobile || this.isTouch) {
            this.setupMobileOptimizations();
            this.setupTouchControls();
        }
    }

    detectMobile() {
        const userAgent = navigator.userAgent || navigator.vendor || window.opera;
        const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
        const isTablet = /iPad|Android/i.test(userAgent) && window.innerWidth >= 768;
        const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        const isSmallScreen = window.innerWidth <= 1024;
        return isMobileDevice || isTablet || (hasTouch && isSmallScreen);
    }

    setupMobileOptimizations() {
        // Prevent pull-to-refresh
        document.body.style.overscrollBehavior = 'none';
        document.body.style.overflow = 'hidden';
        document.documentElement.style.overflow = 'hidden';

        // Prevent zoom on double tap
        let lastTouchEnd = 0;
        document.addEventListener('touchend', (e) => {
            const now = Date.now();
            if (now - lastTouchEnd <= 300) {
                e.preventDefault();
            }
            lastTouchEnd = now;
        }, { passive: false });

        // Prevent context menu on long press
        document.addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });

        // Lock orientation to landscape on phones
        if (screen.orientation && screen.orientation.lock && window.innerWidth < 768) {
            screen.orientation.lock('landscape').catch(err => {
                console.log('Orientation lock not supported:', err);
            });
        }

        // Hide address bar on iOS/mobile browsers
        window.addEventListener('load', () => {
            setTimeout(() => window.scrollTo(0, 1), 100);
        });

        window.addEventListener('orientationchange', () => {
            setTimeout(() => window.scrollTo(0, 1), 100);
        });

        console.log('📱 Mobile optimizations enabled');
    }

    setupTouchControls() {
        // Create virtual joystick container
        const joystickContainer = document.createElement('div');
        joystickContainer.id = 'virtualJoystick';
        joystickContainer.style.cssText = `
            position: fixed;
            bottom: 40px;
            left: 40px;
            width: 150px;
            height: 150px;
            background: radial-gradient(circle, rgba(255, 255, 255, 0.1) 0%, transparent 70%);
            border: 3px solid rgba(255, 255, 255, 0.3);
            border-radius: 50%;
            display: none;
            z-index: 1000;
            touch-action: none;
            user-select: none;
        `;

        // Create joystick knob
        const joystickKnob = document.createElement('div');
        joystickKnob.id = 'joystickKnob';
        joystickKnob.style.cssText = `
            position: absolute;
            width: 60px;
            height: 60px;
            background: radial-gradient(circle, rgba(255, 255, 255, 0.8) 0%, rgba(255, 255, 255, 0.4) 100%);
            border: 3px solid rgba(255, 255, 255, 0.9);
            border-radius: 50%;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            box-shadow: 0 0 20px rgba(255, 255, 255, 0.5);
            transition: transform 0.05s;
        `;

        joystickContainer.appendChild(joystickKnob);
        document.body.appendChild(joystickContainer);

        this.joystick = {
            container: joystickContainer,
            knob: joystickKnob,
            centerX: 0,
            centerY: 0,
            maxRadius: 45
        };

        // Touch event handlers
        let touchId = null;

        const handleTouchStart = (e) => {
            // Check if touch started on a UI element
            const target = e.target;

            // Check if touching any menu/UI screens
            const isMenuScreen = target.closest('#startScreen') ||
                                target.closest('#lobbyScreen') ||
                                target.closest('#characterSelectModal') ||
                                target.closest('#settingsModal') ||
                                target.id === 'startScreen' ||
                                target.id === 'lobbyScreen' ||
                                target.id === 'characterSelectModal' ||
                                target.id === 'settingsModal';

            if (isMenuScreen) {
                return; // Don't activate joystick on menu screens
            }

            const isUIElement = target.tagName === 'BUTTON' ||
                               target.tagName === 'INPUT' ||
                               target.closest('button') ||
                               target.closest('input') ||
                               target.closest('.settings-panel') ||
                               target.classList.contains('enter-prompt') ||
                               target.classList.contains('start-button') ||
                               target.id === 'portalClick' ||
                               target.id === 'startButton' ||
                               target.id === 'charactersBtn' ||
                               target.id === 'settingsBtn' ||
                               target.id === 'game-container';

            if (isUIElement && target.id !== 'game-container') {
                return; // Don't activate joystick on UI elements
            }

            // Exclude top UI area (music controller - top 100px)
            // Exclude bottom UI area (ability buttons - bottom 150px)
            const touch = e.changedTouches[0];
            const isTopUIArea = touch.clientY < 100;
            const isBottomUIArea = touch.clientY > window.innerHeight - 150;

            if (isTopUIArea || isBottomUIArea) {
                return; // Don't activate joystick in UI zones
            }

            // Only activate on game canvas or in middle area of screen
            const isGameArea = target.tagName === 'CANVAS' ||
                              (touch.clientY > 100 && touch.clientY < window.innerHeight - 150);

            if (!isGameArea) {
                return;
            }

            if (touchId !== null) return;

            e.preventDefault();

            touchId = touch.identifier;

            // Show joystick at touch location
            const x = touch.clientX;
            const y = touch.clientY;

            joystickContainer.style.left = (x - 75) + 'px';
            joystickContainer.style.bottom = (window.innerHeight - y - 75) + 'px';
            joystickContainer.style.display = 'block';

            this.joystick.centerX = x;
            this.joystick.centerY = y;
            this.joystickActive = true;
        };

        const handleTouchMove = (e) => {
            if (touchId === null || !this.joystickActive) return;

            const touch = Array.from(e.changedTouches).find(t => t.identifier === touchId);
            if (!touch) return;

            e.preventDefault();

            const deltaX = touch.clientX - this.joystick.centerX;
            const deltaY = touch.clientY - this.joystick.centerY;

            const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
            const angle = Math.atan2(deltaY, deltaX);

            // Clamp to max radius
            const clampedDistance = Math.min(distance, this.joystick.maxRadius);

            // Update knob position
            const knobX = Math.cos(angle) * clampedDistance;
            const knobY = Math.sin(angle) * clampedDistance;

            joystickKnob.style.transform = `translate(calc(-50% + ${knobX}px), calc(-50% + ${knobY}px))`;

            // Calculate normalized vector
            if (distance > 5) {
                this.joystickVector.x = deltaX / this.joystick.maxRadius;
                this.joystickVector.y = deltaY / this.joystick.maxRadius;

                // Clamp values between -1 and 1
                this.joystickVector.x = Math.max(-1, Math.min(1, this.joystickVector.x));
                this.joystickVector.y = Math.max(-1, Math.min(1, this.joystickVector.y));
            } else {
                this.joystickVector.x = 0;
                this.joystickVector.y = 0;
            }
        };

        const handleTouchEnd = (e) => {
            const touch = Array.from(e.changedTouches).find(t => t.identifier === touchId);
            if (!touch) return;

            e.preventDefault();

            touchId = null;

            // Hide joystick
            joystickContainer.style.display = 'none';
            joystickKnob.style.transform = 'translate(-50%, -50%)';

            this.joystickActive = false;
            this.joystickVector.x = 0;
            this.joystickVector.y = 0;
        };

        // Attach touch listeners
        document.addEventListener('touchstart', handleTouchStart, { passive: false });
        document.addEventListener('touchmove', handleTouchMove, { passive: false });
        document.addEventListener('touchend', handleTouchEnd, { passive: false });
        document.addEventListener('touchcancel', handleTouchEnd, { passive: false });

        console.log('🕹️ Virtual joystick initialized');
    }

    getInput() {
        if (this.joystickActive) {
            return {
                x: this.joystickVector.x,
                y: this.joystickVector.y,
                active: true
            };
        }
        return { x: 0, y: 0, active: false };
    }

    isActive() {
        return this.joystickActive;
    }
}

// Global mobile controls instance
const mobileControls = new MobileControls();
