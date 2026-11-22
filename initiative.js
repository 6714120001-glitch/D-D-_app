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
    strip.style.top = '4.6rem';
    container.appendChild(strip);

    function shiftBars() {   // แถบเงา/วงสกิลเดิมอยู่บนสุด — ขยับลงให้พ้นแถบเทิร์น
        const y = strip.classList.contains('hidden') ? '5rem' : '8.6rem';
        ['fogFloatingToolbar', 'aoeFloatingToolbar'].forEach(id => { const el = document.getElementById(id); if (el) el.style.top = y; });
    }

    function render() {
        prune();
        const chips = S.order.map(o => {
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
            <button data-act="roll" class="shrink-0 px-1.5 py-1 rounded-lg hover:bg-vtt-card text-slate-200" title="เลือกผู้เข้าร่วม แล้วสุ่มลำดับ (เริ่มรอบ 1 ใหม่)">🎲</button>
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
        const t = tok(S.cur); if (t) showToast(`เทิร์นของ ${t.name} (รอบ ${S.round})`);
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


    // ---------- เลือกผู้เข้าร่วมก่อนสุ่มลำดับ ----------
    const FN = { player: 'ผู้เล่น', npc: 'NPC', enemy: 'ศัตรู' };
    let pick = new Set();
    const modal = document.createElement('div');
    modal.className = 'hidden fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-3';
    const qb = 'px-2 py-1 rounded-lg bg-vtt-card hover:bg-slate-800 border border-vtt-border text-slate-200 text-[11px]';
    modal.innerHTML = `<div class="bg-vtt-panel border border-amber-500/60 rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col">
        <div class="flex items-center justify-between p-3 border-b border-vtt-border"><h2 class="text-sm font-bold text-amber-400">⚔️ เลือกผู้เข้าร่วมเทิร์น</h2><button data-pk="close" class="text-slate-400 hover:text-white px-2">✕</button></div>
        <div class="p-2 border-b border-vtt-border flex flex-wrap gap-1">
            <button data-pk="all" class="${qb}">ทั้งหมด</button><button data-pk="f:player" class="${qb}">เฉพาะผู้เล่น</button>
            <button data-pk="f:enemy" class="${qb}">เฉพาะศัตรู</button><button data-pk="f:npc" class="${qb}">เฉพาะ NPC</button><button data-pk="none" class="${qb}">ล้าง</button>
        </div>
        <div id="ipList" class="flex-1 overflow-y-auto p-2 space-y-1"></div>
        <div class="p-3 border-t border-vtt-border">
            <button data-pk="go" id="ipGo" class="w-full py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-[12px] font-bold">🎲 สุ่มลำดับ</button>
            <p class="text-[10px] text-slate-500 mt-1.5">สุ่ม d20 + โบนัส DEX ของแต่ละตัว (หมุดที่ไม่มีค่าสเตตัสนับโบนัส 0) ถ้าเสมอกัน ตัวที่ DEX สูงกว่าได้เล่นก่อน</p>
        </div></div>`;
    document.body.appendChild(modal);
    const bonusTxt = t => { const b = dexBonus(t); return (b >= 0 ? '+' : '−') + Math.abs(b); };
    function renderPick() {
        document.getElementById('ipList').innerHTML = state.tokens.length ? state.tokens.map(t => `
            <label class="flex items-center gap-2 bg-vtt-card border border-vtt-border rounded-xl px-2 py-1.5 cursor-pointer">
                <input type="checkbox" data-id="${t.id}" ${pick.has(t.id) ? 'checked' : ''} class="accent-amber-500">
                <span class="w-2.5 h-2.5 rounded-full shrink-0" style="background:${t.color || '#64748b'}"></span>
                <span class="flex-1 min-w-0 text-xs font-semibold text-white truncate">${escapeHtml(t.name)}</span>
                <span class="text-[10px] text-slate-400">${FN[t.faction || 'player'] || ''}</span>
                <span class="text-[10px] text-amber-400 w-16 text-right">DEX ${dexVal(t)} (${bonusTxt(t)})</span>
            </label>`).join('') : '<p class="text-xs text-slate-500 text-center py-6">ยังไม่มีหมุดบนกระดาน</p>';
        document.getElementById('ipGo').textContent = `🎲 สุ่มลำดับ (${pick.size} ตัว)`;
    }
    function openPicker() {
        if (!state.tokens.length) return showToast('ยังไม่มีหมุดบนกระดาน');
        const ids = S.order.map(o => o.id).filter(tok);
        pick = new Set(ids.length ? ids : state.tokens.map(t => t.id));
        renderPick(); modal.classList.remove('hidden');
    }
    modal.addEventListener('click', e => {
        if (e.target === modal) return modal.classList.add('hidden');
        const b = e.target.closest('[data-pk]'); if (!b) return;
        const k = b.dataset.pk;
        if (k === 'close') return modal.classList.add('hidden');
        if (k === 'all') pick = new Set(state.tokens.map(t => t.id));
        else if (k === 'none') pick = new Set();
        else if (k.startsWith('f:')) pick = new Set(state.tokens.filter(t => (t.faction || 'player') === k.slice(2)).map(t => t.id));
        else if (k === 'go') {
            const list = state.tokens.filter(t => pick.has(t.id));
            if (!list.length) return showToast('ยังไม่ได้เลือกผู้เข้าร่วม');
            S.order = list.map(t => ({ id: t.id, init: d20() + dexBonus(t) }));
            sortOrder(); S.round = 1; S.cur = S.order[0].id;
            state.selectedTokenId = S.cur; renderAll(); save(); render();
            modal.classList.add('hidden');
            return showToast(`สุ่มลำดับ ${list.length} ตัวแล้ว — เริ่มที่ ${tok(S.cur).name}`);
        }
        renderPick();
    });
    modal.addEventListener('change', e => {
        const c = e.target.closest('[data-id]'); if (!c) return;
        c.checked ? pick.add(c.dataset.id) : pick.delete(c.dataset.id);
        document.getElementById('ipGo').textContent = `🎲 สุ่มลำดับ (${pick.size} ตัว)`;
    });

    const btn = document.createElement('button');
    btn.title = 'ลำดับเทิร์น (Initiative)';
    btn.className = 'min-w-[3.2rem] px-1.5 py-1 rounded-xl hover:bg-vtt-card text-slate-200 flex flex-col items-center leading-tight text-center';
    btn.innerHTML = '<span class="text-base">⚔️</span><span class="text-[9px] text-slate-400">เทิร์น</span>';
    btn.onclick = () => { strip.classList.toggle('hidden'); shiftBars(); if (!strip.classList.contains('hidden')) render(); };
    const tb = document.getElementById('mapddToolbar');
    if (tb) tb.appendChild(btn);
    render();
})();
