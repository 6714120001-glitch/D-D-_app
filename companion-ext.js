/* js/features/companion-ext.js — รองรับข้อมูลจาก D&D Companion v1.6 (โหลดก่อน ui-layout.js)
   ข้อมูลเก็บที่ t.cx = { eq, ab, mg, bag, buff, def, gold, autoTraits, extra }  (รายการเป็นรูปแบบเดียวกับไฟล์ JSON ของแอปคู่หู)
     รายการ: { a:ชื่อ, b:คำอธิบาย, c:MP, d:[จำนวนลูกเต๋า,จำนวนหน้า], u:"" | "hp" | "mp" | "check", ck:"STR".."CHA" }
   - ค่า AC/DEF/ดาเมจ รวมจากข้อความใน eq, ab, buff (และ autoTraits) ที่มีเครื่องหมาย + / − (เช่น "AC +2", "ดาเมจ -1")
   - t.baseAc = AC ฐาน (ค่า ac ในไฟล์) ส่วน t.ac = ฐาน + โบนัสจากข้อความ  ตอนส่งออกจะส่ง "ฐาน" กลับไป กันบวกซ้ำ
   - แทนที่การ์ด "สกิลย่อ" และ "กระเป๋าไอเทม" เดิมในแผงหมุด (ข้อมูลเก่าถูกย้ายเข้า cx อัตโนมัติ) */
(function () {
    'use strict';
    const KEYS = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];
    const N = { STR: 4, DEX: 3, CON: 3, INT: 4, WIS: 3, CHA: 3 };
    const LISTS = ['eq', 'ab', 'mg', 'bag', 'buff'];
    const LABEL = { eq: '🗡️ อุปกรณ์ / อาวุธ', ab: '✨ ความสามารถ', mg: '🔮 เวทมนตร์', bag: '🎒 กระเป๋า', buff: '🌀 บัฟ / ดีบัฟ' };
    const COLOR = { eq: 'text-amber-300', ab: 'text-purple-300', mg: 'text-sky-300', bag: 'text-emerald-300', buff: 'text-pink-300' };
    const bn = v => Math.floor(Math.max(0, (Number(v) || 0) - 5) / 3);
    const chk = (k, v) => Math.floor(v / N[k]) - (v < 6 ? 1 : 0);
    const tokById = id => state.tokens.find(t => t.id === id);
    const jc = v => JSON.parse(JSON.stringify(v));
    const objs = a => (Array.isArray(a) ? a : []).filter(x => x && typeof x === 'object');
    const nameOf = it => String(it.a ?? it.name ?? '?');
    const descOf = it => String(it.b ?? it.desc ?? '');
    let rnd = Math.random, useDef = true;
    const lastRoll = {};   // ผลทอยล่าสุดต่อหมุด (ไม่บันทึก)

    // ---------- ข้อมูลเสริมของหมุด ----------
    function ensureCx(t) {
        if (t.cx && typeof t.cx === 'object') {
            const c = t.cx;
            LISTS.forEach(l => { c[l] = objs(c[l]); });
            c.def = Number(c.def) || 0; c.gold = Number(c.gold) || 0;
            if (c.autoTraits === undefined) c.autoTraits = null;
            if (!c.extra || typeof c.extra !== 'object') c.extra = {};
            return c;
        }
        const c = { eq: [], ab: [], mg: [], bag: [], buff: [], def: 0, gold: 0, autoTraits: null, extra: {} };
        (t.skills || []).forEach(s => {   // ย้ายสกิล/ไอเทมแบบเก่าเข้ามาครั้งเดียว
            const o = { a: s.name, b: s.desc || '' };
            if (Number(s.mpCost) > 0) { o.c = Number(s.mpCost); c.mg.push(o); } else c.ab.push(o);
        });
        (t.inventory || []).forEach(i => {
            const o = { a: i.name, q: i.qty || 1 };
            if (Number(i.healHp)) { o.u = 'hp'; o.healHp = Number(i.healHp); }
            else if (Number(i.healMp)) { o.u = 'mp'; o.healMp = Number(i.healMp); }
            c.bag.push(o);
        });
        t.skills = []; t.inventory = [];
        t.cx = c;
        return c;
    }
    window.mapddEnsureCx = ensureCx;

    // ---------- สแกนข้อความหาโบนัส ----------
    const KW = '(ลดดาเมจ|ค่าป้องกัน|\\bDEF\\b|\\bAC\\b|ดาเมจ|\\bDMG\\b|\\bDAMAGE\\b)';
    const SG = '([+\\-−–])';
    const kind = w => { w = w.toUpperCase(); return w === 'AC' ? 'ac' : (w === 'DEF' || w === 'ลดดาเมจ' || w === 'ค่าป้องกัน') ? 'def' : 'dmg'; };
    function scanText(text, acc) {   // ต้องมีเครื่องหมาย + หรือ − จึงนับเป็นโบนัส ("AC 15" ไม่นับ)
        let s = String(text || '');
        s = s.replace(new RegExp(KW + '\\s*' + SG + '\\s*(\\d+)', 'gi'), (m, w, sg, n) => { acc[kind(w)] += (sg === '+' ? 1 : -1) * Number(n); return ' '; });
        s.replace(new RegExp(SG + '\\s*(\\d+)\\s*' + KW, 'gi'), (m, sg, n, w) => { acc[kind(w)] += (sg === '+' ? 1 : -1) * Number(n); return ' '; });
        return acc;
    }
    const scanItems = (list, acc) => { list.forEach(it => scanText(nameOf(it) + ' ' + descOf(it), acc)); return acc; };

    // ---------- สกิล/จุดอ่อนอัตโนมัติตามสเตตัส ----------
    const statVal = (t, k) => { const v = t.hr && t.hr.st && t.hr.st[k]; return v == null ? 5 : Number(v) || 0; };
    function autoItems(raw) {   // autoTraits จากไฟล์: รับ array ของข้อความ หรือ {a,b}
        if (!Array.isArray(raw)) return null;
        return raw.map(x => typeof x === 'string' ? { a: x, b: '' } : (x && typeof x === 'object' ? { a: nameOf(x), b: descOf(x) } : null)).filter(Boolean);
    }
    function computedTraits(t) {
        const out = [], fx = { phys: 0, def: 0 };
        KEYS.forEach(k => {
            const v = statVal(t, k);
            if (v <= 0) out.push({ a: `${k} ${v}: จุดอ่อนวิกฤต`, b: '', bad: true });
            else if (v <= 4) out.push({ a: `${k} ${v}: จุดอ่อน (ต่ำกว่าฐาน)`, b: '', bad: true });
            else if (v >= 15) {
                const ult = v >= 30;
                let eff = '';
                if (k === 'STR') { fx.phys += 3; eff = 'ดาเมจกายภาพ +3'; }
                if (k === 'CON') { fx.def += 2; eff = 'DEF +2'; }
                out.push({ a: `${k} ${v}: ${ult ? 'Ultimate' : 'เชี่ยวชาญ'}`, b: eff });
            }
        });
        return { list: out, fx };
    }

    // ---------- ค่ารวมของหมุด ----------
    function calc(t) {
        const cx = ensureCx(t), sc = { ac: 0, def: 0, dmg: 0 };
        scanItems(cx.eq, sc); scanItems(cx.ab, sc); scanItems(cx.buff, sc);
        const given = autoItems(cx.autoTraits);
        let traits, fx = { phys: 0, def: 0 };
        if (given) { traits = given; scanItems(given, sc); }   // ไฟล์ส่งมาเอง: ใช้ตามไฟล์ (ข้อความในนั้นก็ถูกสแกนด้วย)
        else { const c = computedTraits(t); traits = c.list; fx = c.fx; }
        const house = bn(statVal(t, 'STR')) + bn(statVal(t, 'DEX'));   // โบนัสดาเมจกายภาพตามกติกาในบ้าน
        return {
            bonusAc: sc.ac, defBase: cx.def, bonusDef: sc.def + fx.def, def: cx.def + sc.def + fx.def,
            dmgBonus: sc.dmg, physBonus: house + fx.phys, house, traits, given: !!given
        };
    }
    function syncAc(t) {
        const base = t.baseAc != null ? Number(t.baseAc) : (Number(t.ac) || 12);
        t.baseAc = base;
        t.ac = base + calc(t).bonusAc;
    }

    // ---------- ลูกเต๋า ----------
    function parseD(d) {
        if (!Array.isArray(d)) return null;
        const n = Math.min(99, Math.floor(Number(d[0]) || 0)), s = Math.min(1000, Math.floor(Number(d[1]) || 0));
        return n >= 1 && s >= 1 ? { n, s } : null;
    }
    function roll(p) {
        const rolls = []; let sum = 0;
        for (let i = 0; i < p.n; i++) { const r = 1 + Math.floor(rnd() * p.s); rolls.push(r); sum += r; }
        return { n: p.n, s: p.s, rolls, sum };
    }
    const fmtRoll = r => `${r.n}d${r.s} (${r.rolls.join('+')})`;
    const sgn = n => (n >= 0 ? '+' : '−') + Math.abs(n);
    const finish = (t, text) => { lastRoll[t.id] = text; showToast(text); saveToLocalStorage(); renderAll(); };

    // ---------- กดใช้ ----------
    window.mapddCxUse = function (id, list, idx) {
        const t = tokById(id); if (!t) return;
        const cx = ensureCx(t), it = (cx[list] || [])[idx]; if (!it) return;
        if (list === 'buff') return showToast('บัฟ/ดีบัฟไม่ต้องกดใช้ — ค่าถูกรวมให้อัตโนมัติ');
        const name = nameOf(it), cost = Math.max(0, Number(it.c) || 0), u = it.u || '';
        const p = parseD(it.d), c = calc(t);
        if (cost > 0 && (Number(t.mp) || 0) < cost) return showToast(`MP ไม่พอสำหรับใช้ ${name} (ต้องใช้ ${cost})`);

        let text;
        if (u === 'hp' || u === 'mp') {
            const fixed = Number(u === 'hp' ? it.healHp : it.healMp) || 0;
            if (!p && !fixed) return showToast(`"${name}" ไม่มีลูกเต๋า (d) หรือค่าฟื้นฟู`);
            const r = p ? roll(p) : null, amt = r ? r.sum : fixed, cap = u === 'hp' ? 'maxHp' : 'maxMp';
            if (cost) t.mp -= cost;
            const before = Number(t[u]) || 0;
            t[u] = Math.min(Number(t[cap]) || 0, before + amt);
            text = `${t.name} ใช้ ${name}: ${r ? fmtRoll(r) + ' = ' : ''}${amt} → ${u.toUpperCase()} +${t[u] - before} (${t[u]}/${t[cap]})${cost ? ` · −${cost} MP` : ''}`;
        } else if (u === 'check') {
            if (!KEYS.includes(it.ck)) return showToast(`"${name}" ไม่ได้ระบุสเตตัสที่ใช้เช็ก (ck)`);
            const r = roll(p || { n: 1, s: 20 }), v = chk(it.ck, statVal(t, it.ck));
            if (cost) t.mp -= cost;
            text = `${t.name} ใช้ ${name}: เช็ก ${it.ck} ${fmtRoll(r)} ${sgn(v)} = ${r.sum + v}${cost ? ` · −${cost} MP` : ''}`;
        } else {
            const own = (list === 'mg' || list === 'bag') ? scanText(nameOf(it) + ' ' + descOf(it), { ac: 0, def: 0, dmg: 0 }).dmg : 0;   // eq/ab ถูกรวมใน dmgBonus แล้ว
            const bonus = c.dmgBonus + own + (list === 'mg' ? 0 : c.physBonus);   // เวทไม่บวกโบนัสดาเมจกายภาพ
            if (cost) t.mp -= cost;
            if (!p) text = `${t.name} ใช้ ${name} (ไม่มีลูกเต๋า d ให้ทอย)${cost ? ` · −${cost} MP` : ''}`;
            else { const r = roll(p); text = `${t.name} ใช้ ${name}: ดาเมจ ${fmtRoll(r)}${bonus ? ' ' + sgn(bonus) : ''} = ${r.sum + bonus}${cost ? ` · −${cost} MP` : ''}`; }
        }
        if (list === 'bag') {   // ไอเทมในกระเป๋าใช้แล้วลด 1 ชิ้น
            const k = it.q != null ? 'q' : (it.qty != null ? 'qty' : 'q');
            it[k] = (Number(it[k] ?? 1) || 1) - 1;
            if (it[k] <= 0) cx.bag.splice(idx, 1);
        }
        finish(t, text);
    };

    // ---------- รับดาเมจ (หัก DEF ได้) ----------
    window.mapddCxHit = function (id) {
        const t = tokById(id), el = document.getElementById('cxDmgIn'); if (!t || !el) return;
        const raw = Math.max(0, parseInt(el.value) || 0);
        if (!raw) return showToast('ใส่ดาเมจที่ได้รับก่อน');
        const def = calc(t).def, net = useDef ? Math.max(0, raw - def) : raw;
        t.hp = Math.max(0, (Number(t.hp) || 0) - net);
        finish(t, `${t.name} รับดาเมจ ${raw}${useDef ? ` − DEF ${def} = ${net}` : ''} → HP ${t.hp}/${t.maxHp}`);
    };
    window.mapddCxUseDef = on => { useDef = !!on; };

    // ---------- แก้ข้อมูล ----------
    window.mapddCxSet = function (id, key, v) {
        const t = tokById(id); if (!t) return;
        ensureCx(t)[key] = Math.floor(Number(v) || 0);
        saveToLocalStorage(); renderAll();
    };
    window.mapddCxDel = function (id, list, idx) {
        const t = tokById(id); if (!t) return;
        ensureCx(t)[list].splice(idx, 1);
        saveToLocalStorage(); renderAll();
    };
    window.mapddCxAdd = function (id) {
        const t = tokById(id); if (!t) return;
        const g = k => document.getElementById('cxAdd' + k);
        const name = (g('Name').value || '').trim(), list = g('Cat').value;
        if (!name || !LISTS.includes(list)) return showToast('ใส่ชื่อรายการก่อน');
        const it = { a: name, b: (g('Desc').value || '').trim() };
        if (list !== 'buff') {
            const c = Math.max(0, parseInt(g('Mp').value) || 0), n = parseInt(g('N').value) || 0, s = parseInt(g('S').value) || 0, u = g('U').value;
            if (c) it.c = c;
            if (n >= 1 && s >= 1) it.d = [n, s];
            if (u) { it.u = u; if (u === 'check') it.ck = g('Ck').value; }
            if (list === 'bag') it.q = Math.max(1, parseInt(g('Q').value) || 1);
        }
        ensureCx(t)[list].push(it);
        saveToLocalStorage(); renderAll();
    };

    // ---------- การ์ดในแผงหมุด ----------
    const esc = s => escapeHtml(s);
    const inp = 'bg-vtt-bg border border-vtt-border rounded-lg px-1.5 py-1 text-[11px] text-white text-center';
    function row(t, list, it, idx) {
        const p = parseD(it.d), b = [];
        if (Number(it.c) > 0) b.push(`<span class="text-sky-400">${Number(it.c)} MP</span>`);
        if (p) b.push(`<span class="text-amber-300">${p.n}d${p.s}</span>`);
        if (it.u === 'hp') b.push('<span class="text-rose-300">ฟื้น HP</span>');
        else if (it.u === 'mp') b.push('<span class="text-indigo-300">ฟื้น MP</span>');
        else if (it.u === 'check') b.push(`<span class="text-violet-300">เช็ก ${esc(it.ck || '?')}</span>`);
        if (list === 'bag') b.push(`<span class="text-amber-400">x${Number(it.q ?? it.qty ?? 1) || 1}</span>`);
        const d = descOf(it);
        return `<div class="flex items-start justify-between gap-1 bg-vtt-bg px-2 py-1.5 rounded-lg border border-vtt-border text-[11px]">
            <div class="min-w-0"><div class="text-slate-200 break-words">${esc(nameOf(it))} ${b.join(' ')}</div>${d ? `<div class="text-[10px] text-slate-500 break-words">${esc(d)}</div>` : ''}</div>
            <div class="flex items-center gap-1 shrink-0">
                ${list === 'buff' ? '' : `<button onclick="mapddCxUse('${t.id}','${list}',${idx})" class="px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-semibold">ใช้</button>`}
                <button onclick="mapddCxDel('${t.id}','${list}',${idx})" class="text-slate-500 hover:text-rose-400 px-1">✕</button>
            </div></div>`;
    }
    function card(t) {
        const cx = ensureCx(t), c = calc(t);
        const sec = l => `<div class="space-y-1"><h4 class="text-[11px] font-bold ${COLOR[l]}">${LABEL[l]}</h4>${cx[l].map((it, i) => row(t, l, it, i)).join('') || '<p class="text-[10px] text-slate-600 py-0.5">ว่าง</p>'}</div>`;
        const tr = c.traits.map(x => `<div class="text-[11px] ${x.bad ? 'text-rose-300' : 'text-emerald-300'}">${esc(x.a)}${x.b ? ` <span class="text-slate-400">— ${esc(x.b)}</span>` : ''}</div>`).join('');
        const opts = a => a.map(v => `<option value="${v}">${v}</option>`).join('');
        return `
        <div class="bg-vtt-card border border-vtt-border rounded-2xl p-3 space-y-2">
            <div class="flex items-center justify-between"><h3 class="text-xs font-bold text-amber-400">⚔️ ค่าต่อสู้ / อุปกรณ์ / สกิล</h3></div>
            <div class="grid grid-cols-3 gap-1.5 text-center">
                <div class="bg-vtt-bg border border-vtt-border rounded-xl p-1.5"><div class="text-[10px] text-slate-400">AC รวม</div><div class="text-sm font-bold text-amber-400">${t.ac}</div><div class="text-[9px] text-slate-500">ฐาน ${t.baseAc != null ? t.baseAc : t.ac} ${sgn(c.bonusAc)}</div></div>
                <div class="bg-vtt-bg border border-vtt-border rounded-xl p-1.5"><div class="text-[10px] text-slate-400">DEF รวม</div><div class="text-sm font-bold text-sky-300">${c.def}</div><div class="text-[9px] text-slate-500">ฐาน <input type="number" value="${c.defBase}" onchange="mapddCxSet('${t.id}','def',this.value)" class="w-8 bg-transparent text-center text-slate-300 border-b border-vtt-border focus:outline-none"> ${sgn(c.bonusDef)}</div></div>
                <div class="bg-vtt-bg border border-vtt-border rounded-xl p-1.5"><div class="text-[10px] text-slate-400">ดาเมจ</div><div class="text-sm font-bold text-rose-300">${sgn(c.physBonus + c.dmgBonus)}</div><div class="text-[9px] text-slate-500">เวท ${sgn(c.dmgBonus)}</div></div>
            </div>
            <div class="flex items-center gap-1.5 text-[11px] text-slate-300"><span>💰 เงิน</span><input type="number" value="${cx.gold}" onchange="mapddCxSet('${t.id}','gold',this.value)" class="w-20 ${inp}"></div>
            <div class="flex items-center gap-1 flex-wrap text-[11px] text-slate-300">
                <span>รับดาเมจ</span><input id="cxDmgIn" type="number" min="0" placeholder="0" class="w-14 ${inp}">
                <label class="flex items-center gap-1 cursor-pointer"><input type="checkbox" ${useDef ? 'checked' : ''} onchange="mapddCxUseDef(this.checked)" class="accent-amber-500">หัก DEF</label>
                <button onclick="mapddCxHit('${t.id}')" class="px-2 py-1 rounded-lg bg-rose-900 hover:bg-rose-800 text-rose-100 font-bold">รับดาเมจ</button>
            </div>
            ${lastRoll[t.id] ? `<div class="text-[11px] text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-lg px-2 py-1">🎲 ${esc(lastRoll[t.id])}</div>` : ''}
            ${['eq', 'ab', 'mg', 'bag', 'buff'].map(sec).join('')}
            <div class="space-y-1"><h4 class="text-[11px] font-bold text-slate-300">📈 สกิล/จุดอ่อนตามสเตตัส${c.given ? ' (จากไฟล์)' : ''}</h4>${tr || '<p class="text-[10px] text-slate-600 py-0.5">ไม่มี</p>'}</div>
            <div class="space-y-1 border-t border-vtt-border pt-2">
                <div class="grid grid-cols-6 gap-1">
                    <select id="cxAddCat" class="col-span-2 ${inp}">${LISTS.map(l => `<option value="${l}">${LABEL[l].slice(3)}</option>`).join('')}</select>
                    <input id="cxAddName" type="text" placeholder="ชื่อ..." class="col-span-4 ${inp} text-left">
                    <input id="cxAddDesc" type="text" placeholder="คำอธิบาย / ผล เช่น AC +2" class="col-span-6 ${inp} text-left">
                    <input id="cxAddMp" type="number" min="0" placeholder="MP" title="MP ที่ใช้ (c)" class="col-span-1 ${inp}">
                    <input id="cxAddN" type="number" min="1" placeholder="n" title="จำนวนลูกเต๋า" class="col-span-1 ${inp}">
                    <input id="cxAddS" type="number" min="1" placeholder="หน้า" title="จำนวนหน้าเต๋า" class="col-span-1 ${inp}">
                    <select id="cxAddU" class="col-span-3 ${inp}"><option value="">โจมตี</option><option value="hp">ฟื้น HP</option><option value="mp">ฟื้น MP</option><option value="check">เช็กสเตตัส</option></select>
                    <select id="cxAddCk" class="col-span-3 ${inp}" title="สเตตัสที่เช็ก (ck)">${opts(KEYS)}</select>
                    <input id="cxAddQ" type="number" min="1" value="1" title="จำนวนชิ้น (กระเป๋า)" class="col-span-1 ${inp}">
                    <button onclick="mapddCxAdd('${t.id}')" class="col-span-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-[11px] font-bold">+ เพิ่ม</button>
                </div>
                <p class="text-[10px] text-slate-500">ช่องลูกเต๋า = n d หน้า (เช่น 1 และ 8 = 1d8) · "เช็ก" ใช้สเตตัสที่เลือก · บัฟ/ดีบัฟใส่ผลในคำอธิบาย เช่น "AC +2" "DEF −1" "ดาเมจ +3"</p>
            </div>
        </div>`;
    }
    const origInspector = window.renderInspector;
    window.renderInspector = function () {
        origInspector.apply(this, arguments);
        const t = getSelectedToken(), body = document.getElementById('inspectorContent');
        if (!t || !body) return;
        const kids = [...body.children];
        const find = txt => kids.find(k => k.querySelector && k.querySelector('h4') && k.querySelector('h4').textContent.includes(txt));
        const oldSk = find('สกิลย่อ'), oldBag = find('กระเป๋าไอเทม');
        const holder = document.createElement('div');
        holder.innerHTML = card(t);
        const anchor = oldSk || oldBag;
        if (anchor) anchor.insertAdjacentElement('beforebegin', holder.firstElementChild); else body.appendChild(holder.firstElementChild);
        [oldSk, oldBag].forEach(n => n && n.remove());
    };

    // AC ในช่อง AC ของแผงหมุด = ค่ารวม: แก้แล้วย้อนคำนวณกลับเป็นค่าฐาน
    const origField = window.updateTokenField;
    window.updateTokenField = function (id, field, value) {
        const t = tokById(id);
        if (field === 'ac' && t && t.cx) t.baseAc = (Number(value) || 12) - calc(t).bonusAc;
        return origField.apply(this, arguments);
    };
    // ทุกครั้งที่วาดใหม่ ให้ AC ของหมุดที่มีข้อมูลเสริมตรงกับบัฟล่าสุด
    const origAll = window.renderAll;
    window.renderAll = function () {
        state.tokens.forEach(t => { if (t.cx) syncAc(t); });
        return origAll.apply(this, arguments);
    };

    window.mapddCx = { ensureCx, calc, scanText, parseD, syncAc, card, setRandom: f => { rnd = f; }, lastRoll };
})();
