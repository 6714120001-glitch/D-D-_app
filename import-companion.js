// ==================== IMPORT CHARACTER FROM JSON (dnd-companion) ====================
function calculateDndAcFromStats(rawChar) {
    // Standard D&D 5e Unarmored AC = 10 + DEX Modifier
    // (Or 10 + DEX + CON for Barbarian, 10 + DEX + WIS for Monk if class hints match)
    const st = rawChar.st || rawChar.stats || {};
    const dex = Number(st.DEX ?? st.dex ?? 10);
    const con = Number(st.CON ?? st.con ?? 10);
    const wis = Number(st.WIS ?? st.wis ?? 10);

    const dexMod = Math.floor((dex - 10) / 2);
    const conMod = Math.floor((con - 10) / 2);
    const wisMod = Math.floor((wis - 10) / 2);

    const cls = String(rawChar.class || rawChar.charClass || '').toLowerCase();
    let ac = 10 + dexMod;
    if (cls.includes('barbarian') || cls.includes('คนเถื่อน')) {
        ac = 10 + dexMod + conMod;
    } else if (cls.includes('monk') || cls.includes('นักพรต')) {
        ac = 10 + dexMod + wisMod;
    }
    return Math.max(1, ac);
}

function handleCharacterJsonImport(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
        try {
            const data = JSON.parse(ev.target.result);
            const charList = Array.isArray(data.chars)
                ? data.chars
                : (Array.isArray(data) ? data : [data]);

            if (charList.length === 0) {
                showToast('ไม่พบข้อมูลตัวละครในไฟล์ JSON');
                return;
            }

            const rect = container.getBoundingClientRect();
            const centerWorld = screenToWorld(rect.width / 2, rect.height / 2);
            let importedCount = 0;

            charList.forEach((ch, idx) => {
                const hpArr = Array.isArray(ch.hp) ? ch.hp : [Number(ch.hp ?? 10), Number(ch.maxHp ?? ch.hp ?? 10)];
                const mpArr = Array.isArray(ch.mp) ? ch.mp : [Number(ch.mp ?? 0), Number(ch.maxMp ?? ch.mp ?? 0)];

                const hp = Number(hpArr[0]) || 0;
                const maxHp = Math.max(1, Number(hpArr[1]) || hp || 10);
                const mp = Number(mpArr[0]) || 0;
                const maxMp = Math.max(0, Number(mpArr[1]) || mp || 0);
                const level = Math.max(1, Number(ch.lv ?? ch.level ?? 1));
                const computedAc = ch.ac ? Number(ch.ac) : calculateDndAcFromStats(ch);
                const charName = (ch.name && String(ch.name).trim())
                    ? String(ch.name).trim()
                    : `ตัวละคร Lv.${level}`;

                // Map magic (mg) & abilities (ab) into lightweight quick skills
                const skills = [];
                if (Array.isArray(ch.mg)) {
                    ch.mg.forEach(m => {
                        if (m && m.a) {
                            skills.push({
                                id: 'sk-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
                                name: m.a,
                                mpCost: Number(m.c) || 0,
                                desc: m.b || ''
                            });
                        }
                    });
                }
                if (Array.isArray(ch.ab)) {
                    ch.ab.forEach(a => {
                        if (a && a.a) {
                            skills.push({
                                id: 'ab-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
                                name: a.a,
                                mpCost: 0,
                                desc: a.b || ''
                            });
                        }
                    });
                }

                // Map bag items if present
                const inventory = Array.isArray(ch.bag)
                    ? ch.bag.filter(it => it && (it.a || it.name)).map(it => ({
                        id: 'it-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
                        name: it.a || it.name,
                        qty: Number(it.q ?? it.qty ?? 1) || 1,
                        healHp: Number(it.healHp ?? 0) || 0,
                        healMp: Number(it.healMp ?? 0) || 0
                    }))
                    : [];

                const avatarSrc = (ch.img && String(ch.img).trim()) ? String(ch.img).trim() : null;
                if (avatarSrc) {
                    const im = new Image();
                    im.src = avatarSrc;
                    avatarCache[avatarSrc] = im;
                }

                const snapped = snapPositionToGrid(
                    centerWorld.x + idx * (state.grid.size || 64),
                    centerWorld.y,
                    1
                );

                const newTok = ensureTokenRpgData({
                    id: 'tok-' + Date.now() + '-' + idx,
                    name: charName,
                    faction: 'player',
                    charClass: ch.class || ch.charClass || '',
                    level,
                    baseAc: computedAc,
                    ac: computedAc,
                    hp,
                    maxHp,
                    mp,
                    maxMp,
                    size: 1,
                    color: '#10b981',
                    emoji: avatarSrc ? '' : '⚔️',
                    avatar: avatarSrc,
                    x: snapped.x,
                    y: snapped.y,
                    conditions: [],
                    skills,
                    inventory
                });

                state.tokens.push(newTok);
                state.selectedTokenId = newTok.id;
                importedCount++;
            });

            renderAll();
            saveToLocalStorage();
            showToast(`นำเข้าตัวละคร ${importedCount} ตัวเรียบร้อย (คำนวณ AC ตามกฎ D&D แล้ว)`);
        } catch (err) {
            showToast('ไม่สามารถอ่านไฟล์ตัวละคร JSON ได้');
        }
    };
    reader.readAsText(file);
}

document.getElementById('charImportInput').addEventListener('change', (e) => {
    handleCharacterJsonImport(e.target.files[0]);
    e.target.value = '';
});

document.getElementById('charImportSidebarInput').addEventListener('change', (e) => {
    handleCharacterJsonImport(e.target.files[0]);
    e.target.value = '';
});

function deleteToken(id) {
    state.tokens = state.tokens.filter(t => t.id !== id);
    if (state.selectedTokenId === id) state.selectedTokenId = null;
    renderAll();
    saveToLocalStorage();
    showToast('ลบหมุดออกจากแผนที่แล้ว');
}

// Quick Add Skill & Bag Item directly in Inspector
function quickAddInspectorSkill(id) {
    const tok = state.tokens.find(t => t.id === id);
    if (!tok) return;
    const nameEl = document.getElementById('inspQuickSkillName');
    const costEl = document.getElementById('inspQuickSkillCost');
    const name = nameEl.value.trim();
    if (!name) return;
    const mpCost = parseInt(costEl.value) || 0;
    tok.skills.push({ id: 'sk-' + Date.now(), name, mpCost, desc: '' });
    renderAll();
    saveToLocalStorage();
}

function useTokenSkill(id, idx) {
    const tok = state.tokens.find(t => t.id === id);
    if (!tok || !tok.skills[idx]) return;
    const sk = tok.skills[idx];
    if ((sk.mpCost || 0) > 0) {
        if ((tok.mp || 0) < sk.mpCost) {
            showToast(`MP ไม่พอสำหรับใช้ ${sk.name}!`);
            return;
        }
        tok.mp -= sk.mpCost;
    }
    renderAll();
    saveToLocalStorage();
    showToast(`${tok.name} ใช้สกิล "${sk.name}"${sk.mpCost ? ` (-${sk.mpCost} MP)` : ''}`);
}

function removeTokenSkill(id, idx) {
    const tok = state.tokens.find(t => t.id === id);
    if (!tok) return;
    tok.skills.splice(idx, 1);
    renderAll();
    saveToLocalStorage();
}

function quickAddInspectorItem(id) {
    const tok = state.tokens.find(t => t.id === id);
    if (!tok) return;
    const name = document.getElementById('inspQuickItemName').value.trim();
    if (!name) return;
    const qty = parseInt(document.getElementById('inspQuickItemQty').value) || 1;
    const healHp = parseInt(document.getElementById('inspQuickItemHp').value) || 0;
    const healMp = parseInt(document.getElementById('inspQuickItemMp').value) || 0;
    tok.inventory.push({ id: 'it-' + Date.now(), name, qty, healHp, healMp });
    renderAll();
    saveToLocalStorage();
}

function useTokenBagItem(id, idx) {
    const tok = state.tokens.find(t => t.id === id);
    if (!tok || !tok.inventory[idx]) return;
    const item = tok.inventory[idx];
    if (item.healHp) tok.hp = Math.min(tok.maxHp, (tok.hp || 0) + Number(item.healHp));
    if (item.healMp) tok.mp = Math.min(tok.maxMp, (tok.mp || 0) + Number(item.healMp));
    item.qty = (item.qty || 1) - 1;
    if (item.qty <= 0) tok.inventory.splice(idx, 1);
    renderAll();
    saveToLocalStorage();
    showToast(`${tok.name} ใช้ "${item.name}"`);
}

function removeTokenBagItem(id, idx) {
    const tok = state.tokens.find(t => t.id === id);
    if (!tok) return;
    tok.inventory.splice(idx, 1);
    renderAll();
    saveToLocalStorage();
}

