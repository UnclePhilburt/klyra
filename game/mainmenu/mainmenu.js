class MainMenu {
    constructor() {
        this.canvas = document.getElementById('backgroundCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.particles = [];
        this.particleCount = 100;
        this.menuMusic = null;
        this.soundEffects = {};
        this.serverOnline = false;
        this.checkingServer = true;
        this.musicStarted = false;
        
        this.portalCenter = { x: 0, y: 0 };
        
        this.init();
    }
    
    init() {
        this.resizeCanvas();
        this.calculatePortalCenter();
        this.createParticles();
        this.addServerStatusIndicator();
        this.checkServerStatus();
        this.setupPortalInteraction();
        this.loadSoundEffects();
        this.animate();
        this.setupEventListeners();
        this.loadMenuMusic();
        this.loadSavedPlayerName();

        // Start menu music on first user interaction (browser requirement)
        const startMusic = () => {
            this.playMusic();
            document.removeEventListener('click', startMusic);
            document.removeEventListener('keydown', startMusic);
        };
        document.addEventListener('click', startMusic, { once: true });
        document.addEventListener('keydown', startMusic, { once: true });

        // Check server every 10 seconds
        setInterval(() => this.checkServerStatus(), 10000);
    }
    
    addServerStatusIndicator() {
        const indicator = document.createElement('div');
        indicator.id = 'serverStatus';
        indicator.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(0, 0, 0, 0.8);
            border: 3px solid #FFD700;
            padding: 15px 25px;
            border-radius: 10px;
            font-family: 'Press Start 2P', monospace;
            font-size: 12px;
            color: #FFD700;
            z-index: 9999;
            display: flex;
            align-items: center;
            gap: 10px;
            box-shadow: 0 0 20px rgba(255, 215, 0, 0.3);
        `;
        
        indicator.innerHTML = `
            <span id="serverStatusDot" style="
                width: 12px;
                height: 12px;
                border-radius: 50%;
                background: #888;
                display: inline-block;
                animation: pulse 1.5s ease-in-out infinite;
            "></span>
            <span id="serverStatusText">CHECKING SERVER...</span>
        `;
        
        document.body.appendChild(indicator);
        
        // Add pulse animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.4; }
            }
            @keyframes blink {
                0%, 100% { opacity: 1; }
                50% { opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }
    
    async checkServerStatus() {
        const statusDot = document.getElementById('serverStatusDot');
        const statusText = document.getElementById('serverStatusText');
        const enterButton = document.querySelector('.enter-prompt');

        try {
            // Check Socket.IO endpoint instead of root
            const serverURL = typeof GameConfig !== 'undefined' ? GameConfig.SERVER_URL : 'https://klyra-server.onrender.com';
            const response = await fetch(`${serverURL}/socket.io/`, {
                method: 'GET',
                mode: 'cors',
                cache: 'no-cache'
            });

            // Check if we got a valid response (Socket.IO will return info)
            if (response.ok || response.status === 400) {
                // 400 is expected from Socket.IO when not doing handshake - means server is up
                this.serverOnline = true;
                this.checkingServer = false;

                statusDot.style.background = '#4AE290';
                statusDot.style.boxShadow = '0 0 10px #4AE290';
                statusDot.style.animation = 'none';
                statusText.textContent = 'SERVER ONLINE';
                statusText.style.color = '#4AE290';

                if (enterButton) {
                    enterButton.style.opacity = '1';
                    enterButton.style.cursor = 'pointer';
                    enterButton.style.pointerEvents = 'all';
                    // Keep original red button color
                    enterButton.style.removeProperty('background');
                }

                console.log('✅ Server check passed');
            } else {
                throw new Error(`Server returned ${response.status}`);
            }
        } catch (error) {
            // Even on error, enable the button - let the actual connection attempt handle it
            console.warn('⚠️ Server check failed, but enabling button anyway:', error);

            this.serverOnline = true; // Changed to true to enable button
            this.checkingServer = false;

            statusDot.style.background = '#FFA500'; // Orange - uncertain
            statusDot.style.boxShadow = '0 0 10px #FFA500';
            statusDot.style.animation = 'pulse 1.5s ease-in-out infinite';
            statusText.textContent = 'CHECKING...';
            statusText.style.color = '#FFA500';

            if (enterButton) {
                enterButton.style.opacity = '1';
                enterButton.style.cursor = 'pointer';
                enterButton.style.pointerEvents = 'all';
                enterButton.style.removeProperty('background');
            }
            
            console.warn('❌ Server is offline:', error.message);
        }
    }
    
    calculatePortalCenter() {
        this.portalCenter.x = window.innerWidth / 2;
        this.portalCenter.y = window.innerHeight / 2;
    }
    
    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }
    
    createParticles() {
        for (let i = 0; i < this.particleCount; i++) {
            this.particles.push(new GravityParticle(this.canvas, this.portalCenter));
        }
    }
    
    loadSoundEffects() {
        const soundsPath = 'mainmenu/sounds/';
        
        this.soundEffects.portalHum = this.createOscillatorHum();
        this.soundEffects.hover = this.createSynthSound(400, 0.1);
        this.soundEffects.click = this.createSynthSound(600, 0.2);
        this.soundEffects.whoosh = this.createWhoosh();
    }
    
    createOscillatorHum() {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(80, audioContext.currentTime);
        gainNode.gain.setValueAtTime(0.05, audioContext.currentTime);
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        return { oscillator, gainNode, audioContext, isPlaying: false };
    }
    
    createSynthSound(frequency, duration) {
        return () => {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + duration);
        };
    }
    
    createWhoosh() {
        return () => {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const bufferSize = audioContext.sampleRate * 1;
            const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
            const output = buffer.getChannelData(0);
            
            for (let i = 0; i < bufferSize; i++) {
                output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (audioContext.sampleRate * 0.3));
            }
            
            const noise = audioContext.createBufferSource();
            noise.buffer = buffer;
            
            const filter = audioContext.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(500, audioContext.currentTime);
            filter.frequency.exponentialRampToValueAtTime(100, audioContext.currentTime + 0.5);
            
            noise.connect(filter);
            filter.connect(audioContext.destination);
            
            noise.start();
        };
    }
    
    setupPortalInteraction() {
        const enterButton = document.querySelector('.enter-prompt');
        const portalClick = document.getElementById('portalClick');
        const playerNameInput = document.getElementById('playerName');
        const statusText = document.getElementById('statusText');
        const lobbyScreen = document.getElementById('lobbyScreen');
        
        if (enterButton) {
            enterButton.addEventListener('click', async (e) => {
                e.stopPropagation();
                
                if (!this.serverOnline || this.checkingServer) {
                    statusText.textContent = 'Server not ready...';
                    statusText.style.color = '#FF4444';
                    return;
                }
                
                const name = playerNameInput.value.trim() || 'Adventurer';
                
                // Save player name to localStorage
                localStorage.setItem('klyraPlayerName', name);
                
                enterButton.style.pointerEvents = 'none';
                statusText.textContent = 'Starting adventure...';
                statusText.style.color = '#4AE290';
                
                setTimeout(() => {
                    lobbyScreen.classList.add('portal-activated');
                }, 100);
                
                try {
                    if (window.game) {
                        await window.game.connect(name);
                        
                        setTimeout(() => {
                            lobbyScreen.classList.add('hidden');
                            document.body.classList.add('game-active');

                            const settingsBtn = document.getElementById('settingsBtn');
                            if (settingsBtn) {
                                settingsBtn.style.display = 'none';
                            }

                            // Hide server status when in game
                            const serverStatus = document.getElementById('serverStatus');
                            if (serverStatus) {
                                serverStatus.style.display = 'none';
                            }

                            // Hide background canvas to remove blue tint
                            const bgCanvas = document.getElementById('backgroundCanvas');
                            if (bgCanvas) {
                                bgCanvas.style.display = 'none';
                            }

                            this.stopMusic();
                        }, 500);
                    }
                } catch (error) {
                    console.error('Gateway refused entry:', error);
                    statusText.textContent = 'Connection failed... Try again.';
                    statusText.style.color = '#FF4444';
                    enterButton.style.pointerEvents = 'all';
                    lobbyScreen.classList.remove('portal-activated');
                }
            });
        }

        // Button is visible by default - removed hiding code

        if (playerNameInput) {
            playerNameInput.addEventListener('input', (e) => {
                this.animateCarvedText(e.target.value);
            });
        }
    }
    
    animateCarvedText(text) {
        // Placeholder for carved text animation
    }
    
    animate() {
        this.ctx.fillStyle = 'rgba(10, 10, 10, 0.1)';  // Changed from blue to black
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.particles.forEach(particle => {
            particle.update();
            particle.draw(this.ctx);
        });
        
        requestAnimationFrame(() => this.animate());
    }
    
    setupEventListeners() {
        window.addEventListener('resize', () => {
            this.resizeCanvas();
            this.calculatePortalCenter();
        });
        
        const settingsBtn = document.getElementById('settingsBtn');
        const settingsPanel = document.getElementById('settingsPanel');
        const closeSettings = document.getElementById('closeSettings');
        const musicVolume = document.getElementById('musicVolume');
        const volumeValue = document.getElementById('volumeValue');
        
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => {
                settingsPanel.classList.add('active');
            });
        }
        
        if (closeSettings) {
            closeSettings.addEventListener('click', () => {
                settingsPanel.classList.remove('active');
            });
        }
        
        if (settingsPanel) {
            settingsPanel.addEventListener('click', (e) => {
                if (e.target === settingsPanel) {
                    settingsPanel.classList.remove('active');
                }
            });
        }
        
        if (musicVolume) {
            const savedVolume = localStorage.getItem('menuMusicVolume');
            if (savedVolume !== null) {
                musicVolume.value = savedVolume;
                if (volumeValue) {
                    volumeValue.textContent = savedVolume + '%';
                }
            }

            musicVolume.addEventListener('input', (e) => {
                const volume = e.target.value;
                if (volumeValue) {
                    volumeValue.textContent = volume + '%';
                }
                localStorage.setItem('menuMusicVolume', volume);

                if (this.menuMusic) {
                    this.menuMusic.volume = volume / 100;
                }
            });
        }
    }
    
    loadMenuMusic() {
        const musicPath = 'assets/music/poltergeist-and-a-piano.mp3';
        this.menuMusic = new Audio(musicPath);
        this.menuMusic.loop = true;

        const savedVolume = localStorage.getItem('menuMusicVolume');
        const volumeLevel = savedVolume !== null ? parseInt(savedVolume) / 100 : 0.3;
        this.menuMusic.volume = volumeLevel;

        console.log('🎵 Menu music loaded: Poltergeist and a Piano');
    }
    
    playMusic() {
        if (this.menuMusic && !this.musicStarted) {
            this.menuMusic.play().then(() => {
                this.musicStarted = true;
                console.log('🎵 Menu music started playing');
            }).catch(err => {
                console.log('Could not play menu music:', err);
            });
        }
    }
    
    stopMusic() {
        if (this.menuMusic) {
            this.menuMusic.pause();
            this.menuMusic.currentTime = 0;
            this.musicStarted = false;
        }
    }
    
    loadSavedPlayerName() {
        const playerNameInput = document.getElementById('playerName');
        const savedName = localStorage.getItem('klyraPlayerName');
        
        if (savedName && playerNameInput) {
            playerNameInput.value = savedName;
            console.log('✅ Loaded saved player name:', savedName);
        }
    }
}

class GravityParticle {
    constructor(canvas, portalCenter) {
        this.canvas = canvas;
        this.portalCenter = portalCenter;
        this.reset();
    }
    
    reset() {
        this.x = Math.random() * this.canvas.width;
        this.y = Math.random() * this.canvas.height;
        this.vx = 0;
        this.vy = 0;
        this.size = Math.random() * 3 + 1;
        this.opacity = Math.random() * 0.5 + 0.3;
    }
    
    update() {
        const dx = this.portalCenter.x - this.x;
        const dy = this.portalCenter.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < 5) {
            this.reset();
            return;
        }
        
        const force = 100 / (distance * distance);
        const angle = Math.atan2(dy, dx);
        
        this.vx += Math.cos(angle) * force;
        this.vy += Math.sin(angle) * force;
        
        this.vx *= 0.98;
        this.vy *= 0.98;
        
        this.x += this.vx;
        this.y += this.vy;
        
        if (this.x < 0 || this.x > this.canvas.width || 
            this.y < 0 || this.y > this.canvas.height) {
            this.reset();
        }
    }
    
    draw(ctx) {
        ctx.fillStyle = `rgba(107, 79, 255, ${this.opacity})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }
}

// Create and export instance to window
const mainMenu = new MainMenu();
window.mainMenuInstance = mainMenu;