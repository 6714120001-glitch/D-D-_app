// ==================== BUILT-IN PRESET SCENES (TOWN / GUILD / SHOP) ====================
function generatePresetMapDataUrl(sceneKey) {
    const off = document.createElement('canvas');
    const W = 1600, H = 1152, GS = 64;
    off.width = W;
    off.height = H;
    const c = off.getContext('2d');

    const rand = (seed) => {
        let s = seed % 2147483647;
        return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
    };

    const drawTree = (x, y, r, seed) => {
        const rnd = rand(seed);
        c.save();
        c.fillStyle = 'rgba(0,0,0,0.32)';
        c.beginPath(); c.arc(x + 6, y + 8, r, 0, Math.PI * 2); c.fill();
        ['#2d4c2b', '#3a6136', '#4a7844'].forEach((col, i) => {
            c.fillStyle = col;
            c.beginPath();
            c.arc(x + (rnd() - 0.5) * 6, y + (rnd() - 0.5) * 6, r * (1 - i * 0.18), 0, Math.PI * 2);
            c.fill();
        });
        c.restore();
    };

    const drawRoof = (x, y, w, h, roofCol, ridgeCol, label, sub = '') => {
        c.save();
        c.fillStyle = 'rgba(0,0,0,0.42)';
        c.beginPath(); c.roundRect(x + 8, y + 10, w, h, 8); c.fill();
        c.fillStyle = roofCol;
        c.beginPath(); c.roundRect(x, y, w, h, 8); c.fill();
        c.strokeStyle = 'rgba(0,0,0,0.18)'; c.lineWidth = 2;
        for (let sy = y + 14; sy < y + h - 8; sy += 14) {
            c.beginPath(); c.moveTo(x + 6, sy); c.lineTo(x + w - 6, sy); c.stroke();
        }
        c.strokeStyle = ridgeCol; c.lineWidth = 5;
        c.beginPath();
        if (w >= h) { c.moveTo(x + 14, y + h / 2); c.lineTo(x + w - 14, y + h / 2); }
        else { c.moveTo(x + w / 2, y + 14); c.lineTo(x + w / 2, y + h - 14); }
        c.stroke();
        c.strokeStyle = '#1e1b18'; c.lineWidth = 3;
        c.beginPath(); c.roundRect(x, y, w, h, 8); c.stroke();
        if (label) {
            c.font = 'bold 16px Prompt, sans-serif';
            const pw = c.measureText(label).width + 20;
            const ph = sub ? 40 : 26;
            const px = x + w / 2 - pw / 2, py = y + h / 2 - ph / 2;
            c.fillStyle = 'rgba(15,23,42,0.85)';
            c.beginPath(); c.roundRect(px, py, pw, ph, 6); c.fill();
            c.strokeStyle = 'rgba(245,158,11,0.5)'; c.lineWidth = 1.5; c.stroke();
            c.fillStyle = '#fef3c7'; c.textAlign = 'center'; c.textBaseline = 'middle';
            c.fillText(label, x + w / 2, sub ? py + 14 : py + ph / 2);
            if (sub) {
                c.font = '11px Prompt, sans-serif'; c.fillStyle = '#94a3b8';
                c.fillText(sub, x + w / 2, py + 29);
            }
        }
        c.restore();
    };

    if (sceneKey === 'town') {
        const rnd = rand(42);
        c.fillStyle = '#3c4c34'; c.fillRect(0, 0, W, H);
        for (let i = 0; i < 160; i++) {
            c.fillStyle = rnd() > 0.5 ? 'rgba(74,94,58,0.35)' : 'rgba(42,54,36,0.35)';
            c.beginPath(); c.arc(rnd() * W, rnd() * H, 18 + rnd() * 45, 0, Math.PI * 2); c.fill();
        }
        c.fillStyle = '#5c5346'; c.fillRect(64, 64, W - 128, H - 128);
        c.fillStyle = '#78716c';
        c.fillRect(544, 340, 192, 812);
        c.fillRect(480, 320, 560, 128);
        c.fillRect(110, 624, 1120, 64);
        c.fillRect(110, 864, 1360, 160);
        c.fillRect(1180, 448, 280, 440);

        // Perimeter Walls & South Gate (544..736)
        const wt = 28, wx = 48, wy = 48, ww = W - 96, wh = H - 96;
        c.fillStyle = '#475569';
        c.fillRect(wx, wy, ww, wt);
        c.fillRect(wx, wy, wt, wh);
        c.fillRect(wx + ww - wt, wy, wt, wh);
        c.fillRect(wx, wy + wh - wt, 544 - wx, wt);
        c.fillRect(736, wy + wh - wt, (wx + ww) - 736, wt);

        [[wx + 14, wy + 14], [wx + ww - 14, wy + 14], [wx + 14, wy + wh - 14], [wx + ww - 14, wy + wh - 14], [530, wy + wh - 14], [750, wy + wh - 14]].forEach(([tx, ty]) => {
            c.fillStyle = '#334155'; c.beginPath(); c.arc(tx, ty, 26, 0, Math.PI * 2); c.fill();
            c.fillStyle = '#92400e'; c.beginPath(); c.arc(tx, ty, 15, 0, Math.PI * 2); c.fill();
        });

        drawRoof(520, 128, 192, 176, '#9a3412', '#fdba74', 'ร้านอาวุธ / ชุดเกราะ', 'Weapon & Armor');

        // Town Hall
        c.fillStyle = '#1d4ed8'; c.beginPath(); c.arc(880, 216, 94, 0, Math.PI * 2); c.fill();
        c.strokeStyle = '#93c5fd'; c.lineWidth = 4; c.stroke();
        c.fillStyle = '#1e3a8a'; c.beginPath(); c.arc(880, 216, 52, 0, Math.PI * 2); c.fill();
        c.fillStyle = 'rgba(15,23,42,0.88)'; c.beginPath(); c.roundRect(810, 200, 140, 32, 6); c.fill();
        c.fillStyle = '#fef3c7'; c.font = 'bold 15px Prompt, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
        c.fillText('ที่ว่าการเมือง', 880, 216);

        // Row Houses
        drawRoof(112, 432, 344, 168, '#4d7c0f', '#bef264', 'บ้านแถว (ตะวันตกบน)');
        drawRoof(112, 688, 344, 168, '#3f6212', '#bef264', 'บ้านแถว (ตะวันตกล่าง)');
        drawRoof(768, 464, 352, 152, '#4d7c0f', '#bef264', 'บ้านแถว (ตะวันออกบน)');
        drawRoof(768, 696, 352, 160, '#3f6212', '#bef264', 'บ้านแถว (ตะวันออกล่าง)');

        // Market Stalls
        [532, 632, 732].forEach((sy, idx) => {
            const cols = [['#dc2626', '#d97706'], ['#059669', '#7c3aed'], ['#2563eb', '#ea580c']][idx];
            c.fillStyle = cols[0]; c.fillRect(584, sy, 48, 64);
            c.fillStyle = cols[1]; c.fillRect(648, sy, 48, 64);
        });
        c.fillStyle = 'rgba(15,23,42,0.88)'; c.beginPath(); c.roundRect(600, 808, 80, 26, 6); c.fill();
        c.fillStyle = '#38bdf8'; c.font = 'bold 14px Prompt, sans-serif'; c.fillText('ตลาดกลาง', 640, 821);

        // Guild Hall
        c.fillStyle = '#0284c7'; c.beginPath(); c.arc(410, 938, 60, 0, Math.PI * 2); c.fill();
        c.strokeStyle = '#fbbf24'; c.lineWidth = 3.5; c.stroke();
        c.fillStyle = 'rgba(15,23,42,0.9)'; c.beginPath(); c.roundRect(365, 924, 90, 28, 6); c.fill();
        c.fillStyle = '#fbbf24'; c.font = 'bold 14px Prompt, sans-serif'; c.fillText('กิลด์', 410, 938);

        // 5 Sewer Grates
        [[176, 208], [1408, 208], [504, 624], [144, 1008], [1424, 1008]].forEach(([sx, sy]) => {
            c.fillStyle = '#334155'; c.beginPath(); c.arc(sx, sy, 22, 0, Math.PI * 2); c.fill();
            c.fillStyle = '#090d16'; c.beginPath(); c.arc(sx, sy, 16, 0, Math.PI * 2); c.fill();
            c.fillStyle = '#cbd5e1'; c.font = '600 10px Prompt, sans-serif'; c.fillText('ท่อระบายน้ำ', sx, sy + 32);
        });

        [[240, 320, 32], [1120, 160, 34], [1240, 280, 36], [1420, 760, 34]].forEach(([tx, ty, tr], i) => drawTree(tx, ty, tr, i + 10));
    } else if (sceneKey === 'guild') {
        c.fillStyle = '#2d3b27'; c.fillRect(0, 0, W, H);
        const gx = 192, gy = 128, gw = 1216, gh = 896;
        c.fillStyle = '#5c3a21'; c.fillRect(gx, gy, gw, gh);
        c.strokeStyle = 'rgba(28,16,8,0.45)'; c.lineWidth = 2;
        for (let py = gy; py <= gy + gh; py += 32) { c.beginPath(); c.moveTo(gx, py); c.lineTo(gx + gw, py); c.stroke(); }
        c.fillStyle = '#7f1d1d'; c.fillRect(704, 416, 192, 608);
        c.strokeStyle = '#f59e0b'; c.lineWidth = 3; c.strokeRect(708, 416, 184, 604);

        // Reception Counter
        c.fillStyle = '#78350f'; c.fillRect(576, 384, 448, 52);
        c.strokeStyle = '#fbbf24'; c.lineWidth = 3; c.strokeRect(576, 384, 448, 52);
        c.fillStyle = '#fef3c7'; c.font = 'bold 14px Prompt, sans-serif'; c.textAlign = 'center';
        c.fillText('เคาน์เตอร์ต้อนรับ & ส่งเควส', 800, 412);

        // Quest Board (Left)
        c.fillStyle = 'rgba(245,158,11,0.14)'; c.strokeStyle = '#f59e0b'; c.lineWidth = 2;
        c.beginPath(); c.roundRect(224, 320, 224, 384, 12); c.fill(); c.stroke();
        c.fillStyle = '#451a03'; c.fillRect(206, 352, 28, 320);
        c.fillStyle = 'rgba(15,23,42,0.92)'; c.beginPath(); c.roundRect(248, 488, 180, 46, 8); c.fill();
        c.fillStyle = '#fbbf24'; c.font = 'bold 14px Prompt, sans-serif'; c.fillText('📋 ป้ายประกาศเควส', 338, 505);
        c.fillStyle = '#cbd5e1'; c.font = '11px Prompt, sans-serif'; c.fillText('(จุดเลือกภารกิจนักผจญภัย)', 338, 523);

        // Tables
        [[1120, 320], [1120, 672], [1120, 864], [384, 832]].forEach(([tx, ty]) => {
            c.fillStyle = '#92400e'; c.beginPath(); c.arc(tx, ty, 46, 0, Math.PI * 2); c.fill();
            c.strokeStyle = '#d97706'; c.lineWidth = 3; c.stroke();
        });

        // Walls
        c.fillStyle = '#1e293b';
        c.fillRect(gx - 16, gy - 16, gw + 32, 16);
        c.fillRect(gx - 16, gy - 16, 16, gh + 32);
        c.fillRect(gx + gw, gy - 16, 16, gh + 32);
        c.fillRect(gx - 16, gy + gh, 704 - (gx - 16), 16);
        c.fillRect(896, gy + gh, (gx + gw + 16) - 896, 16);
    } else if (sceneKey === 'shop') {
        c.fillStyle = '#3f3b36'; c.fillRect(0, 0, W, H);
        const sx = 256, sy = 160, sw = 1088, sh = 832;
        c.fillStyle = '#334155'; c.fillRect(sx, sy, sw, sh);
        c.fillStyle = '#1e293b'; c.fillRect(sx, sy, sw, 224);

        // Forge
        c.fillStyle = '#ea580c'; c.beginPath(); c.arc(400, 256, 36, 0, Math.PI * 2); c.fill();
        c.fillStyle = '#fef08a'; c.beginPath(); c.arc(400, 256, 18, 0, Math.PI * 2); c.fill();
        c.fillStyle = '#fdba74'; c.font = 'bold 12px Prompt, sans-serif'; c.textAlign = 'center';
        c.fillText('เตาหลอมตีเหล็ก', 400, 312);

        // Shop Counter
        c.fillStyle = '#78350f'; c.fillRect(576, 448, 448, 56);
        c.strokeStyle = '#f59e0b'; c.lineWidth = 3; c.strokeRect(576, 448, 448, 56);
        c.fillStyle = '#fef3c7'; c.font = 'bold 14px Prompt, sans-serif';
        c.fillText('เคาน์เตอร์ซื้อ-ขายอาวุธและชุดเกราะ', 800, 480);

        // Weapon & Armor Racks
        [[304, 480, 'ชั้นดาบสั้น & มีดสั้น'], [304, 640, 'ชั้นหอก & ขวาน'], [304, 800, 'ชั้นธนูสั้น & หน้าไม้']].forEach(([rx, ry, lbl]) => {
            c.fillStyle = '#7c2d12'; c.fillRect(rx, ry, 176, 48);
            c.fillStyle = '#fed7aa'; c.font = '600 12px Prompt, sans-serif'; c.fillText(lbl, rx + 88, ry + 64);
        });
        [[1120, 480, 'หุ่นโชว์เกราะหนัง'], [1120, 640, 'หุ่นโชว์เกราะโซ่'], [1120, 800, 'ชั้นวางโล่ไม้ & โล่เหล็ก']].forEach(([rx, ry, lbl]) => {
            c.fillStyle = '#1e3a8a'; c.fillRect(rx, ry, 176, 48);
            c.fillStyle = '#bfdbfe'; c.font = '600 12px Prompt, sans-serif'; c.fillText(lbl, rx + 88, ry + 64);
        });

        // Walls
        c.fillStyle = '#0f172a';
        c.fillRect(sx - 16, sy - 16, sw + 32, 16);
        c.fillRect(sx - 16, sy - 16, 16, sh + 32);
        c.fillRect(sx + sw, sy - 16, 16, sh + 32);
        c.fillRect(sx - 16, sy + sh, 736 - (sx - 16), 16);
        c.fillRect(864, sy + sh, (sx + sw + 16) - 864, 16);
    }

    return off.toDataURL('image/jpeg', 0.9);
}

const BUILTIN_SCENES = {
    town: {
        title: 'เมืองด่านหน้า (Frontier Town)',
        spawn: { x: 608, y: 992 },
        npcs: [
            { id: 'npc-town-guard-1', name: 'ทหารยามประตูเมือง (ซ้าย)', faction: 'npc', charClass: 'City Guard', level: 2, baseAc: 16, ac: 16, hp: 22, maxHp: 22, mp: 0, maxMp: 0, size: 1, color: '#3b82f6', emoji: '🛡️', x: 544, y: 1056, skills: [{ name: 'หอกยาว (Spear)', mpCost: 0 }], inventory: [{ name: 'ใบผ่านทางเมืองด่านหน้า', qty: 5, healHp: 0, healMp: 0 }] },
            { id: 'npc-town-guard-2', name: 'ทหารยามประตูเมือง (ขวา)', faction: 'npc', charClass: 'City Guard', level: 2, baseAc: 16, ac: 16, hp: 22, maxHp: 22, mp: 0, maxMp: 0, size: 1, color: '#3b82f6', emoji: '🛡️', x: 736, y: 1056, skills: [], inventory: [] },
            { id: 'npc-town-merchant-1', name: 'พ่อค้าเสบียง (ลุงบาร์นส์)', faction: 'npc', charClass: 'Merchant', level: 1, baseAc: 11, ac: 11, hp: 12, maxHp: 12, mp: 0, maxMp: 0, size: 1, color: '#f59e0b', emoji: '💰', x: 672, y: 608, skills: [], inventory: [{ name: 'Potion of Healing', qty: 6, healHp: 10, healMp: 0 }] },
            { id: 'npc-town-merchant-2', name: 'แม่ค้าสมุนไพร (ป้ามีร่า)', faction: 'npc', charClass: 'Herbalist', level: 2, baseAc: 11, ac: 11, hp: 14, maxHp: 14, mp: 10, maxMp: 10, size: 1, color: '#10b981', emoji: '🌿', x: 672, y: 736, skills: [{ name: 'ปรุงยาแก้พิษ', mpCost: 2 }], inventory: [{ name: 'Mana Herb Tea', qty: 4, healHp: 0, healMp: 6 }] },
            { id: 'npc-town-guild-usher', name: 'เจ้าหน้าที่หน้ากิลด์', faction: 'npc', charClass: 'Guild Staff', level: 1, baseAc: 11, ac: 11, hp: 12, maxHp: 12, mp: 0, maxMp: 0, size: 1, color: '#a855f7', emoji: '📜', x: 416, y: 928, skills: [], inventory: [] }
        ]
    },
    guild: {
        title: 'กิลด์นักผจญภัย (1 ชั้น)',
        spawn: { x: 800, y: 864 },
        npcs: [
            { id: 'npc-guild-receptionist', name: 'คุณเอลิน่า (พนักงานต้อนรับกิลด์)', faction: 'npc', charClass: 'Guild Receptionist', level: 3, baseAc: 12, ac: 12, hp: 18, maxHp: 18, mp: 15, maxMp: 15, size: 1, color: '#ec4899', emoji: '👩', x: 800, y: 352, skills: [{ name: 'ลงทะเบียนนักผจญภัย', mpCost: 0 }, { name: 'จ่ายรางวัลเควส', mpCost: 0 }], inventory: [{ name: 'บัตรกิลด์นักผจญภัย', qty: 5, healHp: 0, healMp: 0 }] },
            { id: 'npc-guild-veteran', name: 'นักผจญภัยรุ่นพี่ (การ์เร็ต)', faction: 'npc', charClass: 'Ranger Lv.4', level: 4, baseAc: 15, ac: 15, hp: 34, maxHp: 34, mp: 10, maxMp: 10, size: 1, color: '#10b981', emoji: '🏹', x: 1120, y: 672, skills: [{ name: 'บอกเบาะแสมอนสเตอร์', mpCost: 0 }], inventory: [{ name: 'Potion of Healing', qty: 1, healHp: 10, healMp: 0 }] }
        ]
    },
    shop: {
        title: 'ร้านอาวุธและชุดเกราะ (1 ชั้น)',
        spawn: { x: 800, y: 864 },
        npcs: [
            { id: 'npc-shop-smith', name: 'ช่างตีเหล็กดอร์แกน (เจ้าของร้าน)', faction: 'npc', charClass: 'Blacksmith Merchant', level: 4, baseAc: 15, ac: 15, hp: 38, maxHp: 38, mp: 0, maxMp: 0, size: 1, color: '#f97316', emoji: '🧔', x: 800, y: 416, skills: [{ name: 'ค้อนช่างตีเหล็ก', mpCost: 0 }], inventory: [{ name: 'ดาบสั้น (1d6)', qty: 4, healHp: 0, healMp: 0 }, { name: 'โล่ไม้ (+2 AC)', qty: 3, healHp: 0, healMp: 0 }, { name: 'เกราะหนัง (AC 11+DEX)', qty: 3, healHp: 0, healMp: 0 }] }
        ]
    }
};

async function handlePresetSceneSelect(sceneKey) {
    if (!sceneKey) return;
    const keepPlayers = document.getElementById('keepPlayersOnSwitchCheck')?.checked ?? true;
    const carriedPlayers = keepPlayers
        ? state.tokens.filter(t => t.faction === 'player').map(t => ensureTokenRpgData(JSON.parse(JSON.stringify(t))))
        : [];

    if (sceneKey === 'dungeon') {
        loadSampleDungeonMap();
        if (carriedPlayers.length > 0) {
            carriedPlayers.forEach((p, idx) => {
                const sn = snapPositionToGrid(640 + idx * 64, 544, p.size || 1);
                p.x = sn.x; p.y = sn.y;
            });
            state.tokens = carriedPlayers;
        }
        renderAll();
        saveToLocalStorage();
        return;
    }

    // Try fetching custom committed JSON from ./scenes/{sceneKey}.json first (for GitHub Pages workflow)
    try {
        const res = await fetch(`./scenes/${sceneKey}.json`, { cache: 'no-store' });
        if (res.ok) {
            const data = await res.json();
            if (data.grid) state.grid = { ...state.grid, ...data.grid };
            state.fog = data.fog ? { cells: data.fog.cells || {}, dmDarkOpacity: 1.0 } : { cells: {}, dmDarkOpacity: 1.0 };
            state.aoeTemplates = Array.isArray(data.aoeTemplates) ? data.aoeTemplates : [];
            const sceneTokens = Array.isArray(data.tokens) ? data.tokens.map(ensureTokenRpgData) : [];
            const nonPlayers = sceneTokens.filter(t => t.faction !== 'player');
            const spawn = BUILTIN_SCENES[sceneKey]?.spawn || { x: 800, y: 864 };
            carriedPlayers.forEach((p, idx) => {
                const sn = snapPositionToGrid(spawn.x + idx * 64, spawn.y, p.size || 1);
                p.x = sn.x; p.y = sn.y;
            });
            state.tokens = keepPlayers && carriedPlayers.length > 0
                ? [...nonPlayers, ...carriedPlayers]
                : sceneTokens;
            state.tokens.forEach(t => {
                if (t.avatar) { const im = new Image(); im.src = t.avatar; avatarCache[t.avatar] = im; }
            });
            syncGridUIInputs();
            if (data.mapImageSrc) applyMapImage(data.mapImageSrc);
            renderAll();
            saveToLocalStorage();
            showToast(`โหลดฉาก "${BUILTIN_SCENES[sceneKey]?.title || sceneKey}" จากโฟลเดอร์ฉากแล้ว`);
            return;
        }
    } catch (err) {
        // Fallback to built-in generated scene
    }

    const preset = BUILTIN_SCENES[sceneKey];
    if (!preset) return;

    state.grid.size = 64;
    state.grid.offsetX = 0;
    state.grid.offsetY = 0;
    state.fog = { cells: {}, dmDarkOpacity: 1.0 };
    state.aoeTemplates = [];
    syncGridUIInputs();

    const presetNpcs = JSON.parse(JSON.stringify(preset.npcs)).map(ensureTokenRpgData);
    carriedPlayers.forEach((p, idx) => {
        const sn = snapPositionToGrid(preset.spawn.x + idx * 64, preset.spawn.y, p.size || 1);
        p.x = sn.x;
        p.y = sn.y;
    });

    state.tokens = [...presetNpcs, ...carriedPlayers];
    state.selectedTokenId = carriedPlayers[0]?.id || presetNpcs[0]?.id || null;

    const mapUrl = generatePresetMapDataUrl(sceneKey);
    applyMapImage(mapUrl);
    renderAll();
    saveToLocalStorage();
    showToast(`สลับไปยังฉาก "${preset.title}" พร้อมหมุด NPC แล้ว!`);
}

