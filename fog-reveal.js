/* js/features/fog-reveal.js — เปิดเงาทึบรอบหมุดอัตโนมัติเมื่อเลื่อนหมุด (เปิดค้างถาวร)
   - ปรับจำนวนช่องรอบตัวได้ที่หมุดแต่ละตัว (0 = ไม่เปิด) ค่าเริ่มต้น: ผู้เล่น 1 ช่อง, NPC/ศัตรู 0
   - เปิดเฉพาะเงา "ทึบ" (dark) เงาบาง (shadow) ไม่ถูกแตะ
   - มีปุ่มเปิด/ปิดฟีเจอร์ทั้งระบบในแถบเครื่องมือ */
(function () {
    'use strict';
    const KEY = 'mapdd_fogreveal_v1';
    let on = true;
    try { const r = JSON.parse(localStorage.getItem(KEY)); if (r && r.on === false) on = false; } catch (e) { }
    const saveOn = () => { try { localStorage.setItem(KEY, JSON.stringify({ on })); } catch (e) { } };

    const rad = t => t.revealRadius != null
        ? Math.max(0, Math.min(10, Math.round(Number(t.revealRadius)) || 0))
        : ((t.faction || 'player') === 'player' ? 1 : 0);

    function reveal(t) {   // ลบเงาทึบในพื้นที่ที่หมุดครอบ + R ช่องรอบตัว
        const R = rad(t);
        if (!R) return false;
        const gs = state.grid.size || 64, half = (t.size || 1) * gs / 2;
        const a = worldToGridCell(t.x - half + 1, t.y - half + 1), b = worldToGridCell(t.x + half - 1, t.y + half - 1);
        let n = 0;
        for (let c = a.col - R; c <= b.col + R; c++) for (let r = a.row - R; r <= b.row + R; r++) {
            const k = c + ',' + r;
            if (state.fog.cells[k] === 'dark') { delete state.fog.cells[k]; n++; }
        }
        return n > 0;
    }
    // จำตำแหน่งหมุดทุกตัว (ตามรหัสหมุด) "ตอนกดเมาส์/นิ้วลงบนแมพ" ก่อนลากหมุด แล้วเทียบตอนบันทึกหลังปล่อย
    // หมายเหตุ: แอปสลับลำดับ state.tokens ใหม่ทุกครั้งที่กดหมุด (ดึงไปไว้บนสุด) จึงเทียบด้วยรหัสหมุด ไม่ใช่ตัวอาร์เรย์
    let pre = null;
    function snap() {
        pre = {};
        state.tokens.forEach(t => { pre[t.id] = t.x + ',' + t.y; });
    }
    function onDown() { snap(); }   // กดในพื้นที่แมพ: จดตำแหน่งเฉยๆ ไม่มีผลข้างเคียง
    container.addEventListener('mousedown', onDown, true);
    container.addEventListener('touchstart', onDown, { capture: true, passive: true });
    function onOutside(e) { if (!container.contains(e.target)) pre = null; }   // กดปุ่มเมนู/โหลดฉากนอกแมพ → ล้างภาพถ่าย กันนับการโหลดฉากเป็นการเลื่อน
    document.addEventListener('mousedown', onOutside, true);
    document.addEventListener('touchstart', onOutside, { capture: true, passive: true });
    function check() {
        if (!pre) { snap(); return false; }   // ไม่มีภาพถ่ายก่อนลาก → ไม่เปิดเงา
        let changed = false;
        state.tokens.forEach(t => {
            const before = pre[t.id];
            if (before !== undefined && before !== t.x + ',' + t.y && reveal(t)) changed = true;
        });
        snap();
        return changed;
    }
    window.mapddSyncRevealPos = t => { if (pre) pre[t.id] = t.x + ',' + t.y; };   // ให้จุดเกิดไม่ถูกนับเป็นการเลื่อน

    // ผูกตรรกะกับ "การปล่อยเมาส์/นิ้ว" โดยตรง (capture ที่ window) ไม่ต้องพึ่งการบันทึกของแอป
    // เลื่อนไปหลังตัวจัดการปล่อยเมาส์ของแอป (setTimeout 0) เพื่อให้หมุดถูกวางลงช่อง (snap) เสร็จก่อนค่อยเทียบตำแหน่ง
    function onRelease() {
        setTimeout(() => {
            if (!on) return;
            if (check()) { renderAll(); saveToLocalStorage(); }   // เงาเปลี่ยน → วาดใหม่ + บันทึกพร้อมกระดาน
        }, 0);
    }
    ['mouseup', 'pointerup', 'touchend', 'touchcancel'].forEach(t => window.addEventListener(t, onRelease, true));

    window.mapddSetReveal = function (id, n) {
        const t = state.tokens.find(x => x.id === id); if (!t) return;
        t.revealRadius = Math.max(0, Math.min(10, Math.round(Number(n)) || 0));
        saveToLocalStorage(); renderAll();
    };

    const origInspector = window.renderInspector;
    window.renderInspector = function () {
        origInspector.apply(this, arguments);
        const t = getSelectedToken();
        if (!t) return;
        const R = rad(t);
        document.getElementById('inspectorContent').insertAdjacentHTML('afterbegin', `
        <div class="bg-vtt-card border border-vtt-border rounded-2xl p-2.5 space-y-1.5">
            <div class="flex items-center justify-between"><div class="text-[11px] font-bold text-slate-400">🔦 เปิดเงารอบตัวเมื่อเลื่อนหมุด</div>${on ? '' : '<span class="text-[10px] text-rose-300">ปิดอยู่ (ปุ่มแถบเครื่องมือ)</span>'}</div>
            <div class="flex items-center gap-2">
                <button onclick="mapddSetReveal('${t.id}', ${R - 1})" class="w-8 h-8 rounded-lg bg-vtt-bg hover:bg-slate-800 border border-vtt-border text-white font-bold">−</button>
                <input type="number" min="0" max="10" value="${R}" onchange="mapddSetReveal('${t.id}', this.value)" class="w-14 bg-vtt-bg border border-vtt-border rounded-lg py-1 text-center text-sm font-bold text-amber-400 focus:outline-none focus:border-amber-500">
                <button onclick="mapddSetReveal('${t.id}', ${R + 1})" class="w-8 h-8 rounded-lg bg-vtt-bg hover:bg-slate-800 border border-vtt-border text-white font-bold">＋</button>
                <span class="text-[11px] text-slate-300">ช่องรอบตัว ${R ? '' : '(ไม่เปิด)'}</span>
            </div>
            <p class="text-[10px] text-slate-500">เปิดเฉพาะเงาทึบ เปิดค้างถาวร ตัวละครผู้เล่นเริ่มต้นที่ 1 ช่อง</p>
        </div>`);
    };

    const btn = document.createElement('button');
    btn.title = 'เปิด/ปิดการเปิดเงารอบหมุดอัตโนมัติเมื่อเลื่อนหมุด';
    btn.className = 'min-w-[3.2rem] px-1.5 py-1 rounded-xl hover:bg-vtt-card text-slate-200 flex flex-col items-center leading-tight text-center';
    const paint = () => { btn.innerHTML = `<span class="text-base">🔦</span><span class="text-[9px] ${on ? 'text-emerald-400' : 'text-slate-500'}">เงาอัตโนมัติ ${on ? 'เปิด' : 'ปิด'}</span>`; };
    btn.onclick = () => { on = !on; saveOn(); paint(); showToast(on ? 'เปิดเงาอัตโนมัติรอบหมุดเมื่อเลื่อน: เปิด' : 'เปิดเงาอัตโนมัติ: ปิด'); renderInspector(); };
    paint();
    const tb = document.getElementById('mapddToolbar'); if (tb) tb.appendChild(btn);
})();
