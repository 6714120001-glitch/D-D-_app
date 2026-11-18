// ==================== RENDER UI (ROSTER & INSPECTOR) ====================
function toggleRosterFaction(faction, isVisible) {
    rosterFilters[faction] = isVisible;
    renderRosterList();
}

function renderAll() {
    renderRosterList();
    renderInspector();
}

function renderRosterList() {
    const list = document.getElementById('tokenRosterList');
    const visibleTokens = state.tokens.filter(tok => {
        const f = tok.faction || 'player';
        return rosterFilters[f] !== false;
    });
    document.getElementById('rosterCount').textContent = `${visibleTokens.length}/${state.tokens.length}`;

    if (state.tokens.length === 0) {
        list.innerHTML = `<div class="text-center py-6 text-xs text-slate-500 border border-dashed border-vtt-border rounded-xl">ยังไม่มีหมุดบนแผนที่</div>`;
        return;
    }

    if (visibleTokens.length === 0) {
        list.innerHTML = `<div class="text-center py-5 text-xs text-slate-500 border border-dashed border-vtt-border rounded-xl">ซ่อนรายชื่อหมุดอยู่ (ติ๊กเลือกฝ่ายด้านบนเพื่อแสดง)</div>`;
        return;
    }

    list.innerHTML = visibleTokens.map(tok => {
        const isSel = tok.id === state.selectedTokenId;
        return `
            <div onclick="selectToken('${tok.id}')" class="cursor-pointer flex items-center justify-between p-2 rounded-xl border transition ${isSel ? 'bg-amber-500/15 border-amber-500' : 'bg-vtt-card/70 border-vtt-border hover:border-slate-600'}">
                <div class="flex items-center gap-2 min-w-0">
                    <span class="w-3 h-3 rounded-full shrink-0" style="background:${tok.color}"></span>
                    <div class="truncate">
                        <p class="text-xs font-semibold text-white truncate">${tok.emoji ? tok.emoji + ' ' : ''}${escapeHtml(tok.name)}</p>
                        <p class="text-[10px] text-slate-400">Lv.${tok.level || 1} ${escapeHtml(tok.charClass || '')} • AC ${tok.ac}</p>
                    </div>
                </div>
                <div class="text-right shrink-0 text-[10px] font-bold">
                    <div class="text-rose-400">HP ${tok.hp}/${tok.maxHp}</div>
                    ${tok.maxMp > 0 ? `<div class="text-sky-400">MP ${tok.mp}/${tok.maxMp}</div>` : ''}
                </div>
            </div>
        `;
    }).join('');
}

function renderInspector() {
    const sidebar = document.getElementById('rightSidebar');
    const body = document.getElementById('inspectorContent');
    const tok = getSelectedToken();

    if (!tok) {
        sidebar.classList.add('hidden');
        sidebar.classList.remove('flex');
        return;
    }

    ensureTokenRpgData(tok);
    sidebar.classList.remove('hidden');
    sidebar.classList.add('flex');

    const hpPct = Math.max(0, Math.min(100, Math.round((tok.hp / Math.max(1, tok.maxHp)) * 100)));
    const mpPct = Math.max(0, Math.min(100, Math.round((tok.mp / Math.max(1, tok.maxMp)) * 100)));

    body.innerHTML = `
        <!-- Character Identity, Avatar Upload & AC -->
        <div class="bg-vtt-card border border-vtt-border rounded-2xl p-3 space-y-2.5">
            <div class="flex items-center gap-2.5">
                <label class="relative group cursor-pointer w-12 h-12 rounded-full bg-vtt-bg border-2 flex items-center justify-center font-bold text-base shrink-0 overflow-hidden" style="border-color:${tok.color}" title="คลิกเพื่อเปลี่ยนรูปหมุด">
                    ${tok.avatar ? `<img src="${tok.avatar}" class="w-full h-full object-cover">` : (tok.emoji || escapeHtml((tok.name || '?').slice(0, 2)))}
                    <div class="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-[10px] text-white font-semibold transition">เปลี่ยนรูป</div>
                    <input type="file" accept="image/*" onchange="uploadTokenAvatarFromInspector('${tok.id}', this)" class="hidden">
                </label>
                <div class="flex-1 min-w-0 space-y-1">
                    <input type="text" value="${escapeHtml(tok.name)}" onchange="updateTokenField('${tok.id}', 'name', this.value)" class="w-full bg-transparent font-bold text-sm text-white border-b border-transparent focus:border-amber-500 focus:outline-none">
                    <div class="flex items-center gap-1.5 text-[11px] text-slate-400">
                        <span>Lv.</span>
                        <input type="number" min="1" max="20" value="${tok.level || 1}" onchange="updateTokenField('${tok.id}', 'level', Math.max(1, parseInt(this.value)||1))" class="w-10 bg-vtt-bg border border-vtt-border rounded px-1 py-0.5 text-center text-amber-300 font-bold">
                        <span>AC</span>
                        <input type="number" min="1" max="40" value="${tok.ac || 12}" onchange="updateTokenField('${tok.id}', 'ac', Math.max(1, parseInt(this.value)||12))" class="w-10 bg-vtt-bg border border-vtt-border rounded px-1 py-0.5 text-center text-amber-400 font-bold">
                        <input type="text" value="${escapeHtml(tok.charClass || '')}" placeholder="คลาส..." onchange="updateTokenField('${tok.id}', 'charClass', this.value)" class="flex-1 min-w-0 bg-vtt-bg border border-vtt-border rounded px-1.5 py-0.5 text-slate-200">
                    </div>
                </div>
            </div>
            <div class="flex items-center gap-1.5">
                <label class="cursor-pointer flex-1 py-1.5 px-2.5 rounded-xl bg-vtt-bg hover:bg-slate-800 border border-dashed border-amber-500/50 text-amber-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition">
                    <span>🖼️ ใส่รูป / เปลี่ยนรูปหมุด</span>
                    <input type="file" accept="image/*" onchange="uploadTokenAvatarFromInspector('${tok.id}', this)" class="hidden">
                </label>
                ${tok.avatar ? `<button onclick="removeTokenAvatar('${tok.id}')" class="py-1.5 px-2.5 rounded-xl bg-rose-950/60 hover:bg-rose-900 border border-rose-800/60 text-rose-300 text-xs" title="ลบรูปหมุด">ลบรูป</button>` : ''}
            </div>
        </div>

        <!-- HP Controller -->
        <div class="bg-vtt-card border border-rose-950/70 rounded-2xl p-3 space-y-2">
            <div class="flex items-center justify-between">
                <span class="text-xs font-bold text-rose-400">❤️ พลังชีวิต (HP)</span>
                <div class="flex items-center gap-1 text-xs">
                    <input type="number" value="${tok.hp}" onchange="updateTokenField('${tok.id}', 'hp', parseInt(this.value)||0)" class="w-12 bg-vtt-bg border border-vtt-border rounded px-1.5 py-0.5 text-center font-bold text-white">
                    <span class="text-slate-500">/</span>
                    <input type="number" value="${tok.maxHp}" onchange="updateTokenField('${tok.id}', 'maxHp', Math.max(1, parseInt(this.value)||1))" class="w-12 bg-vtt-bg border border-vtt-border rounded px-1.5 py-0.5 text-center text-slate-300">
                </div>
            </div>
            <div class="w-full h-2.5 bg-vtt-bg rounded-full overflow-hidden">
                <div class="h-full transition-all ${hpPct > 50 ? 'bg-emerald-500' : (hpPct > 25 ? 'bg-amber-500' : 'bg-rose-500')}" style="width:${hpPct}%"></div>
            </div>
            <div class="grid grid-cols-6 gap-1 pt-0.5">
                <button onclick="adjustTokenPool('${tok.id}', 'hp', -10)" class="py-1 rounded-lg bg-rose-950 hover:bg-rose-900 text-rose-300 text-[11px] font-bold">-10</button>
                <button onclick="adjustTokenPool('${tok.id}', 'hp', -5)" class="py-1 rounded-lg bg-rose-950 hover:bg-rose-900 text-rose-300 text-[11px] font-bold">-5</button>
                <button onclick="adjustTokenPool('${tok.id}', 'hp', -1)" class="py-1 rounded-lg bg-rose-950 hover:bg-rose-900 text-rose-300 text-[11px] font-bold">-1</button>
                <button onclick="adjustTokenPool('${tok.id}', 'hp', 1)" class="py-1 rounded-lg bg-emerald-950 hover:bg-emerald-900 text-emerald-300 text-[11px] font-bold">+1</button>
                <button onclick="adjustTokenPool('${tok.id}', 'hp', 5)" class="py-1 rounded-lg bg-emerald-950 hover:bg-emerald-900 text-emerald-300 text-[11px] font-bold">+5</button>
                <button onclick="adjustTokenPool('${tok.id}', 'hp', 10)" class="py-1 rounded-lg bg-emerald-950 hover:bg-emerald-900 text-emerald-300 text-[11px] font-bold">+10</button>
            </div>
        </div>

        <!-- MP Controller -->
        <div class="bg-vtt-card border border-sky-950/70 rounded-2xl p-3 space-y-2">
            <div class="flex items-center justify-between">
                <span class="text-xs font-bold text-sky-400">💧 มานา / ช่องเวท (MP)</span>
                <div class="flex items-center gap-1 text-xs">
                    <input type="number" value="${tok.mp}" onchange="updateTokenField('${tok.id}', 'mp', parseInt(this.value)||0)" class="w-12 bg-vtt-bg border border-vtt-border rounded px-1.5 py-0.5 text-center font-bold text-white">
                    <span class="text-slate-500">/</span>
                    <input type="number" value="${tok.maxMp}" onchange="updateTokenField('${tok.id}', 'maxMp', Math.max(0, parseInt(this.value)||0))" class="w-12 bg-vtt-bg border border-vtt-border rounded px-1.5 py-0.5 text-center text-slate-300">
                </div>
            </div>
            <div class="w-full h-2 bg-vtt-bg rounded-full overflow-hidden">
                <div class="h-full bg-sky-400 transition-all" style="width:${mpPct}%"></div>
            </div>
            <div class="grid grid-cols-4 gap-1 pt-0.5">
                <button onclick="adjustTokenPool('${tok.id}', 'mp', -5)" class="py-1 rounded-lg bg-sky-950 hover:bg-sky-900 text-sky-300 text-[11px] font-bold">-5</button>
                <button onclick="adjustTokenPool('${tok.id}', 'mp', -1)" class="py-1 rounded-lg bg-sky-950 hover:bg-sky-900 text-sky-300 text-[11px] font-bold">-1</button>
                <button onclick="adjustTokenPool('${tok.id}', 'mp', 1)" class="py-1 rounded-lg bg-indigo-950 hover:bg-indigo-900 text-indigo-300 text-[11px] font-bold">+1</button>
                <button onclick="adjustTokenPool('${tok.id}', 'mp', 5)" class="py-1 rounded-lg bg-indigo-950 hover:bg-indigo-900 text-indigo-300 text-[11px] font-bold">+5</button>
            </div>
        </div>

        <!-- Special Status / Conditions -->
        <div class="bg-vtt-card border border-vtt-border rounded-2xl p-3 space-y-2">
            <h4 class="text-xs font-bold text-slate-300">สถานะพิเศษ (Conditions)</h4>
            <div class="grid grid-cols-2 gap-1.5">
                ${CONDITIONS.map(c => {
                    const active = (tok.conditions || []).includes(c.id);
                    return `
                        <button onclick="toggleTokenCondition('${tok.id}', '${c.id}')" class="flex items-center gap-1.5 px-2 py-1.5 rounded-xl text-[11px] border text-left transition ${active ? 'bg-amber-500/20 border-amber-500 text-white font-semibold' : 'bg-vtt-bg border-vtt-border text-slate-400 hover:text-slate-200'}">
                            <span>${c.icon}</span>
                            <span class="truncate">${c.label}</span>
                        </button>
                    `;
                }).join('')}
            </div>
        </div>

        <!-- Quick Skills & Abilities -->
        <div class="bg-vtt-card border border-vtt-border rounded-2xl p-3 space-y-2">
            <div class="flex items-center justify-between">
                <h4 class="text-xs font-bold text-purple-300">✨ สกิลย่อ / ความสามารถ</h4>
            </div>
            <div class="flex gap-1">
                <input type="text" id="inspQuickSkillName" placeholder="ชื่อสกิล..." class="flex-1 bg-vtt-bg border border-vtt-border rounded-lg px-2 py-1 text-[11px] text-white">
                <input type="number" id="inspQuickSkillCost" placeholder="MP" class="w-12 bg-vtt-bg border border-vtt-border rounded-lg px-1.5 py-1 text-[11px] text-center text-sky-300">
                <button onclick="quickAddInspectorSkill('${tok.id}')" class="px-2 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-[11px] font-bold">+ เพิ่ม</button>
            </div>
            <div class="space-y-1 max-h-32 overflow-y-auto">
                ${(tok.skills || []).map((sk, idx) => `
                    <div class="flex items-center justify-between bg-vtt-bg px-2 py-1.5 rounded-lg border border-vtt-border text-[11px]">
                        <span class="text-slate-200 truncate">${escapeHtml(sk.name)} ${sk.mpCost ? `<span class="text-sky-400">(${sk.mpCost} MP)</span>` : ''}</span>
                        <div class="flex items-center gap-1 shrink-0">
                            <button onclick="useTokenSkill('${tok.id}', ${idx})" class="px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-semibold">ใช้</button>
                            <button onclick="removeTokenSkill('${tok.id}', ${idx})" class="text-slate-500 hover:text-rose-400 px-1">✕</button>
                        </div>
                    </div>
                `).join('') || '<p class="text-[10px] text-slate-500 text-center py-1">ยังไม่มีสกิลย่อ</p>'}
            </div>
        </div>

        <!-- Quick Bag / Inventory -->
        <div class="bg-vtt-card border border-vtt-border rounded-2xl p-3 space-y-2">
            <h4 class="text-xs font-bold text-emerald-300">🎒 กระเป๋าไอเทม (Bag)</h4>
            <div class="grid grid-cols-12 gap-1">
                <input type="text" id="inspQuickItemName" placeholder="ชื่อไอเทม..." class="col-span-5 bg-vtt-bg border border-vtt-border rounded-lg px-2 py-1 text-[11px] text-white">
                <input type="number" id="inspQuickItemQty" value="1" min="1" title="จำนวน" class="col-span-2 bg-vtt-bg border border-vtt-border rounded-lg px-1 py-1 text-[11px] text-center text-white">
                <input type="number" id="inspQuickItemHp" placeholder="+HP" title="ฟื้นฟู HP" class="col-span-2 bg-vtt-bg border border-vtt-border rounded-lg px-1 py-1 text-[11px] text-center text-rose-300">
                <input type="number" id="inspQuickItemMp" placeholder="+MP" title="ฟื้นฟู MP" class="col-span-2 bg-vtt-bg border border-vtt-border rounded-lg px-1 py-1 text-[11px] text-center text-sky-300">
                <button onclick="quickAddInspectorItem('${tok.id}')" class="col-span-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold">+</button>
            </div>
            <div class="space-y-1 max-h-32 overflow-y-auto">
                ${(tok.inventory || []).map((it, idx) => `
                    <div class="flex items-center justify-between bg-vtt-bg px-2 py-1.5 rounded-lg border border-vtt-border text-[11px]">
                        <span class="text-slate-200 truncate">${escapeHtml(it.name)} <span class="text-amber-400">x${it.qty || 1}</span></span>
                        <div class="flex items-center gap-1 shrink-0">
                            <button onclick="useTokenBagItem('${tok.id}', ${idx})" class="px-2 py-0.5 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-semibold">ใช้</button>
                            <button onclick="removeTokenBagItem('${tok.id}', ${idx})" class="text-slate-500 hover:text-rose-400 px-1">✕</button>
                        </div>
                    </div>
                `).join('') || '<p class="text-[10px] text-slate-500 text-center py-1">กระเป๋าว่างเปล่า</p>'}
            </div>
        </div>

        <!-- Token Actions -->
        <div class="grid grid-cols-2 gap-2 pt-1">
            <button onclick="duplicateToken('${tok.id}')" class="py-2 rounded-xl bg-vtt-card hover:bg-slate-800 border border-vtt-border text-xs text-slate-200 font-medium">📋 คัดลอกหมุด</button>
            <button onclick="deleteToken('${tok.id}')" class="py-2 rounded-xl bg-rose-950/60 hover:bg-rose-900 border border-rose-800/60 text-xs text-rose-300 font-medium">🗑️ ลบหมุด</button>
        </div>
    `;
}

