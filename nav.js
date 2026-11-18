// ==================== TOOLBAR & NAVIGATION ====================
function setTool(tool) {
    currentTool = tool;
    const activeCls = 'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-amber-500 text-slate-950 shadow transition';
    const inactiveCls = 'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white transition';
    document.getElementById('toolSelectBtn').className = tool === 'select' ? activeCls : inactiveCls;
    document.getElementById('toolPanBtn').className = tool === 'pan' ? activeCls : inactiveCls;
    document.getElementById('toolRulerBtn').className = tool === 'ruler' ? activeCls : inactiveCls;
    document.getElementById('toolFogBtn').className = tool === 'fog' ? activeCls : inactiveCls;
    document.getElementById('toolAoeBtn').className = tool === 'aoe' ? activeCls : inactiveCls;

    const fogBar = document.getElementById('fogFloatingToolbar');
    if (fogBar) {
        if (tool === 'fog') fogBar.classList.remove('hidden');
        else fogBar.classList.add('hidden');
    }

    const aoeBar = document.getElementById('aoeFloatingToolbar');
    if (aoeBar) {
        if (tool === 'aoe') aoeBar.classList.remove('hidden');
        else aoeBar.classList.add('hidden');
    }

    canvas.style.cursor = tool === 'pan' ? 'grab' : ((tool === 'fog' || tool === 'aoe') ? 'crosshair' : 'default');
}

