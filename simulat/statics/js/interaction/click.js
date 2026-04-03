function dashboard() {
    return window.HelloWorldDashboard || null;
}

function toggleSidebar() {
    dashboard()?.toggleSidebar();
}

function showPage(pageId) {
    dashboard()?.switchPage(pageId);
}

function send_meta() {
    return dashboard()?.applyMetaFromUI();
}

function toggleSim() {
    return dashboard()?.togglePrimaryControl();
}

function resetSimUI() {
    return dashboard()?.resetSimulation();
}

function applySettings() {
    return dashboard()?.applySettings();
}

function resetSettings() {
    return dashboard()?.resetSettings();
}
