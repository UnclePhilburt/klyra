// GitHub Webhook Auto-Deploy Handler
// Listens for GitHub push events and auto-deploys

const http = require('http');
const crypto = require('crypto');
const { exec, spawn } = require('child_process');
const path = require('path');

// Configuration
const PORT = 3002;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'your-webhook-secret-here'; // Set this!
const REPO_PATH = 'C:\\klyra';
const SERVER_SCRIPT = 'server.js';

// Track the game server process
let gameServerProcess = null;

// Verify GitHub signature
function verifySignature(payload, signature) {
    if (!signature) return false;

    const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET);
    const digest = 'sha256=' + hmac.update(payload).digest('hex');

    try {
        return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
    } catch {
        return false;
    }
}

// Execute shell command and return promise
function runCommand(command, cwd = REPO_PATH) {
    return new Promise((resolve, reject) => {
        console.log(`> ${command}`);
        exec(command, { cwd }, (error, stdout, stderr) => {
            if (stdout) console.log(stdout);
            if (stderr) console.error(stderr);
            if (error) {
                reject(error);
            } else {
                resolve(stdout);
            }
        });
    });
}

// Start the game server
function startGameServer() {
    console.log('Starting game server...');

    gameServerProcess = spawn('node', [SERVER_SCRIPT], {
        cwd: REPO_PATH,
        stdio: 'inherit',
        shell: true
    });

    gameServerProcess.on('error', (err) => {
        console.error('Failed to start game server:', err);
    });

    gameServerProcess.on('exit', (code) => {
        console.log(`Game server exited with code ${code}`);
        gameServerProcess = null;
    });

    console.log('Game server started with PID:', gameServerProcess.pid);
}

// Stop the game server
function stopGameServer() {
    return new Promise((resolve) => {
        if (!gameServerProcess) {
            console.log('No game server process to stop');
            resolve();
            return;
        }

        console.log('Stopping game server...');

        // On Windows, we need to kill the process tree
        exec(`taskkill /pid ${gameServerProcess.pid} /f /t`, (error) => {
            if (error) {
                console.log('Process may have already exited');
            }
            gameServerProcess = null;
            resolve();
        });
    });
}

// Deploy new code
async function deploy() {
    console.log('\n========================================');
    console.log('DEPLOYING NEW CODE');
    console.log('========================================\n');

    try {
        // 1. Stop the game server
        await stopGameServer();

        // 2. Pull latest code
        console.log('\nPulling latest code from GitHub...');
        await runCommand('git fetch origin main');
        await runCommand('git reset --hard origin/main');

        // 3. Install dependencies (if package.json changed)
        console.log('\nChecking for dependency updates...');
        await runCommand('npm install --production');

        // 4. Start the game server
        console.log('\nStarting game server...');
        startGameServer();

        console.log('\n========================================');
        console.log('DEPLOY COMPLETE!');
        console.log('========================================\n');

        return true;
    } catch (error) {
        console.error('Deploy failed:', error);

        // Try to restart server anyway
        console.log('Attempting to restart server despite error...');
        startGameServer();

        return false;
    }
}

// HTTP server to receive webhooks
const server = http.createServer(async (req, res) => {
    // Health check endpoint
    if (req.method === 'GET' && req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            status: 'online',
            gameServer: gameServerProcess ? 'running' : 'stopped'
        }));
        return;
    }

    // Manual deploy trigger (GET /deploy)
    if (req.method === 'GET' && req.url === '/deploy') {
        console.log('Manual deploy triggered');
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('Deploy started...');
        deploy();
        return;
    }

    // GitHub webhook endpoint
    if (req.method === 'POST' && req.url === '/webhook') {
        let body = '';

        req.on('data', chunk => {
            body += chunk.toString();
        });

        req.on('end', async () => {
            // Verify signature
            const signature = req.headers['x-hub-signature-256'];

            if (WEBHOOK_SECRET !== 'your-webhook-secret-here' && !verifySignature(body, signature)) {
                console.log('Invalid webhook signature!');
                res.writeHead(401, { 'Content-Type': 'text/plain' });
                res.end('Invalid signature');
                return;
            }

            // Parse payload
            let payload;
            try {
                payload = JSON.parse(body);
            } catch {
                res.writeHead(400, { 'Content-Type': 'text/plain' });
                res.end('Invalid JSON');
                return;
            }

            // Check if this is a push to main branch
            const event = req.headers['x-github-event'];
            console.log(`Received GitHub event: ${event}`);

            if (event === 'push') {
                const branch = payload.ref?.replace('refs/heads/', '');
                console.log(`Push to branch: ${branch}`);

                if (branch === 'main' || branch === 'master') {
                    res.writeHead(200, { 'Content-Type': 'text/plain' });
                    res.end('Deploy triggered');

                    // Deploy asynchronously
                    deploy();
                } else {
                    res.writeHead(200, { 'Content-Type': 'text/plain' });
                    res.end(`Ignoring push to ${branch}`);
                }
            } else if (event === 'ping') {
                console.log('Webhook ping received!');
                res.writeHead(200, { 'Content-Type': 'text/plain' });
                res.end('Pong!');
            } else {
                res.writeHead(200, { 'Content-Type': 'text/plain' });
                res.end(`Ignoring event: ${event}`);
            }
        });

        return;
    }

    // 404 for other routes
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
});

server.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════════════╗
║     🚀 KLYRA AUTO-DEPLOY WEBHOOK SERVER              ║
║                                                       ║
║  Port: ${PORT}                                          ║
║  Repo: ${REPO_PATH}                              ║
║                                                       ║
║  Endpoints:                                           ║
║  - POST /webhook  - GitHub webhook receiver           ║
║  - GET  /health   - Health check                      ║
║  - GET  /deploy   - Manual deploy trigger             ║
╚═══════════════════════════════════════════════════════╝
    `);

    // Start the game server on startup
    startGameServer();
});

// Handle process termination
process.on('SIGINT', async () => {
    console.log('\nShutting down...');
    await stopGameServer();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\nShutting down...');
    await stopGameServer();
    process.exit(0);
});
