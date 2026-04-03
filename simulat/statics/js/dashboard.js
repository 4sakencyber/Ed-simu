const API = window.HelloWorldApi || {
    meta: "/myapp/api/meta/",
    turtles: "/myapp/api/turtles/",
    runtime: "/myapp/api/runtime/",
    controls: "/myapp/api/simulation/controls/",
    building: "/myapp/api/building/"
};

const STORAGE_KEYS = {
    prefs: "helloworld_dashboard_prefs_v1",
    history: "helloworld_dashboard_history_v1"
};

const DEFAULT_META = {
    num_persons: 10,
    random_pos: true,
    leader: false,
    panic: 0,
    expV: 1.3
};

const DEFAULT_PREFS = {
    themeMode: "night",
    modelOpacity: 0.35,
    renderQuality: "high",
    samplingSec: 0.6,
    pickFilter: "all",
    trackingMode: "orbit",
    autoSwitchMonitor: false,
    sidebarCollapsed: false,
    shipVisible: true,
    personMonitorCollapsed: false,
    runtimeCardCollapsed: false
};

const dom = {};

const state = {
    page: "simulation",
    mode: "idle",
    meta: { ...DEFAULT_META },
    turtles: [],
    history: [],
    logs: [],
    prefs: { ...DEFAULT_PREFS },
    elapsedMs: 0,
    lastTickAt: null,
    currentRun: null,
    nextRunNo: 1,
    lastSignature: "",
    stableFrames: 0,
    pageMeta: {},
    viewerSelection: {
        selected: false,
        meta: null,
        trackingActive: false,
        trackingPersonId: null,
        trackingMode: DEFAULT_PREFS.trackingMode,
        pickFilter: DEFAULT_PREFS.pickFilter
    },
    settingsDirty: false,
    lastViewerStatus: "",
    runtime: null,
    metaPollHandle: null,
    runtimePollHandle: null,
    clockHandle: null,
    runtimeFetchFailed: false,
    lastRuntimeError: "",
    historyClearConfirming: false,
    historyClearTimer: null
};

init();

function init() {
    cacheDom();
    collectPageMeta();
    restorePrefs();
    restoreHistory();
    bindEvents();
    applyPrefsToDocument();
    syncUiFromState();
    applySettingsToViewer(state.prefs);
    switchPage("simulation");
    renderLogs();
    renderLogSummary();
    renderRuntimeDiagnostics();
    renderHistoryList();
    renderLiveTable();
    renderCharts();
    updateRuntimeStats();
    renderPersonMonitor();
    renderSettingsStatus();
    syncHistoryClearButton();
    log("event", "前端控制台已就绪");
    fetchRuntime(false);
    fetchMeta(false);
    startRuntimePolling();
    startMetaPolling();
    startClockTicker();
    exposeLegacyApi();
}

function cacheDom() {
    dom.workspace = document.getElementById("workspace");
    dom.sidebar = document.getElementById("sidebar");
    dom.sidebarToggle = document.getElementById("sidebarToggle");
    dom.sideLinks = Array.from(document.querySelectorAll(".side-link[data-page]"));
    dom.mainPanel = document.getElementById("mainPanel");
    dom.panelTitle = document.getElementById("panelTitle");
    dom.panelSubtitle = document.getElementById("panelSubtitle");
    dom.stateBadge = document.getElementById("stateBadge");
    dom.simClock = document.getElementById("simClock");
    dom.sceneHint = document.getElementById("sceneHint");
    dom.viewerMetaHint = document.getElementById("viewerMetaHint");
    dom.toast = document.getElementById("toast");

    dom.totalPeople = document.getElementById("totalPeople");
    dom.randomPosition = document.getElementById("randomPosition");
    dom.hasLeader = document.getElementById("hasLeader");
    dom.panicFactor = document.getElementById("panicFactor");
    dom.desiredSpeed = document.getElementById("desiredSpeed");
    dom.panicValue = document.getElementById("panicValue");
    dom.speedValue = document.getElementById("speedValue");
    dom.applyMetaBtn = document.getElementById("applyMetaBtn");
    dom.startBtn = document.getElementById("startBtn");
    dom.pauseBtn = document.getElementById("pauseBtn");
    dom.resetBtn = document.getElementById("resetBtn");
    dom.shipVisibleToggle = document.getElementById("shipVisibleToggle");

    dom.statTotal = document.getElementById("statTotal");
    dom.statActive = document.getElementById("statActive");
    dom.statFinished = document.getElementById("statFinished");
    dom.statEvacRate = document.getElementById("statEvacRate");
    dom.statAvgDose = document.getElementById("statAvgDose");
    dom.statMaxDose = document.getElementById("statMaxDose");
    dom.statTotalDose = document.getElementById("statTotalDose");
    dom.statHighDoseCount = document.getElementById("statHighDoseCount");
    dom.statLeaders = document.getElementById("statLeaders");
    dom.statLevel = document.getElementById("statLevel");
    dom.floorDist = document.getElementById("floorDist");
    dom.metaSummary = document.getElementById("metaSummary");
    dom.runtimeFocusHint = document.getElementById("runtimeFocusHint");
    dom.personMonitorBadge = document.getElementById("personMonitorBadge");
    dom.personMonitorCard = document.getElementById("personMonitorCard");
    dom.togglePersonMonitorBtn = document.getElementById("togglePersonMonitorBtn");
    dom.personSearchInput = document.getElementById("personSearchInput");
    dom.personSearchBtn = document.getElementById("personSearchBtn");
    dom.personQuickSelect = document.getElementById("personQuickSelect");
    dom.personMonitorTitle = document.getElementById("personMonitorTitle");
    dom.personMonitorMeta = document.getElementById("personMonitorMeta");
    dom.personQuickId = document.getElementById("personQuickId");
    dom.personQuickStatus = document.getElementById("personQuickStatus");
    dom.personQuickDose = document.getElementById("personQuickDose");
    dom.personStatId = document.getElementById("personStatId");
    dom.personStatFloor = document.getElementById("personStatFloor");
    dom.personStatRoom = document.getElementById("personStatRoom");
    dom.personStatRegion = document.getElementById("personStatRegion");
    dom.personStatRole = document.getElementById("personStatRole");
    dom.personStatStatus = document.getElementById("personStatStatus");
    dom.personStatDose = document.getElementById("personStatDose");
    dom.personStatPos = document.getElementById("personStatPos");
    dom.personDoseBand = document.getElementById("personDoseBand");
    dom.personDoseRank = document.getElementById("personDoseRank");
    dom.personDoseShare = document.getElementById("personDoseShare");
    dom.personDoseHint = document.getElementById("personDoseHint");
    dom.personFocusBtn = document.getElementById("personFocusBtn");
    dom.personTrackBtn = document.getElementById("personTrackBtn");
    dom.personClearBtn = document.getElementById("personClearBtn");

    dom.runtimeCard = document.getElementById("runtimeCard");
    dom.toggleRuntimeCardBtn = document.getElementById("toggleRuntimeCardBtn");
    dom.monitorEvacRate = document.getElementById("monitorEvacRate");
    dom.monitorActive = document.getElementById("monitorActive");
    dom.monitorSamples = document.getElementById("monitorSamples");
    dom.historyRuns = document.getElementById("historyRuns");
    dom.monitorAvgDose = document.getElementById("monitorAvgDose");
    dom.monitorMaxDose = document.getElementById("monitorMaxDose");
    dom.monitorTotalDose = document.getElementById("monitorTotalDose");
    dom.monitorHighDoseCount = document.getElementById("monitorHighDoseCount");
    dom.clearHistoryBtn = document.getElementById("clearHistoryBtn");
    dom.trendChart = document.getElementById("trendChart");
    dom.liveTableBody = document.getElementById("liveTableBody");
    dom.historyList = document.getElementById("historyList");

    dom.logFilter = document.getElementById("logFilter");
    dom.logList = document.getElementById("logList");
    dom.clearLogsBtn = document.getElementById("clearLogsBtn");
    dom.exportLogsBtn = document.getElementById("exportLogsBtn");
    dom.logCountAll = document.getElementById("logCountAll");
    dom.logCountEvent = document.getElementById("logCountEvent");
    dom.logCountWarn = document.getElementById("logCountWarn");
    dom.logCountError = document.getElementById("logCountError");
    dom.logLastTime = document.getElementById("logLastTime");
    dom.runtimeStatusBadge = document.getElementById("runtimeStatusBadge");
    dom.runtimeStatusMeta = document.getElementById("runtimeStatusMeta");
    dom.runtimeStatusText = document.getElementById("runtimeStatusText");
    dom.runtimeThreadState = document.getElementById("runtimeThreadState");
    dom.runtimeFrame = document.getElementById("runtimeFrame");
    dom.runtimeUpdatedAt = document.getElementById("runtimeUpdatedAt");
    dom.runtimeCallbackUrl = document.getElementById("runtimeCallbackUrl");
    dom.runtimeLastError = document.getElementById("runtimeLastError");
    dom.runtimeBridgeLogList = document.getElementById("runtimeBridgeLogList");

    dom.themeModeSelect = document.getElementById("themeModeSelect");
    dom.modelOpacitySlider = document.getElementById("modelOpacitySlider");
    dom.modelOpacityValue = document.getElementById("modelOpacityValue");
    dom.renderQuality = document.getElementById("renderQuality");
    dom.samplingRange = document.getElementById("samplingRange");
    dom.samplingValue = document.getElementById("samplingValue");
    dom.pickFilterSelect = document.getElementById("pickFilterSelect");
    dom.trackingModeSelect = document.getElementById("trackingModeSelect");
    dom.focusSelectionBtn = document.getElementById("focusSelectionBtn");
    dom.trackBtn = document.getElementById("trackBtn");
    dom.stopTrackBtn = document.getElementById("stopTrackBtn");
    dom.autoSwitchMonitor = document.getElementById("autoSwitchMonitor");
    dom.applySettingsBtn = document.getElementById("applySettingsBtn");
    dom.resetSettingsBtn = document.getElementById("resetSettingsBtn");
    dom.settingsStatusTitle = document.getElementById("settingsStatusTitle");
    dom.settingsStatusMeta = document.getElementById("settingsStatusMeta");

    dom.pages = {
        simulation: document.getElementById("page-simulation"),
        monitor: document.getElementById("page-monitor"),
        logs: document.getElementById("page-logs"),
        settings: document.getElementById("page-settings"),
        about: document.getElementById("page-about")
    };
}

function collectPageMeta() {
    state.pageMeta = Object.fromEntries(
        Object.entries(dom.pages).map(([key, node]) => {
            const firstHeading = node?.querySelector("h2")?.textContent?.trim() || key;
            return [key, {
                title: node?.dataset.pageTitle?.trim() || firstHeading,
                subtitle: node?.dataset.pageSubtitle?.trim() || ""
            }];
        })
    );
}

function exposeLegacyApi() {
    window.HelloWorldDashboard = {
        toggleSidebar,
        switchPage,
        applyMetaFromUI,
        startOrResume,
        pauseOrResume,
        togglePrimaryControl,
        resetSimulation,
        applySettings,
        resetSettings
    };
}

function bindEvents() {
    dom.sidebarToggle.addEventListener("click", toggleSidebar);
    dom.sideLinks.forEach((button) => {
        button.addEventListener("click", () => switchPage(button.dataset.page));
    });

    dom.panicFactor.addEventListener("input", syncRangeLabels);
    dom.desiredSpeed.addEventListener("input", syncRangeLabels);
    dom.modelOpacitySlider.addEventListener("input", handleSettingsPreviewChange);
    dom.samplingRange.addEventListener("input", handleSettingsPreviewChange);

    dom.applyMetaBtn.addEventListener("click", () => {
        void applyMetaFromUI();
    });
    dom.startBtn.addEventListener("click", () => {
        void startOrResume();
    });
    dom.pauseBtn.addEventListener("click", () => {
        void pauseOrResume();
    });
    dom.resetBtn.addEventListener("click", () => {
        void resetSimulation();
    });
    dom.shipVisibleToggle?.addEventListener("change", () => {
        setShipVisibilityPreference(dom.shipVisibleToggle.checked);
    });

    dom.logFilter.addEventListener("change", renderLogs);
    dom.clearLogsBtn.addEventListener("click", clearLogs);
    dom.exportLogsBtn.addEventListener("click", exportLogs);
    dom.clearHistoryBtn?.addEventListener("click", handleClearHistoryClick);

    dom.applySettingsBtn.addEventListener("click", applySettings);
    dom.resetSettingsBtn.addEventListener("click", resetSettings);
    dom.themeModeSelect.addEventListener("change", handleSettingsPreviewChange);
    dom.renderQuality.addEventListener("change", handleSettingsPreviewChange);
    dom.autoSwitchMonitor.addEventListener("change", handleSettingsPreviewChange);
    dom.pickFilterSelect?.addEventListener("change", () => {
        state.prefs.pickFilter = normalizePickFilter(dom.pickFilterSelect.value);
        applySettingsToViewer(state.prefs);
        savePrefs();
        renderSettingsStatus();
    });
    dom.trackingModeSelect?.addEventListener("change", () => {
        state.prefs.trackingMode = normalizeTrackingMode(dom.trackingModeSelect.value);
        applySettingsToViewer(state.prefs);
        savePrefs();
        renderSettingsStatus();
    });
    dom.liveTableBody?.addEventListener("click", handleLiveTableClick);
    dom.personSearchBtn?.addEventListener("click", () => {
        focusPersonById(dom.personSearchInput?.value, { source: "搜索栏", focus: true });
    });
    dom.personSearchInput?.addEventListener("keydown", (event) => {
        if (event.key !== "Enter") {
            return;
        }
        event.preventDefault();
        focusPersonById(dom.personSearchInput?.value, { source: "搜索栏", focus: true });
    });
    dom.personQuickSelect?.addEventListener("change", () => {
        if (!dom.personQuickSelect.value) {
            return;
        }
        focusPersonById(dom.personQuickSelect.value, { source: "快速选择", focus: true });
    });
    dom.personFocusBtn?.addEventListener("click", () => {
        const personId = currentMonitoredPersonId();
        if (personId == null) return;
        focusPersonById(personId, { source: "个体监视", focus: true, silentToast: true });
    });
    dom.personTrackBtn?.addEventListener("click", () => {
        const personId = currentMonitoredPersonId();
        if (personId == null) return;
        focusPersonById(personId, { source: "个体监视", focus: true, track: true, silentToast: true });
    });
    dom.personClearBtn?.addEventListener("click", () => {
        window.helloWorldViewer?.clearSelection?.();
        window.helloWorldViewer?.stopTracking?.();
    });
    dom.togglePersonMonitorBtn?.addEventListener("click", () => {
        setCardCollapsed("personMonitor", !state.prefs.personMonitorCollapsed);
    });
    dom.toggleRuntimeCardBtn?.addEventListener("click", () => {
        setCardCollapsed("runtimeCard", !state.prefs.runtimeCardCollapsed);
    });

    window.addEventListener("helloworld:turtles-update", onTurtlesUpdate);
    window.addEventListener("helloworld:turtles-error", (event) => {
        log("error", `人员数据拉取失败: ${event.detail?.message || "unknown error"}`);
    });
    window.addEventListener("helloworld:viewer-ready", handleViewerReady);
    window.addEventListener("helloworld:selection-change", handleSelectionChange);
    window.addEventListener("helloworld:tracking-change", handleTrackingChange);
    window.addEventListener("helloworld:viewer-status", handleViewerStatus);
    window.addEventListener("resize", () => {
        renderCharts();
        renderSettingsStatus();
    });
}

function restorePrefs() {
    try {
        const raw = localStorage.getItem(STORAGE_KEYS.prefs);
        if (!raw) return;
        const parsed = JSON.parse(raw);
        state.prefs = { ...DEFAULT_PREFS, ...parsed };
    } catch {
        state.prefs = { ...DEFAULT_PREFS };
    }
}

function savePrefs() {
    localStorage.setItem(STORAGE_KEYS.prefs, JSON.stringify(state.prefs));
}

function restoreHistory() {
    try {
        const raw = localStorage.getItem(STORAGE_KEYS.history);
        state.history = raw ? JSON.parse(raw) : [];
    } catch {
        state.history = [];
    }

    state.nextRunNo =
        state.history.reduce((maxRun, item) => Math.max(maxRun, Number(item.runNo) || 0), 0) + 1;
}

function saveHistory() {
    if (!state.history.length) {
        localStorage.removeItem(STORAGE_KEYS.history);
        return;
    }
    localStorage.setItem(STORAGE_KEYS.history, JSON.stringify(state.history));
}

function syncUiFromState() {
    dom.totalPeople.value = String(state.meta.num_persons);
    dom.randomPosition.checked = !!state.meta.random_pos;
    dom.hasLeader.checked = !!state.meta.leader;
    dom.panicFactor.value = String(state.meta.panic);
    dom.desiredSpeed.value = String(state.meta.expV);

    dom.themeModeSelect.value = state.prefs.themeMode;
    dom.modelOpacitySlider.value = String(state.prefs.modelOpacity);
    dom.renderQuality.value = state.prefs.renderQuality;
    dom.samplingRange.value = String(state.prefs.samplingSec);
    if (dom.pickFilterSelect) {
        dom.pickFilterSelect.value = normalizePickFilter(state.prefs.pickFilter);
    }
    if (dom.trackingModeSelect) {
        dom.trackingModeSelect.value = normalizeTrackingMode(state.prefs.trackingMode);
    }
    dom.autoSwitchMonitor.checked = !!state.prefs.autoSwitchMonitor;
    if (dom.shipVisibleToggle) {
        dom.shipVisibleToggle.checked = !!state.prefs.shipVisible;
    }

    syncRangeLabels();
    syncCollapsibleCards();
    renderMetaSummary();
}

function syncRangeLabels() {
    dom.panicValue.textContent = Number(dom.panicFactor.value).toFixed(2);
    dom.speedValue.textContent = Number(dom.desiredSpeed.value).toFixed(2);
    dom.modelOpacityValue.textContent = `${Math.round(Number(dom.modelOpacitySlider.value) * 100)}%`;
    dom.samplingValue.textContent = Number(dom.samplingRange.value).toFixed(2);
}

function readSettingsDraft() {
    return {
        ...state.prefs,
        themeMode: dom.themeModeSelect.value === "day" ? "day" : "night",
        modelOpacity: clamp(Number(dom.modelOpacitySlider.value), 0.05, 1.0),
        renderQuality: normalizeQuality(dom.renderQuality.value),
        samplingSec: clamp(Number(dom.samplingRange.value), 0.2, 2.0),
        pickFilter: normalizePickFilter(dom.pickFilterSelect?.value || state.prefs.pickFilter),
        trackingMode: normalizeTrackingMode(dom.trackingModeSelect?.value || state.prefs.trackingMode),
        autoSwitchMonitor: !!dom.autoSwitchMonitor.checked
    };
}

function isSettingsDirty(draft = readSettingsDraft()) {
    return draft.themeMode !== state.prefs.themeMode ||
        Math.abs(draft.modelOpacity - state.prefs.modelOpacity) > 1e-6 ||
        draft.renderQuality !== state.prefs.renderQuality ||
        Math.abs(draft.samplingSec - state.prefs.samplingSec) > 1e-6 ||
        !!draft.autoSwitchMonitor !== !!state.prefs.autoSwitchMonitor;
}

function handleSettingsPreviewChange() {
    syncRangeLabels();
    const draft = readSettingsDraft();
    state.settingsDirty = isSettingsDirty(draft);
    applyPrefsToDocument(draft);
    applySettingsToViewer(draft);
    renderCharts();
    renderSettingsStatus(draft);
}

function applyPrefsToDocument(prefs = state.prefs) {
    document.body.dataset.theme = prefs.themeMode === "day" ? "day" : "night";
    dom.workspace.classList.toggle("sidebar-collapsed", !!state.prefs.sidebarCollapsed);
}

function applySettingsToViewer(prefs = readSettingsDraft()) {
    const viewer = window.helloWorldViewer;
    if (!viewer) return;

    viewer.setShipVisible?.(prefs.shipVisible);
    viewer.setModelOpacity?.(prefs.modelOpacity);
    viewer.setRenderQuality?.(prefs.renderQuality);
    viewer.setPickFilter?.(prefs.pickFilter);
    viewer.setTrackingMode?.(prefs.trackingMode);
}

function applySettings() {
    state.prefs = readSettingsDraft();
    state.settingsDirty = false;
    applyPrefsToDocument(state.prefs);
    applySettingsToViewer(state.prefs);
    savePrefs();
    renderCharts();
    renderSettingsStatus(state.prefs);
    log("event", "本地显示设置已应用");
    toast("设置已应用");
}

function resetSettings() {
    state.prefs = {
        ...DEFAULT_PREFS,
        sidebarCollapsed: state.prefs.sidebarCollapsed,
        shipVisible: state.prefs.shipVisible,
        personMonitorCollapsed: state.prefs.personMonitorCollapsed,
        runtimeCardCollapsed: state.prefs.runtimeCardCollapsed
    };
    state.settingsDirty = false;
    syncUiFromState();
    applyPrefsToDocument(state.prefs);
    applySettingsToViewer(state.prefs);
    savePrefs();
    renderCharts();
    renderSettingsStatus(state.prefs);
    log("event", "本地设置已恢复默认值");
    toast("已恢复默认设置");
}

function normalizeQuality(value) {
    if (value === "low" || value === "medium" || value === "high") {
        return value;
    }
    return DEFAULT_PREFS.renderQuality;
}

function normalizePickFilter(value) {
    return value === "person" || value === "room" || value === "task" || value === "other"
        ? value
        : DEFAULT_PREFS.pickFilter;
}

function normalizeTrackingMode(value) {
    return value === "lock" || value === "third" ? value : DEFAULT_PREFS.trackingMode;
}

function themeModeLabel(value) {
    return value === "day" ? "日间" : "夜间";
}

function qualityLabel(value) {
    if (value === "low") return "低";
    if (value === "medium") return "中";
    return "高";
}

function pickFilterText(value) {
    if (value === "person") return "人物";
    if (value === "room") return "房间";
    if (value === "task") return "任务对象";
    if (value === "other") return "其他对象";
    return "全部对象";
}

function trackingModeText(value) {
    if (value === "lock") return "固定跟随";
    if (value === "third") return "第三人称跟随";
    return "自由跟随";
}

function handleViewerReady() {
    applySettingsToViewer(readSettingsDraft());
    renderSettingsStatus();
}

function setShipVisibilityPreference(visible) {
    state.prefs.shipVisible = !!visible;
    if (dom.shipVisibleToggle) {
        dom.shipVisibleToggle.checked = state.prefs.shipVisible;
    }
    applySettingsToViewer(state.prefs);
    savePrefs();
    renderSettingsStatus();
    log("event", `船体模型已${state.prefs.shipVisible ? "显示" : "隐藏"}`);
}

function setCardCollapsed(cardKey, collapsed, options = {}) {
    const {
        persist = true,
        silent = false
    } = options;

    const isPersonCard = cardKey === "personMonitor";
    const prefKey = isPersonCard ? "personMonitorCollapsed" : "runtimeCardCollapsed";
    const card = isPersonCard ? dom.personMonitorCard : dom.runtimeCard;
    const button = isPersonCard ? dom.togglePersonMonitorBtn : dom.toggleRuntimeCardBtn;
    const label = isPersonCard ? "个体监视" : "运行态势";
    const nextCollapsed = !!collapsed;

    state.prefs[prefKey] = nextCollapsed;

    if (card) {
        card.dataset.collapsed = nextCollapsed ? "true" : "false";
    }
    if (button) {
        button.textContent = nextCollapsed ? "展开" : "收起";
        button.setAttribute("aria-expanded", String(!nextCollapsed));
    }

    if (persist) {
        savePrefs();
    }
    renderSettingsStatus();
    if (!silent) {
        log("event", `${label}已${nextCollapsed ? "收起" : "展开"}`);
    }
}

function syncCollapsibleCards() {
    setCardCollapsed("personMonitor", !!state.prefs.personMonitorCollapsed, { persist: false, silent: true });
    setCardCollapsed("runtimeCard", !!state.prefs.runtimeCardCollapsed, { persist: false, silent: true });
}

function handleTrackingChange(event) {
    state.viewerSelection = {
        ...state.viewerSelection,
        ...(event.detail || {})
    };
    renderPersonMonitor();
    renderLiveTable();
}

function handleViewerStatus(event) {
    const message = String(event.detail?.message || "").trim();
    if (!message || message === state.lastViewerStatus) {
        return;
    }

    state.lastViewerStatus = message;
    log(/fail|error/i.test(message) ? "error" : "event", `Viewer status: ${message}`);
}

function normalizePersonId(value) {
    const personId = Number(value);
    return Number.isFinite(personId) && personId >= 0 ? personId : null;
}

function currentMonitoredPersonId() {
    const selectedId = state.viewerSelection.meta?.type === "person"
        ? normalizePersonId(state.viewerSelection.meta.personId)
        : null;
    if (selectedId != null) {
        return selectedId;
    }

    return normalizePersonId(state.viewerSelection.trackingPersonId);
}

function getPersonById(personId) {
    const normalizedId = normalizePersonId(personId);
    if (normalizedId == null) {
        return null;
    }

    return state.turtles.find((item) => Number(item.id) === normalizedId) || null;
}

function personRoleText(person) {
    return person?.is_leader ? "领队" : "普通人员";
}

function personStatusText(person) {
    if (!person) return "-";
    return person.finished ? "已完成疏散" : "疏散中";
}

function formatDoseValue(value, options = {}) {
    const { compact = false } = options;
    const dose = safeNumber(value, 0);
    const absDose = Math.abs(dose);
    if (absDose <= Number.EPSILON) {
        return compact ? "0" : "0.000000";
    }
    if (absDose >= 10) {
        return dose.toFixed(2);
    }
    if (absDose >= 1) {
        return dose.toFixed(3);
    }
    if (absDose >= 1e-2) {
        return dose.toFixed(5);
    }
    if (absDose >= 1e-4) {
        return dose.toFixed(7);
    }
    return dose.toExponential(2);
}

function formatPersonPosition(person) {
    if (!Array.isArray(person?.pos) || person.pos.length < 3) {
        return "-";
    }

    return person.pos
        .slice(0, 3)
        .map((item) => safeNumber(item, 0).toFixed(2))
        .join(", ");
}

function rankTurtlesByDose(turtles, limit = turtles.length) {
    return turtles
        .slice()
        .sort((a, b) => {
            const doseGap = safeNumber(b.dose, 0) - safeNumber(a.dose, 0);
            if (Math.abs(doseGap) > Number.EPSILON) {
                return doseGap;
            }
            return Number(a.id) - Number(b.id);
        })
        .slice(0, limit);
}

function findDoseRank(personId) {
    const normalizedId = normalizePersonId(personId);
    if (normalizedId == null) {
        return null;
    }

    const ranked = rankTurtlesByDose(state.turtles);
    const index = ranked.findIndex((item) => Number(item.id) === normalizedId);
    if (index < 0) {
        return null;
    }

    return {
        rank: index + 1,
        total: ranked.length
    };
}

function doseLevelMeta(value, summary) {
    const dose = safeNumber(value, 0);
    if (dose <= 0) {
        return { label: "未累积", badge: "neutral", cell: "none" };
    }

    const maxDose = safeNumber(summary?.maxDose, 0);
    const avgDose = safeNumber(summary?.avgDose, 0);
    if (maxDose <= 0) {
        return { label: "已累积", badge: "neutral", cell: "low" };
    }

    const highThreshold = Math.max(maxDose * 0.72, avgDose * 2.4);
    const mediumThreshold = Math.max(maxDose * 0.38, avgDose * 1.35);

    if (dose >= highThreshold) {
        return { label: "高剂量", badge: "warn", cell: "high" };
    }
    if (dose >= mediumThreshold) {
        return { label: "关注中", badge: "info", cell: "medium" };
    }
    return { label: "低剂量", badge: "neutral", cell: "low" };
}

function syncPersonQuickSelect() {
    if (!dom.personQuickSelect) {
        return;
    }

    const currentValue = String(currentMonitoredPersonId() ?? "");
    const options = ['<option value="">跟随当前选中人物</option>'];

    state.turtles
        .slice()
        .sort((a, b) => Number(a.id) - Number(b.id))
        .forEach((person) => {
            const personId = Number(person.id);
            const suffix = [
                person.finished ? "完成" : `F${person.floor ?? "-"}`,
                person.is_leader ? "领队" : "普通"
            ].join(" · ");
            options.push(`<option value="${personId}">#${personId} · ${suffix}</option>`);
        });

    dom.personQuickSelect.innerHTML = options.join("");
    dom.personQuickSelect.value = currentValue;
}

function focusPersonById(value, options = {}) {
    const {
        source = "个体监视",
        focus = true,
        track = false,
        silentToast = false
    } = options;
    const personId = normalizePersonId(value);
    if (personId == null) {
        if (!silentToast) {
            toast("请输入有效的人员编号");
        }
        return false;
    }

    const result = window.helloWorldViewer?.selectPersonById?.(personId, { focus, track });
    if (result) {
        if (dom.personSearchInput) {
            dom.personSearchInput.value = String(personId);
        }
        if (!silentToast) {
            toast(`${source}已定位人员 #${personId}`);
        }
        log("event", `${source}已定位人员 #${personId}`);
        return true;
    }

    if (!silentToast) {
        toast(`未找到人员 #${personId}`);
    }
    log("warn", `${source}定位人员失败 #${personId}`);
    return false;
}

function toggleSidebar() {
    state.prefs.sidebarCollapsed = !state.prefs.sidebarCollapsed;
    applyPrefsToDocument();
    savePrefs();
    window.dispatchEvent(new Event("resize"));
}

function switchPage(page) {
    if (!(page in dom.pages)) return;

    state.page = page;
    dom.mainPanel.dataset.page = page;
    Object.entries(dom.pages).forEach(([key, node]) => {
        node.classList.toggle("active", key === page);
    });
    dom.sideLinks.forEach((button) => {
        button.classList.toggle("active", button.dataset.page === page);
    });

    const meta = state.pageMeta[page] || { title: page, subtitle: "" };
    dom.panelTitle.textContent = meta.title;
    dom.panelSubtitle.textContent = meta.subtitle;

    if (page === "monitor") {
        renderMonitor();
    } else if (page === "logs") {
        renderLogs();
        renderHistoryList();
    } else if (page === "settings") {
        renderSettingsStatus();
    }
}

function startMetaPolling() {
    if (state.metaPollHandle) return;
    state.metaPollHandle = window.setInterval(() => {
        void fetchMeta(false);
    }, 2500);
}

function startRuntimePolling() {
    if (state.runtimePollHandle) return;
    state.runtimePollHandle = window.setInterval(() => {
        void fetchRuntime(false);
    }, 1200);
}

function startClockTicker() {
    if (state.clockHandle) return;
    state.clockHandle = window.setInterval(() => {
        updateClock();
    }, 200);
}

function updateClock() {
    const now = performance.now();
    if (state.mode === "running") {
        if (state.lastTickAt == null) {
            state.lastTickAt = now;
        } else {
            state.elapsedMs += Math.max(0, now - state.lastTickAt);
            state.lastTickAt = now;
        }
    } else {
        state.lastTickAt = null;
    }

    dom.simClock.textContent = formatClock(state.elapsedMs / 1000);
}

async function fetchMeta(showToast) {
    try {
        const response = await fetch(API.meta);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const payload = await response.json();
        state.meta = normalizeApiMeta(payload?.meta || payload || state.meta);
        if (state.mode === "idle" && !isMetaDirtyInUi()) {
            syncUiFromState();
        } else {
            renderMetaSummary();
        }
        if (showToast) {
            toast("参数已同步");
        }
    } catch (error) {
        log("error", `Meta 拉取失败: ${error.message || error}`);
        if (showToast) {
            toast("参数同步失败");
        }
    }
}

function normalizeRuntimeStatus(value) {
    return value === "running" || value === "paused" || value === "completed" || value === "error"
        ? value
        : "idle";
}

async function fetchRuntime(showToast) {
    try {
        const response = await fetch(API.runtime);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const payload = await response.json();
        const recovered = state.runtimeFetchFailed;
        state.runtimeFetchFailed = false;
        applyRuntimeSnapshot(payload);
        if (recovered) {
            log("event", "杩愯鎬佸悓姝ュ凡鎭㈠");
        }
        if (showToast) {
            toast("杩愯鎬佸凡鍚屾");
        }
    } catch (error) {
        if (!state.runtimeFetchFailed) {
            log("warn", `杩愯鎬佸悓姝ュけ璐? ${error.message || error}`);
        }
        state.runtimeFetchFailed = true;
        renderRuntimeDiagnostics();
        if (showToast) {
            toast("杩愯鎬佸悓姝ュけ璐?");
        }
    }
}

function applyRuntimeSnapshot(snapshot) {
    if (!snapshot || typeof snapshot !== "object") {
        return;
    }

    state.runtime = snapshot;

    if (snapshot.meta) {
        state.meta = normalizeApiMeta(snapshot.meta);
        if (state.mode === "idle" && !isMetaDirtyInUi()) {
            syncUiFromState();
        } else {
            renderMetaSummary();
        }
    }

    const nextMode = normalizeRuntimeStatus(snapshot.status);
    const runtimeHasAuthority = nextMode !== "idle";
    if (
        runtimeHasAuthority ||
        nextMode === "error" ||
        (!state.currentRun && state.turtles.length === 0)
    ) {
        if (nextMode !== state.mode) {
            setMode(nextMode);
        }
    }

    if ((nextMode === "running" || nextMode === "paused") && !state.currentRun && state.turtles.length > 0) {
        ensureRunForHeuristicStart();
    }

    if ((nextMode === "running" || nextMode === "completed") && state.elapsedMs <= 0) {
        syncElapsedFromRuntime(snapshot);
    }

    const runtimeError = String(snapshot.last_error || "").trim();
    if (runtimeError) {
        if (runtimeError !== state.lastRuntimeError) {
            state.lastRuntimeError = runtimeError;
            log("error", `杩愯鎬佸紓甯? ${runtimeError}`);
        }
    } else {
        state.lastRuntimeError = "";
    }

    renderRuntimeDiagnostics();
}

function normalizeApiMeta(meta) {
    return {
        num_persons: safeNumber(meta.num_persons, DEFAULT_META.num_persons),
        random_pos: typeof meta.random_pos === "boolean" ? meta.random_pos : DEFAULT_META.random_pos,
        leader: typeof meta.leader === "boolean" ? meta.leader : DEFAULT_META.leader,
        panic: safeNumber(meta.panic, DEFAULT_META.panic),
        expV: safeNumber(meta.expV, DEFAULT_META.expV)
    };
}

function readMetaFromUi() {
    return {
        num_persons: Math.max(1, Math.min(300, Math.round(safeNumber(dom.totalPeople.value, DEFAULT_META.num_persons)))),
        random_pos: !!dom.randomPosition.checked,
        leader: !!dom.hasLeader.checked,
        panic: clamp(Number(dom.panicFactor.value), 0, 1),
        expV: clamp(Number(dom.desiredSpeed.value), 0.8, 2.8)
    };
}

function isMetaDirtyInUi() {
    if (!dom.totalPeople) {
        return false;
    }

    const draft = readMetaFromUi();
    return draft.num_persons !== state.meta.num_persons ||
        draft.random_pos !== state.meta.random_pos ||
        draft.leader !== state.meta.leader ||
        Math.abs(draft.panic - state.meta.panic) > 1e-6 ||
        Math.abs(draft.expV - state.meta.expV) > 1e-6;
}

function syncElapsedFromRuntime(snapshot) {
    const startedAt = Date.parse(snapshot?.started_at || "");
    if (!Number.isFinite(startedAt)) {
        return;
    }

    const completedAt = snapshot?.status === "completed"
        ? Date.parse(snapshot?.completed_at || "")
        : NaN;
    const reference = Number.isFinite(completedAt) ? completedAt : Date.now();
    state.elapsedMs = Math.max(0, reference - startedAt);
}

function runtimeStatusText(status) {
    if (status === "running") return "Running";
    if (status === "paused") return "Paused";
    if (status === "completed") return "Completed";
    if (status === "error") return "Error";
    return "Idle";
}

function runtimeBadgeTone(status, offline = false) {
    if (offline) {
        return "warn";
    }
    if (status === "running") return "info";
    if (status === "paused") return "warn";
    if (status === "error") return "danger";
    return "neutral";
}

function formatRuntimeTime(value) {
    const stamp = Date.parse(value || "");
    if (Number.isFinite(stamp)) {
        return new Date(stamp).toLocaleString("zh-CN", {
            hour12: false,
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit"
        });
    }

    return value ? String(value) : "--";
}

function normalizeRuntimeLogLevel(level) {
    const normalized = String(level || "event").toLowerCase();
    if (normalized === "error") {
        return "error";
    }
    if (normalized === "warn" || normalized === "warning") {
        return "warn";
    }
    return "event";
}

function renderRuntimeDiagnostics() {
    if (!dom.runtimeStatusBadge) {
        return;
    }

    const snapshot = state.runtime;
    const offline = !!state.runtimeFetchFailed;
    const status = normalizeRuntimeStatus(snapshot?.status);

    dom.runtimeStatusBadge.textContent = offline ? "Offline" : runtimeStatusText(status);
    dom.runtimeStatusBadge.className = `mini-badge ${runtimeBadgeTone(status, offline)}`;
    dom.runtimeStatusText.textContent = runtimeStatusText(status);
    dom.runtimeThreadState.textContent = snapshot
        ? (snapshot.thread_alive ? "Alive" : "Stopped")
        : "--";
    dom.runtimeFrame.textContent = snapshot ? String(snapshot.frame ?? 0) : "--";
    dom.runtimeUpdatedAt.textContent = formatRuntimeTime(snapshot?.updated_at || snapshot?.started_at || "");
    dom.runtimeCallbackUrl.textContent = snapshot?.callback_url || "--";
    dom.runtimeLastError.textContent = snapshot?.last_error || "None";

    if (!snapshot) {
        dom.runtimeStatusMeta.textContent = offline
            ? "Runtime status endpoint is temporarily unavailable."
            : "Waiting for the backend runtime snapshot.";
        dom.runtimeBridgeLogList.innerHTML =
            '<div class="log-item"><span class="log-time">--</span>No bridge diagnostics yet</div>';
        renderSettingsStatus();
        return;
    }

    dom.runtimeStatusMeta.textContent =
        `Last command ${snapshot.last_command || "-"} / turtles ${snapshot.turtle_count ?? 0} / ` +
        `thread ${snapshot.thread_alive ? "alive" : "stopped"} / ` +
        `${offline ? "showing last successful snapshot" : "runtime endpoint connected"}`;

    const runtimeLogs = Array.isArray(snapshot.recent_logs) ? snapshot.recent_logs : [];
    if (!runtimeLogs.length) {
        dom.runtimeBridgeLogList.innerHTML =
            '<div class="log-item"><span class="log-time">--</span>No bridge diagnostics yet</div>';
        renderSettingsStatus();
        return;
    }

    dom.runtimeBridgeLogList.innerHTML = runtimeLogs
        .map((item) => {
            const type = normalizeRuntimeLogLevel(item.level);
            return `
                <div class="log-item ${type}">
                    <span class="log-time">[${escapeHtml(formatRuntimeTime(item.time))}]</span>${escapeHtml(item.message || "")}
                </div>
            `;
        })
        .join("");

    renderSettingsStatus();
}

async function applyMetaFromUI(showToast = true) {
    const meta = readMetaFromUi();

    try {
        const response = await fetch(API.meta, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(meta)
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        await response.json();
        state.meta = meta;
        renderMetaSummary();
        log("event", "仿真参数已下发到后端");
        if (showToast) {
            toast("参数已应用");
        }
    } catch (error) {
        log("error", `参数下发失败: ${error.message || error}`);
        toast("参数下发失败");
        throw error;
    }
}

async function sendCommand(command) {
    const response = await fetch(API.controls, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ command })
    });
    if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
    }
    return response.json();
}

async function startOrResume() {
    if (state.mode === "running") {
        toast("仿真已在运行中");
        return;
    }

    if (state.mode === "paused") {
        try {
            await sendCommand("resume");
            await fetchRuntime(false);
            if (state.mode !== "running") {
                setMode("running");
            }
            log("event", "仿真继续");
            toast("继续运行");
        } catch (error) {
            log("error", `恢复仿真失败: ${error.message || error}`);
            toast("恢复仿真失败");
        }
        return;
    }

    try {
        await applyMetaFromUI(false);
        if (state.turtles.length > 0) {
            window.helloWorldViewer?.clearPersons?.(true);
            state.turtles = [];
            state.lastSignature = "";
            state.stableFrames = 0;
            updateRuntimeStats();
            renderMonitor();
        }
        await sendCommand("start");
        beginRun();
        await fetchRuntime(false);
        if (state.mode !== "running") {
            setMode("running");
        }
        log("event", "仿真已启动");
        toast("仿真已启动");
    } catch (error) {
        log("error", `启动仿真失败: ${error.message || error}`);
        toast("启动仿真失败");
    }
}

async function pauseOrResume() {
    if (state.mode === "idle") {
        toast("请先启动仿真");
        return;
    }

    if (state.mode === "completed") {
        toast("当前轮次已结束，请重置后再启动");
        return;
    }

    if (state.mode === "running") {
        try {
            await sendCommand("pause");
            await fetchRuntime(false);
            if (state.mode !== "paused") {
                setMode("paused");
            }
            log("event", "仿真已暂停");
            toast("已暂停");
        } catch (error) {
            log("error", `暂停仿真失败: ${error.message || error}`);
            toast("暂停仿真失败");
        }
        return;
    }

    try {
        await sendCommand("resume");
        await fetchRuntime(false);
        if (state.mode !== "running") {
            setMode("running");
        }
        log("event", "仿真继续");
        toast("继续运行");
    } catch (error) {
        log("error", `恢复仿真失败: ${error.message || error}`);
        toast("恢复仿真失败");
    }
}

function togglePrimaryControl() {
    if (state.mode === "running") {
        void pauseOrResume();
        return;
    }
    void startOrResume();
}

async function resetSimulation() {
    if (state.mode === "idle" && state.turtles.length === 0 && !state.currentRun) {
        toast("当前没有可重置的数据");
        return;
    }

    try {
        if (state.currentRun) {
            finalizeCurrentRun("manual_reset");
        }

        await sendCommand("reset");
        state.elapsedMs = 0;
        state.lastTickAt = null;
        state.turtles = [];
        state.lastSignature = "";
        state.stableFrames = 0;
        await fetchRuntime(false);
        if (state.mode !== "idle") {
            setMode("idle");
        }
        updateRuntimeStats();
        renderMonitor();
        window.helloWorldViewer?.clearPersons?.(true);
        log("event", "仿真已重置");
        toast("重置完成");
    } catch (error) {
        log("error", `重置仿真失败: ${error.message || error}`);
        toast("重置仿真失败");
    }
}

function beginRun() {
    state.elapsedMs = 0;
    state.lastTickAt = performance.now();
    state.currentRun = {
        runNo: state.nextRunNo,
        startedAt: new Date().toISOString(),
        meta: { ...state.meta },
        samples: []
    };
}

function ensureRunForHeuristicStart() {
    if (state.currentRun) return;
    state.currentRun = {
        runNo: state.nextRunNo,
        startedAt: new Date().toISOString(),
        meta: { ...state.meta },
        samples: []
    };
    if (state.elapsedMs <= 0) {
        state.lastTickAt = performance.now();
    }
}

function finalizeCurrentRun(reason) {
    if (!state.currentRun) return;

    const summary = summarizeTurtles(state.turtles);
    const record = {
        runNo: state.currentRun.runNo,
        startedAt: state.currentRun.startedAt,
        endedAt: new Date().toISOString(),
        reason,
        meta: { ...state.currentRun.meta },
        total: summary.total,
        finished: summary.finished,
        evacRate: Number(summary.evacRate.toFixed(4)),
        avgDose: Number(summary.avgDose.toPrecision(12)),
        maxDose: Number(summary.maxDose.toPrecision(12)),
        totalDose: Number(summary.totalDose.toPrecision(12)),
        highDoseCount: summary.highDoseCount,
        peakDosePersonId: summary.highestDosePerson ? Number(summary.highestDosePerson.id) : null,
        leaderCount: summary.leaderCount,
        elapsedSec: Number((state.elapsedMs / 1000).toFixed(2)),
        samples: state.currentRun.samples.slice(-240)
    };

    state.history.unshift(record);
    if (state.history.length > 40) {
        state.history.length = 40;
    }

    state.nextRunNo += 1;
    state.currentRun = null;
    saveHistory();
    renderMonitor();
    log("event", `第 ${record.runNo} 轮已归档 (${toPercent(summary.evacRate)})`);
}

function setMode(mode) {
    state.mode = mode;
    dom.stateBadge.className = `badge ${mode}`;

    if (mode === "running") {
        dom.stateBadge.textContent = "Running";
    } else if (mode === "paused") {
        dom.stateBadge.textContent = "Paused";
    } else if (mode === "completed") {
        dom.stateBadge.textContent = "Completed";
    } else if (mode === "error") {
        dom.stateBadge.textContent = "Error";
    } else {
        dom.stateBadge.textContent = "Idle";
    }

    const hint =
        mode === "running" ? "正在接收实时疏散数据" :
        mode === "paused" ? "仿真已暂停，场景保持最近一帧" :
        mode === "completed" ? "本轮已完成，可前往监控页复盘" :
        "等待仿真数据";

    dom.sceneHint.textContent = hint;
    dom.viewerMetaHint.textContent = hint;

    if (mode === "error") {
        const errorHint = "杩愯鎬佹娴嬪埌寮傚父锛岃鏌ョ湅鏃ュ織骞堕噸缃?";
        dom.sceneHint.textContent = errorHint;
        dom.viewerMetaHint.textContent = errorHint;
    }
}

function handleSelectionChange(event) {
    const detail = event.detail || {};
    state.viewerSelection = {
        ...state.viewerSelection,
        ...detail,
        selected: !!detail.selected,
        meta: detail.meta || null
    };

    if (detail.selected && detail.meta?.title) {
        dom.viewerMetaHint.textContent = `已选择: ${detail.meta.title}`;
    } else if (state.mode === "running") {
        dom.viewerMetaHint.textContent = "正在接收实时疏散数据";
    } else if (state.mode === "paused") {
        dom.viewerMetaHint.textContent = "仿真已暂停，场景保持最近一帧";
    } else if (state.mode === "completed") {
        dom.viewerMetaHint.textContent = "本轮已完成，可前往监控页复盘";
    } else {
        dom.viewerMetaHint.textContent = "拖动查看多层舱室与人员流动";
    }

    renderPersonMonitor();
    renderLiveTable();
}

function handleLiveTableClick(event) {
    const row = event.target.closest("tr[data-person-id]");
    if (!row) {
        return;
    }

    const personId = Number(row.dataset.personId);
    if (!Number.isFinite(personId)) {
        return;
    }

    focusPersonById(personId, { source: "监控页", focus: true });
}

function renderPersonMonitor() {
    if (!dom.personMonitorTitle) {
        return;
    }

    syncPersonQuickSelect();

    const personId = currentMonitoredPersonId();
    const person = personId == null ? null : getPersonById(personId);
    const selectedMeta = state.viewerSelection.meta;
    const trackingActive = !!state.viewerSelection.trackingActive;
    const summary = summarizeTurtles(state.turtles);

    if (!person) {
        dom.personMonitorTitle.textContent = selectedMeta?.type && selectedMeta.type !== "person"
            ? "当前选中不是人员"
            : "暂无监视个体";
        dom.personMonitorMeta.textContent = selectedMeta?.type && selectedMeta.type !== "person"
            ? "当前锁定的是建筑对象。请点击人物，或通过搜索栏、下拉菜单切换到目标人员。"
            : "点击场景中的人物，或通过搜索栏、下拉菜单快速定位个体。";
        dom.personMonitorBadge.textContent = trackingActive ? "仅跟随中" : "等待选中";
        dom.personMonitorBadge.className = `mini-badge ${trackingActive ? "warn" : "neutral"}`;
        dom.personStatId.textContent = "-";
        dom.personStatFloor.textContent = "-";
        dom.personStatRoom.textContent = "-";
        dom.personStatRegion.textContent = "-";
        dom.personStatRole.textContent = "-";
        dom.personStatStatus.textContent = "-";
        dom.personStatDose.textContent = "-";
        dom.personStatPos.textContent = "-";
        if (dom.personQuickId) {
            dom.personQuickId.textContent = "-";
        }
        if (dom.personQuickStatus) {
            dom.personQuickStatus.textContent = trackingActive ? "跟随中" : "-";
        }
        if (dom.personQuickDose) {
            dom.personQuickDose.textContent = "-";
        }
        dom.personDoseBand.textContent = "未评级";
        dom.personDoseBand.className = "mini-badge neutral";
        dom.personDoseRank.textContent = "-";
        dom.personDoseShare.textContent = "-";
        dom.personDoseHint.textContent = "选中人员后，在这里查看当前剂量等级、排名和关注提示。";
        dom.personFocusBtn.disabled = true;
        dom.personTrackBtn.disabled = true;
        dom.personClearBtn.disabled = !selectedMeta && !trackingActive;
        if (dom.personQuickSelect) {
            dom.personQuickSelect.value = "";
        }
        return;
    }

    const trackingThisPerson = normalizePersonId(state.viewerSelection.trackingPersonId) === Number(person.id);
    const badgeClass = trackingThisPerson ? "warn" : (person.finished ? "neutral" : "info");
    const badgeText = trackingThisPerson ? "跟随中" : (person.finished ? "已完成" : "监视中");
    const doseMeta = doseLevelMeta(person.dose, summary);
    const rank = findDoseRank(person.id);
    const maxDose = safeNumber(summary.maxDose, 0);
    const personDose = safeNumber(person.dose, 0);
    const doseShare = maxDose > 0 ? personDose / maxDose : 0;
    const remainingToPeak = Math.max(0, maxDose - personDose);

    dom.personMonitorBadge.textContent = badgeText;
    dom.personMonitorBadge.className = `mini-badge ${badgeClass}`;
    dom.personMonitorTitle.textContent = `人员 #${person.id}`;
    dom.personMonitorMeta.textContent =
        `楼层 F${person.floor ?? "-"} / 房间 ${person.room ?? "-"} / 区域 ${person.region || "-"} / ` +
        `${personRoleText(person)} / ${personStatusText(person)}`;
    dom.personStatId.textContent = `#${person.id}`;
    dom.personStatFloor.textContent = person.floor == null ? "-" : `F${person.floor}`;
    dom.personStatRoom.textContent = String(person.room ?? "-");
    dom.personStatRegion.textContent = String(person.region ?? "-");
    dom.personStatRole.textContent = personRoleText(person);
    dom.personStatStatus.textContent = personStatusText(person);
    dom.personStatDose.textContent = formatDoseValue(person.dose);
    dom.personStatPos.textContent = formatPersonPosition(person);
    if (dom.personQuickId) {
        dom.personQuickId.textContent = `#${person.id}`;
    }
    if (dom.personQuickStatus) {
        dom.personQuickStatus.textContent = trackingThisPerson ? "跟随中" : personStatusText(person);
    }
    if (dom.personQuickDose) {
        dom.personQuickDose.textContent = formatDoseValue(person.dose, { compact: true });
    }
    dom.personDoseBand.textContent = doseMeta.label;
    dom.personDoseBand.className = `mini-badge ${doseMeta.badge}`;
    dom.personDoseRank.textContent = rank ? `${rank.rank} / ${rank.total}` : "-";
    dom.personDoseShare.textContent = maxDose > 0 ? toPercent(doseShare) : "-";
    if (personDose <= 0) {
        dom.personDoseHint.textContent = "当前尚未累计出可见剂量，后续会随着仿真推进继续更新。";
    } else if (rank?.rank === 1) {
        dom.personDoseHint.textContent = `该个体当前为全体最高剂量对象，累计剂量 ${formatDoseValue(personDose)}。`;
    } else {
        dom.personDoseHint.textContent =
            `当前剂量排名第 ${rank?.rank ?? "-"}，距离当前峰值还差 ${formatDoseValue(remainingToPeak)}。`;
    }
    dom.personFocusBtn.disabled = false;
    dom.personTrackBtn.disabled = false;
    dom.personClearBtn.disabled = false;
    if (dom.personQuickSelect) {
        dom.personQuickSelect.value = String(person.id);
    }
    if (dom.personSearchInput && document.activeElement !== dom.personSearchInput) {
        dom.personSearchInput.value = String(person.id);
    }
}

function renderSettingsStatus(prefs = readSettingsDraft()) {
    if (!dom.settingsStatusTitle || !dom.settingsStatusMeta) {
        return;
    }

    const runtimeLabel = state.runtimeFetchFailed
        ? "离线"
        : runtimeStatusText(normalizeRuntimeStatus(state.runtime?.status));

    state.settingsDirty = isSettingsDirty(prefs);
    dom.settingsStatusTitle.textContent = state.settingsDirty
        ? "当前存在未保存的本地预览设置。"
        : "当前已应用已保存的本地设置。";
    dom.settingsStatusMeta.textContent =
        `主题 ${themeModeLabel(prefs.themeMode)} / 透明度 ${Math.round(prefs.modelOpacity * 100)}% / ` +
        `质量 ${qualityLabel(prefs.renderQuality)} / 采样 ${Number(prefs.samplingSec).toFixed(2)}s / ` +
        `筛选 ${pickFilterText(prefs.pickFilter)} / 跟随 ${trackingModeText(prefs.trackingMode)} / ` +
        `船体 ${prefs.shipVisible ? "显示" : "隐藏"} / 自动切换监控 ${prefs.autoSwitchMonitor ? "开启" : "关闭"}`;
    dom.settingsStatusMeta.textContent += ` / 运行态 ${runtimeLabel}`;
}

function onTurtlesUpdate(event) {
    const turtles = Array.isArray(event.detail?.turtles) ? event.detail.turtles : [];
    const signature = turtleSignature(turtles);
    const changed = signature !== state.lastSignature;
    const summary = summarizeTurtles(turtles);
    const runtimeMode = normalizeRuntimeStatus(state.runtime?.status);
    const runtimeAuthoritative = runtimeMode === "running" || runtimeMode === "paused" || runtimeMode === "completed" || runtimeMode === "error";

    state.turtles = turtles;
    updateRuntimeStats();
    renderPersonMonitor();
    renderLiveTable();

    if (summary.total > 0 && summary.finished === summary.total) {
        if (state.mode !== "completed") {
            ensureRunForHeuristicStart();
            appendCurrentSample(summary, true);
            setMode("completed");
            finalizeCurrentRun("natural_end");
            log("event", "仿真自然结束：所有人员均已完成路径");
            toast("本轮仿真结束");
            if (state.prefs.autoSwitchMonitor) {
                switchPage("monitor");
            }
        }
    } else if (summary.total > 0 && changed) {
        ensureRunForHeuristicStart();
        if (!runtimeAuthoritative && (state.mode === "idle" || state.mode === "completed")) {
            setMode("running");
        }
        state.stableFrames = 0;
    } else if (summary.total > 0 && !changed) {
        state.stableFrames += 1;
        if (!runtimeAuthoritative && state.mode === "running" && state.stableFrames >= 8 && summary.finished < summary.total) {
            setMode("paused");
        }
    }

    if (state.mode === "running" || state.mode === "completed") {
        appendCurrentSample(summary, false);
    }

    state.lastSignature = signature;

    if (state.page === "monitor") {
        renderMonitor();
    }
}

function appendCurrentSample(summary, force) {
    if (!state.currentRun) return;

    const nowSec = state.elapsedMs / 1000;
    const lastSample = state.currentRun.samples[state.currentRun.samples.length - 1];
    if (!force && lastSample && nowSec - lastSample.t < state.prefs.samplingSec) {
        return;
    }

    state.currentRun.samples.push({
        t: Number(nowSec.toFixed(2)),
        avgDose: Number(summary.avgDose.toPrecision(12)),
        maxDose: Number(summary.maxDose.toPrecision(12)),
        totalDose: Number(summary.totalDose.toPrecision(12)),
        evacRate: Number(summary.evacRate.toFixed(4)),
        highDoseCount: summary.highDoseCount,
        active: summary.active,
        finished: summary.finished
    });

    if (state.currentRun.samples.length > 240) {
        state.currentRun.samples.shift();
    }
}

function summarizeTurtles(turtles) {
    const total = turtles.length;
    const finished = turtles.filter((item) => item.finished).length;
    const doses = turtles.map((item) => safeNumber(item.dose, 0));
    const avgDose = total ? doses.reduce((sum, value) => sum + value, 0) / total : 0;
    const maxDose = total ? Math.max(...doses) : 0;
    const totalDose = doses.reduce((sum, value) => sum + value, 0);
    const leaderCount = turtles.filter((item) => item.is_leader).length;
    const active = total - finished;
    const f3 = turtles.filter((item) => !item.finished && Number(item.floor) === 3).length;
    const f2 = turtles.filter((item) => !item.finished && Number(item.floor) === 2).length;
    const f1 = turtles.filter((item) => !item.finished && Number(item.floor) === 1).length;
    const evacRate = total ? finished / total : 0;
    const highestDosePerson = total
        ? turtles.reduce((best, item) => {
            if (!best) {
                return item;
            }
            return safeNumber(item.dose, 0) > safeNumber(best.dose, 0) ? item : best;
        }, null)
        : null;
    const highDoseThreshold = maxDose > 0 ? Math.max(maxDose * 0.72, avgDose * 2.4) : Infinity;
    const highDoseCount = turtles.filter((item) => safeNumber(item.dose, 0) >= highDoseThreshold && safeNumber(item.dose, 0) > 0).length;

    let riskLevel = "LOW";
    if (avgDose > 0.01 || evacRate < 0.15) riskLevel = "HIGH";
    else if (avgDose > 0.001 || evacRate < 0.5) riskLevel = "MEDIUM";

    return {
        total,
        finished,
        active,
        avgDose,
        maxDose,
        totalDose,
        highDoseCount,
        highestDosePerson,
        leaderCount,
        f3,
        f2,
        f1,
        evacRate,
        riskLevel
    };
}

function updateRuntimeStats() {
    const summary = summarizeTurtles(state.turtles);
    dom.statTotal.textContent = String(summary.total);
    if (dom.statActive) {
        dom.statActive.textContent = String(summary.active);
    }
    dom.statFinished.textContent = String(summary.finished);
    if (dom.statEvacRate) {
        dom.statEvacRate.textContent = toPercent(summary.evacRate);
    }
    dom.statAvgDose.textContent = formatDoseValue(summary.avgDose);
    dom.statMaxDose.textContent = formatDoseValue(summary.maxDose);
    if (dom.statTotalDose) {
        dom.statTotalDose.textContent = formatDoseValue(summary.totalDose);
    }
    if (dom.statHighDoseCount) {
        dom.statHighDoseCount.textContent = String(summary.highDoseCount);
    }
    dom.statLeaders.textContent = String(summary.leaderCount);
    dom.statLevel.textContent = summary.riskLevel;
    dom.floorDist.textContent = `F3:${summary.f3} / F2:${summary.f2} / F1:${summary.f1} / Exit:${summary.finished}`;

    if (dom.runtimeFocusHint) {
        const highestDosePerson = summary.highestDosePerson;
        if (!highestDosePerson) {
            dom.runtimeFocusHint.textContent = "等待人员数据...";
        } else {
            dom.runtimeFocusHint.textContent =
                `当前最高剂量人员 #${highestDosePerson.id}，累计剂量 ${formatDoseValue(highestDosePerson.dose)}，` +
                `${highestDosePerson.finished ? "已完成疏散" : `位于 F${highestDosePerson.floor ?? "-"} / 房间 ${highestDosePerson.room ?? "-"}`}。` +
                ` 全体累计剂量 ${formatDoseValue(summary.totalDose)}，高剂量人数 ${summary.highDoseCount}。`;
        }
    }
}

function renderMetaSummary() {
    const meta = state.meta;
    dom.metaSummary.textContent =
        `人数 ${meta.num_persons} / 随机位置 ${meta.random_pos ? "开启" : "关闭"} / ` +
        `领队 ${meta.leader ? "开启" : "关闭"} / 恐慌 ${Number(meta.panic).toFixed(2)} / 速度 ${Number(meta.expV).toFixed(2)} m/s`;
}

function renderMonitor() {
    const summary = summarizeTurtles(state.turtles);
    dom.monitorEvacRate.textContent = toPercent(summary.evacRate);
    dom.monitorActive.textContent = String(summary.active);
    dom.monitorSamples.textContent = String(state.currentRun?.samples.length || 0);
    dom.historyRuns.textContent = String(state.history.length);
    if (dom.monitorAvgDose) {
        dom.monitorAvgDose.textContent = formatDoseValue(summary.avgDose);
    }
    if (dom.monitorMaxDose) {
        dom.monitorMaxDose.textContent = formatDoseValue(summary.maxDose);
    }
    if (dom.monitorTotalDose) {
        dom.monitorTotalDose.textContent = formatDoseValue(summary.totalDose);
    }
    if (dom.monitorHighDoseCount) {
        dom.monitorHighDoseCount.textContent = String(summary.highDoseCount);
    }
    renderLiveTable();
    renderHistoryList();
    renderCharts();
}

function renderLiveTable() {
    if (!state.turtles.length) {
        dom.liveTableBody.innerHTML = '<tr><td colspan="6" class="empty-cell">等待数据…</td></tr>';
        return;
    }

    const summary = summarizeTurtles(state.turtles);
    const selectedPersonId = state.viewerSelection.meta?.type === "person"
        ? Number(state.viewerSelection.meta.personId)
        : NaN;
    const trackingPersonId = state.viewerSelection.trackingPersonId == null
        ? NaN
        : Number(state.viewerSelection.trackingPersonId);

    const rows = state.turtles
        .slice()
        .sort((a, b) => {
            const doseGap = safeNumber(b.dose, 0) - safeNumber(a.dose, 0);
            if (Math.abs(doseGap) > Number.EPSILON) {
                return doseGap;
            }
            return Number(a.id) - Number(b.id);
        })
        .slice(0, 20)
        .map((item) => {
            const personId = Number(item.id);
            const rowClasses = [
                "person-row",
                personId === selectedPersonId ? "selected" : "",
                personId === trackingPersonId ? "tracking" : ""
            ].filter(Boolean).join(" ");
            const doseMeta = doseLevelMeta(item.dose, summary);
            return `
            <tr class="${rowClasses}" data-person-id="${personId}" tabindex="0" title="点击联动到 3D 场景">
                <td>${escapeHtml(String(item.id))}</td>
                <td>${escapeHtml(String(item.floor ?? "-"))}</td>
                <td>${escapeHtml(String(item.room ?? "-"))}</td>
                <td>${escapeHtml(String(item.region ?? "-"))}</td>
                <td class="dose-cell ${doseMeta.cell}">
                    <span class="dose-pill ${doseMeta.cell}">${formatDoseValue(item.dose)}</span>
                </td>
                <td>${item.finished ? "完成" : "运行中"}</td>
            </tr>
        `;
        })
        .join("");

    dom.liveTableBody.innerHTML = rows;
}

function renderHistoryList() {
    if (!dom.historyList) {
        return;
    }

    if (!state.history.length) {
        dom.historyList.innerHTML = '<div class="history-row head"><span>轮次</span><span>结束时间</span><span>人数</span><span>完成率</span><span>剂量</span><span>原因</span></div><div class="history-row"><span>-</span><span>-</span><span>-</span><span>-</span><span>-</span><span>暂无记录</span></div>';
        return;
    }

    const header = '<div class="history-row head"><span>轮次</span><span>结束时间</span><span>人数</span><span>完成率</span><span>剂量</span><span>原因</span></div>';
    const rows = state.history
        .slice(0, 16)
        .map((item) => `
            <div class="history-row">
                <span>#${item.runNo}</span>
                <span>${escapeHtml((item.endedAt || "").slice(11, 19) || "--:--:--")}</span>
                <span>${escapeHtml(String(item.total || 0))}</span>
                <span>${toPercent(Number(item.evacRate) || 0)}</span>
                <span>均 ${formatDoseValue(item.avgDose)} / 峰 ${formatDoseValue(item.maxDose)}</span>
                <span>${escapeHtml(formatRunReason(item.reason || "-"))}</span>
            </div>
        `)
        .join("");

    dom.historyList.innerHTML = header + rows;
}

function formatRunReason(reason) {
    if (reason === "manual_reset") return "手动重置";
    if (reason === "natural_end") return "自然结束";
    return reason;
}

function renderCharts() {
    if (dom.trendChart) {
        drawTrendChart();
    }
}

function drawTrendChart() {
    const samples = state.currentRun?.samples || [];
    const { ctx, width, height } = prepareCanvas(dom.trendChart);
    drawChartBackground(ctx, width, height);

    if (samples.length < 2) {
        drawNoData(ctx, width, height, "等待采样数据");
        return;
    }

    const pad = { left: 42, right: 34, top: 22, bottom: 30 };
    const innerWidth = width - pad.left - pad.right;
    const innerHeight = height - pad.top - pad.bottom;
    const maxTime = Math.max(samples[samples.length - 1].t, 1);
    const maxDose = Math.max(...samples.map((item) => Math.max(Number(item.avgDose) || 0, Number(item.maxDose) || 0)), 0.000001) * 1.12;

    drawGrid(ctx, pad, innerWidth, innerHeight, width, height);
    drawLine(
        ctx,
        samples,
        (point) => pad.left + (point.t / maxTime) * innerWidth,
        (point) => pad.top + innerHeight - (safeNumber(point.avgDose, 0) / maxDose) * innerHeight,
        "#58a6ff",
        2.2
    );
    drawLine(
        ctx,
        samples,
        (point) => pad.left + (point.t / maxTime) * innerWidth,
        (point) => pad.top + innerHeight - (safeNumber(point.maxDose, 0) / maxDose) * innerHeight,
        "#f85149",
        2
    );
    drawLine(
        ctx,
        samples,
        (point) => pad.left + (point.t / maxTime) * innerWidth,
        (point) => pad.top + innerHeight - clamp(safeNumber(point.evacRate, 0), 0, 1) * innerHeight,
        "#d29922",
        2.2
    );

    ctx.fillStyle = chartText();
    ctx.font = '12px "Space Grotesk", "Noto Sans SC", sans-serif';
    ctx.fillText("本轮趋势: 平均剂量 / 最高剂量 / 完成率", pad.left, 14);
}

function prepareCanvas(canvas) {
    const ratio = Math.max(1, window.devicePixelRatio || 1);
    const width = canvas.clientWidth || 520;
    const height = canvas.clientHeight || 240;
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    const ctx = canvas.getContext("2d");
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    return { ctx, width, height };
}

function drawChartBackground(ctx, width, height) {
    ctx.clearRect(0, 0, width, height);
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    if (document.body.dataset.theme === "night") {
        gradient.addColorStop(0, "rgba(22, 27, 34, 0.98)");
        gradient.addColorStop(1, "rgba(13, 17, 23, 0.98)");
    } else {
        gradient.addColorStop(0, "rgba(248, 250, 252, 0.96)");
        gradient.addColorStop(1, "rgba(239, 244, 248, 0.96)");
    }
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
}

function drawGrid(ctx, pad, innerWidth, innerHeight, width, height) {
    ctx.strokeStyle = document.body.dataset.theme === "night" ? "rgba(48, 54, 61, 0.9)" : "rgba(208, 215, 222, 0.9)";
    ctx.lineWidth = 1;

    for (let i = 0; i <= 4; i += 1) {
        const y = pad.top + (innerHeight / 4) * i;
        ctx.beginPath();
        ctx.moveTo(pad.left, y);
        ctx.lineTo(width - pad.right, y);
        ctx.stroke();
    }

    for (let i = 0; i <= 4; i += 1) {
        const x = pad.left + (innerWidth / 4) * i;
        ctx.beginPath();
        ctx.moveTo(x, pad.top);
        ctx.lineTo(x, height - pad.bottom);
        ctx.stroke();
    }
}

function drawLine(ctx, points, getX, getY, color, lineWidth) {
    ctx.beginPath();
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = color;
    points.forEach((point, index) => {
        const x = getX(point);
        const y = getY(point);
        if (index === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    });
    ctx.stroke();
}

function drawNoData(ctx, width, height, label) {
    ctx.fillStyle = chartText();
    ctx.font = '13px "Noto Sans SC", sans-serif';
    ctx.textAlign = "center";
    ctx.fillText(label, width / 2, height / 2);
    ctx.textAlign = "left";
}

function chartText() {
    return document.body.dataset.theme === "night" ? "#c9d1d9" : "#1f2328";
}

function renderLogs() {
    const filter = dom.logFilter.value;
    const items = filter === "all" ? state.logs : state.logs.filter((item) => item.type === filter);
    renderLogSummary();

    if (!items.length) {
        dom.logList.innerHTML = '<div class="log-item"><span class="log-time">--:--:--</span>暂无日志</div>';
        return;
    }

    dom.logList.innerHTML = items
        .map((item) => `
            <div class="log-item ${item.type}">
                <span class="log-time">[${escapeHtml(item.time)}]</span>${escapeHtml(item.message)}
            </div>
        `)
        .join("");
}

function renderLogSummary() {
    if (!dom.logCountAll) {
        return;
    }

    const eventCount = state.logs.filter((item) => item.type === "event").length;
    const warnCount = state.logs.filter((item) => item.type === "warn").length;
    const errorCount = state.logs.filter((item) => item.type === "error").length;
    const lastTime = state.logs[0]?.time || "--:--:--";

    dom.logCountAll.textContent = String(state.logs.length);
    dom.logCountEvent.textContent = String(eventCount);
    dom.logCountWarn.textContent = String(warnCount);
    dom.logCountError.textContent = String(errorCount);
    dom.logLastTime.textContent = lastTime;
}

function clearLogs() {
    state.logs = [];
    renderLogs();
    toast("日志已清空");
}

function syncHistoryClearButton() {
    if (!dom.clearHistoryBtn) {
        return;
    }

    dom.clearHistoryBtn.textContent = state.historyClearConfirming ? "再次确认清除" : "清除历史数据";
    dom.clearHistoryBtn.classList.toggle("danger", state.historyClearConfirming);
}

function cancelHistoryClearConfirmation() {
    if (state.historyClearTimer) {
        window.clearTimeout(state.historyClearTimer);
        state.historyClearTimer = null;
    }
    state.historyClearConfirming = false;
    syncHistoryClearButton();
}

function handleClearHistoryClick() {
    if (!state.history.length) {
        toast("暂无可清除的历史数据");
        return;
    }

    if (!state.historyClearConfirming) {
        state.historyClearConfirming = true;
        syncHistoryClearButton();
        state.historyClearTimer = window.setTimeout(() => {
            cancelHistoryClearConfirmation();
        }, 4000);
        toast("再次点击“清除历史数据”以确认");
        return;
    }

    clearHistoryRecords();
}

function clearHistoryRecords() {
    cancelHistoryClearConfirmation();
    state.history = [];
    if (state.currentRun) {
        state.currentRun.runNo = 1;
        state.nextRunNo = 2;
    } else {
        state.nextRunNo = 1;
    }
    saveHistory();
    renderMonitor();
    renderHistoryList();
    renderCharts();
    log("event", "已清除本地历史模拟数据");
    toast("历史数据已清除");
}

function exportLogs() {
    const content = state.logs
        .map((item) => `[${item.time}] [${item.type.toUpperCase()}] ${item.message}`)
        .join("\n");
    downloadText(`helloworld-console-logs-${timestampForFilename()}.txt`, content || "No logs");
    toast("日志已导出");
}

function log(type, message) {
    state.logs.unshift({
        type,
        message,
        time: new Date().toLocaleTimeString("zh-CN", { hour12: false })
    });

    if (state.logs.length > 240) {
        state.logs.length = 240;
    }

    if (state.page === "logs") {
        renderLogs();
    }

    renderLogSummary();
}

function turtleSignature(turtles) {
    return turtles
        .slice(0, 24)
        .map((item) => {
            const dose = safeNumber(item.dose, 0);
            return `${item.id}:${item.finished ? 1 : 0}:${(item.pos || []).join(",")}:${dose.toPrecision(6)}`;
        })
        .join("|");
}

function safeNumber(value, fallback) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function formatClock(totalSeconds) {
    const seconds = Math.max(0, Math.round(totalSeconds));
    const mins = String(Math.floor(seconds / 60)).padStart(2, "0");
    const secs = String(seconds % 60).padStart(2, "0");
    return `${mins}:${secs}`;
}

function timestampForFilename(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hour = String(date.getHours()).padStart(2, "0");
    const minute = String(date.getMinutes()).padStart(2, "0");
    const second = String(date.getSeconds()).padStart(2, "0");
    return `${year}${month}${day}-${hour}${minute}${second}`;
}

function toPercent(value) {
    return `${(clamp(value, 0, 1) * 100).toFixed(1)}%`;
}

function escapeHtml(text) {
    return String(text)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

function toast(message) {
    dom.toast.textContent = message;
    dom.toast.classList.remove("hidden");
    clearTimeout(toast.timer);
    toast.timer = window.setTimeout(() => {
        dom.toast.classList.add("hidden");
    }, 1600);
}

function downloadText(filename, content) {
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
}
