/* js/features/stealth.js — ศัตรู/หมุดแบบ "ซ่อน" และ "ซุ่มโจมตี" + มุมมอง master/player
   โหมดของหมุด (t.stealth): 'off' ปกติ · 'hidden' ซ่อนจนกว่า DM กดแสดง · 'ambush' ซ่อน และโผล่เองเมื่อหมุดผู้เล่นเข้าใกล้ (t.triggerRadius ช่อง)
   มุมมอง: window.mapddRole = 'master' | 'player'
     - player: หมุดที่ซ่อนไม่ถูกวาด/คลิก/โชว์ชื่อเลย
     - master: ค่าเริ่มต้นก็ไม่เห็นเหมือนกัน (กันหลุดตอนผู้เล่นดูจอเดียวกัน) กดปุ่ม "แสดงตัวที่ซ่อน" เพื่อดูแบบจางๆ
   เตรียมออนไลน์: mapddFilterForClient(state) ตัดหมุดที่ซ่อน/กำแพง/จุดเกิดออกก่อนส่งให้ฝั่งผู้เล่น (การซ่อนด้วยการไม่วาดอย่างเดียวไม่ปลอดภัย) */
(function () {
    'use strict';
    const KEY = 'mapdd_stealth_v1';
    let ghost = false, preview = false;
    try { const r = JSON.parse(localStorage.getItem(KEY)); if (r && r.ghost === true) ghost = true; } catch (e) { }
    const saveLocal = () => { try { localStorage.setItem(KEY, JSON.stringify({ ghost })); } catch (e) { } };
    window.mapddRole = 'master';
    const toast = m => showToast(m);

    // ---------- กฎกลาง: หมุดนี้ "ผู้ชมตอนนี้" เห็นไหม ----------
    window.mapddViewOf = function (t, role) {
        const st = t.stealth || 'off';
        if (st === 'off') return 'full';
        if ((role || window.mapddRole) === 'player') return 'none';
        return ghost ? 'ghost' : 'none';
    };
    window.mapddFilterForClient = s => Object.assign({}, s, { tokens: s.tokens.filter(t => (t.stealth || 'off') === 'off'), walls: [], spawn: {} });

    // ---------- วาด / คลิก / รายชื่อ ----------
    const origDrawTok = window.drawTokenOnCanvas;
    window.drawTokenOnCanvas = function (tok) {
        const v = window.mapddViewOf(tok);
        if (v === 'none') return;
        if (v === 'full') return origDrawTok.apply(this, arguments);
        ctx.save(); ctx.globalAlpha = 0.32;
        origDrawTok.apply(this, arguments);
        ctx.restore();
        const gs = state.grid.size || 64, r = (tok.size || 1) * gs * 0.5 + 6;
        ctx.save();
        ctx.beginPath(); ctx.arc(tok.x, tok.y, r, 0, Math.PI * 2);
        ctx.setLineDash([gs * 0.12, gs * 0.1]); ctx.lineWidth = 2.5; ctx.strokeStyle = '#c084fc'; ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = '#c084fc'; ctx.font = `bold ${gs * 0.2}px Prompt, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
        ctx.fillText(tok.stealth === 'ambush' ? 'ซุ่ม ' + (tok.triggerRadius ?? 3) : 'ซ่อน', tok.x, tok.y - r - 2);
        ctx.restore();
    };
    const origFind = window.findTokenAtWorld;
    window.findTokenAtWorld = function (wx, wy) {
        const gs = state.grid.size || 64;
        for (let i = state.tokens.length - 1; i >= 0; i--) {
            const t = state.tokens[i];
            if (window.mapddViewOf(t) === 'none') continue;   // ซ่อนอยู่ → จิ้ม/ลาก/เลือกไม่ได้
            if (Math.hypot(wx - t.x, wy - t.y) <= Math.max(28, ((t.size || 1) * gs) * 0.55)) return t;
        }
        return null;
    };
    const origRoster = window.renderRosterList;
    window.renderRosterList = function () {   // รายชื่อหมุด: ไม่แสดงชื่อหมุดที่ซ่อน
        const all = state.tokens;
        state.tokens = all.filter(t => window.mapddViewOf(t) !== 'none');
        try { return origRoster.apply(this, arguments); } finally { state.tokens = all; }
    };

    // ---------- กระตุ้นศัตรูซุ่มโจมตีเมื่อหมุดผู้เล่นเดินเข้าใกล้ (ตรวจตอนปล่อยหมุด) ----------
    let pre = null;
    const snap = () => { pre = {}; state.tokens.forEach(t => { if ((t.faction || 'player') === 'player') pre[t.id] = t.x + ',' + t.y; }); };
    container.addEventListener('mousedown', snap, true);
    container.addEventListener('touchstart', snap, { capture: true, passive: true });
    const outside = e => { if (!container.contains(e.target)) pre = null; };
    document.addEventListener('mousedown', outside, true);
    document.addEventListener('touchstart', outside, { capture: true, passive: true });
    function checkTriggers() {
        if (!pre) { snap(); return; }
        const gs = state.grid.size || 64, moved = state.tokens.filter(t => pre[t.id] !== undefined && pre[t.id] !== t.x + ',' + t.y);
        snap();
        if (!moved.length) return;
        const fired = [];
        state.tokens.forEach(e => {
            if (e.stealth !== 'ambush') return;
            const R = e.triggerRadius ?? 3;
            const hit = moved.some(p => Math.max(Math.abs(p.x - e.x), Math.abs(p.y - e.y)) / gs <= R + 1e-6
                && (!window.mapddCanSee || window.mapddCanSee(p.x, p.y, e.x, e.y)));   // กำแพง/ประตูปิดบังสายตา = ไม่ถูกกระตุ้น
            if (hit) { e.stealth = 'off'; fired.push(e.name); }
        });
        if (fired.length) { renderAll(); saveToLocalStorage(); toast(`⚠️ ${fired.join(', ')} ถูกกระตุ้น! ปรากฏตัวบนแมพ`); }
    }
    ['mouseup', 'pointerup', 'touchend', 'touchcancel'].forEach(t => window.addEventListener(t, () => setTimeout(checkTriggers, 0), true));

    // ---------- การ์ดในแผงหมุด ----------
    window.mapddSetStealth = function (id, mode) {
        const t = state.tokens.find(x => x.id === id); if (!t) return;
        t.stealth = mode;
        if (mode === 'ambush' && t.triggerRadius == null) t.triggerRadius = 3;
        if (mode !== 'off' && !ghost && window.mapddRole !== 'player') { ghost = true; saveLocal(); paint(); toast('เปิด "แสดงตัวที่ซ่อน (จางๆ)" ให้แล้ว เพื่อให้คุณยังเห็นหมุดนี้'); }
        saveToLocalStorage(); renderAll();
    };
    window.mapddSetTrigger = function (id, n) {
        const t = state.tokens.find(x => x.id === id); if (!t) return;
        t.triggerRadius = Math.max(1, Math.min(20, Math.round(Number(n)) || 1));
        saveToLocalStorage(); renderAll();
    };
    const origInspector = window.renderInspector;
    window.renderInspector = function () {
        const sel = getSelectedToken();
        if (sel && window.mapddViewOf(sel) === 'none') state.selectedTokenId = null;   // หมุดที่ซ่อนอยู่ในมุมมองนี้ → ไม่เปิดแผงข้อมูล
        origInspector.apply(this, arguments);
        const t = getSelectedToken();
        if (!t) return;
        const m = t.stealth || 'off', R = t.triggerRadius ?? 3;
        const b = (k, n) => `<button onclick="mapddSetStealth('${t.id}','${k}')" class="py-1.5 rounded-lg text-[11px] font-bold border ${m === k ? 'bg-violet-500 text-white border-violet-300' : 'bg-vtt-bg text-slate-300 border-vtt-border hover:bg-slate-800'}">${n}</button>`;
        document.getElementById('inspectorContent').insertAdjacentHTML('afterbegin', `
        <div class="bg-vtt-card border border-vtt-border rounded-2xl p-2.5 space-y-1.5">
            <div class="text-[11px] font-bold text-slate-400">🎭 ซ่อนตัว / ซุ่มโจมตี</div>
            <div class="grid grid-cols-3 gap-1">${b('off', 'ปกติ')}${b('hidden', 'ซ่อน')}${b('ambush', 'ซุ่มโจมตี')}</div>
            ${m === 'ambush' ? `<div class="flex items-center gap-2"><span class="text-[11px] text-slate-300">โผล่เมื่อผู้เล่นเข้าใกล้ภายใน</span>
                <button onclick="mapddSetTrigger('${t.id}',${R - 1})" class="w-7 h-7 rounded-lg bg-vtt-bg border border-vtt-border text-white font-bold">−</button>
                <input type="number" min="1" max="20" value="${R}" onchange="mapddSetTrigger('${t.id}',this.value)" class="w-12 bg-vtt-bg border border-vtt-border rounded-lg py-1 text-center text-sm font-bold text-violet-300 focus:outline-none">
                <button onclick="mapddSetTrigger('${t.id}',${R + 1})" class="w-7 h-7 rounded-lg bg-vtt-bg border border-vtt-border text-white font-bold">＋</button><span class="text-[11px] text-slate-300">ช่อง</span></div>` : ''}
            ${m !== 'off' ? `<button onclick="mapddSetStealth('${t.id}','off')" class="w-full py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-[11px] font-semibold">แสดงตัวบนแมพทันที</button>` : ''}
            <p class="text-[10px] text-slate-500">ผู้เล่นมองไม่เห็นหมุดที่ซ่อนเลย (ไม่วาด ไม่ขึ้นรายชื่อ) ซุ่มโจมตีโผล่เองเมื่อหมุดผู้เล่นปล่อยหมุดในระยะ (กำแพงบังสายตาไม่ถูกกระตุ้น)</p>
        </div>`);
    };

    // ---------- ปุ่มแถบเครื่องมือ ----------
    const mk = () => { const b = document.createElement('button'); b.className = 'min-w-[3.2rem] px-1.5 py-1 rounded-xl hover:bg-vtt-card text-slate-200 flex flex-col items-center leading-tight text-center'; return b; };
    const gb = mk(), pb = mk();
    function paint() {
        gb.innerHTML = `<span class="text-base">👁</span><span class="text-[9px] ${ghost ? 'text-violet-300' : 'text-slate-500'}">ตัวที่ซ่อน ${ghost ? 'แสดง' : 'ซ่อน'}</span>`;
        pb.innerHTML = `<span class="text-base">🎭</span><span class="text-[9px] ${preview ? 'text-amber-300' : 'text-slate-400'}">${preview ? 'พรีวิว: เปิด' : 'พรีวิวผู้เล่น'}</span>`;
        pb.style.background = preview ? 'rgba(245,158,11,.18)' : '';
    }
    gb.title = 'แสดงตัวที่ซ่อนแบบจางๆ (สำหรับ DM) — ปิดไว้ตอนผู้เล่นดูจอเดียวกัน';
    pb.title = 'พรีวิวว่าผู้เล่นจะเห็นอะไร (ซ่อนหมุดที่ซ่อน, เส้นกำแพง, จุดเกิด)';
    gb.onclick = () => { if (preview) return toast('กำลังพรีวิวผู้เล่น ปิดพรีวิวก่อน'); ghost = !ghost; saveLocal(); paint(); renderAll(); };
    pb.onclick = () => { preview = !preview; window.mapddRole = preview ? 'player' : 'master'; paint(); renderAll(); toast(preview ? 'พรีวิวมุมมองผู้เล่น: เปิด (กดปุ่มอีกครั้งเพื่อกลับ)' : 'กลับมุมมอง DM'); };
    const tb = document.getElementById('mapddToolbar'); if (tb) { tb.appendChild(gb); tb.appendChild(pb); }
    paint();
})();
