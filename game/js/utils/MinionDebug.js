// Minion Formation Debug Helper
// Usage: Type debugMinions() in the console

window.debugMinions = function() {
    const scene = window.game?.scene?.scenes[0];
    if (!scene) {
        console.log('❌ Game scene not found');
        return;
    }

    console.log('\n========== MINION FORMATION DEBUG ==========');

    const localPlayer = scene.localPlayer;
    if (!localPlayer) {
        console.log('❌ No local player found');
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

console.log('✅ Minion Debug loaded - Type: debugMinions()');
