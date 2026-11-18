// ==================== POINTER & CANVAS INTERACTION ====================
function getCanvasPos(e) {
    const rect = canvas.getBoundingClientRect();
    const touch = (e.touches && e.touches[0]) || (e.changedTouches && e.changedTouches[0]);
    const clientX = touch ? touch.clientX : e.clientX;
    const clientY = touch ? touch.clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
}

function findTokenAtWorld(wx, wy) {
    const gs = state.grid.size || 64;
    for (let i = state.tokens.length - 1; i >= 0; i--) {
        const tok = state.tokens[i];
        const radius = Math.max(28, ((tok.size || 1) * gs) * 0.55);
        if (Math.hypot(wx - tok.x, wy - tok.y) <= radius) {
            return tok;
        }
    }
    return null;
}

function onCanvasPointerDown(e) {
    if (e.button === 2) return;
    const pos = getCanvasPos(e);
    const worldPos = screenToWorld(pos.x, pos.y);

    if (currentTool === 'fog') {
        isPaintingFog = true;
        lastPaintedFogCell = null;
        applyFogBrushAtWorld(worldPos.x, worldPos.y);
        return;
    }

    if (currentTool === 'aoe') {
        const labelVal = (document.getElementById('aoeLabelInput')?.value || '').trim();
        const snapPos = state.grid.snap
            ? {
                x: Math.round((worldPos.x - state.grid.offsetX) / state.grid.size) * state.grid.size + state.grid.offsetX,
                y: Math.round((worldPos.y - state.grid.offsetY) / state.grid.size) * state.grid.size + state.grid.offsetY
            }
            : worldPos;
        if (!Array.isArray(state.aoeTemplates)) state.aoeTemplates = [];
        const newId = 'aoe-' + Date.now();
        state.aoeTemplates.push({
            id: newId,
            shape: aoeDraft.shape === 'square' ? 'square' : 'circle',
            x: snapPos.x,
            y: snapPos.y,
            radiusFeet: aoeDraft.radiusFeet,
            color: aoeDraft.color,
            label: labelVal
        });
        selectAoeTemplate(newId);
        setTool('select');
        saveToLocalStorage();
        showToast('วางพื้นที่เอฟเฟกต์สกิลแล้ว');
        return;
    }

    if (currentTool === 'ruler') {
        isMeasuring = true;
        rulerStart = worldPos;
        rulerEnd = worldPos;
        return;
    }

    // 1. Check Token FIRST in BOTH 'select' and 'pan' modes!
    const hitTok = findTokenAtWorld(worldPos.x, worldPos.y);
    if (hitTok) {
        e.stopPropagation();
        isPanning = false;
        draggingAoe = null;
        deselectAoe();
        state.selectedTokenId = hitTok.id;
        draggingToken = hitTok;
        dragOffset = { x: worldPos.x - hitTok.x, y: worldPos.y - hitTok.y };
        canvas.style.cursor = 'grabbing';
        state.tokens = state.tokens.filter(t => t.id !== hitTok.id);
        state.tokens.push(hitTok);
        renderAll();
        return;
    }

    if (currentTool === 'pan' || e.button === 1) {
        isPanning = true;
        lastPointer = { x: pos.x, y: pos.y };
        canvas.style.cursor = 'grabbing';
        return;
    }

    // 2. Check Skill AoE Template
    const hitAoe = findAoeAtWorld(worldPos.x, worldPos.y);
    if (hitAoe) {
        isPanning = false;
        selectAoeTemplate(hitAoe.id);
        draggingAoe = hitAoe;
        aoeDragOffset = { x: worldPos.x - hitAoe.x, y: worldPos.y - hitAoe.y };
        canvas.style.cursor = 'grabbing';
        return;
    }

    // 3. Empty space -> Deselect AoE & Pan map
    deselectAoe();
    isPanning = true;
    lastPointer = { x: pos.x, y: pos.y };
    canvas.style.cursor = 'grabbing';
}

function onCanvasPointerMove(e) {
    const pos = getCanvasPos(e);
    const worldPos = screenToWorld(pos.x, pos.y);

    if (currentTool === 'fog') {
        hoverFogCell = worldToGridCell(worldPos.x, worldPos.y);
    } else {
        hoverFogCell = null;
    }

    if (currentTool === 'aoe') {
        hoverWorldPos = state.grid.snap
            ? {
                x: Math.round((worldPos.x - state.grid.offsetX) / state.grid.size) * state.grid.size + state.grid.offsetX,
                y: Math.round((worldPos.y - state.grid.offsetY) / state.grid.size) * state.grid.size + state.grid.offsetY
            }
            : worldPos;
    } else {
        hoverWorldPos = null;
    }

    if (isPaintingFog) {
        applyFogBrushAtWorld(worldPos.x, worldPos.y);
        return;
    }

    if (draggingToken) {
        if (e.cancelable) e.preventDefault();
        draggingToken.x = worldPos.x - dragOffset.x;
        draggingToken.y = worldPos.y - dragOffset.y;
        return;
    }

    if (draggingAoe) {
        if (e.cancelable) e.preventDefault();
        draggingAoe.x = worldPos.x - aoeDragOffset.x;
        draggingAoe.y = worldPos.y - aoeDragOffset.y;
        return;
    }

    if (isMeasuring) {
        rulerEnd = worldPos;
        return;
    }

    if (isPanning) {
        state.camera.x += pos.x - lastPointer.x;
        state.camera.y += pos.y - lastPointer.y;
        lastPointer = { x: pos.x, y: pos.y };
        return;
    }

    // Hover cursor feedback when in select mode
    if (currentTool === 'select') {
        const overTok = findTokenAtWorld(worldPos.x, worldPos.y);
        const overAoe = !overTok && findAoeAtWorld(worldPos.x, worldPos.y);
        canvas.style.cursor = (overTok || overAoe) ? 'grab' : 'default';
    }
}

function onCanvasPointerUp() {
    if (isPaintingFog) {
        isPaintingFog = false;
        lastPaintedFogCell = null;
    }
    if (isPanning) {
        isPanning = false;
        canvas.style.cursor = currentTool === 'pan' ? 'grab' : ((currentTool === 'fog' || currentTool === 'aoe') ? 'crosshair' : 'default');
    }
    if (isMeasuring) {
        isMeasuring = false;
        setTimeout(() => {
            if (!isMeasuring) {
                rulerStart = null;
                rulerEnd = null;
                document.getElementById('rulerBadge').classList.add('hidden');
            }
        }, 1500);
    }
    if (draggingAoe) {
        if (state.grid.snap) {
            draggingAoe.x = Math.round((draggingAoe.x - state.grid.offsetX) / state.grid.size) * state.grid.size + state.grid.offsetX;
            draggingAoe.y = Math.round((draggingAoe.y - state.grid.offsetY) / state.grid.size) * state.grid.size + state.grid.offsetY;
        }
        draggingAoe = null;
        canvas.style.cursor = 'default';
        saveToLocalStorage();
    }
    if (draggingToken) {
        const snapped = snapPositionToGrid(draggingToken.x, draggingToken.y, draggingToken.size);
        draggingToken.x = snapped.x;
        draggingToken.y = snapped.y;
        draggingToken = null;
        canvas.style.cursor = 'default';
        saveToLocalStorage();
    }
}

canvas.addEventListener('mousedown', onCanvasPointerDown);
window.addEventListener('mousemove', onCanvasPointerMove);
window.addEventListener('mouseup', onCanvasPointerUp);

// Right-click on canvas to delete an AoE template under cursor
canvas.addEventListener('contextmenu', (e) => {
    const pos = getCanvasPos(e);
    const worldPos = screenToWorld(pos.x, pos.y);
    const hitAoe = findAoeAtWorld(worldPos.x, worldPos.y);
    if (hitAoe) {
        e.preventDefault();
        if (selectedAoeId === hitAoe.id) {
            selectedAoeId = null;
            updateSelectedAoeBar();
        }
        state.aoeTemplates = state.aoeTemplates.filter(a => a.id !== hitAoe.id);
        saveToLocalStorage();
        showToast('ลบพื้นที่เอฟเฟกต์สกิลแล้ว');
    }
});

canvas.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) onCanvasPointerDown(e);
}, { passive: false });
canvas.addEventListener('touchmove', (e) => {
    if (e.touches.length === 1) onCanvasPointerMove(e);
}, { passive: false });
canvas.addEventListener('touchend', onCanvasPointerUp);

canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const pos = getCanvasPos(e);
    const delta = e.deltaY < 0 ? 0.1 : -0.1;
    zoomCanvas(delta, pos.x, pos.y);
}, { passive: false });

