// ==================== SAVE / LOAD SCENE JSON ====================
function saveSceneJSON() {
    const payload = {
        version: '1.4',
        savedAt: new Date().toISOString(),
        grid: state.grid,
        fog: state.fog || { cells: {}, dmDarkOpacity: 1.0 },
        aoeTemplates: state.aoeTemplates || [],
        spawn: state.spawn || {},
        tokens: state.tokens,
        mapImageSrc: state.mapImageSrc
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dnd_scene_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('บันทึกไฟล์ฉาก .JSON เรียบร้อยแล้ว');
}

document.getElementById('sceneLoadInput').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
        try {
            const data = JSON.parse(ev.target.result);
            if (data.grid) state.grid = { ...state.grid, ...data.grid };
            state.fog = data.fog ? { cells: data.fog.cells || {}, dmDarkOpacity: 1.0 } : { cells: {}, dmDarkOpacity: 1.0 };
            state.aoeTemplates = Array.isArray(data.aoeTemplates) ? data.aoeTemplates : [];
            state.spawn = (data.spawn && typeof data.spawn === 'object') ? data.spawn : {};
            if (Array.isArray(data.tokens)) {
                state.tokens = data.tokens.map(ensureTokenRpgData);
                state.tokens.forEach(t => {
                    if (t.avatar) {
                        const im = new Image();
                        im.src = t.avatar;
                        avatarCache[t.avatar] = im;
                    }
                });
            }
            syncGridUIInputs();
            if (data.mapImageSrc) {
                applyMapImage(data.mapImageSrc);
            } else {
                loadSampleDungeonMap();
            }
            renderAll();
            saveToLocalStorage();
            showToast('โหลดฉากและหมุดทั้งหมดสำเร็จ!');
        } catch (err) {
            showToast('ไฟล์ฉากไม่ถูกต้อง');
        }
    };
    reader.readAsText(file);
});

function syncGridUIInputs() {
    document.getElementById('gridVisibleCheck').checked = state.grid.visible;
    document.getElementById('gridSnapCheck').checked = state.grid.snap;
    document.getElementById('gridShowAcCheck').checked = state.grid.showAc;
    document.getElementById('gridSizeRange').value = state.grid.size;
    document.getElementById('gridOpacityRange').value = Math.round(state.grid.opacity * 100);
    document.getElementById('gridOffsetXRange').value = state.grid.offsetX;
    document.getElementById('gridOffsetYRange').value = state.grid.offsetY;
    document.getElementById('gridSizeVal').textContent = state.grid.size + ' px';
    document.getElementById('gridOpacityVal').textContent = Math.round(state.grid.opacity * 100) + '%';
    document.getElementById('gridOffsetXVal').textContent = state.grid.offsetX + ' px';
    document.getElementById('gridOffsetYVal').textContent = state.grid.offsetY + ' px';
}

function saveToLocalStorage() {
    try {
        const lightState = {
            grid: state.grid,
            fog: state.fog,
            aoeTemplates: state.aoeTemplates || [],
            tokens: state.tokens,
            selectedTokenId: state.selectedTokenId
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(lightState));
    } catch (e) {
        // Ignore storage quota errors
    }
}

function loadFromLocalStorage() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return false;
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.tokens)) {
            state.grid = { ...state.grid, ...(parsed.grid || {}) };
            state.fog = parsed.fog ? { cells: parsed.fog.cells || {}, dmDarkOpacity: 1.0 } : { cells: {}, dmDarkOpacity: 1.0 };
            state.aoeTemplates = Array.isArray(parsed.aoeTemplates) ? parsed.aoeTemplates : [];
            state.tokens = parsed.tokens.map(ensureTokenRpgData);
            state.tokens.forEach(t => {
                if (t.avatar) {
                    const im = new Image();
                    im.src = t.avatar;
                    avatarCache[t.avatar] = im;
                }
            });
            state.selectedTokenId = parsed.selectedTokenId || null;
            return true;
        }
    } catch (e) {
        return false;
    }
    return false;
}

function escapeHtml(str) {
    return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

