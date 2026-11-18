/* js/features/stats.js — ช่องสเตตัส STR/DEX/CON/INT/WIS/CHA ในแผงหมุด (กติกาในบ้าน) + ปุ่มทอยเช็ก */
(function () {
    'use strict';
    const KEYS = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];
    const N = { STR: 4, DEX: 3, CON: 3, INT: 4, WIS: 3, CHA: 3 };
    const bn = v => Math.floor(Math.max(0, (Number(v) || 0) - 5) / 3);
    const chk = (k, v) => Math.floor(v / N[k]) - (v < 6 ? 1 : 0);
    const stOf = t => (t.hr && t.hr.st) || {};
    const val = (t, k) => { const v = stOf(t)[k]; return v == null ? 5 : Number(v); };
    const tokById = id => state.tokens.find(t => t.id === id);

    function ensureHr(t) {
        if (!t.hr) t.hr = {};
        if (!t.hr.st) t.hr.st = {};
        KEYS.forEach(k => { if (t.hr.st[k] == null) t.hr.st[k] = 5; });
        return t.hr;
    }
    function derive(t) {   // คำนวณค่าที่เกี่ยวข้องใหม่ตามกติกาในบ้าน
        const hr = ensureHr(t), lv = t.level || 1;
        hr.dmg = bn(hr.st.STR) + bn(hr.st.DEX);
        hr.checks = {}; KEYS.forEach(k => { hr.checks[k] = chk(k, Number(hr.st[k])); });
        if (hr.baseHp != null) { t.maxHp = Math.max(1, hr.baseHp + 10 * (lv - 1) + 2 * bn(hr.st.CON)); t.hp = Math.min(t.hp, t.maxHp); }
        if (hr.baseMp != null) { t.maxMp = Math.max(0, hr.baseMp + 10 * (lv - 1) + 10 * bn(hr.st.INT)); t.mp = Math.min(t.mp, t.maxMp); }
    }
    const refresh = () => { saveToLocalStorage(); renderAll(); };

    window.mapddSetStat = function (id, k, v) {
        const t = tokById(id); if (!t) return;
        ensureHr(t).st[k] = Math.min(99, Math.max(1, parseInt(v) || 5));
        derive(t); refresh();
    };
    window.mapddToggleAuto = function (id, on) {
        const t = tokById(id); if (!t) return;
        const hr = ensureHr(t), lv = t.level || 1;
        if (on) {   // ถอยหาค่าพื้นฐานจากค่าสูงสุดปัจจุบัน แล้วคำนวณตามสูตรต่อไป
            hr.baseHp = Math.max(0, t.maxHp - 10 * (lv - 1) - 2 * bn(hr.st.CON));
            hr.baseMp = Math.max(0, t.maxMp - 10 * (lv - 1) - 10 * bn(hr.st.INT));
        } else { hr.baseHp = null; hr.baseMp = null; }
        derive(t); refresh();
    };
    window.mapddRollCheck = function (id, k) {
        const t = tokById(id); if (!t) return;
        const c = chk(k, val(t, k)), r = 1 + Math.floor(Math.random() * 20);
        showToast(`${t.name} ทอยเช็ก ${k}: d20 (${r}) ${c >= 0 ? '+' : '−'}${Math.abs(c)} = ${r + c}${r === 20 ? ' 🎯 20 เต็ม!' : r === 1 ? ' 💥 1' : ''}`);
    };

    function block(t) {
        const auto = !!(t.hr && (t.hr.baseHp != null || t.hr.baseMp != null));
        const dmg = bn(val(t, 'STR')) + bn(val(t, 'DEX'));
        return `
        <div class="bg-vtt-card border border-vtt-border rounded-2xl p-3 space-y-2.5">
            <div class="flex items-center justify-between">
                <h3 class="text-xs font-bold text-amber-400">สเตตัส (กติกาในบ้าน)</h3>
                <span class="text-[11px] text-slate-300">โบนัสดาเมจ <b class="text-amber-400">+${dmg}</b></span>
            </div>
            <div class="grid grid-cols-3 gap-1.5">
                ${KEYS.map(k => { const v = val(t, k), c = chk(k, v); return `
                <div class="bg-vtt-bg border border-vtt-border rounded-xl p-1.5 text-center">
                    <div class="text-[10px] font-bold text-slate-400">${k}</div>
                    <input type="number" min="1" max="99" value="${v}" onchange="mapddSetStat('${t.id}','${k}',this.value)" class="w-full bg-transparent text-center text-sm font-bold text-white focus:outline-none">
                    <button onclick="mapddRollCheck('${t.id}','${k}')" class="mt-0.5 w-full rounded-lg bg-amber-500/90 hover:bg-amber-400 text-slate-950 text-[10px] font-bold py-0.5" title="ทอย d20 + ค่าเช็ก">🎲 ${c >= 0 ? '+' : '−'}${Math.abs(c)}</button>
                </div>`; }).join('')}
            </div>
            <label class="flex items-center gap-1.5 text-[11px] text-slate-300 cursor-pointer">
                <input type="checkbox" ${auto ? 'checked' : ''} onchange="mapddToggleAuto('${t.id}', this.checked)" class="accent-amber-500">
                คำนวณ HP/MP สูงสุดจากสเตตัสและเลเวลอัตโนมัติ
            </label>
        </div>`;
    }

    const origInspector = window.renderInspector;
    window.renderInspector = function () {
        origInspector.apply(this, arguments);
        const t = getSelectedToken();
        if (!t) return;
        document.getElementById('inspectorContent').insertAdjacentHTML('beforeend', block(t));
    };

    // เปลี่ยนเลเวล → คำนวณ HP/MP สูงสุดใหม่ (เฉพาะหมุดที่เปิดคำนวณอัตโนมัติ)
    const origField = window.updateTokenField;
    window.updateTokenField = function (id, field) {
        const r = origField.apply(this, arguments);
        const t = tokById(id);
        if (field === 'level' && t && t.hr && (t.hr.baseHp != null || t.hr.baseMp != null)) { derive(t); refresh(); }
        return r;
    };
})();
