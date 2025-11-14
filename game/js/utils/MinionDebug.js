// Minion Formation Debug Helper
// Usage: Type debugMinions() in the console

window.debugMinions = function() {
    // Try multiple ways to find the active game scene
    let scene = null;

    // Method 1: Through window.game
    if (window.game && window.game.scene) {
        const scenes = window.game.scene.scenes || window.game.scene.getScenes();
        // Find GameScene (should be the active scene)
        scene = scenes.find(s => s.scene && s.scene.key === 'GameScene') || scenes[scenes.length - 1];
    }

    // Method 2: Direct access if stored globally
    if (!scene && window.gameScene) {
        scene = window.gameScene;
    }

    if (!scene) {
        console.log('❌ Game scene not found');
        console.log('Available scenes:', window.game?.scene?.scenes?.map(s => s.scene?.key));
        return;
    }

    console.log('\n========== MINION FORMATION DEBUG ==========');
    console.log('🎮 Scene found:', scene.scene?.key || 'Unknown');

    const localPlayer = scene.localPlayer;
    if (!localPlayer) {
        console.log('❌ No local player found in scene');
        console.log('Scene properties:', Object.keys(scene).filter(k => k.includes('player')));
        return;
    }

    const localPlayerId = localPlayer.data.id;
    const playerPos = { x: localPlayer.sprite.x, y: localPlayer.sprite.y };
    const playerVel = localPlayer.sprite.body.velocity;
    const isMoving = Math.abs(playerVel.x) > 10 || Math.abs(playerVel.y) > 10;

    console.log(`👤 Player at: (${playerPos.x.toFixed(0)}, ${playerPos.y.toFixed(0)})`);
    console.log(`   Moving: ${isMoving}, Velocity: (${playerVel.x.toFixed(1)}, ${playerVel.y.toFixed(1)})`);
    console.log(`   Direction: ${localPlayer.currentDirection || 'unknown'}\n`);

    const myMinions = Object.values(scene.minions || {})
        .filter(m => m.ownerId === localPlayerId && m.isAlive);

    console.log(`📊 Total minions: ${myMinions.length}\n`);

    myMinions.forEach((m, i) => {
        const currentPos = { x: m.sprite.x, y: m.sprite.y };
        const formationPos = m.formationPosition || { x: 0, y: 0 };
        const offset = {
            x: formationPos.x - playerPos.x,
            y: formationPos.y - playerPos.y
        };
        const offsetDist = Math.sqrt(offset.x * offset.x + offset.y * offset.y);
        const currentDist = Math.sqrt(
            (currentPos.x - playerPos.x) ** 2 +
            (currentPos.y - playerPos.y) ** 2
        );
        const distToTarget = Math.sqrt(
            (currentPos.x - formationPos.x) ** 2 +
            (currentPos.y - formationPos.y) ** 2
        );

        console.log(`${i+1}. ${(m.role || 'NO_ROLE').toUpperCase()}`);
        console.log(`   Current: (${currentPos.x.toFixed(0)}, ${currentPos.y.toFixed(0)}) - ${currentDist.toFixed(0)}px from player`);
        console.log(`   Formation Target: (${formationPos.x.toFixed(0)}, ${formationPos.y.toFixed(0)})`);
        console.log(`   Formation Offset: (${offset.x.toFixed(0)}, ${offset.y.toFixed(0)}) = ${offsetDist.toFixed(0)}px from player`);
        console.log(`   Distance to target: ${distToTarget.toFixed(1)}px`);
        console.log(`   State: ${m.state}, Patrol Distance: ${m.patrolDistance}px`);
        console.log(`   Health: ${m.health}/${m.maxHealth} (${((m.health/m.maxHealth)*100).toFixed(0)}%)\n`);
    });

    console.log('==========================================\n');
    console.log('💡 Stop moving and run this again to see formation spreading');
};

// Force print formation calculations for ONE minion
window.debugFormationCalc = function() {
    let scene = null;
    if (window.game && window.game.scene) {
        const scenes = window.game.scene.scenes || window.game.scene.getScenes();
        scene = scenes.find(s => s.scene && s.scene.key === 'GameScene') || scenes[scenes.length - 1];
    }
    if (!scene || !scene.localPlayer) {
        console.log('❌ Cannot find game scene or player');
        return;
    }

    const myMinions = Object.values(scene.minions || {})
        .filter(m => m.ownerId === scene.localPlayer.data.id && m.isAlive);

    if (myMinions.length === 0) {
        console.log('❌ No minions found');
        return;
    }

    console.log('\n===== FORCE FORMATION CALC =====');

    // Call calculateFormationPosition for each minion and log the result
    myMinions.forEach((m, i) => {
        const owner = scene.localPlayer;

        // Manually replicate the calculation to see where it goes wrong
        const playerVelocity = owner.sprite.body.velocity;
        const isMoving = Math.abs(playerVelocity.x) > 10 || Math.abs(playerVelocity.y) > 10;

        let moveAngle = 0;
        if (isMoving) {
            moveAngle = Math.atan2(playerVelocity.y, playerVelocity.x);
        } else {
            moveAngle = owner.currentDirection === 'up' ? -Math.PI/2 :
                       owner.currentDirection === 'down' ? Math.PI/2 :
                       owner.currentDirection === 'left' ? Math.PI :
                       owner.currentDirection === 'right' ? 0 : Math.PI/2;
        }

        let distance = m.combatMode ? m.patrolDistance * 0.5 : m.patrolDistance;

        const formPos = m.calculateFormationPositionV2 ? m.calculateFormationPositionV2(owner) : m.calculateFormationPosition(owner);
        const offsetX = formPos.x - owner.sprite.x;
        const offsetY = formPos.y - owner.sprite.y;
        const dist = Math.sqrt(offsetX * offsetX + offsetY * offsetY);

        console.log(`${i+1}. ${m.role?.toUpperCase()}`);
        console.log(`   Player: (${owner.sprite.x.toFixed(0)}, ${owner.sprite.y.toFixed(0)})`);
        console.log(`   Formation: (${formPos.x.toFixed(0)}, ${formPos.y.toFixed(0)})`);
        console.log(`   Offset: (${offsetX.toFixed(1)}, ${offsetY.toFixed(1)}) = ${dist.toFixed(1)}px`);
        console.log(`   patrolDistance: ${m.patrolDistance}, combatMode: ${m.combatMode}, distance: ${distance}`);
        console.log(`   moveAngle: ${(moveAngle * 180 / Math.PI).toFixed(0)}°, isMoving: ${isMoving}`);
        console.log(`   currentDirection: ${owner.currentDirection}`);
    });
    console.log('================================\n');
};

// Also add a simpler version that just logs patrol distances
window.debugMinionRoles = function() {
    let scene = null;
    if (window.game && window.game.scene) {
        const scenes = window.game.scene.scenes || window.game.scene.getScenes();
        scene = scenes.find(s => s.scene && s.scene.key === 'GameScene') || scenes[scenes.length - 1];
    }
    if (!scene || !scene.localPlayer) {
        console.log('❌ Cannot find game scene or player');
        return;
    }

    console.log('\n===== MINION ROLES =====');
    const myMinions = Object.values(scene.minions || {})
        .filter(m => m.ownerId === scene.localPlayer.data.id && m.isAlive);

    myMinions.forEach((m, i) => {
        console.log(`${i+1}. ${m.role?.toUpperCase() || 'NO_ROLE'} - patrol: ${m.patrolDistance}px, speed: ${m.moveSpeed}, combatMode: ${m.combatMode}`);
    });
    console.log('========================\n');
};

console.log('✅ Minion Debug loaded');
console.log('   debugMinions() - Full formation analysis');
console.log('   debugMinionRoles() - Quick role check');
console.log('   debugFormationCalc() - Force calculate formations NOW');
