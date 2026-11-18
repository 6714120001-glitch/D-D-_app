// ==================== GRID CONTROLS & MAP UPLOAD ====================
function updateGridConfig() {
    state.grid.visible = document.getElementById('gridVisibleCheck').checked;
    state.grid.snap = document.getElementById('gridSnapCheck').checked;
    state.grid.showAc = document.getElementById('gridShowAcCheck').checked;
    state.grid.size = parseInt(document.getElementById('gridSizeRange').value) || 64;
    state.grid.opacity = (parseInt(document.getElementById('gridOpacityRange').value) || 35) / 100;
    state.grid.offsetX = parseInt(document.getElementById('gridOffsetXRange').value) || 0;
    state.grid.offsetY = parseInt(document.getElementById('gridOffsetYRange').value) || 0;

    document.getElementById('gridSizeVal').textContent = state.grid.size + ' px';
    document.getElementById('gridOpacityVal').textContent = Math.round(state.grid.opacity * 100) + '%';
    document.getElementById('gridOffsetXVal').textContent = state.grid.offsetX + ' px';
    document.getElementById('gridOffsetYVal').textContent = state.grid.offsetY + ' px';
    saveToLocalStorage();
}

function setGridColor(hex) {
    state.grid.color = hex;
    saveToLocalStorage();
}

function resetGridOffset() {
    document.getElementById('gridOffsetXRange').value = 0;
    document.getElementById('gridOffsetYRange').value = 0;
    updateGridConfig();
}

document.getElementById('mapUploadInput').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
        applyMapImage(ev.target.result);
        showToast('อัปโหลดรูปแผนที่เรียบร้อยแล้ว!');
    };
    reader.readAsDataURL(file);
});

function applyMapImage(dataUrl) {
    state.mapImageSrc = dataUrl;
    state.isBlankMap = false;
    const img = new Image();
    img.onload = () => {
        mapImgObj = img;
        state.mapWidth = img.naturalWidth || 1600;
        state.mapHeight = img.naturalHeight || 1100;
        fitMapToScreen();
        saveToLocalStorage();
    };
    img.src = dataUrl;
}

function loadSampleDungeonMap() {
    state.mapImageSrc = null;
    state.isBlankMap = false;
    mapImgObj = null;
    state.mapWidth = 1600;
    state.mapHeight = 1100;
    const presetSel = document.getElementById('presetSceneSelect');
    if (presetSel) presetSel.value = 'dungeon';
    fitMapToScreen();
    showToast('โหลดฉากวิหารโบราณตัวอย่างแล้ว');
}

function removeCurrentMap() {
    state.mapImageSrc = null;
    state.isBlankMap = true;
    mapImgObj = null;
    state.mapWidth = 1600;
    state.mapHeight = 1100;
    const presetSel = document.getElementById('presetSceneSelect');
    if (presetSel) presetSel.value = '';
    const mapInput = document.getElementById('mapUploadInput');
    if (mapInput) mapInput.value = '';
    fitMapToScreen();
    saveToLocalStorage();
    showToast('ลบรูปแผนที่ปัจจุบันออกแล้ว (เหลือกระดานตารางเปล่า)');
}

function resetEntireBoard() {
    state.mapImageSrc = null;
    state.isBlankMap = true;
    mapImgObj = null;
    state.mapWidth = 1600;
    state.mapHeight = 1100;
    state.tokens = [];
    state.selectedTokenId = null;
    state.fog = { cells: {}, dmDarkOpacity: 1.0 };
    state.aoeTemplates = [];
    selectedAoeId = null;
    updateSelectedAoeBar();
    const presetSel = document.getElementById('presetSceneSelect');
    if (presetSel) presetSel.value = '';
    const mapInput = document.getElementById('mapUploadInput');
    if (mapInput) mapInput.value = '';
    fitMapToScreen();
    renderAll();
    saveToLocalStorage();
    showToast('ล้างรูปแผนที่ หมุด เงา และเอฟเฟกต์ทั้งหมดเรียบร้อยแล้ว');
}

