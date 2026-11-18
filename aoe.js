// ==================== SKILL AOE TEMPLATES ====================
function setAoeShape(shape) {
    aoeDraft.shape = shape === 'square' ? 'square' : 'circle';
    ['circle', 'square'].forEach(s => {
        const btn = document.getElementById(`aoeShape-${s}`);
        if (btn) {
            btn.className = s === aoeDraft.shape
                ? 'px-2.5 py-1 rounded bg-amber-500 text-slate-950 text-[11px] font-bold'
                : 'px-2.5 py-1 rounded text-slate-300 hover:text-white text-[11px] font-semibold';
        }
    });
}

function setAoeColor(hex) {
    aoeDraft.color = hex;
    document.querySelectorAll('#aoeColorPicker button').forEach(btn => {
        btn.classList.remove('ring-2', 'ring-white');
        if (btn.getAttribute('data-color') === hex) {
            btn.classList.add('ring-2', 'ring-white');
        }
    });
}

function setAoeRadiusFeet(feet) {
    aoeDraft.radiusFeet = feet || 20;
}

function getSelectedAoe() {
    if (!selectedAoeId || !Array.isArray(state.aoeTemplates)) return null;
    return state.aoeTemplates.find(a => a.id === selectedAoeId) || null;
}

function selectAoeTemplate(id) {
    selectedAoeId = id;
    updateSelectedAoeBar();
}

function deselectAoe() {
    selectedAoeId = null;
    updateSelectedAoeBar();
}

function updateSelectedAoeBar() {
    const bar = document.getElementById('selectedAoeControlBar');
    const tpl = getSelectedAoe();
    if (!bar) return;
    if (!tpl) {
        bar.classList.add('hidden');
        return;
    }
    bar.classList.remove('hidden');
    const shapeNames = { circle: 'วงกลม', square: 'สี่เหลี่ยม' };
    document.getElementById('selectedAoeTitle').textContent = tpl.label
        ? `${tpl.label} (${tpl.radiusFeet} ft)`
        : `${shapeNames[tpl.shape] || 'พื้นที่สกิล'} (${tpl.radiusFeet} ft)`;
}

function deleteSelectedAoe() {
    if (!selectedAoeId) return;
    state.aoeTemplates = (state.aoeTemplates || []).filter(a => a.id !== selectedAoeId);
    selectedAoeId = null;
    updateSelectedAoeBar();
    saveToLocalStorage();
    showToast('ลบพื้นที่เอฟเฟกต์สกิลที่เลือกแล้ว');
}

function clearAllAoeTemplates() {
    state.aoeTemplates = [];
    selectedAoeId = null;
    updateSelectedAoeBar();
    saveToLocalStorage();
    showToast('ล้างพื้นที่เอฟเฟกต์สกิลทั้งหมดแล้ว');
}

function hexToRgba(hex, alpha) {
    const clean = hex.replace('#', '');
    const r = parseInt(clean.substring(0, 2), 16) || 239;
    const g = parseInt(clean.substring(2, 4), 16) || 68;
    const b = parseInt(clean.substring(4, 6), 16) || 68;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function findAoeAtWorld(wx, wy) {
    if (!Array.isArray(state.aoeTemplates)) return null;
    const gs = state.grid.size || 64;
    for (let i = state.aoeTemplates.length - 1; i >= 0; i--) {
        const tpl = state.aoeTemplates[i];
        const radiusPx = ((tpl.radiusFeet || 20) / 5) * gs;
        const dx = wx - tpl.x;
        const dy = wy - tpl.y;
        const dist = Math.hypot(dx, dy);

        if (tpl.shape === 'square') {
            if (Math.abs(dx) <= radiusPx && Math.abs(dy) <= radiusPx) {
                return tpl;
            }
        } else {
            if (dist <= Math.max(24, radiusPx)) {
                return tpl;
            }
        }
    }
    return null;
}

