/* js/features/ui-layout.js — จัด UI ใหม่ (โหลดเป็นไฟล์สุดท้าย)
   - แถบบน: ไฟล์ ▾ · ฉาก ▾ | เครื่องมือบนแมพ | เทิร์น · มุมมอง ▾ · ตั้งค่า DM ▾
   - แผง "ฉาก": แท็บ สำเร็จรูป / ของฉัน (คลังแมพ) พร้อมรูปย่อ และ "พกผู้เล่นไปด้วย"
   - แผงหมุดฝั่งขวา: แท็บ "ข้อมูล" / "DM" (การ์ดที่ติดป้าย data-dm)
   - ปุ่มจริงของฟีเจอร์ยังอยู่ในแถบเครื่องมือเดิมที่ซ่อนไว้ (#mapddToolbar) เมนูใหม่เรียกใช้ผ่านปุ่มเหล่านั้น จึงไม่ต้องแก้ฟีเจอร์เดิม */
(function () {
    'use strict';
    const $ = id => document.getElementById(id);
    const safe = (name, fn) => { try { fn(); } catch (e) { console.error('ui-layout:', name, e); } };
    const KEY = 'mapdd_ui_v1';
    let tab = 'info';
    try { const r = JSON.parse(localStorage.getItem(KEY)); if (r && r.tab === 'dm') tab = 'dm'; } catch (e) { }

    const holder = $('mapddToolbar');
    const real = part => holder ? [...holder.children].find(b => (b.title || '').includes(part)) : null;

    // ---------- เมนูแบบเปิด/ปิด ----------
    const MENUS = ['uiMenuFile', 'uiMenuView', 'uiMenuDm', 'uiScenePanel'];
    const ANCHORS = ['uiFileBtn', 'uiSceneBtn', 'uiViewBtn', 'uiDmBtn'];
    const closeAll = () => MENUS.forEach(id => { const m = $(id); if (m) m.classList.add('hidden'); });
    function toggleMenu(id, anchor, align, before) {
        const m = $(id), a = $(anchor);
        if (!m || !a) return false;
        const wasOpen = !m.classList.contains('hidden');
        closeAll();
        if (wasOpen) return false;
        if (before) before();
        m.classList.remove('hidden');
        const r = a.getBoundingClientRect(), w = m.offsetWidth || 260;
        const left = align === 'right' ? r.right - w : r.left;
        m.style.top = (r.bottom + 6) + 'px';
        m.style.left = Math.max(8, Math.min(left, window.innerWidth - w - 8)) + 'px';
        return true;
    }
    document.addEventListener('mousedown', e => {   // คลิกนอกเมนู/ปุ่มเปิดเมนู → ปิดเมนูทั้งหมด
        const hit = id => { const el = $(id); return !!(el && el.contains(e.target)); };
        if (![...MENUS, ...ANCHORS].some(hit)) closeAll();
    }, true);
    window.addEventListener('keydown', e => { if (e.key === 'Escape') closeAll(); });

    // ---------- เมนู "ไฟล์" ----------
    safe('file', () => {
        $('uiFileBtn').onclick = () => toggleMenu('uiMenuFile', 'uiFileBtn', 'left');
        const m = $('uiMenuFile');
        m.addEventListener('click', e => { if (e.target.closest('button')) setTimeout(closeAll, 0); });
        m.addEventListener('change', () => setTimeout(closeAll, 0));   // เลือกไฟล์แล้วปิดเมนู
    });

    // ---------- เครื่องมือบนแมพ / ควบคุมเกม (ปุ่มจริงอยู่ในแถบเดิมที่ซ่อนไว้) ----------
    safe('tools', () => {
        if (holder) holder.style.display = 'none';
        $('uiToolWalls').onclick = () => { closeAll(); const b = real('กำแพง/ประตู'); if (b) b.click(); };
        $('uiToolSpawn').onclick = () => { closeAll(); const b = real('จุดเกิดของหมุด'); if (b) b.click(); };
        $('uiTurnBtn').onclick = () => { closeAll(); const b = real('ลำดับเทิร์น'); if (b) b.click(); };
        [...$('uiTools').querySelectorAll('button')].forEach(b => { if (!b.title) b.title = (b.textContent || '').trim(); });   // จอแคบแสดงเป็นไอคอน
    });

    // ---------- เมนู "มุมมอง" / "ตั้งค่า DM": แถวสวิตช์ที่ใช้ปุ่มจริงเป็นตัวทำงาน ----------
    const stateOf = (kind, b) => {   // อ่านสถานะจากป้ายข้อความท้ายปุ่มจริง (เช่น "ตัวที่ซ่อน แสดง", "เงาอัตโนมัติ เปิด")
        const t = ((b.lastElementChild && b.lastElementChild.textContent) || '').trim();
        if (kind === 'ghost') return t.endsWith('แสดง') ? 'แสดง' : 'ซ่อน';
        return t.endsWith('เปิด') ? 'เปิด' : 'ปิด';
    };
    function fillMenu(menuId, defs, note) {
        const m = $(menuId); if (!m) return;
        m.innerHTML = '';
        defs.forEach(d => {
            const b = d.part ? real(d.part) : null;
            if (d.part && !b) return;
            const row = document.createElement('button');
            row.className = 'w-full text-left px-3 py-2 rounded-lg text-xs text-slate-200 hover:bg-vtt-card flex items-center justify-between gap-2';
            const st = d.kind && b ? stateOf(d.kind, b) : '';
            const on = st === 'เปิด' || st === 'แสดง';
            row.innerHTML = `<span>${d.label}</span>${st ? `<span class="text-[11px] font-bold ${on ? 'text-emerald-400' : 'text-slate-500'}">${st}</span>` : ''}`;
            row.onclick = () => { if (b) b.click(); else if (d.run) d.run(); if (d.keep) setTimeout(() => fillMenu(menuId, defs, note), 30); else closeAll(); };
            m.appendChild(row);
        });
        if (note) { const p = document.createElement('p'); p.className = 'px-3 py-2 text-[10px] text-slate-500'; p.textContent = note; m.appendChild(p); }
    }
    const viewDefs = [
        { part: 'พอดีหน้าจอ', label: 'พอดีจอ' },
        { part: 'ช่องกริดให้ลงตัว', label: 'กริดพอดีภาพ' },
        { part: 'แสดงตัวที่ซ่อน', label: 'แสดงตัวที่ซ่อน (จางๆ)', kind: 'ghost', keep: true },
        { part: 'พรีวิวว่าผู้เล่น', label: 'พรีวิวมุมมองผู้เล่น', kind: 'on', keep: true }
    ];
    const dmDefs = [
        { part: 'เงารอบหมุดอัตโนมัติ', label: 'เปิดเงารอบหมุดอัตโนมัติเมื่อเลื่อน', kind: 'on', keep: true },
        { label: 'เปิดเงารอบหมุดทุกตัวตอนนี้', run: () => { if (window.mapddRevealAllNow) window.mapddRevealAllNow(); } }
    ];
    safe('menus', () => {
        $('uiViewBtn').onclick = () => toggleMenu('uiMenuView', 'uiViewBtn', 'right', () => fillMenu('uiMenuView', viewDefs));
        $('uiDmBtn').onclick = () => toggleMenu('uiMenuDm', 'uiDmBtn', 'right', () => fillMenu('uiMenuDm', dmDefs, 'ตัวเลือกกำแพง (เกาะกริด/แสดงเส้น/บังสายตา) อยู่ในแผงเครื่องมือ "กำแพง" และตัวเลือกจุดเกิดอยู่ในแผง "จุดเกิด"'));
    });

    // ---------- แผง "ฉาก" ----------
    const thumbs = {};
    let presetsDrawn = false;
    const fmtDate = t => { try { return new Date(t).toLocaleDateString('th-TH'); } catch (e) { return ''; } };
    const ph = 'bg-gradient-to-br from-slate-700 to-slate-800';
    function drawPresets() {
        const pane = $('uiPresetPane'), sel = $('presetSceneSelect');
        if (!pane || !sel || presetsDrawn) return;
        presetsDrawn = true;
        const items = [...sel.options].filter(o => o.value).map(o => ({ key: o.value, label: o.textContent.replace(/^\S+\s+/, '').trim() }));
        pane.innerHTML = '';
        items.forEach((it, i) => {
            const card = document.createElement('button');
            card.className = 'text-left bg-vtt-card border border-vtt-border hover:border-amber-500 rounded-xl p-1.5 transition';
            card.innerHTML = `<div class="h-24 rounded-lg overflow-hidden ${ph} flex items-center justify-center"><img alt="" class="w-full h-full object-cover hidden"></div><div class="text-[11px] font-semibold text-white mt-1.5 leading-snug">${it.label}</div>`;
            card.onclick = () => { closeAll(); if (typeof handlePresetSceneSelect === 'function') handlePresetSceneSelect(it.key); };
            pane.appendChild(card);
            const img = card.querySelector('img');
            setTimeout(() => safe('thumb', () => {   // สร้างรูปย่อทีละใบ ไม่ให้หน้าค้าง
                if (!thumbs[it.key] && typeof generatePresetMapDataUrl === 'function') thumbs[it.key] = generatePresetMapDataUrl(it.key);
                if (thumbs[it.key]) { img.src = thumbs[it.key]; img.classList.remove('hidden'); }
            }), 60 + i * 120);
        });
    }
    function showTab(which) {
        const preset = which !== 'mine';
        $('uiPresetPane').classList.toggle('hidden', !preset);
        $('uiMinePane').classList.toggle('hidden', preset);
        $('uiTabPreset').className = 'px-3 py-1.5 rounded-lg text-xs ' + (preset ? 'font-bold bg-amber-500 text-slate-950' : 'font-semibold bg-vtt-card text-slate-300 border border-vtt-border');
        $('uiTabMine').className = 'px-3 py-1.5 rounded-lg text-xs ' + (!preset ? 'font-bold bg-amber-500 text-slate-950' : 'font-semibold bg-vtt-card text-slate-300 border border-vtt-border');
        if (preset) drawPresets(); else renderMine();
    }
    async function renderMine() {
        const box = $('uiMineList'); if (!box || !window.mapddScenes) return;
        let all = [];
        try { all = (await window.mapddScenes.all()).sort((a, b) => b.savedAt - a.savedAt); } catch (e) { }
        box.innerHTML = all.length ? '' : '<p class="text-xs text-slate-500 text-center py-6">ยังไม่มีฉากในคลัง — ตั้งชื่อแล้วกด "เก็บฉากนี้"</p>';
        all.forEach(c => {
            const row = document.createElement('div');
            row.className = 'flex items-center gap-2.5 bg-vtt-card border border-vtt-border rounded-xl p-2';
            const n = (c.tokens || []).length, f = Object.keys((c.fog && c.fog.cells) || {}).length;
            row.innerHTML = `<div class="w-16 h-12 rounded-lg overflow-hidden ${ph} shrink-0">${c.thumb ? `<img alt="" src="${c.thumb}" class="w-full h-full object-cover">` : ''}</div>
                <div class="flex-1 min-w-0"><div class="text-xs font-bold text-white truncate"></div><div class="text-[10px] text-slate-400">หมุด ${n} · เงา ${f} ช่อง · ${fmtDate(c.savedAt)}</div></div>
                <button data-a="load" class="px-2 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-[11px] font-bold">โหลด</button>
                <button data-a="del" class="px-2 py-1 rounded-lg bg-rose-950 hover:bg-rose-900 border border-rose-800 text-rose-300 text-[11px]">ลบ</button>`;
            row.querySelector('.truncate').textContent = c.name;   // ชื่อฉากเป็นข้อความธรรมดา (กันแทรก HTML)
            row.querySelector('[data-a=load]').onclick = async () => {
                const k = $('sceneKeepTokens'); if (k) k.checked = $('uiKeepTokens').checked;
                closeAll(); try { await window.mapddScenes.load(c.id); } catch (e) { showToast('โหลดฉากไม่สำเร็จ'); }
            };
            row.querySelector('[data-a=del]').onclick = async () => {
                if (!confirm('ลบฉากนี้ออกจากคลัง?')) return;
                try { await window.mapddScenes.del(c.id); } catch (e) { } renderMine();
            };
            box.appendChild(row);
        });
    }
    safe('scene', () => {
        $('uiSceneBtn').onclick = () => toggleMenu('uiScenePanel', 'uiSceneBtn', 'left', () => showTab('preset'));
        $('uiSceneClose').onclick = closeAll;
        $('uiTabPreset').onclick = () => showTab('preset');
        $('uiTabMine').onclick = () => showTab('mine');
        $('uiSceneSave').onclick = async () => {
            const old = $('sceneNameInput'); if (old) old.value = $('uiSceneName').value.trim();
            try { await window.mapddScenes.save(); $('uiSceneName').value = ''; } catch (e) { showToast('เก็บฉากไม่สำเร็จ'); }
            renderMine();
        };
    });

    // ---------- แผงหมุดฝั่งขวา: แท็บ ข้อมูล / DM ----------
    window.mapddUiTab = t => {
        tab = t === 'dm' ? 'dm' : 'info';
        try { localStorage.setItem(KEY, JSON.stringify({ tab })); } catch (e) { }
        renderInspector();
    };
    const origInspector = window.renderInspector;
    window.renderInspector = function () {
        origInspector.apply(this, arguments);
        safe('inspector-tabs', () => {
            const body = $('inspectorContent'); if (!body) return;
            const kids = [...body.children], dm = kids.filter(k => k.dataset && k.dataset.dm);
            if (!dm.length) return;
            kids.forEach(k => { const isDm = k.dataset && k.dataset.dm; k.style.display = (tab === 'dm') === !!isDm ? '' : 'none'; });
            const bar = document.createElement('div');
            bar.className = 'grid grid-cols-2 gap-1';
            const cls = on => 'py-2 rounded-lg text-xs font-bold ' + (on ? 'bg-amber-500 text-slate-950' : 'bg-vtt-card text-slate-300 border border-vtt-border');
            bar.innerHTML = `<button onclick="mapddUiTab('info')" class="${cls(tab !== 'dm')}">ข้อมูล</button><button onclick="mapddUiTab('dm')" class="${cls(tab === 'dm')}">DM</button>`;
            body.insertBefore(bar, body.firstChild);
        });
    };

    // เลย์เอาต์แท็บเล็ตเปลี่ยนขนาดพื้นที่แมพ → ให้แคนวาสคำนวณขนาดใหม่
    safe('resize', () => {
        const fire = () => { try { window.dispatchEvent(new Event('resize')); } catch (e) { } };
        if (typeof window.matchMedia === 'function') { const mq = window.matchMedia('(max-width: 1100px)'); if (mq.addEventListener) mq.addEventListener('change', fire); }
        setTimeout(fire, 50);
    });
})();
