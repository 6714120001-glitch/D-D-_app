/* js/features/faction.js — ปุ่มเปลี่ยนฝ่าย (ผู้เล่น / NPC / ศัตรู) และสีขอบหมุด ในแผงรายละเอียดหมุด */
(function () {
    'use strict';
    const F = [['player', 'ผู้เล่น', '#10b981'], ['npc', 'NPC', '#3b82f6'], ['enemy', 'ศัตรู', '#ef4444']];
    const COLORS = ['#10b981', '#ef4444', '#3b82f6', '#f59e0b', '#a855f7', '#ec4899', '#06b6d4', '#f8fafc'];
    const orig = window.renderInspector;
    window.renderInspector = function () {
        orig.apply(this, arguments);
        const t = getSelectedToken();
        if (!t) return;
        const cur = t.faction || 'player';
        const btns = F.map(([k, n, c]) =>
            `<button onclick="updateTokenField('${t.id}','faction','${k}')" class="py-1.5 rounded-lg text-[11px] font-bold border ${k === cur ? 'text-slate-950' : 'bg-vtt-bg text-slate-300 border-vtt-border hover:bg-slate-800'}" style="${k === cur ? 'background:' + c + ';border-color:' + c : ''}">${n}</button>`
        ).join('');
        const col = (t.color || '#10b981').toLowerCase();
        const sw = COLORS.map(c => `<button onclick="updateTokenField('${t.id}','color','${c}')" class="w-6 h-6 rounded-full border border-slate-600 ${c === col ? 'ring-2 ring-white' : ''}" style="background:${c}" title="${c}"></button>`).join('');
        document.getElementById('inspectorContent').insertAdjacentHTML('afterbegin',
            `<div class="bg-vtt-card border border-vtt-border rounded-2xl p-2.5 space-y-1.5" data-dm="1"><div class="text-[11px] font-bold text-slate-400">ฝ่ายของหมุด (แก้ได้ทุกเมื่อ)</div><div class="grid grid-cols-3 gap-1">${btns}</div>
            <div class="text-[11px] font-bold text-slate-400 pt-1">สีขอบหมุด</div>
            <div class="flex items-center gap-1.5 flex-wrap">${sw}<label class="w-6 h-6 rounded-full overflow-hidden border border-slate-600 cursor-pointer relative" title="เลือกสีเอง" style="background:conic-gradient(red,yellow,lime,cyan,blue,magenta,red)"><input type="color" value="${col}" onchange="updateTokenField('${t.id}','color',this.value)" class="opacity-0 absolute inset-0 w-full h-full cursor-pointer"></label></div></div>`);
    };
})();
