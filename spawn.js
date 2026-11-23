/* js/features/spawn.js — จุดเกิดของหมุด (1 จุดต่อฝ่าย: ผู้เล่น / NPC / ศัตรู)
   ถ้าฝ่ายไหนไม่ตั้งจุดเกิด หมุดฝ่ายนั้นจะเกิดกลางแมพเหมือนเดิม */
(function () {
    'use strict';
    const KEY = 'mapdd_spawn_v1';
    const COL = { player: '#10b981', npc: '#3b82f6', enemy: '#ef4444' };
    const NAME = { player: 'ผู้เล่น', npc: 'NPC', enemy: 'ศัตรู / มอนสเตอร์' };
    let placing = null, show = true;

    try { const r = JSON.parse(localStorage.getItem(KEY)); if (r) { state.spawn = r.spawn || {}; show = r.show !== false; } } catch (e) { }
    if (!state.spawn) state.spawn = {};
    const saveLocal = () => { try { localStorage.setItem(KEY, JSON.stringify({ spawn: state.spawn, show })); } catch (e) { } };

    // ---------- วางหมุดที่จุดเกิด (กระจายเป็นวงเมื่อมีหมุดอยู่แล้ว) ----------
    const SP = [[0, 0]];
    for (let r = 1; r <= 8; r++) for (let dx = -r; dx <= r; dx++) for (let dy = -r; dy <= r; dy++) if (Math.max(Math.abs(dx), Math.abs(dy)) === r) SP.push([dx, dy]);
    SP.sort((a, b) => Math.hypot(a[0], a[1]) - Math.hypot(b[0], b[1]));

    window.mapddPlaceAtSpawn = function (t) {
        const sp = state.spawn && state.spawn[t.faction];
        if (!sp) return false;                       // ไม่ได้ตั้งจุดเกิด → ให้โค้ดเดิมจัดการ (กลางแมพ)
        const g = state.grid.size || 64, size = t.size || 1;
        const free = p => !state.tokens.some(o => o !== t && Math.hypot(o.x - p.x, o.y - p.y) < g * 0.8);
        let first = null;
        for (const [dx, dy] of SP) {
            const p = snapPositionToGrid(sp.x + dx * g, sp.y + dy * g, size);
            if (p.x < 0 || p.y < 0 || p.x > state.mapWidth || p.y > state.mapHeight) continue;
            if (!first) first = p;
            if (free(p)) { t.x = p.x; t.y = p.y; return true; }
        }
        if (first) { t.x = first.x; t.y = first.y; }
        return true;
    };

    // ปุ่ม "วางหมุดลงบนแผนที่" เดิม: ย้ายหมุดที่เพิ่งสร้างไปจุดเกิด
    const origCreate = window.createNewToken;
    window.createNewToken = function () {
        const n = state.tokens.length, r = origCreate.apply(this, arguments);
        if (state.tokens.length > n && window.mapddPlaceAtSpawn(state.tokens[state.tokens.length - 1])) {
            if (window.mapddSyncRevealPos) window.mapddSyncRevealPos(state.tokens[state.tokens.length - 1]);   // จุดเกิดไม่นับเป็นการเลื่อน
            renderAll(); saveToLocalStorage();
        }
        return r;
    };

    // ---------- เครื่องหมายบนแมพ (ผู้เล่นออนไลน์ไม่เห็น) ----------
    const origDraw = window.drawBoard;
    window.drawBoard = function () {
        origDraw.apply(this, arguments);
        if (!show || (window.mapddOnline && window.mapddOnline.role === 'client')) return;
        const g = state.grid.size || 64;
        ctx.save();
        ctx.translate(state.camera.x, state.camera.y); ctx.scale(state.camera.zoom, state.camera.zoom);
        Object.keys(COL).forEach(f => {
            const p = state.spawn[f]; if (!p) return;
            ctx.beginPath(); ctx.arc(p.x, p.y, g * 0.45, 0, Math.PI * 2);
            ctx.fillStyle = COL[f] + '2e'; ctx.fill();
            ctx.setLineDash([g * 0.12, g * 0.08]); ctx.lineWidth = 3; ctx.strokeStyle = COL[f]; ctx.stroke(); ctx.setLineDash([]);
            ctx.fillStyle = COL[f]; ctx.font = `bold ${g * 0.2}px Prompt, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText('📍' + (f === 'enemy' ? 'ศัตรู' : f === 'npc' ? 'NPC' : 'PC'), p.x, p.y);
        });
        ctx.restore();
    };

    // ---------- โหมดคลิกตั้งจุดเกิด ----------
    function stop() { placing = null; canvas.style.cursor = ''; }
    function onPick(e) {
        if (!placing || e.target !== canvas) return;
        e.preventDefault(); e.stopImmediatePropagation();
        const pos = getCanvasPos(e), w = screenToWorld(pos.x, pos.y), p = snapPositionToGrid(w.x, w.y, 1);
        state.spawn[placing] = { x: p.x, y: p.y };
        showToast(`ตั้งจุดเกิด${NAME[placing]}แล้ว`);
        stop(); saveToLocalStorage(); renderPanel();
    }
    container.addEventListener('mousedown', onPick, true);          // ดักก่อนตัวจัดการลากหมุด/แพนแมพเดิม
    container.addEventListener('touchstart', onPick, { capture: true, passive: false });
    window.addEventListener('keydown', e => { if (e.key === 'Escape' && placing) { stop(); showToast('ยกเลิกการตั้งจุดเกิด'); } });

    // ---------- แผงควบคุม ----------
    const panel = document.createElement('div');
    panel.className = 'hidden absolute left-1/2 -translate-x-1/2 z-20 bg-vtt-panel border border-amber-500/60 rounded-2xl shadow-2xl p-3 w-72 max-w-[94vw] space-y-2';
    panel.style.top = '4.6rem';
    container.appendChild(panel);
    function renderPanel() {
        panel.innerHTML = `<div class="flex items-center justify-between"><h3 class="text-sm font-bold text-amber-400">📍 จุดเกิดของหมุด</h3><button data-x="close" class="text-slate-400 hover:text-white px-1">✕</button></div>` +
            Object.keys(COL).map(f => `<div class="flex items-center gap-1.5 bg-vtt-card border border-vtt-border rounded-xl p-1.5">
                <span class="w-2.5 h-2.5 rounded-full shrink-0" style="background:${COL[f]}"></span>
                <div class="flex-1 min-w-0"><div class="text-xs font-semibold text-white">${NAME[f]}</div><div class="text-[10px] text-slate-400">${state.spawn[f] ? 'ตั้งแล้ว' : 'ยังไม่ตั้ง (เกิดกลางแมพ)'}</div></div>
                <button data-set="${f}" class="px-2 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-[11px] font-bold">${state.spawn[f] ? 'ย้าย' : 'ตั้งจุด'}</button>
                ${state.spawn[f] ? `<button data-del="${f}" class="px-2 py-1 rounded-lg bg-rose-950 hover:bg-rose-900 border border-rose-800 text-rose-300 text-[11px]">ลบ</button>` : ''}
            </div>`).join('') +
            `<label class="flex items-center gap-1.5 text-[11px] text-slate-300 cursor-pointer"><input data-x="show" type="checkbox" ${show ? 'checked' : ''} class="accent-amber-500"> แสดงเครื่องหมายจุดเกิดบนแมพ</label>
             <p class="text-[10px] text-slate-500">กด "ตั้งจุด" แล้วคลิกบนแมพ (ESC ยกเลิก) หมุดใหม่ของฝ่ายนั้นจะเกิดที่จุดนี้ ถ้ามีหมุดอยู่แล้วจะเรียงไปช่องข้างๆ</p>`;
    }
    panel.addEventListener('click', e => {
        const s = e.target.closest('[data-set]'), d = e.target.closest('[data-del]'), x = e.target.closest('[data-x]');
        if (s) { placing = s.dataset.set; canvas.style.cursor = 'crosshair'; panel.classList.add('hidden'); showToast(`คลิกบนแมพเพื่อตั้งจุดเกิด${NAME[placing]} (ESC ยกเลิก)`); }
        else if (d) { delete state.spawn[d.dataset.del]; saveToLocalStorage(); renderPanel(); }
        else if (x && x.dataset.x === 'close') panel.classList.add('hidden');
        else if (x && x.dataset.x === 'show') { show = x.checked; saveLocal(); }
    });

    const origSave = window.saveToLocalStorage;      // จุดเกิดถูกจำพร้อมกระดานทุกครั้งที่บันทึก
    window.saveToLocalStorage = function () { origSave.apply(this, arguments); saveLocal(); };

    const btn = document.createElement('button');
    btn.title = 'ตั้งจุดเกิดของหมุด (ผู้เล่น / NPC / ศัตรู)';
    btn.className = 'min-w-[3.2rem] px-1.5 py-1 rounded-xl hover:bg-vtt-card text-slate-200 flex flex-col items-center leading-tight text-center';
    btn.innerHTML = '<span class="text-base">📍</span><span class="text-[9px] text-slate-400">จุดเกิด</span>';
    btn.onclick = () => { renderPanel(); panel.classList.toggle('hidden'); };
    const tb = document.getElementById('mapddToolbar'); if (tb) tb.appendChild(btn);
})();
