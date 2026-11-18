// ==================== FOG OF WAR & SHADOW BRUSH ====================
function setFogBrushMode(mode) {
    fogBrushMode = mode;
    const activeBtn = 'px-2.5 py-1 rounded-xl text-xs font-bold bg-amber-500 text-slate-950 transition';
    const normalBtn = 'px-2.5 py-1 rounded-xl text-xs font-semibold bg-vtt-bg text-slate-300 hover:text-white border border-vtt-border transition';
    document.getElementById('fogModeDarkBtn').className = mode === 'dark' ? activeBtn : normalBtn;
    document.getElementById('fogModeShadowBtn').className = mode === 'shadow' ? activeBtn : normalBtn;
    document.getElementById('fogModeRevealBtn').className = mode === 'reveal' ? activeBtn : normalBtn;
}

function setFogBrushSize(size) {
    fogBrushSize = size;
    [1, 2, 3, 4].forEach(s => {
        const floatBtn = document.getElementById(`fogSizeBtn-${s}`);
        if (floatBtn) {
            floatBtn.className = s === size
                ? 'px-2 py-0.5 rounded bg-amber-500 text-slate-950 text-[11px] font-bold'
                : 'px-2 py-0.5 rounded text-slate-300 hover:text-white text-[11px] font-semibold';
        }
        const sideBtn = document.getElementById(`sidebarBrushSize-${s}`);
        if (sideBtn) {
            sideBtn.className = s === size
                ? 'py-1 rounded-lg bg-amber-500 text-slate-950 font-bold text-xs'
                : 'py-1 rounded-lg bg-vtt-bg hover:bg-slate-800 border border-vtt-border text-slate-300 text-xs';
        }
    });
}

function worldToGridCell(wx, wy) {
    const gs = state.grid.size || 64;
    const col = Math.floor((wx - state.grid.offsetX) / gs);
    const row = Math.floor((wy - state.grid.offsetY) / gs);
    return { col, row };
}

function applyFogBrushAtWorld(wx, wy) {
    const { col, row } = worldToGridCell(wx, wy);
    const key = `${col},${row}`;
    if (lastPaintedFogCell === key) return;
    lastPaintedFogCell = key;

    if (!state.fog) state.fog = { cells: {}, dmDarkOpacity: 1.0 };
    for (let dc = 0; dc < fogBrushSize; dc++) {
        for (let dr = 0; dr < fogBrushSize; dr++) {
            const cellKey = `${col + dc},${row + dr}`;
            if (fogBrushMode === 'reveal') {
                delete state.fog.cells[cellKey];
            } else {
                state.fog.cells[cellKey] = fogBrushMode; // 'dark' | 'shadow'
            }
        }
    }
    saveToLocalStorage();
}

function fillAllFog(mode) {
    if (!state.fog) state.fog = { cells: {}, dmDarkOpacity: 1.0 };
    const gs = state.grid.size || 64;
    const startCol = Math.floor(-state.grid.offsetX / gs) - 1;
    const endCol = Math.ceil((state.mapWidth - state.grid.offsetX) / gs) + 1;
    const startRow = Math.floor(-state.grid.offsetY / gs) - 1;
    const endRow = Math.ceil((state.mapHeight - state.grid.offsetY) / gs) + 1;

    state.fog.cells = {};
    for (let c = startCol; c <= endCol; c++) {
        for (let r = startRow; r <= endRow; r++) {
            state.fog.cells[`${c},${r}`] = mode;
        }
    }
    saveToLocalStorage();
    showToast(mode === 'dark' ? 'ปิดทึบทั้งแผนที่แล้ว' : 'ใส่เงาสลัวทั้งแผนที่แล้ว');
}

function clearAllFog() {
    if (!state.fog) state.fog = { cells: {}, dmDarkOpacity: 1.0 };
    state.fog.cells = {};
    saveToLocalStorage();
    showToast('เปิดสว่างทั้งแผนที่แล้ว');
}

function switchLeftTab(tab) {
    document.getElementById('leftTabTokens').classList.toggle('hidden', tab !== 'tokens');
    document.getElementById('leftTabGrid').classList.toggle('hidden', tab !== 'grid');

    const active = 'py-2 text-xs font-semibold rounded-lg bg-vtt-card text-amber-400 shadow';
    const inactive = 'py-2 text-xs font-medium rounded-lg text-slate-400 hover:text-slate-200';
    document.getElementById('tabBtnTokens').className = tab === 'tokens' ? active : inactive;
    document.getElementById('tabBtnGrid').className = tab === 'grid' ? active : inactive;
}

function toggleLeftSidebar() {
    const el = document.getElementById('leftSidebar');
    const label = document.getElementById('toggleLeftLabel');
    const isCollapsed = el.classList.toggle('-translate-x-full');
    if (label) {
        label.textContent = isCollapsed ? 'เปิดแถบซ้าย' : 'พับแถบซ้าย';
    }
}

function showToast(msg) {
    const box = document.getElementById('toastBox');
    const label = document.getElementById('toastMessage');
    label.textContent = msg;
    box.classList.remove('opacity-0');
    clearTimeout(window._toastTimer);
    window._toastTimer = setTimeout(() => box.classList.add('opacity-0'), 2800);
}

