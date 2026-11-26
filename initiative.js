/* js/features/initiative.js — ตัวนับลำดับเทิร์น (Initiative) แถบแนวนอนใต้แถบเครื่องมือ */
(function () {
    'use strict';
    const KEY = 'mapdd_init_v1';
    let S = { round: 1, cur: null, order: [] };   // order: [{id, init}] เรียงมาก→น้อย
    try { const r = JSON.parse(localStorage.getItem(KEY)); if (r && Array.isArray(r.order)) S = r; } catch (e) { }
    const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { } };
    const tok = id => state.tokens.find(t => t.id === id);
    const d20 = () => 1 + Math.floor(Math.random() * 20);
    const dexBonus = t => (t.hr && t.hr.checks && Number(t.hr.checks.DEX)) || 0;
    const dexVal = t => (t && t.hr && t.hr.st && Number(t.hr.st.DEX)) || 5;
    const sortOrder = () => S.order.sort((a, b) => b.init - a.init || dexVal(tok(b.id)) - dexVal(tok(a.id)));   // เสมอกัน → DEX สูงกว่าได้ก่อน
    const prune = () => {
        S.order = S.order.filter(o => tok(o.id));
        if (!S.order.some(o => o.id === S.cur)) S.cur = S.order[0] ? S.order[0].id : null;
    };

    const strip = document.createElement('div');
    strip.id = 'initStrip';
    strip.className = 'hidden absolute left-1/2 -translate-x-1/2 z-10 bg-vtt-panel/95 backdrop-blur border border-vtt-border rounded-2xl shadow-xl px-2 py-1.5 flex items-center gap-1.5 max-w-[96vw]';
    strip.style.top = '0.75rem';
    container.appendChild(strip);

    function shiftBars() {   // แถบเงา/วงสกิลเดิมอยู่บนสุด — ขยับลงให้พ้นแถบเทิร์น
        const y = strip.classList.contains('hidden') ? '' : '4.5rem';
        ['fogFloatingToolbar', 'aoeFloatingToolbar'].forEach(id => { const el = document.getElementById(id); if (el) el.style.top = y; });
    }

    function render() {
        prune();
        const vis = o => !window.mapddViewOf || window.mapddViewOf(tok(o.id)) !== 'none';   // หมุดที่ซ่อนอยู่ไม่ขึ้นในแถบ (กันชื่อรั่ว)
        const chips = S.order.filter(vis).map(o => {
            const t = tok(o.id), on = o.id === S.cur;
            return `<div data-pick="${o.id}" class="shrink-0 flex items-center gap-1 rounded-xl border px-1.5 py-1 cursor-pointer ${on ? 'border-amber-400 bg-amber-500/20' : 'border-vtt-border bg-vtt-bg'}">
                <span class="w-2.5 h-2.5 rounded-full" style="background:${t.color || '#64748b'}"></span>
                <span class="text-[11px] font-semibold text-white max-w-[5.5rem] truncate">${escapeHtml(t.name)}</span>
                <input data-init="${o.id}" type="number" value="${o.init}" class="w-9 bg-transparent text-center text-[11px] font-bold text-amber-400 focus:outline-none" title="ค่าริเริ่ม (แก้ได้)">
                <button data-rm="${o.id}" class="text-slate-500 hover:text-rose-400 text-[11px]" title="เอาออกจากลำดับ">✕</button>
            </div>`;
        }).join('');
        strip.innerHTML = `
            <span class="shrink-0 text-[11px] font-bold text-amber-400">รอบ ${S.round}</span>
            <div class="flex items-center gap-1 overflow-x-auto max-w-[60vw]">${chips || '<span class="text-[11px] text-slate-500 px-1">ยังไม่มีลำดับ — กด 🎲 เพื่อทอยริเริ่มทุกหมุด</span>'}</div>
            <button data-act="prev" class="shrink-0 px-1.5 py-1 rounded-lg hover:bg-vtt-card text-slate-200" title="เทิร์นก่อนหน้า">⏮</button>
            <button data-act="next" class="shrink-0 px-2 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-[11px] font-bold" title="เทิร์นถัดไป">⏭ ถัดไป</button>
            <button data-act="roll" class="shrink-0 px-1.5 py-1 rounded-lg hover:bg-vtt-card text-slate-200" title="คลิกหมุดบนแมพเพื่อเลือกผู้เข้าร่วม แล้วสุ่มลำดับ (เริ่มรอบ 1 ใหม่)">🎲</button>
            <button data-act="add" class="shrink-0 px-1.5 py-1 rounded-lg hover:bg-vtt-card text-slate-200" title="เพิ่มหมุดที่เลือกเข้าลำดับ">＋</button>
            <button data-act="end" class="shrink-0 px-1.5 py-1 rounded-lg hover:bg-vtt-card text-rose-300" title="จบการต่อสู้ (ล้างลำดับ)">🧹</button>`;
    }

    function go(dir) {
        if (!S.order.length) return;
        const i = S.order.findIndex(o => o.id === S.cur);
        let n = i + dir;
        if (n >= S.order.length) { n = 0; S.round++; }
        if (n < 0) { n = S.order.length - 1; S.round = Math.max(1, S.round - 1); }
        S.cur = S.order[n].id;
        state.selectedTokenId = S.cur; renderAll();
        const t = tok(S.cur);
        if (t) showToast(window.mapddViewOf && window.mapddViewOf(t) === 'none' ? `เทิร์นถัดไป (รอบ ${S.round})` : `เทิร์นของ ${t.name} (รอบ ${S.round})`);
        save(); render();
    }
    const addToken = t => {
        const o = S.order.find(x => x.id === t.id);
        const init = d20() + dexBonus(t);
        if (o) o.init = init; else S.order.push({ id: t.id, init });
    };

    strip.addEventListener('click', e => {
        const a = e.target.closest('[data-act]'), rm = e.target.closest('[data-rm]'), pk = e.target.closest('[data-pick]');
        if (a) {
            const act = a.dataset.act;
            if (act === 'next') return go(1);
            if (act === 'prev') return go(-1);
            if (act === 'roll') return openPicker();
            if (act === 'add') { const t = getSelectedToken(); if (!t) return showToast('เลือกหมุดบนแมพก่อน'); addToken(t); sortOrder(); if (!S.cur) S.cur = t.id; }
            if (act === 'end') { S = { round: 1, cur: null, order: [] }; }
            save(); render();
        } else if (rm) {
            S.order = S.order.filter(o => o.id !== rm.dataset.rm); save(); render();
        } else if (pk && !e.target.closest('input')) {
            state.selectedTokenId = pk.dataset.pick; renderAll();
        }
    });
    strip.addEventListener('change', e => {
        const el = e.target.closest('[data-init]');
        if (!el) return;
        const o = S.order.find(x => x.id === el.dataset.init);
        if (o) { o.init = Number(el.value) || 0; sortOrder(); save(); render(); }
    });


    // ---------- เลือกผู้เข้าร่วมด้วยการคลิกหมุดบนแมพ (ไม่มีรายชื่อ จึงไม่เผยตัวที่ซ่อนอยู่) ----------
    let picking = false, pick = new Set();
    const bar = document.createElement('div');
    bar.className = 'hidden absolute left-1/2 -translate-x-1/2 z-10 bg-vtt-panel/95 backdrop-blur border border-cyan-400/70 rounded-2xl shadow-xl px-2.5 py-1.5 flex items-center gap-1.5 max-w-[96vw] flex-wrap justify-center';
    bar.style.top = '0.75rem';
    const bb = 'shrink-0 px-2 py-1 rounded-lg bg-vtt-card hover:bg-slate-800 border border-vtt-border text-slate-200 text-[11px]';
    bar.innerHTML = `<span class="text-[11px] font-bold text-cyan-300">เลือกผู้เข้าร่วม: <b id="pkN">0</b> ตัว</span>
        <span class="text-[10px] text-slate-400 hidden md:inline">คลิกหมุดบนแมพเพื่อเลือก / ยกเลิก</span>
        <button data-pk="players" class="${bb}">ผู้เล่นทั้งหมด</button><button data-pk="none" class="${bb}">ล้าง</button>
        <button data-pk="go" class="shrink-0 px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-[11px] font-bold">🎲 สุ่มลำดับ</button>
        <button data-pk="cancel" class="${bb}">ยกเลิก</button>`;
    container.appendChild(bar);
    const upd = () => { document.getElementById('pkN').textContent = pick.size; };
    function startPick() {
        if (!state.tokens.length) return showToast('ยังไม่มีหมุดบนกระดาน');
        picking = true; pick = new Set(S.order.map(o => o.id).filter(tok));
        strip.classList.add('hidden'); bar.classList.remove('hidden'); upd();
        showToast('คลิกหมุดบนแมพเพื่อเลือกผู้เข้าร่วม แล้วกด "สุ่มลำดับ"');
    }
    function endPick() {
        picking = false; bar.classList.add('hidden'); strip.classList.remove('hidden'); shiftBars(); render();
    }
    bar.addEventListener('click', e => {
        const b = e.target.closest('[data-pk]'); if (!b) return;
        const k = b.dataset.pk;
        if (k === 'players') pick = new Set(state.tokens.filter(t => (t.faction || 'player') === 'player').map(t => t.id));
        else if (k === 'none') pick = new Set();
        else if (k === 'cancel') return endPick();
        else if (k === 'go') {
            const list = state.tokens.filter(t => pick.has(t.id));
            if (!list.length) return showToast('ยังไม่ได้เลือกหมุดผู้เข้าร่วม');
            S.order = list.map(t => ({ id: t.id, init: d20() + dexBonus(t) }));
            sortOrder(); S.round = 1; S.cur = S.order[0].id;
            state.selectedTokenId = S.cur; renderAll(); save(); endPick();
            return showToast(`สุ่มลำดับ ${list.length} ตัวแล้ว (d20 + โบนัส DEX)`);
        }
        upd();
    });
    function onPickTap(e) {   // ดักก่อนตัวลาก/เลือกหมุดเดิม เฉพาะตอนคลิกโดนหมุด (คลิกที่ว่างยังแพนแมพได้)
        if (!picking || e.target !== canvas) return;
        const p = getCanvasPos(e), w = screenToWorld(p.x, p.y), t = findTokenAtWorld(w.x, w.y);
        if (!t) return;
        e.preventDefault(); e.stopImmediatePropagation();
        pick.has(t.id) ? pick.delete(t.id) : pick.add(t.id);
        upd();
    }
    container.addEventListener('mousedown', onPickTap, true);
    container.addEventListener('touchstart', onPickTap, { capture: true, passive: false });
    window.addEventListener('keydown', e => { if (e.key === 'Escape' && picking) endPick(); });

    const origDraw = window.drawBoard;   // วงสีฟ้า + ✓ บนหมุดที่ถูกเลือก
    window.drawBoard = function () {
        origDraw.apply(this, arguments);
        if (!picking || !pick.size) return;
        const gs = state.grid.size || 64;
        ctx.save();
        ctx.translate(state.camera.x, state.camera.y); ctx.scale(state.camera.zoom, state.camera.zoom);
        state.tokens.forEach(t => {
            if (!pick.has(t.id)) return;
            const r = (t.size || 1) * gs * 0.43 + 10;
            ctx.beginPath(); ctx.arc(t.x, t.y, r, 0, Math.PI * 2);
            ctx.lineWidth = 4; ctx.strokeStyle = '#22d3ee'; ctx.setLineDash([gs * 0.14, gs * 0.08]); ctx.stroke(); ctx.setLineDash([]);
            ctx.fillStyle = '#22d3ee'; ctx.font = `bold ${gs * 0.3}px Prompt, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
            ctx.fillText('✓', t.x, t.y - r - 2);
        });
        ctx.restore();
    };
    const openPicker = startPick;

    const btn = document.createElement('button');
    btn.title = 'ลำดับเทิร์น (Initiative)';
    btn.className = 'min-w-[3.2rem] px-1.5 py-1 rounded-xl hover:bg-vtt-card text-slate-200 flex flex-col items-center leading-tight text-center';
    btn.innerHTML = '<span class="text-base">⚔️</span><span class="text-[9px] text-slate-400">เทิร์น</span>';
    btn.onclick = () => { if (picking) return endPick(); strip.classList.toggle('hidden'); shiftBars(); if (!strip.classList.contains('hidden')) render(); };
    const tb = document.getElementById('mapddToolbar');
    if (tb) tb.appendChild(btn);
    render();
})();
