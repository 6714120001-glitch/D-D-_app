// ==================== TOKEN MANAGEMENT ====================
function selectNewTokenColor(hex) {
    newTokenDraftColor = hex;
    document.querySelectorAll('#colorSwatches button').forEach(btn => {
        btn.classList.remove('ring-2', 'ring-white');
        if (btn.getAttribute('data-color') === hex) btn.classList.add('ring-2', 'ring-white');
    });
}

document.getElementById('newTokenAvatarInput').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
        newTokenDraftAvatar = ev.target.result;
        const img = new Image();
        img.src = newTokenDraftAvatar;
        avatarCache[newTokenDraftAvatar] = img;
        document.getElementById('avatarFileLabel').textContent = file.name;
    };
    reader.readAsDataURL(file);
});

function createNewToken() {
    const nameInput = document.getElementById('newTokenName');
    const name = nameInput.value.trim() || 'นักผจญภัย';
    const faction = document.getElementById('newTokenFaction').value;
    const charClass = document.getElementById('newTokenClass').value.trim();
    const level = parseInt(document.getElementById('newTokenLevel').value) || 1;
    const ac = parseInt(document.getElementById('newTokenAc').value) || 12;
    const hp = parseInt(document.getElementById('newTokenHp').value) || 20;
    const maxHp = parseInt(document.getElementById('newTokenMaxHp').value) || hp;
    const mp = parseInt(document.getElementById('newTokenMp').value) || 0;
    const maxMp = parseInt(document.getElementById('newTokenMaxMp').value) || mp;
    const size = parseInt(document.getElementById('newTokenSize').value) || 1;
    const emoji = document.getElementById('newTokenEmoji').value;

    const rect = container.getBoundingClientRect();
    const centerWorld = screenToWorld(rect.width / 2, rect.height / 2);
    const snapped = snapPositionToGrid(centerWorld.x, centerWorld.y, size);

    const tok = ensureTokenRpgData({
        id: 'tok-' + Date.now(),
        name,
        faction,
        charClass,
        level,
        baseAc: ac,
        ac,
        hp,
        maxHp,
        mp,
        maxMp,
        size,
        color: newTokenDraftColor,
        emoji,
        avatar: newTokenDraftAvatar,
        x: snapped.x,
        y: snapped.y,
        conditions: [],
        skills: [],
        inventory: [],
        equipment: [],
        buffs: []
    });

    state.tokens.push(tok);
    state.selectedTokenId = tok.id;

    nameInput.value = '';
    newTokenDraftAvatar = null;
    document.getElementById('avatarFileLabel').textContent = 'เลือกรูป...';

    renderAll();
    saveToLocalStorage();
    showToast(`วางหมุด "${tok.name}" ลงแผนที่แล้ว`);
}

function clearAllTokens() {
    state.tokens = [];
    state.selectedTokenId = null;
    renderAll();
    saveToLocalStorage();
    showToast('ล้างหมุดทั้งหมดแล้ว');
}

function selectToken(id) {
    state.selectedTokenId = id;
    renderAll();
}

function deselectToken() {
    state.selectedTokenId = null;
    renderAll();
}

function getSelectedToken() {
    return state.tokens.find(t => t.id === state.selectedTokenId) || null;
}

function adjustTokenPool(id, field, delta) {
    const tok = state.tokens.find(t => t.id === id);
    if (!tok) return;
    if (field === 'hp') {
        tok.hp = Math.max(0, Math.min(tok.maxHp, (tok.hp || 0) + delta));
    } else if (field === 'mp') {
        tok.mp = Math.max(0, Math.min(tok.maxMp, (tok.mp || 0) + delta));
    }
    renderAll();
    saveToLocalStorage();
}

function updateTokenField(id, field, value) {
    const tok = state.tokens.find(t => t.id === id);
    if (!tok) return;
    tok[field] = value;
    renderAll();
    saveToLocalStorage();
}

function uploadTokenAvatarFromInspector(id, inputEl) {
    const file = inputEl.files && inputEl.files[0];
    if (!file) return;
    const tok = state.tokens.find(t => t.id === id);
    if (!tok) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
        const dataUrl = ev.target.result;
        const img = new Image();
        img.onload = () => {
            avatarCache[dataUrl] = img;
            tok.avatar = dataUrl;
            renderAll();
            saveToLocalStorage();
            showToast(`เปลี่ยนรูปหมุด "${tok.name}" เรียบร้อยแล้ว`);
        };
        img.src = dataUrl;
    };
    reader.readAsDataURL(file);
}

function removeTokenAvatar(id) {
    const tok = state.tokens.find(t => t.id === id);
    if (!tok) return;
    tok.avatar = null;
    renderAll();
    saveToLocalStorage();
    showToast('ลบรูปโปรไฟล์หมุดแล้ว');
}

function toggleTokenCondition(id, condId) {
    const tok = state.tokens.find(t => t.id === id);
    if (!tok) return;
    if (!Array.isArray(tok.conditions)) tok.conditions = [];
    if (tok.conditions.includes(condId)) {
        tok.conditions = tok.conditions.filter(c => c !== condId);
    } else {
        tok.conditions.push(condId);
    }
    renderAll();
    saveToLocalStorage();
}

function duplicateToken(id) {
    const orig = state.tokens.find(t => t.id === id);
    if (!orig) return;
    const copy = ensureTokenRpgData(JSON.parse(JSON.stringify(orig)));
    copy.id = 'tok-' + Date.now();
    copy.name = orig.name + ' (สำเนา)';
    copy.x += state.grid.size;
    state.tokens.push(copy);
    state.selectedTokenId = copy.id;
    renderAll();
    saveToLocalStorage();
    showToast(`คัดลอกหมุด "${copy.name}" แล้ว`);
}

