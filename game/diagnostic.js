// FPS Diagnostic Tool - Run this in browser console (F12)
// Type: runDiagnostic()

function runDiagnostic() {
    const scene = game.scene.scenes[0];

    console.log('=== KLYRA FPS DIAGNOSTIC ===');
    console.log('');
    console.log('📊 PERFORMANCE:');
    console.log(`FPS: ${Math.round(game.loop.actualFps)}`);
    console.log(`Target FPS: ${game.loop.targetFps}`);
    console.log('');

    console.log('🎮 SCENE OBJECTS:');
    console.log(`Total children: ${scene.children.list.length}`);
    console.log(`Tweens active: ${scene.tweens.getTweens().length}`);
    console.log('');

    console.log('🌍 GAME ENTITIES:');
    console.log(`Rendered tiles: ${scene.renderedTiles?.size || 0}`);
    console.log(`Rendered decorations: ${scene.renderedDecorations?.size || 0}`);
    console.log(`Tree sprites: ${scene.treeSprites?.length || 0}`);
    console.log(`Enemies: ${Object.keys(scene.enemies || {}).length}`);
    console.log(`Wolves: ${Object.keys(scene.wolves || {}).length}`);
    console.log(`Minions: ${Object.keys(scene.minions || {}).length}`);
    console.log(`Other players: ${Object.keys(scene.otherPlayers || {}).length}`);
    console.log('');

    console.log('🔍 DECORATION CULLING STATUS:');
    const decorationType = typeof scene.renderedDecorations;
    if (decorationType === 'undefined') {
        console.log('❌ renderedDecorations NOT FOUND - OLD CODE!');
    } else if (scene.renderedDecorations instanceof Set) {
        console.log('❌ renderedDecorations is a Set - OLD CODE (no culling)!');
    } else if (scene.renderedDecorations instanceof Map) {
        console.log('✅ renderedDecorations is a Map - NEW CODE (culling enabled)!');
    }
    console.log('');

    console.log('👾 ENEMY STATUS:');
    const sampleEnemy = Object.values(scene.enemies || {})[0];
    if (sampleEnemy) {
        console.log(`Has glow: ${!!sampleEnemy.glow}`);
        console.log(`Has label: ${!!sampleEnemy.label}`);
        console.log(`Health bar visible: ${sampleEnemy.healthBar?.visible}`);
        if (sampleEnemy.glow) {
            console.log('❌ Enemy still has glow - OLD CODE!');
        } else {
            console.log('✅ Enemy glow removed - NEW CODE!');
        }
    } else {
        console.log('No enemies spawned yet');
    }
    console.log('');

    console.log('📈 RECOMMENDATIONS:');
    if (scene.renderedDecorations instanceof Set) {
        console.log('⚠️ YOU NEED TO REFRESH! Old code is still running.');
        console.log('   Press Ctrl+Shift+R to hard refresh');
    }
    if (sampleEnemy?.glow) {
        console.log('⚠️ YOU NEED TO REFRESH! Old enemy code is still running.');
        console.log('   Press Ctrl+Shift+R to hard refresh');
    }

    const totalObjects = scene.children.list.length;
    if (totalObjects > 3000) {
        console.log(`⚠️ HIGH OBJECT COUNT: ${totalObjects} objects`);
        console.log('   Decorations may not be getting culled properly');
    }

    console.log('');
    console.log('=== END DIAGNOSTIC ===');
}

console.log('💊 Diagnostic tool loaded! Type: runDiagnostic()');
