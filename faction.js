/* js/features/faction.js — ปุ่มเปลี่ยนฝ่ายของหมุด (ผู้เล่น / NPC / ศัตรู) ในแผงรายละเอียดหมุด */
(function () {
    'use strict';
    const F = [['player', 'ผู้เล่น', '#10b981'], ['npc', 'NPC', '#3b82f6'], ['enemy', 'ศัตรู', '#ef4444']];
    const orig = window.renderInspector;
    window.renderInspector = function () {
        orig.apply(this, arguments);
        const t = getSelectedToken();
        if (!t) return;
        const cur = t.faction || 'player';
        const btns = F.map(([k, n, c]) =>
            `<button onclick="updateTokenField('${t.id}','faction','${k}')" class="py-1.5 rounded-lg text-[11px] font-bold border ${k === cur ? 'text-slate-950' : 'bg-vtt-bg text-slate-300 border-vtt-border hover:bg-slate-800'}" style="${k === cur ? 'background:' + c + ';border-color:' + c : ''}">${n}</button>`
        ).join('');
        document.getElementById('inspectorContent').insertAdjacentHTML('afterbegin',
            `<div class="bg-vtt-card border border-vtt-border rounded-2xl p-2.5 space-y-1.5"><div class="text-[11px] font-bold text-slate-400">ฝ่ายของหมุด (แก้ได้ทุกเมื่อ)</div><div class="grid grid-cols-3 gap-1">${btns}</div></div>`);
    };
})();
