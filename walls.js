/* js/features/walls.js — เส้นกำแพง + ประตู (ทดลอง) ให้เงาที่เปิดอัตโนมัติไม่ทะลุกำแพง
   ข้อมูล: state.walls = [{id, x1,y1,x2,y2, type:'wall'|'door', open:false}] (พิกัดโลกของแมพ)
   - วาดทับแมพที่อัปโหลด: คลิกจุดเริ่ม แล้วคลิกต่อเป็นเส้น (เกาะมุมกริดได้) · ESC/ปุ่ม "หยุดวาด" จบเส้น
   - ประตู: คลิกที่ประตูบนแมพ (โหมดเลือก/ย้ายหมุด) เพื่อ เปิด/ปิด
   - กำแพงและประตูที่ปิดบังสายตา: fog-reveal.js เรียก mapddCanSee() ก่อนเปิดแต่ละช่อง */
(function () {
    'use strict';
    const KEY = 'mapdd_walls_v1';
    const COL = { wall: '#f43f5e', door: '#f59e0b', open: '#22c55e' };
    let mode = null /* 'wall' | 'door' | 'erase' */, start = null, mouse = null;
    let snapOn = true, showLines = true, blockOn = true;

    if (!Array.isArray(state.walls)) state.walls = [];
    try {
        const r = JSON.parse(localStorage.getItem(KEY));
        if (r) { if (Array.isArray(r.walls)) state.walls = r.walls; snapOn = r.snapOn !== false; showLines = r.showLines !== false; blockOn = r.blockOn !== false; }
    } catch (e) { }
    const saveLocal = () => { try { localStorage.setItem(KEY, JSON.stringify({ walls: state.walls, snapOn, showLines, blockOn })); } catch (e) { } };
    const origSave = window.saveToLocalStorage;
    window.saveToLocalStorage = function () { origSave.apply(this, arguments); saveLocal(); };

    // ---------- เรขาคณิต ----------
    const orient = (ax, ay, bx, by, cx, cy) => (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
    const onSeg = (ax, ay, bx, by, px, py) => Math.min(ax, bx) - 1e-6 <= px && px <= Math.max(ax, bx) + 1e-6 && Math.min(ay, by) - 1e-6 <= py && py <= Math.max(ay, by) + 1e-6;
    function segHit(ax, ay, bx, by, cx, cy, dx, dy) {   // สองเส้นแตะ/ตัดกัน (รวมแตะที่ปลาย = นับว่าบัง ป้องกันแสงลอดมุมทแยง)
        const o1 = orient(ax, ay, bx, by, cx, cy), o2 = orient(ax, ay, bx, by, dx, dy), o3 = orient(cx, cy, dx, dy, ax, ay), o4 = orient(cx, cy, dx, dy, bx, by);
        if (((o1 > 1e-6 && o2 < -1e-6) || (o1 < -1e-6 && o2 > 1e-6)) && ((o3 > 1e-6 && o4 < -1e-6) || (o3 < -1e-6 && o4 > 1e-6))) return true;
        if (Math.abs(o1) <= 1e-6 && onSeg(ax, ay, bx, by, cx, cy)) return true;
        if (Math.abs(o2) <= 1e-6 && onSeg(ax, ay, bx, by, dx, dy)) return true;
        if (Math.abs(o3) <= 1e-6 && onSeg(cx, cy, dx, dy, ax, ay)) return true;
        if (Math.abs(o4) <= 1e-6 && onSeg(cx, cy, dx, dy, bx, by)) return true;
        return false;
    }
    const blockers = () => state.walls.filter(w => w.type === 'wall' || (w.type === 'door' && !w.open));
    window.mapddCanSee = function (x1, y1, x2, y2) {   // มองเห็นจากจุดแรกไปจุดที่สองได้ไหม
        if (!blockOn) return true;
        const bl = blockers();
        for (let i = 0; i < bl.length; i++) if (segHit(x1, y1, x2, y2, bl[i].x1, bl[i].y1, bl[i].x2, bl[i].y2)) return false;
        return true;
    };
    function distToSeg(px, py, w) {
        const dx = w.x2 - w.x1, dy = w.y2 - w.y1, l2 = dx * dx + dy * dy;
        let t = l2 ? ((px - w.x1) * dx + (py - w.y1) * dy) / l2 : 0; t = Math.max(0, Math.min(1, t));
        return Math.hypot(px - (w.x1 + t * dx), py - (w.y1 + t * dy));
    }
    const nearest = (wx, wy, types) => {
        const tol = 12 / (state.camera.zoom || 1); let best = null, bd = tol;
        state.walls.forEach(w => { if (types && !types.includes(w.type)) return; const d = distToSeg(wx, wy, w); if (d <= bd) { bd = d; best = w; } });
        return best;
    };
    const snapPt = (wx, wy) => {
        if (!snapOn) return { x: wx, y: wy };
        const gs = state.grid.size || 64, ox = state.grid.offsetX || 0, oy = state.grid.offsetY || 0;
        return { x: ox + Math.round((wx - ox) / gs) * gs, y: oy + Math.round((wy - oy) / gs) * gs };
    };

    // ---------- รับคลิกบนแมพ ----------
    function stopDraw() { start = null; }
    function setMode(m) { mode = m; start = null; canvas.style.cursor = m ? 'crosshair' : ''; renderPanel(); }
    function onTap(e) {
        if (e.target !== canvas) return;
        const p = getCanvasPos(e), w = screenToWorld(p.x, p.y);
        if (mode) {   // โหมดวาด/ลบ
            e.preventDefault(); e.stopImmediatePropagation();
            if (mode === 'erase') {
                const hit = nearest(w.x, w.y);
                if (hit) { state.walls = state.walls.filter(x => x !== hit); saveToLocalStorage(); renderPanel(); }
                return;
            }
            const s = snapPt(w.x, w.y);
            if (!start) { start = s; return; }
            if (Math.hypot(s.x - start.x, s.y - start.y) < 2) { stopDraw(); return; }   // คลิกจุดเดิมซ้ำ = จบเส้น
            state.walls.push({ id: 'w' + Date.now() + Math.random().toString(36).slice(2, 5), x1: start.x, y1: start.y, x2: s.x, y2: s.y, type: mode, open: false });
            start = s; saveToLocalStorage(); renderPanel();
            return;
        }
        // โหมดปกติ: คลิกที่ประตู (ไม่โดนหมุด) = เปิด/ปิด
        if (typeof currentTool !== 'undefined' && currentTool !== 'select') return;
        const ht = findTokenAtWorld(w.x, w.y);   // ประตูอยู่ที่ขอบช่อง จึงอยู่ในรัศมีคลิกของหมุดข้างๆ: กลางตัวหมุดให้หมุดชนะ ใกล้เส้นประตูให้ประตูชนะ
        if (ht && Math.hypot(w.x - ht.x, w.y - ht.y) <= 0.3 * (state.grid.size || 64)) return;
        const d = nearest(w.x, w.y, ['door']);
        if (d) {
            e.preventDefault(); e.stopImmediatePropagation();
            d.open = !d.open; saveToLocalStorage(); renderAll();
            showToast(d.open ? 'เปิดประตูแล้ว' : 'ปิดประตูแล้ว');
        }
    }
    container.addEventListener('mousedown', onTap, true);
    container.addEventListener('touchstart', onTap, { capture: true, passive: false });
    container.addEventListener('mousemove', e => { if (mode && start && e.target === canvas) { const p = getCanvasPos(e), w = screenToWorld(p.x, p.y); mouse = snapPt(w.x, w.y); } }, true);
    window.addEventListener('keydown', e => { if (e.key === 'Escape' && (start || mode)) { if (start) stopDraw(); else setMode(null); } });

    // ---------- วาดเส้นบนแมพ (มุมมอง DM) ----------
    const origDraw = window.drawBoard;
    window.drawBoard = function () {
        origDraw.apply(this, arguments);
        const active = !!mode;
        if (!(showLines || active) || !state.walls.length && !start) return;
        const z = state.camera.zoom || 1;
        ctx.save();
        ctx.translate(state.camera.x, state.camera.y); ctx.scale(z, z);
        ctx.lineCap = 'round';
        state.walls.forEach(w => {
            const isDoor = w.type === 'door';
            ctx.beginPath(); ctx.moveTo(w.x1, w.y1); ctx.lineTo(w.x2, w.y2);
            ctx.strokeStyle = isDoor ? (w.open ? COL.open : COL.door) : COL.wall;
            ctx.lineWidth = (isDoor ? (w.open ? 3 : 6) : 4) / z;
            ctx.setLineDash(isDoor && w.open ? [8 / z, 6 / z] : []);
            ctx.stroke();
        });
        ctx.setLineDash([]);
        if (active) state.walls.forEach(w => { [[w.x1, w.y1], [w.x2, w.y2]].forEach(([x, y]) => { ctx.beginPath(); ctx.arc(x, y, 4 / z, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill(); }); });
        if (start) {
            ctx.beginPath(); ctx.arc(start.x, start.y, 6 / z, 0, Math.PI * 2); ctx.fillStyle = '#22d3ee'; ctx.fill();
            if (mouse) { ctx.beginPath(); ctx.moveTo(start.x, start.y); ctx.lineTo(mouse.x, mouse.y); ctx.strokeStyle = '#22d3ee'; ctx.lineWidth = 3 / z; ctx.setLineDash([10 / z, 8 / z]); ctx.stroke(); }
        }
        ctx.restore();
    };

    // ---------- แผงควบคุม ----------
    const panel = document.createElement('div');
    panel.className = 'hidden absolute left-1/2 -translate-x-1/2 z-20 bg-vtt-panel border border-amber-500/60 rounded-2xl shadow-2xl p-3 w-80 max-w-[94vw] space-y-2';
    panel.style.top = '4.6rem';
    container.appendChild(panel);
    const mb = (m, t) => `<button data-mode="${m}" class="py-1.5 rounded-lg text-[11px] font-bold border ${mode === m ? 'bg-amber-500 text-slate-950 border-amber-400' : 'bg-vtt-bg text-slate-200 border-vtt-border hover:bg-slate-800'}">${t}</button>`;
    const cb = (k, on, t) => `<label class="flex items-center gap-1.5 text-[11px] text-slate-300 cursor-pointer"><input data-opt="${k}" type="checkbox" ${on ? 'checked' : ''} class="accent-amber-500"> ${t}</label>`;
    function renderPanel() {
        const nw = state.walls.filter(w => w.type === 'wall').length, nd = state.walls.length - nw;
        panel.innerHTML = `<div class="flex items-center justify-between"><h3 class="text-sm font-bold text-amber-400">🧱 กำแพงและประตู <span class="text-[10px] text-slate-400">(ทดลอง)</span></h3><button data-x="close" class="text-slate-400 hover:text-white px-1">✕</button></div>
            <div class="grid grid-cols-3 gap-1">${mb('wall', 'วาดกำแพง')}${mb('door', 'วาดประตู')}${mb('erase', 'ลบเส้น')}</div>
            <div class="text-[10px] text-slate-400">${mode ? (start ? 'คลิกจุดถัดไปเพื่อต่อเส้น · คลิกจุดเดิมหรือ ESC เพื่อจบเส้น' : 'คลิกบนแมพเพื่อเริ่มเส้น (ESC ออกจากโหมด)') : 'เลือกโหมดแล้วคลิกบนแมพ · คลิกที่ประตูตอนปกติเพื่อเปิด/ปิด'} · กำแพง ${nw} · ประตู ${nd}</div>
            <div class="grid grid-cols-2 gap-1"><button data-x="stop" class="py-1 rounded-lg bg-vtt-card border border-vtt-border text-slate-200 text-[11px]">หยุดวาด/ออกโหมด</button><button data-x="undo" class="py-1 rounded-lg bg-vtt-card border border-vtt-border text-slate-200 text-[11px]">↶ ลบเส้นล่าสุด</button></div>
            ${cb('snap', snapOn, 'เกาะมุมกริด')}${cb('show', showLines, 'แสดงเส้นกำแพง (ปิดตอนเล่นถ้าผู้เล่นดูจอเดียวกัน)')}${cb('block', blockOn, 'กำแพง/ประตูปิดบังสายตาตอนเปิดเงาอัตโนมัติ')}
            <div class="grid grid-cols-2 gap-1"><button data-x="reveal" class="py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-[11px] font-semibold" title="เปิดเงารอบหมุดที่ตั้งค่าช่องไว้ ตามกำแพง/ประตูตอนนี้">🔦 เปิดเงารอบหมุดตอนนี้</button><button data-x="clear" class="py-1.5 rounded-lg bg-rose-950 hover:bg-rose-900 border border-rose-800 text-rose-300 text-[11px]">ล้างเส้นทั้งหมด</button></div>`;
    }
    panel.addEventListener('click', e => {
        const m = e.target.closest('[data-mode]'), x = e.target.closest('[data-x]'), o = e.target.closest('[data-opt]');
        if (m) return setMode(mode === m.dataset.mode ? null : m.dataset.mode);
        if (o) { const k = o.dataset.opt; if (k === 'snap') snapOn = o.checked; else if (k === 'show') showLines = o.checked; else blockOn = o.checked; saveLocal(); return renderAll(); }
        if (!x) return;
        const k = x.dataset.x;
        if (k === 'close') { setMode(null); panel.classList.add('hidden'); }
        else if (k === 'stop') { stopDraw(); setMode(null); }
        else if (k === 'undo') { state.walls.pop(); stopDraw(); saveToLocalStorage(); renderPanel(); }
        else if (k === 'clear') { if (confirm('ล้างกำแพงและประตูทั้งหมด?')) { state.walls = []; stopDraw(); saveToLocalStorage(); renderPanel(); } }
        else if (k === 'reveal') { if (window.mapddRevealAllNow) window.mapddRevealAllNow(); }
    });

    const btn = document.createElement('button');
    btn.title = 'วาดกำแพง/ประตู ให้เงาไม่ทะลุกำแพง (ทดลอง)';
    btn.className = 'min-w-[3.2rem] px-1.5 py-1 rounded-xl hover:bg-vtt-card text-slate-200 flex flex-col items-center leading-tight text-center';
    btn.innerHTML = '<span class="text-base">🧱</span><span class="text-[9px] text-slate-400">กำแพง</span>';
    btn.onclick = () => { renderPanel(); panel.classList.toggle('hidden'); if (panel.classList.contains('hidden')) setMode(null); };
    const tb = document.getElementById('mapddToolbar'); if (tb) tb.appendChild(btn);
})();
