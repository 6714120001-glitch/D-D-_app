// ==================== INITIALIZATION ====================
window.addEventListener('resize', resizeCanvas);
window.onload = function () {
    resizeCanvas();
    const restored = loadFromLocalStorage();
    syncGridUIInputs();
    if (!restored || state.tokens.length === 0) {
        state.tokens = [
            ensureTokenRpgData({
                id: 'tok-demo-1',
                name: 'Alaric',
                faction: 'player',
                charClass: 'Paladin',
                level: 3,
                baseAc: 18,
                hp: 32,
                maxHp: 32,
                mp: 15,
                maxMp: 15,
                size: 1,
                color: '#10b981',
                emoji: '🛡️',
                x: snapPositionToGrid(640, 520, 1).x,
                y: snapPositionToGrid(640, 520, 1).y,
                skills: [{ name: 'Divine Smite', mpCost: 5, desc: '+2d8 Radiant Damage' }],
                inventory: [{ name: 'Healing Potion', qty: 2, healHp: 10, healMp: 0 }]
            }),
            ensureTokenRpgData({
                id: 'tok-demo-2',
                name: 'Lyra',
                faction: 'player',
                charClass: 'Wizard',
                level: 3,
                baseAc: 13,
                hp: 20,
                maxHp: 20,
                mp: 30,
                maxMp: 30,
                size: 1,
                color: '#3b82f6',
                emoji: '🧙',
                x: snapPositionToGrid(576, 584, 1).x,
                y: snapPositionToGrid(576, 584, 1).y,
                skills: [{ name: 'Fireball', mpCost: 10, desc: '8d6 Fire (20 ft Radius)' }]
            }),
            ensureTokenRpgData({
                id: 'tok-demo-3',
                name: 'Shadow Ogre',
                faction: 'enemy',
                charClass: 'Giant',
                level: 4,
                baseAc: 14,
                hp: 59,
                maxHp: 59,
                mp: 0,
                maxMp: 0,
                size: 2,
                color: '#ef4444',
                emoji: '👹',
                x: snapPositionToGrid(928, 520, 2).x,
                y: snapPositionToGrid(928, 520, 2).y
            })
        ];
    }
    fitMapToScreen();
    renderAll();
    renderLoop();
};
