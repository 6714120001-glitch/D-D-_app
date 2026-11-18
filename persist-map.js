/* js/features/persist-map.js — จำรูปแมพ (และพื้นหลังที่เลือก) ข้ามการรีเฟรช โดยเก็บใน IndexedDB */
(function () {
    'use strict';
    const KEY = 'current-map';
    let last = null, timer = null;

    const sig = s => (s.src ? s.src.length + ':' + s.src.slice(-40) : '') + '|' + s.isBlank + '|' + s.w + 'x' + s.h;
    function snapshot() {
        return { src: state.mapImageSrc || null, isBlank: !!state.isBlankMap, w: state.mapWidth, h: state.mapHeight };
    }
    function persist() {
        const s = snapshot(), g = sig(s);
        if (g === last) return;
        last = g;
        window.mapddKv.set(KEY, s).catch(() => { last = null; });
    }

    // ทุกครั้งที่แอปบันทึกสถานะ ให้เก็บแมพตามไปด้วย (หน่วงเล็กน้อยกันเขียนถี่)
    const origSave = window.saveToLocalStorage;
    window.saveToLocalStorage = function () {
        origSave.apply(this, arguments);
        clearTimeout(timer);
        timer = setTimeout(persist, 400);
    };
    // ฟังก์ชันที่เปลี่ยนแมพแต่เดิมไม่ได้เรียกบันทึก
    ['loadSampleDungeonMap', 'removeCurrentMap', 'resetEntireBoard'].forEach(name => {
        const o = window[name];
        if (typeof o !== 'function') return;
        window[name] = function () { const r = o.apply(this, arguments); saveToLocalStorage(); return r; };
    });

    window.addEventListener('load', () => setTimeout(async () => {
        try {
            const s = await window.mapddKv.get(KEY);
            if (!s) return;
            last = sig(s);
            if (s.src) applyMapImage(s.src);
            else {
                state.mapImageSrc = null; mapImgObj = null; state.isBlankMap = !!s.isBlank;
                state.mapWidth = s.w || 1600; state.mapHeight = s.h || 1100;
                fitMapToScreen();
            }
        } catch (e) { /* ไม่รองรับ IndexedDB: ใช้งานต่อได้ แค่ไม่จำรูปแมพ */ }
    }, 50));
})();
