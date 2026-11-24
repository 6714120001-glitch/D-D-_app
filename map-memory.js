/* js/features/map-memory.js — จำ "กำแพง + จุดเกิด" แยกตามแมพ
   เปลี่ยนไปแมพอื่น (อัปโหลดรูปใหม่ / ฉากสำเร็จรูป / ลบรูป) → กำแพงและจุดเกิดของแมพเดิมถูกเก็บไว้ แมพใหม่เริ่มว่าง
   กลับมาแมพเดิม → กำแพงและจุดเกิดกลับมาเอง
   - รหัสแมพ = ลายนิ้วมือของรูป (ขนาด + ตัวอย่างข้อมูลรูป) · 'blank' = กระดานเปล่า · 'sample' = ฉากตัวอย่างในตัว
   - การโหลดฉาก/คลังแมพที่มีกำแพงของตัวเองมา: ถือว่ากำแพงนั้นเป็นของแมพที่โหลดมา (ไม่ถูกสลับ) */
(function () {
    'use strict';
    const KEY = 'mapdd_mapmem_v1', MAX = 40;
    let mem = { cur: null, maps: {} };
    try { const r = JSON.parse(localStorage.getItem(KEY)); if (r && r.maps) mem = r; } catch (e) { }
    let curKey = mem.cur || null;   // null = ยังไม่รู้ว่ากำแพงชุดปัจจุบันเป็นของแมพไหน → รับเป็นของแมพปัจจุบันตอนบันทึกครั้งถัดไป
    let W = Array.isArray(state.walls) ? state.walls : [];
    let S = (state.spawn && typeof state.spawn === 'object') ? state.spawn : {};
    // สั่ง state.walls = ... / state.spawn = ... จากที่อื่น (โหลดฉาก ล้างเส้น) = กำแพงชุดใหม่นั้นเป็นของแมพปัจจุบัน
    [['walls', () => W, v => { W = v; }], ['spawn', () => S, v => { S = v; }]].forEach(([name, get, set]) => {
        Object.defineProperty(state, name, { configurable: true, enumerable: true, get, set: v => { set(v); curKey = null; } });
    });

    const hashStr = s => { let h = 5381; const step = Math.max(1, Math.floor(s.length / 2000)); for (let i = 0; i < s.length; i += step) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36); };
    const keyNow = () => state.mapImageSrc ? 'img:' + state.mapImageSrc.length + ':' + hashStr(state.mapImageSrc) : (state.isBlankMap ? 'blank' : 'sample');
    function persist() {
        mem.cur = curKey;
        const ks = Object.keys(mem.maps);
        if (ks.length > MAX) ks.sort((a, b) => (mem.maps[a].t || 0) - (mem.maps[b].t || 0)).slice(0, ks.length - MAX).forEach(k => delete mem.maps[k]);
        try { localStorage.setItem(KEY, JSON.stringify(mem)); } catch (e) { }
    }
    function stash(k) {
        if (W.length || Object.keys(S).length) mem.maps[k] = { walls: W, spawn: S, t: Date.now() }; else delete mem.maps[k];
    }
    function check() {
        const k = keyNow();
        if (curKey === null) { curKey = k; persist(); return false; }
        if (curKey === k) return false;
        stash(curKey);                                   // เก็บของแมพเดิม
        const m = mem.maps[k];                           // โหลดของแมพใหม่ (ถ้าเคยวาดไว้)
        W = m ? m.walls : []; S = m ? m.spawn : {};
        curKey = k; persist();
        return true;
    }

    const origSave = window.saveToLocalStorage;
    window.saveToLocalStorage = function () {
        const swapped = check();
        const r = origSave.apply(this, arguments);       // ตัวห่อของ walls.js/spawn.js จะบันทึกชุดที่สลับแล้วลงเครื่อง
        if (swapped) { renderAll(); if (typeof renderInspector === 'function') renderInspector(); }
        return r;
    };

    // "ล้างทั้งหมด" ของแอปเดิมลืมกำแพง/จุดเกิด → ล้างของแมพที่กำลังล้างด้วย (ของแมพอื่นที่จำไว้ไม่แตะ)
    const origReset = window.resetEntireBoard;
    if (typeof origReset === 'function') window.resetEntireBoard = function () {
        delete mem.maps[keyNow()]; W = []; S = {}; curKey = null; persist();
        return origReset.apply(this, arguments);
    };
})();
