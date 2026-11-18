// ==================== CANVAS & MAP RENDERING ====================
function resizeCanvas() {
    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function screenToWorld(sx, sy) {
    return {
        x: (sx - state.camera.x) / state.camera.zoom,
        y: (sy - state.camera.y) / state.camera.zoom
    };
}

function snapPositionToGrid(wx, wy, tokenSizeCells = 1) {
    if (!state.grid.snap) return { x: wx, y: wy };
    const gs = state.grid.size;
    const halfSpan = (tokenSizeCells * gs) / 2;
    const relX = wx - state.grid.offsetX - halfSpan;
    const relY = wy - state.grid.offsetY - halfSpan;
    const snappedX = Math.round(relX / gs) * gs + state.grid.offsetX + halfSpan;
    const snappedY = Math.round(relY / gs) * gs + state.grid.offsetY + halfSpan;
    return { x: snappedX, y: snappedY };
}

function zoomCanvas(delta, centerX = null, centerY = null) {
    const rect = container.getBoundingClientRect();
    const cx = centerX !== null ? centerX : rect.width / 2;
    const cy = centerY !== null ? centerY : rect.height / 2;
    const oldZoom = state.camera.zoom;
    const newZoom = Math.min(3.0, Math.max(0.2, oldZoom + delta));
    const worldBefore = screenToWorld(cx, cy);
    state.camera.zoom = newZoom;
    state.camera.x = cx - worldBefore.x * newZoom;
    state.camera.y = cy - worldBefore.y * newZoom;
    document.getElementById('zoomPercentLabel').textContent = Math.round(newZoom * 100) + '%';
}

function fitMapToScreen() {
    const rect = container.getBoundingClientRect();
    const pad = 40;
    const scaleX = (rect.width - pad) / state.mapWidth;
    const scaleY = (rect.height - pad) / state.mapHeight;
    const zoom = Math.min(scaleX, scaleY, 1.2);
    state.camera.zoom = Math.max(0.2, zoom);
    state.camera.x = (rect.width - state.mapWidth * state.camera.zoom) / 2;
    state.camera.y = (rect.height - state.mapHeight * state.camera.zoom) / 2;
    document.getElementById('zoomPercentLabel').textContent = Math.round(state.camera.zoom * 100) + '%';
}

function renderLoop() {
    drawBoard();
    requestAnimationFrame(renderLoop);
}

function drawBoard() {
    const rect = container.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);

    ctx.save();
    ctx.translate(state.camera.x, state.camera.y);
    ctx.scale(state.camera.zoom, state.camera.zoom);

    // 1. Map Background
    ctx.shadowColor = 'rgba(0,0,0,0.65)';
    ctx.shadowBlur = 30;
    ctx.fillStyle = '#151c28';
    ctx.fillRect(0, 0, state.mapWidth, state.mapHeight);
    ctx.shadowBlur = 0;

    if (mapImgObj && mapImgObj.complete && mapImgObj.naturalWidth > 0) {
        ctx.drawImage(mapImgObj, 0, 0, state.mapWidth, state.mapHeight);
    } else if (!state.isBlankMap) {
        drawProceduralDungeonFloor();
    } else {
        // Clean blank slate grid board when map is deleted
        ctx.fillStyle = '#111620';
        ctx.fillRect(0, 0, state.mapWidth, state.mapHeight);
        ctx.strokeStyle = '#28334a';
        ctx.lineWidth = 3;
        ctx.strokeRect(2, 2, state.mapWidth - 4, state.mapHeight - 4);
    }

    // 2. Grid Overlay
    if (state.grid.visible) {
        drawGridOverlay();
    }

    // 2.5 Skill AoE Templates (Underneath tokens so characters remain clearly visible)
    drawAoeTemplatesLayer();

    // 3. Tokens
    state.tokens.forEach(tok => drawTokenOnCanvas(tok));

    // 4. Fog of War & Shadow Blocks Overlay
    drawFogAndShadowsOverlay();

    // 5. Ruler Line
    if (rulerStart && rulerEnd) {
        drawRulerOverlay();
    }

    ctx.restore();
}

function drawProceduralDungeonFloor() {
    ctx.fillStyle = '#18202c';
    ctx.fillRect(0, 0, state.mapWidth, state.mapHeight);

    ctx.strokeStyle = '#243042';
    ctx.lineWidth = 4;
    ctx.strokeRect(48, 48, state.mapWidth - 96, state.mapHeight - 96);

    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.arc(state.mapWidth / 2, state.mapHeight / 2, 180, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = 'rgba(245, 158, 11, 0.25)';
    ctx.font = 'bold 28px Cinzel, serif';
    ctx.textAlign = 'center';
    ctx.fillText('ANCIENT SANCTUM', state.mapWidth / 2, state.mapHeight / 2 + 8);
}

function drawGridOverlay() {
    const gs = state.grid.size;
    ctx.save();
    ctx.strokeStyle = state.grid.color;
    ctx.globalAlpha = state.grid.opacity;
    ctx.lineWidth = 1;

    ctx.beginPath();
    for (let x = state.grid.offsetX % gs; x <= state.mapWidth; x += gs) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, state.mapHeight);
    }
    for (let y = state.grid.offsetY % gs; y <= state.mapHeight; y += gs) {
        ctx.moveTo(0, y);
        ctx.lineTo(state.mapWidth, y);
    }
    ctx.stroke();
    ctx.restore();
}

function drawSingleAoeTemplate(tpl, isPreview = false) {
    const gs = state.grid.size || 64;
    const radiusPx = ((tpl.radiusFeet || 20) / 5) * gs;
    const isSelected = !isPreview && tpl.id === selectedAoeId;
    const fillAlpha = isPreview ? 0.16 : (isSelected ? 0.28 : 0.22);
    const strokeAlpha = isPreview ? 0.65 : (isSelected ? 0.95 : 0.75);

    ctx.save();
    ctx.fillStyle = hexToRgba(tpl.color, fillAlpha);
    ctx.strokeStyle = isSelected ? '#fbbf24' : hexToRgba(tpl.color, strokeAlpha);
    ctx.lineWidth = Math.max(2, (isSelected ? 3 : 2.5) / state.camera.zoom);
    if (isPreview) ctx.setLineDash([6, 4]);

    ctx.beginPath();
    if (tpl.shape === 'square') {
        ctx.rect(tpl.x - radiusPx, tpl.y - radiusPx, radiusPx * 2, radiusPx * 2);
    } else {
        ctx.arc(tpl.x, tpl.y, radiusPx, 0, Math.PI * 2);
    }
    ctx.fill();
    ctx.stroke();
    ctx.setLineDash([]);

    // Center anchor dot
    ctx.fillStyle = isSelected ? '#fbbf24' : hexToRgba(tpl.color, 0.9);
    ctx.beginPath();
    ctx.arc(tpl.x, tpl.y, isSelected ? 5 : 3.5, 0, Math.PI * 2);
    ctx.fill();

    // Label badge
    const badgeText = tpl.label ? `${tpl.label} (${tpl.radiusFeet} ft)` : `${tpl.radiusFeet} ft`;
    ctx.font = '600 11px Prompt, sans-serif';
    const tw = ctx.measureText(badgeText).width;
    const pw = tw + 12;
    const ph = 18;
    ctx.fillStyle = 'rgba(11, 14, 20, 0.85)';
    ctx.beginPath();
    ctx.roundRect(tpl.x - pw / 2, tpl.y - ph - 10, pw, ph, 5);
    ctx.fill();

    ctx.fillStyle = isSelected ? '#fbbf24' : '#f8fafc';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(badgeText, tpl.x, tpl.y - ph / 2 - 10);

    ctx.restore();
}

function drawAoeTemplatesLayer() {
    if (Array.isArray(state.aoeTemplates)) {
        state.aoeTemplates.forEach(tpl => drawSingleAoeTemplate(tpl, false));
    }
    if (currentTool === 'aoe' && hoverWorldPos) {
        const labelVal = (document.getElementById('aoeLabelInput')?.value || '').trim();
        drawSingleAoeTemplate({
            shape: aoeDraft.shape === 'square' ? 'square' : 'circle',
            x: hoverWorldPos.x,
            y: hoverWorldPos.y,
            radiusFeet: aoeDraft.radiusFeet,
            color: aoeDraft.color,
            label: labelVal
        }, true);
    }
}

function drawFogAndShadowsOverlay() {
    const gs = state.grid.size || 64;
    const cells = state.fog?.cells || {};

    ctx.save();
    for (const [key, mode] of Object.entries(cells)) {
        const [colStr, rowStr] = key.split(',');
        const col = parseInt(colStr, 10);
        const row = parseInt(rowStr, 10);
        const x = col * gs + state.grid.offsetX;
        const y = row * gs + state.grid.offsetY;

        if (mode === 'dark') {
            // Solid 100% opaque fog block
            ctx.fillStyle = '#05070c';
            ctx.fillRect(x - 0.5, y - 0.5, gs + 1, gs + 1);
        } else if (mode === 'shadow') {
            // Dim / shadow block
            ctx.fillStyle = 'rgba(8, 12, 24, 0.48)';
            ctx.fillRect(x, y, gs, gs);
            ctx.strokeStyle = 'rgba(148, 163, 184, 0.16)';
            ctx.lineWidth = 1;
            ctx.strokeRect(x + 0.5, y + 0.5, gs - 1, gs - 1);
        }
    }

    // Brush hover preview cursor (supports 1x1 to 4x4)
    if (currentTool === 'fog' && hoverFogCell) {
        const hx = hoverFogCell.col * gs + state.grid.offsetX;
        const hy = hoverFogCell.row * gs + state.grid.offsetY;
        const span = gs * fogBrushSize;
        ctx.fillStyle = fogBrushMode === 'reveal'
            ? 'rgba(16, 185, 129, 0.25)'
            : (fogBrushMode === 'shadow' ? 'rgba(99, 102, 241, 0.28)' : 'rgba(245, 158, 11, 0.28)');
        ctx.fillRect(hx, hy, span, span);
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2;
        ctx.strokeRect(hx + 1, hy + 1, span - 2, span - 2);
    }
    ctx.restore();
}

function drawTokenOnCanvas(tok) {
    const gs = state.grid.size;
    const radius = (tok.size * gs) * 0.43;
    const isSelected = tok.id === state.selectedTokenId;

    ctx.save();

    // Selection Pulse Ring
    if (isSelected) {
        ctx.beginPath();
        ctx.arc(tok.x, tok.y, radius + 6, 0, Math.PI * 2);
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 3;
        ctx.setLineDash([6, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
    }

    // Base Circle & Avatar
    ctx.beginPath();
    ctx.arc(tok.x, tok.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = '#1e293b';
    ctx.fill();

    if (tok.avatar && avatarCache[tok.avatar] && avatarCache[tok.avatar].complete) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(tok.x, tok.y, radius - 2, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(avatarCache[tok.avatar], tok.x - radius, tok.y - radius, radius * 2, radius * 2);
        ctx.restore();
    } else {
        ctx.fillStyle = '#f8fafc';
        ctx.font = `bold ${Math.max(14, radius * 0.72)}px Prompt, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const label = tok.emoji ? tok.emoji : (tok.name || '?').slice(0, 2).toUpperCase();
        ctx.fillText(label, tok.x, tok.y + 1);
    }

    // Border Ring
    ctx.beginPath();
    ctx.arc(tok.x, tok.y, radius, 0, Math.PI * 2);
    ctx.strokeStyle = tok.color || '#10b981';
    ctx.lineWidth = Math.max(3, radius * 0.11);
    ctx.stroke();

    // AC Shield Badge (Top-Left)
    if (state.grid.showAc && tok.ac) {
        const bx = tok.x - radius * 0.72;
        const by = tok.y - radius * 0.72;
        const br = Math.max(11, radius * 0.34);
        ctx.beginPath();
        ctx.arc(bx, by, br, 0, Math.PI * 2);
        ctx.fillStyle = '#0f172a';
        ctx.fill();
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 1.8;
        ctx.stroke();

        ctx.fillStyle = '#fbbf24';
        ctx.font = `bold ${Math.max(9, br * 0.9)}px Prompt, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(tok.ac, bx, by + 0.5);
    }

    // Condition Icons (Top-Right)
    if (Array.isArray(tok.conditions) && tok.conditions.length > 0) {
        tok.conditions.slice(0, 4).forEach((condId, idx) => {
            const cond = CONDITIONS.find(c => c.id === condId);
            if (!cond) return;
            const angle = -Math.PI / 4 + idx * 0.55;
            const cx = tok.x + Math.cos(angle) * (radius + 6);
            const cy = tok.y + Math.sin(angle) * (radius + 6);
            ctx.font = `${Math.max(12, radius * 0.42)}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(cond.icon, cx, cy);
        });
    }

    // HP & MP Bars + Name Tag Below Token
    const barW = Math.max(46, radius * 2.1);
    const barH = 6;
    const startX = tok.x - barW / 2;
    let curY = tok.y + radius + 5;

    // HP Bar
    const hpPct = Math.max(0, Math.min(1, (tok.hp || 0) / Math.max(1, tok.maxHp || 1)));
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.fillRect(startX - 1, curY - 1, barW + 2, barH + 2);
    ctx.fillStyle = hpPct > 0.5 ? '#10b981' : (hpPct > 0.25 ? '#f59e0b' : '#ef4444');
    ctx.fillRect(startX, curY, barW * hpPct, barH);
    curY += barH + 2;

    // MP Bar (only if maxMp > 0)
    if ((tok.maxMp || 0) > 0) {
        const mpPct = Math.max(0, Math.min(1, (tok.mp || 0) / tok.maxMp));
        ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
        ctx.fillRect(startX - 1, curY - 1, barW + 2, barH - 1);
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(startX, curY, barW * mpPct, barH - 2);
        curY += barH + 1;
    }

    // Name Pill
    const nameText = tok.name || 'Unnamed';
    ctx.font = '600 11px Prompt, sans-serif';
    const textW = ctx.measureText(nameText).width;
    const pillW = textW + 10;
    const pillH = 16;
    ctx.fillStyle = 'rgba(11, 14, 20, 0.85)';
    ctx.beginPath();
    ctx.roundRect(tok.x - pillW / 2, curY + 1, pillW, pillH, 5);
    ctx.fill();

    ctx.fillStyle = '#f8fafc';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(nameText, tok.x, curY + 1 + pillH / 2);

    ctx.restore();
}

function drawRulerOverlay() {
    const dx = rulerEnd.x - rulerStart.x;
    const dy = rulerEnd.y - rulerStart.y;
    const distPx = Math.hypot(dx, dy);
    const cells = distPx / state.grid.size;
    const feet = Math.round(cells * 5);

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(rulerStart.x, rulerStart.y);
    ctx.lineTo(rulerEnd.x, rulerEnd.y);
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 6]);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(rulerStart.x, rulerStart.y, 5, 0, Math.PI * 2);
    ctx.arc(rulerEnd.x, rulerEnd.y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    const badge = document.getElementById('rulerBadge');
    badge.classList.remove('hidden');
    badge.textContent = `ระยะทาง: ${feet} ฟุต (${cells.toFixed(1)} ช่อง)`;
}

