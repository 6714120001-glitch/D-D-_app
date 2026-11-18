// ==================== APPLICATION STATE ====================
const STORAGE_KEY = 'mapdd_state_v1'; // คำนำหน้า mapdd_ กันชนกับโปรเจกต์อื่นบนโดเมนเดียวกัน
try { // ย้ายข้อมูลจากคีย์เก่าครั้งเดียว
    if (!localStorage.getItem(STORAGE_KEY) && localStorage.getItem('dnd_vtt_clean_v6')) {
        localStorage.setItem(STORAGE_KEY, localStorage.getItem('dnd_vtt_clean_v6'));
    }
} catch (e) { }

let state = {
    mapImageSrc: null,
    isBlankMap: false,
    mapWidth: 1600,
    mapHeight: 1100,
    camera: { x: 40, y: 30, zoom: 0.75 },
    grid: {
        visible: true,
        snap: true,
        showAc: true,
        size: 64,
        opacity: 0.35,
        color: '#ffffff',
        offsetX: 0,
        offsetY: 0
    },
    fog: {
        cells: {}, // key: "col,row" -> 'dark' | 'shadow'
        dmDarkOpacity: 1.0
    },
    aoeTemplates: [], // { id, shape, x, y, radiusFeet, color, label }
    tokens: [],
    selectedTokenId: null
};

let mapImgObj = null;
const avatarCache = {};
let newTokenDraftColor = '#10b981';
let newTokenDraftAvatar = null;
let rosterFilters = {
    player: true,
    enemy: false,
    npc: false
};

// Canvas & Interaction State
const canvas = document.getElementById('vttCanvas');
const ctx = canvas.getContext('2d');
const container = document.getElementById('canvasContainer');

let currentTool = 'select'; // 'select' | 'pan' | 'ruler' | 'fog' | 'aoe'
let fogBrushMode = 'dark'; // 'dark' | 'shadow' | 'reveal'
let fogBrushSize = 1; // 1, 2, 3, 4
let hoverFogCell = null; // { col, row }
let isPaintingFog = false;
let lastPaintedFogCell = null;

let aoeDraft = {
    shape: 'circle', // 'circle' | 'square'
    color: '#ef4444',
    radiusFeet: 20
};
let selectedAoeId = null;
let hoverWorldPos = null;
let draggingAoe = null;
let aoeDragOffset = { x: 0, y: 0 };

let isPanning = false;
let draggingToken = null;
let dragOffset = { x: 0, y: 0 };
let lastPointer = { x: 0, y: 0 };

let rulerStart = null;
let rulerEnd = null;
let isMeasuring = false;

// Conditions List (Including Charmed & Nauseated)
const CONDITIONS = [
    { id: 'poisoned', label: 'ติดพิษ', icon: '🤢', color: '#22c55e' },
    { id: 'charmed', label: 'ติดหลงเสน่ห์', icon: '💘', color: '#ec4899' },
    { id: 'nauseated', label: 'คลื่นไส้', icon: '🤮', color: '#84cc16' },
    { id: 'stunned', label: 'มึนงง', icon: '💫', color: '#eab308' },
    { id: 'burning', label: 'ติดไฟ', icon: '🔥', color: '#f97316' },
    { id: 'prone', label: 'ล้มลง', icon: '🛌', color: '#38bdf8' },
    { id: 'blinded', label: 'ตาบอด', icon: '🙈', color: '#a855f7' },
    { id: 'unconscious', label: 'หมดสติ', icon: '💀', color: '#ef4444' }
];

// ==================== TOKEN DATA NORMALIZER ====================
function ensureTokenRpgData(tok) {
    if (!tok.level) tok.level = 1;
    if (!tok.charClass) tok.charClass = '';
    if (!tok.ac) tok.ac = tok.baseAc || 12;
    if (!Array.isArray(tok.inventory)) tok.inventory = [];
    if (!Array.isArray(tok.skills)) tok.skills = [];
    if (!Array.isArray(tok.conditions)) tok.conditions = [];
    return tok;
}

function recalculateTokenTotals(tok) {
    const totalStats = { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 };
    STAT_KEYS.forEach(s => {
        let val = Number(tok.stats?.[s.key] ?? 10) + Number(tok.bonuses?.[s.key] ?? 0);
        (tok.equipment || []).forEach(eq => {
            if (eq.equipped !== false && eq.mods && eq.mods[s.key]) val += Number(eq.mods[s.key]);
        });
        (tok.buffs || []).forEach(bf => {
            if (bf.active !== false && bf.mods && bf.mods[s.key]) val += Number(bf.mods[s.key]);
        });
        totalStats[s.key] = val;
    });

    let ac = Number(tok.baseAc ?? tok.ac ?? 12) + Number(tok.bonuses?.ac ?? 0);
    let speed = Number(tok.baseSpeed ?? 30) + Number(tok.bonuses?.speed ?? 0);

    (tok.equipment || []).forEach(eq => {
        if (eq.equipped !== false && eq.mods) {
            if (eq.mods.ac) ac += Number(eq.mods.ac);
            if (eq.mods.speed) speed += Number(eq.mods.speed);
        }
    });
    (tok.buffs || []).forEach(bf => {
        if (bf.active !== false && bf.mods) {
            if (bf.mods.ac) ac += Number(bf.mods.ac);
            if (bf.mods.speed) speed += Number(bf.mods.speed);
        }
    });

    tok.computedStats = totalStats;
    tok.ac = ac;
    tok.speed = speed;
    tok.profBonus = Math.ceil((tok.level || 1) / 4) + 1;
}

function getStatMod(score) {
    return Math.floor(((score || 10) - 10) / 2);
}

function formatMod(mod) {
    return mod >= 0 ? `+${mod}` : `${mod}`;
}

