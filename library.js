/* js/features.js — ฟีเจอร์เสริมของ D&D Battle Map (โหลดต่อท้ายสคริปต์หลักใน index.html)
   1) ตัวแปลงตัวละครจากแอปคู่หู (กติกาในบ้าน)   2) คลังตัวละคร
   3) พิมพ์ขนาดวงสกิลเอง                       4) แถบเครื่องมือ + จัดภาพให้พอดี
   5) บันทึกฉาก + ตัวละคร(คลัง) พร้อมกัน */
(function () {
    'use strict';
    const LIB_KEY = 'mapdd_library_v1';

    // ================= 1) กติกาในบ้าน + ตัวแปลงรูปแบบข้อมูล =================
    const CHECK_N = { STR: 4, DEX: 3, CON: 3, INT: 4, WIS: 3, CHA: 3 };
    const bn = v => Math.floor(Math.max(0, (Number(v) || 0) - 5) / 3);
    const rid = () => Math.random().toString(36).slice(2, 7);

    function companionToToken(ch, idx, center) {
        const st = ch.st || ch.stats || {};
        const g = k => Number(st[k] ?? st[k.toLowerCase()] ?? 5);
        const lv = Math.max(1, Number(ch.lv ?? ch.level ?? 1));
        const hpA = Array.isArray(ch.hp) ? ch.hp : [ch.hp, ch.hp];
        const mpA = Array.isArray(ch.mp) ? ch.mp : [ch.mp, ch.mp];

        const maxHp = Math.max(1, (Number(hpA[1]) || 0) + 10 * (lv - 1) + 2 * bn(g('CON')));
        const maxMp = Math.max(0, (Number(mpA[1]) || 0) + 10 * (lv - 1) + 10 * bn(g('INT')));
        const hp = Math.min(maxHp, hpA[0] == null ? maxHp : Math.max(0, Number(hpA[0]) || 0));
        const mp = Math.min(maxMp, mpA[0] == null ? maxMp : Math.max(0, Number(mpA[0]) || 0));
        const checks = {};
        Object.keys(CHECK_N).forEach(k => {
            checks[k] = Math.floor(g(k) / CHECK_N[k]) - (g(k) < 6 ? 1 : 0);
        });
        const ac = ch.ac ? Number(ch.ac) : 10 + bn(g('DEX'));   // กติกาในบ้านไม่ได้กำหนด AC: ใช้ 10 + bn(DEX) แก้ได้ในแผงหมุด

        const skills = [];
        (ch.mg || []).forEach(m => m && m.a && skills.push({ id: 'sk-' + rid(), name: m.a, mpCost: Number(m.c) || 0, desc: m.b || '' }));
        (ch.ab || []).forEach(a => a && a.a && skills.push({ id: 'ab-' + rid(), name: a.a, mpCost: 0, desc: a.b || '' }));
        const inventory = (ch.bag || []).filter(it => it && (it.a || it.name)).map(it => ({
            id: 'it-' + rid(), name: it.a || it.name, qty: Number(it.q ?? it.qty ?? 1) || 1,
            healHp: Number(it.healHp ?? 0) || 0, healMp: Number(it.healMp ?? 0) || 0
        }));

        const avatar = (ch.img && String(ch.img).trim()) || null;
        if (avatar) { const im = new Image(); im.src = avatar; avatarCache[avatar] = im; }
        const pos = snapPositionToGrid(center.x + idx * (state.grid.size || 64), center.y, 1);

        return ensureTokenRpgData({
            id: 'tok-' + Date.now() + '-' + rid(),
            name: (ch.name && String(ch.name).trim()) || `ตัวละคร Lv.${lv}`,
            faction: 'player', charClass: ch.class || ch.charClass || '', level: lv,
            baseAc: ac, ac, hp, maxHp, mp, maxMp, size: 1, color: '#10b981',
            emoji: avatar ? '' : '⚔️', avatar, x: pos.x, y: pos.y,
            conditions: [], skills, inventory,
            hr: { st: { STR: g('STR'), DEX: g('DEX'), CON: g('CON'), INT: g('INT'), WIS: g('WIS'), CHA: g('CHA') }, dmg: bn(g('STR')) + bn(g('DEX')), checks, baseHp: Number(hpA[1]) || 0, baseMp: Number(mpA[1]) || 0 },
            src: { app: 'dnd-companion', id: ch.id ?? null, cap: ch.cap ?? null, buff: ch.buff || [] }
        });
    }

    function tokenToCompanion(t) {
        const st = (t.hr && t.hr.st) || { STR: 5, DEX: 5, CON: 5, INT: 5, WIS: 5, CHA: 5 };
        const lv = t.level || 1;
        const mg = [], ab = [];
        (t.skills || []).forEach(k => {
            const isMg = k.id ? String(k.id).startsWith('sk-') : (k.mpCost > 0);
            if (isMg) mg.push({ a: k.name, b: k.desc || '', c: Number(k.mpCost) || 0 });
            else ab.push({ a: k.name, b: k.desc || '' });
        });
        const o = {
            id: (t.src && t.src.id != null) ? t.src.id : (t.libId || t.id), name: t.name,
            hp: [t.hp, (t.hr && t.hr.baseHp != null) ? t.hr.baseHp : Math.max(0, (t.maxHp || 0) - 10 * (lv - 1) - 2 * bn(st.CON))],
            mp: [t.mp, (t.hr && t.hr.baseMp != null) ? t.hr.baseMp : Math.max(0, (t.maxMp || 0) - 10 * (lv - 1) - 10 * bn(st.INT))],
            st, lv, ab, mg, buff: (t.src && t.src.buff) || [],
            bag: (t.inventory || []).map(i => ({ a: i.name, q: i.qty }))
        };
        if (t.avatar) o.img = t.avatar;
        if (t.src && t.src.cap != null) o.cap = t.src.cap;
        return o;
    }
    function exportCompanion(list, label) {
        if (!list.length) return showToast('ไม่มีตัวละครให้ส่งออก');
        download(`dnd_companion_${label}_${today()}.json`, { app: 'dnd-companion', ver: 2, chars: list.map(tokenToCompanion) });
        showToast(`ส่งออก ${list.length} ตัวละครในรูปแบบแอปคู่หูแล้ว`);
    }

    window.handleCharacterJsonImport = function (file) {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => {
            try {
                const data = JSON.parse(ev.target.result);
                const list = Array.isArray(data.chars) ? data.chars : (Array.isArray(data) ? data : [data]);
                if (!list.length) return showToast('ไม่พบข้อมูลตัวละครในไฟล์ JSON');
                const r = container.getBoundingClientRect();
                const center = screenToWorld(r.width / 2, r.height / 2);
                list.forEach((ch, i) => {
                    const t = companionToToken(ch, i, center);
                    if (window.mapddPlaceAtSpawn) window.mapddPlaceAtSpawn(t);
                    state.tokens.push(t);
                    state.selectedTokenId = t.id;
                    libAdd(t, true);
                });
                renderAll(); saveToLocalStorage(); renderLib();
                showToast(`นำเข้า ${list.length} ตัวละคร (คำนวณตามกติกาในบ้าน) และเก็บเข้าคลังแล้ว`);
            } catch (e) { showToast('ไม่สามารถอ่านไฟล์ตัวละคร JSON ได้'); }
        };
        reader.readAsText(file);
    };

    // ================= 2) คลังตัวละคร =================
    function loadLib() {
        try { const a = JSON.parse(localStorage.getItem(LIB_KEY) || '[]'); return Array.isArray(a) ? a : []; }
        catch (e) { return []; }
    }
    function saveLib(arr) {
        try { localStorage.setItem(LIB_KEY, JSON.stringify(arr)); return true; }
        catch (e) { showToast('พื้นที่เก็บข้อมูลเต็ม (รูปตัวละครอาจใหญ่เกินไป)'); return false; }
    }
    function libAdd(tok, silent) {
        const lib = loadLib();
        const snap = JSON.parse(JSON.stringify(tok));
        delete snap.x; delete snap.y;
        const srcId = snap.src && snap.src.id != null ? snap.src.id : null;
        const i = lib.findIndex(c => (srcId != null && c.src && c.src.id === srcId) || (srcId == null && c.name === snap.name));
        snap.libId = i >= 0 ? lib[i].libId : 'lib-' + Date.now() + '-' + rid();
        if (i >= 0) lib[i] = snap; else lib.push(snap);
        if (saveLib(lib) && !silent) showToast(`เก็บ "${snap.name}" เข้าคลังแล้ว`);
    }
    function libPlace(libId) {
        const c = loadLib().find(x => x.libId === libId);
        if (!c) return;
        const t = ensureTokenRpgData(JSON.parse(JSON.stringify(c)));
        t.id = 'tok-' + Date.now() + '-' + rid();
        const r = container.getBoundingClientRect();
        const ctr = screenToWorld(r.width / 2, r.height / 2);
        const p = snapPositionToGrid(ctr.x + (state.tokens.length % 5) * (state.grid.size || 64), ctr.y, t.size || 1);
        t.x = p.x; t.y = p.y;
        if (window.mapddPlaceAtSpawn) window.mapddPlaceAtSpawn(t);
        if (t.avatar) { const im = new Image(); im.src = t.avatar; avatarCache[t.avatar] = im; }
        state.tokens.push(t); state.selectedTokenId = t.id;
        renderAll(); saveToLocalStorage();
        showToast(`วาง "${t.name}" ลงแผนที่แล้ว`);
    }
    function libDelete(libId) {
        saveLib(loadLib().filter(c => c.libId !== libId)); renderLib();
    }
    function libExport() {
        download(`dnd_library_${today()}.json`, { app: 'dnd-battlemap-library', ver: 1, library: loadLib() });
    }
    function libMerge(items) {
        const lib = loadLib(); let n = 0;
        items.forEach(c => {
            if (!c || !c.name) return;
            c.libId = c.libId || 'lib-' + Date.now() + '-' + rid();
            const i = lib.findIndex(x => x.libId === c.libId);
            if (i >= 0) lib[i] = c; else lib.push(c);
            n++;
        });
        saveLib(lib); renderLib(); return n;
    }

    function renderLib() {
        const box = document.getElementById('libList');
        if (!box) return;
        const q = (document.getElementById('libSearch').value || '').trim().toLowerCase();
        const lib = loadLib().filter(c => !q || (c.name + ' ' + (c.charClass || '')).toLowerCase().includes(q));
        document.getElementById('libCount').textContent = loadLib().length;
        box.innerHTML = lib.length ? lib.map(c => `
            <div class="flex items-center gap-2.5 bg-vtt-card border border-vtt-border rounded-xl p-2">
                <div class="w-10 h-10 rounded-full bg-vtt-bg border border-vtt-border overflow-hidden flex items-center justify-center text-lg shrink-0">
                    ${c.avatar ? `<img src="${c.avatar}" class="w-full h-full object-cover">` : escapeHtml(c.emoji || (c.name || '?')[0])}
                </div>
                <div class="flex-1 min-w-0">
                    <div class="text-xs font-bold text-white truncate">${escapeHtml(c.name)}</div>
                    <div class="text-[10px] text-slate-400 truncate">${escapeHtml(c.charClass || '-')} · Lv.${c.level || 1} · HP ${c.hp}/${c.maxHp} · MP ${c.mp}/${c.maxMp}${c.hr ? ' · ดาเมจ +' + c.hr.dmg : ''}</div>
                </div>
                <button data-place="${c.libId}" class="px-2 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-[11px] font-bold">วาง</button>
                <button data-del="${c.libId}" class="px-2 py-1 rounded-lg bg-rose-950 hover:bg-rose-900 border border-rose-800 text-rose-300 text-[11px]">ลบ</button>
            </div>`).join('')
            : '<p class="text-xs text-slate-500 text-center py-6">ยังไม่มีตัวละครในคลัง — นำเข้าจากแอปคู่หู หรือกด "เก็บหมุดที่เลือก"</p>';
    }

    function buildLibModal() {
        const m = document.createElement('div');
        m.id = 'libModal';
        m.className = 'hidden fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-3';
        m.innerHTML = `
        <div class="bg-vtt-panel border border-amber-500/60 rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col">
            <div class="flex items-center justify-between p-3 border-b border-vtt-border">
                <h2 class="text-sm font-bold text-amber-400">📚 คลังตัวละคร (<span id="libCount">0</span>)</h2>
                <button id="libClose" class="text-slate-400 hover:text-white px-2">✕</button>
            </div>
            <div class="p-3 space-y-2 border-b border-vtt-border">
                <div class="grid grid-cols-2 gap-1.5">
                    <button id="libAddSel" class="py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold">＋ เก็บหมุดที่เลือก</button>
                    <button id="libAddPlayers" class="py-1.5 rounded-lg bg-emerald-900/70 hover:bg-emerald-800 border border-emerald-700 text-emerald-200 text-[11px] font-semibold">＋ เก็บผู้เล่นทั้งหมด</button>
                    <button id="libExport" class="py-1.5 rounded-lg bg-vtt-card hover:bg-slate-800 border border-vtt-border text-slate-200 text-[11px]">⬇ ส่งออกคลัง</button>
                    <label class="py-1.5 rounded-lg bg-vtt-card hover:bg-slate-800 border border-vtt-border text-slate-200 text-[11px] text-center cursor-pointer">⬆ นำเข้าคลัง<input id="libImport" type="file" accept=".json" class="hidden"></label>
                    <button id="libExpComp" class="py-1.5 rounded-lg bg-sky-900/60 hover:bg-sky-800 border border-sky-700 text-sky-200 text-[11px]" title="ไฟล์ที่แอปคู่หูเปิดได้ (dnd-companion ver 2)">⬇ ส่งออกแบบแอปคู่หู (คลัง)</button>
                    <button id="libExpMap" class="py-1.5 rounded-lg bg-sky-900/60 hover:bg-sky-800 border border-sky-700 text-sky-200 text-[11px]">⬇ ส่งออกผู้เล่นบนแมพ (แอปคู่หู)</button>
                </div>
                <input id="libSearch" placeholder="ค้นหาชื่อ / คลาส" class="w-full bg-vtt-bg border border-vtt-border rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500">
            </div>
            <div id="libList" class="flex-1 overflow-y-auto p-3 space-y-2"></div>
        </div>`;
        document.body.appendChild(m);

        const $ = id => document.getElementById(id);
        const toggle = on => { m.classList.toggle('hidden', !on); if (on) renderLib(); };
        window.openCharLibrary = () => toggle(true);
        $('libClose').onclick = () => toggle(false);
        m.addEventListener('click', e => {
            if (e.target === m) return toggle(false);
            const p = e.target.closest('[data-place]'), d = e.target.closest('[data-del]');
            if (p) libPlace(p.dataset.place);
            if (d && confirm('ลบตัวละครนี้ออกจากคลัง?')) libDelete(d.dataset.del);
        });
        $('libSearch').oninput = renderLib;
        $('libAddSel').onclick = () => {
            const t = getSelectedToken();
            if (!t) return showToast('ยังไม่ได้เลือกหมุดบนแผนที่');
            libAdd(t); renderLib();
        };
        $('libAddPlayers').onclick = () => {
            const ps = state.tokens.filter(t => t.faction === 'player');
            ps.forEach(t => libAdd(t, true)); renderLib();
            showToast(`เก็บผู้เล่น ${ps.length} ตัวเข้าคลังแล้ว`);
        };
        $('libExport').onclick = libExport;
        $('libExpComp').onclick = () => exportCompanion(loadLib(), 'library');
        $('libExpMap').onclick = () => exportCompanion(state.tokens.filter(t => t.faction === 'player'), 'players');
        $('libImport').onchange = e => {
            const f = e.target.files[0]; e.target.value = '';
            if (!f) return;
            const r = new FileReader();
            r.onload = ev => {
                try {
                    const d = JSON.parse(ev.target.result);
                    const items = Array.isArray(d.library) ? d.library : (Array.isArray(d) ? d : []);
                    showToast(`นำเข้าคลัง ${libMerge(items)} ตัวละครแล้ว`);
                } catch (err) { showToast('ไฟล์คลังไม่ถูกต้อง'); }
            };
            r.readAsText(f);
        };
    }

    // ================= 3) พิมพ์ขนาดวงสกิลเอง =================
    const clampFeet = v => Math.min(500, Math.max(5, Math.round(Number(v) || 0)));

    function buildAoeInputs() {
        // 3.1 ช่องพิมพ์ในแถบเครื่องมือ "ก่อนวาง"
        const sel = document.getElementById('aoeRadiusSelect');
        if (sel) {
            const w = document.createElement('div');
            w.className = 'flex items-center gap-1 bg-vtt-bg px-2 py-0.5 rounded-lg border border-vtt-border';
            w.innerHTML = '<span class="text-[10px] text-slate-400">พิมพ์เอง:</span><input id="aoeRadiusInput" type="number" min="5" max="500" step="5" value="20" class="w-14 bg-transparent text-xs font-bold text-amber-400 text-center focus:outline-none"><span class="text-[10px] text-slate-400">ฟุต</span>';
            sel.parentElement.after(w);
            document.getElementById('aoeRadiusInput').addEventListener('input', e => {
                if (!(Number(e.target.value) > 0)) return;
                aoeDraft.radiusFeet = clampFeet(e.target.value);
                sel.value = String(aoeDraft.radiusFeet);   // ถ้าไม่ตรงตัวเลือก dropdown จะว่างไว้
            });
            const orig = window.setAoeRadiusFeet;
            window.setAoeRadiusFeet = f => { orig(f); document.getElementById('aoeRadiusInput').value = aoeDraft.radiusFeet; };
        }
        // 3.2 ช่องพิมพ์ใน "วงที่เลือกอยู่" ปรับขนาดสดๆ
        const bar = document.getElementById('selectedAoeControlBar');
        const del = bar && bar.querySelector('button[onclick="deleteSelectedAoe()"]');
        if (del) {
            const w = document.createElement('div');
            w.className = 'flex items-center gap-1 text-xs text-slate-300';
            w.innerHTML = 'รัศมี <input id="selAoeRadiusInput" type="number" min="5" max="500" step="5" class="w-16 bg-vtt-bg border border-vtt-border rounded-lg px-1.5 py-1 text-xs font-bold text-amber-400 text-center focus:outline-none focus:border-amber-500"> ฟุต (<span id="selAoeCells">0</span> ช่อง)';
            del.before(w);
            document.getElementById('selAoeRadiusInput').addEventListener('input', e => {
                const tpl = getSelectedAoe();
                if (!tpl || !(Number(e.target.value) > 0)) return;
                tpl.radiusFeet = clampFeet(e.target.value);
                document.getElementById('selAoeCells').textContent = +(tpl.radiusFeet / 5).toFixed(1);
                document.getElementById('selectedAoeTitle').textContent = tpl.label ? `${tpl.label} (${tpl.radiusFeet} ft)` : `${tpl.shape === 'square' ? 'สี่เหลี่ยม' : 'วงกลม'} (${tpl.radiusFeet} ft)`;
                saveToLocalStorage();
            });
            const origBar = window.updateSelectedAoeBar;
            window.updateSelectedAoeBar = function () {
                origBar();
                const tpl = getSelectedAoe(), inp = document.getElementById('selAoeRadiusInput');
                if (tpl && inp) {
                    if (document.activeElement !== inp) inp.value = tpl.radiusFeet;
                    document.getElementById('selAoeCells').textContent = +(tpl.radiusFeet / 5).toFixed(1);
                }
            };
        }
    }

    // ================= 4) จัดภาพให้พอดี + แถบเครื่องมือ =================
    window.fitMapToScreen = function () {
        const r = container.getBoundingClientRect();
        const sb = document.getElementById('leftSidebar');
        const left = sb && !sb.classList.contains('-translate-x-full') && r.width > 700 ? sb.offsetWidth : 0; // แถบซ้ายลอยทับแมพ
        const pad = 32;
        const z = Math.max(0.1, Math.min((r.width - left - pad * 2) / state.mapWidth, (r.height - pad * 2) / state.mapHeight, 2));
        state.camera.zoom = z;
        state.camera.x = left + (r.width - left - state.mapWidth * z) / 2;
        state.camera.y = (r.height - state.mapHeight * z) / 2;
        document.getElementById('zoomPercentLabel').textContent = Math.round(z * 100) + '%';
    };

    function fitGridToImage() {
        const cols = Math.max(1, Math.round(state.mapWidth / (state.grid.size || 64)));
        state.grid.size = Math.min(160, Math.max(24, Math.round(state.mapWidth / cols)));
        state.grid.offsetX = 0; state.grid.offsetY = 0;
        syncGridUIInputs(); saveToLocalStorage();
        showToast(`ปรับกริดให้พอดีภาพ: ${Math.round(state.mapWidth / state.grid.size)} ช่องแนวนอน (ช่องละ ${state.grid.size}px)`);
    }

    function buildToolbar() {
        const tb = document.createElement('div');
        tb.id = 'mapddToolbar';
        tb.className = 'absolute top-2 left-1/2 -translate-x-1/2 z-10 flex flex-row gap-0.5 bg-vtt-panel/90 backdrop-blur border border-vtt-border rounded-2xl p-1 shadow-xl max-w-[96vw]';
        // แถบลอยของโหมดเงา/วงสกิลเดิมอยู่บนสุดตรงกลาง — ขยับลงมาไม่ให้ทับแถบนี้
        ['fogFloatingToolbar', 'aoeFloatingToolbar'].forEach(id => { const el = document.getElementById(id); if (el) el.style.top = '5rem'; });
        const items = [
            ['⤢', 'พอดีจอ', 'จัดแผนที่ให้พอดีหน้าจอ', () => { fitMapToScreen(); }],
            ['▦', 'กริดพอดีภาพ', 'ปรับขนาดช่องกริดให้ลงตัวกับความกว้างภาพ', fitGridToImage],
            ['🗺️', 'คลังแมพ', 'คลังแมพ: เก็บแมพ + ตำแหน่งหมุด + เงา/ทึบ', () => openSceneLibrary()],
            ['📚', 'คลังตัวละคร', 'คลังตัวละคร', () => openCharLibrary()],
            ['💾', 'บันทึกรวม', 'บันทึกฉาก + หมุด + คลังตัวละครเป็นไฟล์เดียว', saveAll]
        ];
        items.forEach(([ic, label, tip, fn]) => {
            const b = document.createElement('button');
            b.title = tip;
            b.className = 'min-w-[3.2rem] px-1.5 py-1 rounded-xl hover:bg-vtt-card text-slate-200 flex flex-col items-center leading-tight text-center';
            b.innerHTML = `<span class="text-base">${ic}</span><span class="text-[9px] text-slate-400">${label}</span>`;
            b.onclick = fn;
            tb.appendChild(b);
        });
        container.appendChild(tb);
    }

    // ================= 5) บันทึก/โหลดรวม (ฉาก + หมุด + คลัง) =================
    const today = () => new Date().toISOString().slice(0, 10);
    function download(name, obj) {
        const url = URL.createObjectURL(new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' }));
        const a = document.createElement('a'); a.href = url; a.download = name; a.click();
        URL.revokeObjectURL(url);
    }
    function saveAll() {
        download(`dnd_battlemap_all_${today()}.json`, {
            app: 'dnd-battlemap', version: '2.0', savedAt: new Date().toISOString(),
            grid: state.grid, fog: state.fog || { cells: {}, dmDarkOpacity: 1 },
            aoeTemplates: state.aoeTemplates || [], spawn: state.spawn || {}, walls: state.walls || [], tokens: state.tokens,
            mapImageSrc: state.mapImageSrc, library: loadLib()
        });
        showToast('บันทึกฉาก + หมุด + คลังตัวละคร ลงไฟล์เดียวแล้ว (โหลดด้วยปุ่ม "โหลดฉาก")');
    }
    // ปุ่ม "โหลดฉาก" เดิมจะโหลดฉาก/หมุดให้เอง — ตรงนี้เสริมเฉพาะการรวมคลังจากไฟล์บันทึกรวม
    document.getElementById('sceneLoadInput').addEventListener('change', e => {
        const f = e.target.files[0];
        if (!f) return;
        const r = new FileReader();
        r.onload = ev => {
            try {
                const d = JSON.parse(ev.target.result);
                if (Array.isArray(d.library) && d.library.length) {
                    const n = libMerge(d.library);
                    showToast(`โหลดฉากแล้ว และรวมตัวละครเข้าคลัง ${n} ตัว`);
                }
            } catch (err) { /* ตัวโหลดฉากเดิมแจ้งข้อผิดพลาดอยู่แล้ว */ }
        };
        r.readAsText(f);
    });

    // ================= 6) คลังแมพ (แมพ + ตำแหน่งหมุด + เงา/ทึบ เก็บรวมกัน) — เก็บใน IndexedDB =================
    function idb() {
        return new Promise((res, rej) => {
            const rq = indexedDB.open('mapdd_db', 2);
            rq.onupgradeneeded = () => {
                const db = rq.result;
                if (!db.objectStoreNames.contains('scenes')) db.createObjectStore('scenes', { keyPath: 'id' });
                if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv');
            };
            rq.onsuccess = () => res(rq.result);
            rq.onerror = () => rej(rq.error);
        });
    }
    async function idbRun(mode, fn) {
        const db = await idb();
        return new Promise((res, rej) => {
            const tx = db.transaction('scenes', mode), out = fn(tx.objectStore('scenes'));
            tx.oncomplete = () => res(out && out.result);
            tx.onerror = () => rej(tx.error);
        });
    }
    async function kvRun(mode, fn) {
        const db = await idb();
        return new Promise((res, rej) => {
            const tx = db.transaction('kv', mode), out = fn(tx.objectStore('kv'));
            tx.oncomplete = () => res(out && out.result);
            tx.onerror = () => rej(tx.error);
        });
    }
    window.mapddKv = {   // ที่เก็บ key-value ใน IndexedDB (ใช้โดย persist-map.js)
        get: k => kvRun('readonly', st => st.get(k)),
        set: (k, v) => kvRun('readwrite', st => st.put(v, k)),
        del: k => kvRun('readwrite', st => st.delete(k))
    };
    const sceneAll = () => idbRun('readonly', st => st.getAll());
    const scenePut = o => idbRun('readwrite', st => st.put(o));
    const sceneDel = id => idbRun('readwrite', st => st.delete(id));

    function makeThumb() {
        if (!mapImgObj || !mapImgObj.naturalWidth) return null;
        const c = document.createElement('canvas'), k = 160 / mapImgObj.naturalWidth;
        c.width = 160; c.height = Math.max(1, Math.round(mapImgObj.naturalHeight * k));
        c.getContext('2d').drawImage(mapImgObj, 0, 0, c.width, c.height);
        return c.toDataURL('image/jpeg', 0.6);
    }

    async function saveSceneToLibrary() {
        const inp = document.getElementById('sceneNameInput');
        const name = inp.value.trim() || 'ฉากไม่มีชื่อ ' + new Date().toLocaleString('th-TH');
        const all = await sceneAll();
        const old = all.find(x => x.name === name);
        if (old && !confirm(`มีฉากชื่อ "${name}" อยู่แล้ว — เขียนทับ?`)) return;
        await scenePut(JSON.parse(JSON.stringify({
            id: old ? old.id : 'scn-' + Date.now() + '-' + rid(), name, savedAt: Date.now(), thumb: makeThumb(),
            mapImageSrc: state.mapImageSrc, isBlankMap: state.isBlankMap, mapWidth: state.mapWidth, mapHeight: state.mapHeight,
            grid: state.grid, fog: state.fog, aoeTemplates: state.aoeTemplates || [], spawn: state.spawn || {}, walls: state.walls || [], tokens: state.tokens
        })));
        inp.value = '';
        showToast(`เก็บฉาก "${name}" แล้ว (แมพ + หมุด + เงา)`);
        renderScenes();
    }

    async function loadSceneFromLibrary(id) {
        const d = (await sceneAll()).find(x => x.id === id);
        if (!d) return;
        const keep = document.getElementById('sceneKeepTokens').checked;
        state.grid = { ...state.grid, ...(d.grid || {}) };
        state.fog = { cells: (d.fog && d.fog.cells) || {}, dmDarkOpacity: 1.0 };
        state.aoeTemplates = d.aoeTemplates || [];
        state.spawn = d.spawn || {};
        state.walls = Array.isArray(d.walls) ? d.walls : [];
        if (!keep) {
            state.tokens = (d.tokens || []).map(ensureTokenRpgData);
            state.tokens.forEach(t => { if (t.avatar) { const im = new Image(); im.src = t.avatar; avatarCache[t.avatar] = im; } });
            state.selectedTokenId = null;
        }
        state.mapWidth = d.mapWidth || 1600; state.mapHeight = d.mapHeight || 1100;
        if (d.mapImageSrc) applyMapImage(d.mapImageSrc);
        else { state.mapImageSrc = null; mapImgObj = null; state.isBlankMap = !!d.isBlankMap; fitMapToScreen(); }
        selectedAoeId = null; updateSelectedAoeBar(); syncGridUIInputs(); renderAll(); saveToLocalStorage();
        document.getElementById('sceneModal').classList.add('hidden');
        showToast(`โหลดฉาก "${d.name}" แล้ว`);
    }

    async function renderScenes() {
        const box = document.getElementById('sceneList');
        if (!box) return;
        const all = (await sceneAll()).sort((a, b) => b.savedAt - a.savedAt);
        document.getElementById('sceneCount').textContent = all.length;
        box.innerHTML = all.length ? all.map(c => `
            <div class="flex items-center gap-2.5 bg-vtt-card border border-vtt-border rounded-xl p-2">
                <div class="w-16 h-12 rounded-lg bg-vtt-bg border border-vtt-border overflow-hidden shrink-0 flex items-center justify-center text-slate-600 text-[10px]">
                    ${c.thumb ? `<img src="${c.thumb}" class="w-full h-full object-cover">` : 'ไม่มีรูป'}
                </div>
                <div class="flex-1 min-w-0">
                    <div class="text-xs font-bold text-white truncate">${escapeHtml(c.name)}</div>
                    <div class="text-[10px] text-slate-400">หมุด ${(c.tokens || []).length} · เงา/ทึบ ${Object.keys((c.fog && c.fog.cells) || {}).length} ช่อง · ${new Date(c.savedAt).toLocaleDateString('th-TH')}</div>
                </div>
                <button data-sexp="${c.id}" title="ส่งออกฉากนี้" class="px-2 py-1 rounded-lg bg-vtt-bg hover:bg-slate-800 border border-vtt-border text-slate-300 text-[11px]">⬇</button>
                <button data-load="${c.id}" class="px-2 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-[11px] font-bold">โหลด</button>
                <button data-sdel="${c.id}" class="px-2 py-1 rounded-lg bg-rose-950 hover:bg-rose-900 border border-rose-800 text-rose-300 text-[11px]">ลบ</button>
            </div>`).join('')
            : '<p class="text-xs text-slate-500 text-center py-6">ยังไม่มีฉากในคลัง — ตั้งชื่อแล้วกด "เก็บฉากนี้"</p>';
    }

    function buildSceneModal() {
        const m = document.createElement('div');
        m.id = 'sceneModal';
        m.className = 'hidden fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-3';
        m.innerHTML = `
        <div class="bg-vtt-panel border border-amber-500/60 rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col">
            <div class="flex items-center justify-between p-3 border-b border-vtt-border">
                <h2 class="text-sm font-bold text-amber-400">🗺️ คลังแมพ (<span id="sceneCount">0</span>)</h2>
                <button id="sceneClose" class="text-slate-400 hover:text-white px-2">✕</button>
            </div>
            <div class="p-3 space-y-2 border-b border-vtt-border">
                <div class="flex gap-1.5">
                    <input id="sceneNameInput" placeholder="ชื่อฉาก เช่น ถ้ำก็อบลิน ชั้น 1" class="flex-1 bg-vtt-bg border border-vtt-border rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500">
                    <button id="sceneSaveBtn" class="px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold">เก็บฉากนี้</button>
                </div>
                <div class="grid grid-cols-2 gap-1.5">
                    <button id="sceneExpAll" class="py-1.5 rounded-lg bg-vtt-card hover:bg-slate-800 border border-vtt-border text-slate-200 text-[11px]">⬇ ส่งออกคลังแมพทั้งหมด</button>
                    <label class="py-1.5 rounded-lg bg-vtt-card hover:bg-slate-800 border border-vtt-border text-slate-200 text-[11px] text-center cursor-pointer">⬆ นำเข้าคลังแมพ<input id="sceneImp" type="file" accept=".json" class="hidden"></label>
                </div>
                <label class="flex items-center gap-1.5 text-[11px] text-slate-300 cursor-pointer"><input id="sceneKeepTokens" type="checkbox" class="accent-amber-500"> โหลดเฉพาะแมพ+เงา (คงหมุดที่อยู่บนกระดานตอนนี้)</label>
            </div>
            <div id="sceneList" class="flex-1 overflow-y-auto p-3 space-y-2"></div>
        </div>`;
        document.body.appendChild(m);
        window.openSceneLibrary = () => { m.classList.remove('hidden'); renderScenes(); };
        document.getElementById('sceneClose').onclick = () => m.classList.add('hidden');
        document.getElementById('sceneExpAll').onclick = async () => {
            const a = await sceneAll();
            if (!a.length) return showToast('คลังแมพยังว่างอยู่');
            download(`dnd_scenes_${today()}.json`, { app: 'dnd-battlemap-scenes', ver: 1, scenes: a });
            showToast(`ส่งออก ${a.length} ฉากแล้ว`);
        };
        document.getElementById('sceneImp').onchange = e => {
            const f = e.target.files[0]; e.target.value = '';
            if (!f) return;
            const r = new FileReader();
            r.onload = async ev => {
                try {
                    const d = JSON.parse(ev.target.result);
                    const list = (Array.isArray(d.scenes) ? d.scenes : []).filter(c => c && c.id && c.name);
                    if (!list.length) return showToast('ไม่พบฉากในไฟล์นี้');
                    for (const c of list) await scenePut(c);
                    showToast(`นำเข้า ${list.length} ฉากแล้ว`); renderScenes();
                } catch (err) { showToast('ไฟล์คลังแมพไม่ถูกต้อง'); }
            };
            r.readAsText(f);
        };
        document.getElementById('sceneSaveBtn').onclick = () => saveSceneToLibrary().catch(() => showToast('เก็บฉากไม่สำเร็จ (พื้นที่เบราว์เซอร์ไม่พอ?)'));
        m.addEventListener('click', e => {
            if (e.target === m) return m.classList.add('hidden');
            const x = e.target.closest('[data-sexp]');
            if (x) sceneAll().then(a => { const c = a.find(z => z.id === x.dataset.sexp); if (c) download(`dnd_scene_${c.name.replace(/[^\w\u0E00-\u0E7F-]+/g, '_')}.json`, { app: 'dnd-battlemap-scenes', ver: 1, scenes: [c] }); });
            const l = e.target.closest('[data-load]'), d = e.target.closest('[data-sdel]');
            if (l) loadSceneFromLibrary(l.dataset.load);
            if (d && confirm('ลบฉากนี้ออกจากคลัง?')) sceneDel(d.dataset.sdel).then(renderScenes);
        });
    }

    // ================= เริ่มทำงาน =================
    buildLibModal();
    buildSceneModal();
    buildAoeInputs();
    buildToolbar();
    window.addEventListener('load', () => setTimeout(fitMapToScreen, 0));
})();
