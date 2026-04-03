import * as THREE from "three";
import { initScene } from "./core/scene.js";
import { initCamera } from "./core/camera.js";
import { initRenderer } from "./core/renderer.js";
import { initControls } from "./core/controls.js";
import { fetchTurtles, makePersonMesh, updatePersonMesh } from "./people/person.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

let scene;
let camera;
let renderer;
let controls;
let container;
let personsMap = new Map();
let gltfModel;
let shipLoadPromise = null;
let modelOpacity = 0.35;
let renderQuality = "high";
let shipVisible = true;
let latestTurtles = [];
let latestTurtlesSignature = "";
let suppressedSignature = null;
let selectedObject = null;
let hoveredObject = null;
let pickFilter = "all";
let trackingMode = "orbit";
let trackingPersonId = null;
let trackingAnchor = null;

const trackingOffset = new THREE.Vector3(14, 10, 16);
const trackingHeading = new THREE.Vector3(0, 0, 1);
const defaultCameraPosition = new THREE.Vector3();
const defaultControlsTarget = new THREE.Vector3();
const inspectorDom = {};

const MODEL_URL = "/static/gltf/703a14c77b9443808eb0548316fe4fc6.gltf";
const MODEL_ROTATE_Y = -Math.PI / 2;
const MODEL_SCALE_MULTIPLIER = 30.0;
const FIXED_MODEL_SCALE = {
    x: 0.83,
    y: 1.0,
    z: 0.70
};
const PICK_FILTER_LABEL = {
    all: "全部对象",
    person: "人物",
    room: "房间",
    task: "任务对象",
    other: "其他对象"
};
const TRACKING_MODE_LABEL = {
    orbit: "自由跟随",
    lock: "固定跟随",
    third: "第三人称跟随"
};
const raycaster = new THREE.Raycaster();
const pointerNdc = new THREE.Vector2();
const tempColor = new THREE.Color();
const tempVec3 = new THREE.Vector3();
const clickableObjects = [];
const pointerState = { downX: 0, downY: 0, downTime: 0 };
const SELECTION_TINT = {
    person: new THREE.Color(0xff8a3c),
    room: new THREE.Color(0x2ca2ff),
    task: new THREE.Color(0xf6cb49),
    other: new THREE.Color(0x9f7aea)
};

function normalizePickFilter(value) {
    return value === "person" || value === "room" || value === "task" || value === "other" ? value : "all";
}

function normalizeTrackingMode(value) {
    return value === "lock" || value === "third" ? value : "orbit";
}

function pickFilterLabel(value = pickFilter) {
    const key = normalizePickFilter(value);
    return PICK_FILTER_LABEL[key] || PICK_FILTER_LABEL.all;
}

function trackingModeLabel(value = trackingMode) {
    const key = normalizeTrackingMode(value);
    return TRACKING_MODE_LABEL[key] || TRACKING_MODE_LABEL.orbit;
}

function updateViewerStatus(message) {
    const statusEl = document.getElementById("viewer-status");
    if (statusEl) {
        statusEl.textContent = message;
    }
    window.dispatchEvent(new CustomEvent("helloworld:viewer-status", {
        detail: { message }
    }));
}

function cacheInspectorDom() {
    inspectorDom.title = document.getElementById("selectionTitle");
    inspectorDom.meta = document.getElementById("selectionMeta");
    inspectorDom.clearBtn = document.getElementById("clearSelectionBtn");
    inspectorDom.pickFilterSelect = document.getElementById("pickFilterSelect");
    inspectorDom.trackingModeSelect = document.getElementById("trackingModeSelect");
    inspectorDom.resetViewBtn = document.getElementById("resetViewBtn");
    inspectorDom.focusBtn = document.getElementById("focusSelectionBtn");
    inspectorDom.trackBtn = document.getElementById("trackBtn");
    inspectorDom.stopTrackBtn = document.getElementById("stopTrackBtn");
}

function getPickCategory(meta) {
    if (!meta) return "other";
    if (meta.type === "person") return "person";
    if (meta.type === "room") return "room";
    if (meta.type === "task") return "task";
    return "other";
}

function selectionTintForMesh(mesh) {
    const meta = mesh?.userData?.pickMeta;
    const category = getPickCategory(meta);
    return SELECTION_TINT[category] || SELECTION_TINT.other;
}

function isMeshPickableByFilter(mesh) {
    const filter = normalizePickFilter(pickFilter);
    if (filter === "all") return true;
    return getPickCategory(mesh?.userData?.pickMeta) === filter;
}

function getMeshWorldPosition(mesh) {
    return mesh.getWorldPosition(new THREE.Vector3());
}

function getSelectedPersonMesh() {
    const personId = selectedObject?.mesh?.userData?.pickMeta?.personId;
    if (personId == null) {
        return null;
    }
    return personsMap.get(personId) || null;
}

function getTrackedPersonMesh() {
    if (trackingPersonId == null) {
        return null;
    }
    return personsMap.get(trackingPersonId) || null;
}

function dispatchSelectionChange(meta) {
    window.dispatchEvent(new CustomEvent("helloworld:selection-change", {
        detail: {
            selected: Boolean(selectedObject),
            meta,
            pickFilter,
            pickFilterLabel: pickFilterLabel(),
            trackingMode,
            trackingModeLabel: trackingModeLabel(),
            trackingPersonId,
            trackingActive: trackingPersonId != null,
            canTrack: meta?.type === "person"
        }
    }));
}

function syncSelectionPanel() {
    const meta = selectedObject?.mesh?.userData?.pickMeta || null;
    const category = getPickCategory(meta);
    const isPerson = meta?.type === "person";
    const trackedHere = isPerson && trackingPersonId === meta.personId;

    if (inspectorDom.title) {
        inspectorDom.title.textContent = meta?.title || "未选择对象";
    }

    if (inspectorDom.meta) {
        if (!meta) {
            inspectorDom.meta.textContent = `点击场景中的房间、楼梯、舱门、反应堆或人员查看详细信息 | 当前筛选: ${pickFilterLabel()}`;
        } else {
            const parts = [
                meta.detail || "对象信息暂不可用",
                `类别 ${PICK_FILTER_LABEL[category] || category}`,
                `筛选 ${pickFilterLabel()}`
            ];
            if (trackedHere) {
                parts.push(`追踪中(${trackingModeLabel()})`);
            } else if (trackingPersonId != null) {
                parts.push(`当前有其他追踪对象 #${trackingPersonId}`);
            }
            inspectorDom.meta.textContent = parts.join(" | ");
        }
    }

    if (inspectorDom.clearBtn) {
        inspectorDom.clearBtn.disabled = !selectedObject;
    }
    if (inspectorDom.focusBtn) {
        inspectorDom.focusBtn.disabled = !selectedObject;
    }
    if (inspectorDom.trackBtn) {
        inspectorDom.trackBtn.disabled = !isPerson;
    }
    if (inspectorDom.stopTrackBtn) {
        inspectorDom.stopTrackBtn.disabled = trackingPersonId == null;
    }
    if (inspectorDom.pickFilterSelect && inspectorDom.pickFilterSelect.value !== pickFilter) {
        inspectorDom.pickFilterSelect.value = pickFilter;
    }
    if (inspectorDom.trackingModeSelect && inspectorDom.trackingModeSelect.value !== trackingMode) {
        inspectorDom.trackingModeSelect.value = trackingMode;
    }

    dispatchSelectionChange(meta);
}

function applySelectionStyle(material, tint, pulse) {
    if (!material || !tint) {
        return;
    }

    const backup = material.userData?._selBackup;
    if (material.color && backup?.colorHex != null) {
        tempColor.setHex(backup.colorHex);
        const blend = 0.18 + pulse * 0.3;
        material.color.copy(tempColor).lerp(tint, blend);
    }
    if (material.emissive) {
        const baseIntensity = typeof backup?.emissiveIntensity === "number" ? backup.emissiveIntensity : 0;
        material.emissive.copy(tint);
        material.emissiveIntensity = Math.max(0.1, baseIntensity * 0.6 + 0.22 + pulse * 0.28);
    }
}

function applyHoverStyle(material, tint) {
    if (!material || !tint) {
        return;
    }

    const backup = material.userData?._hoverBackup;
    if (material.color && backup?.colorHex != null) {
        tempColor.setHex(backup.colorHex);
        material.color.copy(tempColor).lerp(tint, 0.12);
    }
    if (material.emissive) {
        material.emissive.copy(tint);
        material.emissiveIntensity = Math.max(0.08, (backup?.emissiveIntensity || 0) * 0.35 + 0.12);
    }
}

function highlightMesh(mesh, active) {
    if (!mesh || !mesh.material) {
        return;
    }

    const list = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    const tint = selectionTintForMesh(mesh);

    for (const material of list) {
        if (!material) {
            continue;
        }

        if (!material.userData) {
            material.userData = {};
        }

        if (active) {
            if (!material.userData._selBackup) {
                material.userData._selBackup = {
                    colorHex: material.color ? material.color.getHex() : null,
                    emissiveHex: material.emissive ? material.emissive.getHex() : null,
                    emissiveIntensity: typeof material.emissiveIntensity === "number" ? material.emissiveIntensity : 0
                };
            }

            material.userData._selActive = true;
            applySelectionStyle(material, tint, 0.5);
            continue;
        }

        material.userData._selActive = false;
        const backup = material.userData._selBackup;
        if (!backup) {
            continue;
        }
        if (material.color && backup.colorHex != null) {
            material.color.setHex(backup.colorHex);
        }
        if (material.emissive && backup.emissiveHex != null) {
            material.emissive.setHex(backup.emissiveHex);
        }
        if (material.emissive) {
            material.emissiveIntensity = typeof backup.emissiveIntensity === "number" ? backup.emissiveIntensity : 0;
        }
    }
}

function hoverMesh(mesh, active) {
    if (!mesh || !mesh.material || mesh === selectedObject?.mesh) {
        return;
    }

    const list = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    const tint = selectionTintForMesh(mesh);

    for (const material of list) {
        if (!material) {
            continue;
        }

        if (!material.userData) {
            material.userData = {};
        }

        if (active) {
            if (!material.userData._hoverBackup) {
                material.userData._hoverBackup = {
                    colorHex: material.color ? material.color.getHex() : null,
                    emissiveHex: material.emissive ? material.emissive.getHex() : null,
                    emissiveIntensity: typeof material.emissiveIntensity === "number" ? material.emissiveIntensity : 0
                };
            }

            material.userData._hoverActive = true;
            applyHoverStyle(material, tint);
            continue;
        }

        material.userData._hoverActive = false;
        const backup = material.userData._hoverBackup;
        if (!backup) {
            continue;
        }
        if (material.color && backup.colorHex != null) {
            material.color.setHex(backup.colorHex);
        }
        if (material.emissive && backup.emissiveHex != null) {
            material.emissive.setHex(backup.emissiveHex);
        }
        if (material.emissive) {
            material.emissiveIntensity = typeof backup.emissiveIntensity === "number" ? backup.emissiveIntensity : 0;
        }
    }
}

function setHoveredObject(mesh) {
    if (hoveredObject?.mesh === mesh) {
        return;
    }

    if (hoveredObject?.mesh) {
        hoverMesh(hoveredObject.mesh, false);
    }

    hoveredObject = mesh ? { mesh } : null;

    if (hoveredObject?.mesh) {
        hoverMesh(hoveredObject.mesh, true);
    }
}

function setSelectedObject(mesh) {
    if (selectedObject?.mesh === mesh) {
        syncSelectionPanel();
        return;
    }

    if (hoveredObject?.mesh === mesh) {
        setHoveredObject(null);
    }

    if (selectedObject?.mesh) {
        highlightMesh(selectedObject.mesh, false);
    }

    selectedObject = mesh ? { mesh } : null;

    if (selectedObject?.mesh) {
        highlightMesh(selectedObject.mesh, true);
    }

    syncSelectionPanel();
}

function clearSelectedObject() {
    if (selectedObject?.mesh) {
        highlightMesh(selectedObject.mesh, false);
    }
    selectedObject = null;
    syncSelectionPanel();
}

function unregisterClickable(mesh) {
    const index = clickableObjects.indexOf(mesh);
    if (index >= 0) {
        clickableObjects.splice(index, 1);
    }
    if (hoveredObject?.mesh === mesh) {
        setHoveredObject(null);
    }
    if (selectedObject?.mesh === mesh) {
        clearSelectedObject();
    }
}

function registerClickable(mesh, meta = null) {
    if (!mesh?.isObject3D) {
        return mesh;
    }

    mesh.userData = {
        ...mesh.userData,
        clickable: true,
        pickMeta: meta || mesh.userData?.pickMeta || null
    };

    if (!clickableObjects.includes(mesh)) {
        clickableObjects.push(mesh);
    }

    return mesh;
}

function resolveClickableAncestor(obj) {
    let current = obj;
    while (current) {
        if (current.userData?.clickable) {
            return current;
        }
        current = current.parent;
    }
    return null;
}

function findPickedMesh(evt) {
    if (!renderer || clickableObjects.length === 0) {
        return null;
    }

    const rect = renderer.domElement.getBoundingClientRect();
    pointerNdc.x = ((evt.clientX - rect.left) / rect.width) * 2 - 1;
    pointerNdc.y = -((evt.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(pointerNdc, camera);
    const hits = raycaster.intersectObjects(clickableObjects, true);

    if (hits.length === 0) {
        return null;
    }

    for (const hit of hits) {
        const picked = resolveClickableAncestor(hit.object);
        if (!picked) {
            continue;
        }
        if (!isMeshPickableByFilter(picked)) {
            continue;
        }
        return picked;
    }

    return null;
}

function pickSceneObject(evt) {
    const picked = findPickedMesh(evt);
    if (!picked) {
        clearSelectedObject();
        return;
    }

    setHoveredObject(null);
    setSelectedObject(picked);
}

function previewSceneObject(evt) {
    if ((evt.buttons & 1) === 1) {
        setHoveredObject(null);
        return;
    }

    const picked = findPickedMesh(evt);
    if (!picked || picked === selectedObject?.mesh) {
        setHoveredObject(null);
        return;
    }

    setHoveredObject(picked);
}

function onViewerPointerLeave() {
    setHoveredObject(null);
}

function onViewerKeydown(evt) {
    const activeEl = document.activeElement;
    const tagName = activeEl?.tagName?.toLowerCase();
    const inFormField = tagName === "input" || tagName === "select" || tagName === "textarea" || activeEl?.isContentEditable;
    if (inFormField) {
        return;
    }

    if (evt.code === "Escape") {
        evt.preventDefault();
        stopTracking({ silent: false });
        clearSelectedObject();
        setHoveredObject(null);
        return;
    }

    if (evt.code === "KeyF" && selectedObject?.mesh) {
        evt.preventDefault();
        focusSelected(true);
        return;
    }

    if (evt.code === "KeyR") {
        evt.preventDefault();
        resetCameraView(true);
    }
}

function rememberDefaultView() {
    if (!camera || !controls) {
        return;
    }

    defaultCameraPosition.copy(camera.position);
    defaultControlsTarget.copy(controls.target);
}

function resetCameraView(immediate = true) {
    if (!camera || !controls) {
        return false;
    }

    stopTracking({ silent: true });
    if (immediate) {
        camera.position.copy(defaultCameraPosition);
        controls.target.copy(defaultControlsTarget);
    } else {
        camera.position.lerp(defaultCameraPosition, 0.85);
        controls.target.lerp(defaultControlsTarget, 0.85);
    }
    controls.update();
    return true;
}

function selectPersonById(personId, options = {}) {
    const normalizedId = Number(personId);
    const mesh = personsMap.get(normalizedId);
    if (!mesh) {
        return false;
    }

    setHoveredObject(null);
    setSelectedObject(mesh);
    if (options.focus) {
        focusCameraOnMesh(mesh, true);
    }
    if (options.track) {
        return startTrackingPersonById(normalizedId);
    }
    return true;
}

function onViewerPointerDown(evt) {
    if (evt.button !== 0) {
        return;
    }

    pointerState.downX = evt.clientX;
    pointerState.downY = evt.clientY;
    pointerState.downTime = performance.now();
}

function onViewerPointerUp(evt) {
    if (evt.button !== 0) {
        return;
    }

    const dx = Math.abs(evt.clientX - pointerState.downX);
    const dy = Math.abs(evt.clientY - pointerState.downY);
    const dt = performance.now() - pointerState.downTime;

    if (dx > 6 || dy > 6 || dt > 320) {
        return;
    }

    pickSceneObject(evt);
}

function focusCameraOnMesh(mesh, immediate = false) {
    if (!mesh || !camera || !controls) {
        return false;
    }

    const box = new THREE.Box3().setFromObject(mesh);
    const target = box.isEmpty() ? getMeshWorldPosition(mesh) : box.getCenter(new THREE.Vector3());
    const size = box.isEmpty() ? new THREE.Vector3(1, 1, 1) : box.getSize(new THREE.Vector3());
    const radius = Math.max(size.length() * 0.42, 1.8);

    const direction = camera.position.clone().sub(controls.target);
    if (direction.lengthSq() < 1e-6) {
        direction.set(1.8, 1.15, 1.8);
    }
    direction.normalize();

    const desiredTarget = target.clone();
    const desiredCamera = desiredTarget.clone()
        .addScaledVector(direction, radius * 3.2)
        .add(new THREE.Vector3(0, radius * 0.8, 0));

    if (immediate) {
        controls.target.copy(desiredTarget);
        camera.position.copy(desiredCamera);
    } else {
        controls.target.lerp(desiredTarget, 0.85);
        camera.position.lerp(desiredCamera, 0.85);
    }

    controls.update();
    return true;
}

function focusSelected(immediate = false) {
    if (!selectedObject?.mesh) {
        return false;
    }
    return focusCameraOnMesh(selectedObject.mesh, immediate);
}

function seedTrackingHeading(target) {
    const camForward = target.clone().sub(camera.position);
    camForward.y = 0;
    if (camForward.lengthSq() > 1e-6) {
        trackingHeading.copy(camForward.normalize());
    }
}

function updateTrackingHeading(target) {
    if (!trackingAnchor) {
        trackingAnchor = target.clone();
        return;
    }

    const delta = target.clone().sub(trackingAnchor);
    delta.y = 0;
    if (delta.lengthSq() > 1e-6) {
        trackingHeading.lerp(delta.normalize(), 0.18).normalize();
    }
}

function stopTracking(options = {}) {
    const { silent = false } = options;
    const oldId = trackingPersonId;

    trackingPersonId = null;
    trackingAnchor = null;

    if (!silent && oldId != null) {
        window.dispatchEvent(new CustomEvent("helloworld:tracking-change", {
            detail: {
                trackingActive: false,
                trackingPersonId: oldId,
                trackingMode
            }
        }));
    }

    syncSelectionPanel();
}

function startTrackingPersonById(personId) {
    const normalizedId = Number(personId);
    const mesh = personsMap.get(normalizedId);
    if (!mesh) {
        return false;
    }

    focusCameraOnMesh(mesh, true);
    const target = getMeshWorldPosition(mesh);
    trackingPersonId = normalizedId;
    trackingAnchor = target.clone();
    trackingOffset.copy(camera.position).sub(target);
    if (trackingOffset.lengthSq() < 1e-6) {
        trackingOffset.set(14, 10, 16);
    }
    seedTrackingHeading(target);
    syncSelectionPanel();

    window.dispatchEvent(new CustomEvent("helloworld:tracking-change", {
        detail: {
            trackingActive: true,
            trackingPersonId: normalizedId,
            trackingMode
        }
    }));

    return true;
}

function startTrackingSelected() {
    const personId = selectedObject?.mesh?.userData?.pickMeta?.personId;
    if (personId == null) {
        return false;
    }
    return startTrackingPersonById(personId);
}

function setPickFilter(value) {
    pickFilter = normalizePickFilter(value);
    if (selectedObject?.mesh && !isMeshPickableByFilter(selectedObject.mesh)) {
        clearSelectedObject();
        return;
    }
    syncSelectionPanel();
}

function setTrackingMode(value) {
    trackingMode = normalizeTrackingMode(value);

    if (trackingPersonId != null) {
        const mesh = getTrackedPersonMesh();
        if (mesh) {
            const target = getMeshWorldPosition(mesh);
            trackingAnchor = target.clone();
            if (trackingMode === "lock") {
                trackingOffset.copy(camera.position).sub(target);
            } else if (trackingMode === "third") {
                seedTrackingHeading(target);
            }
        }
    }

    syncSelectionPanel();
}

function updateTrackingCamera() {
    if (trackingPersonId == null) {
        return;
    }

    const mesh = getTrackedPersonMesh();
    if (!mesh) {
        stopTracking({ silent: true });
        return;
    }

    const target = getMeshWorldPosition(mesh);

    if (trackingMode === "third") {
        updateTrackingHeading(target);

        const forward = trackingHeading.lengthSq() > 1e-6
            ? trackingHeading.clone().normalize()
            : new THREE.Vector3(0, 0, 1);
        const up = new THREE.Vector3(0, 1, 0);
        const side = new THREE.Vector3().crossVectors(up, forward);

        if (side.lengthSq() > 1e-6) {
            side.normalize();
        } else {
            side.set(1, 0, 0);
        }

        const focus = target.clone()
            .addScaledVector(forward, 1.2)
            .addScaledVector(up, 1.25);
        const desiredCamera = focus.clone()
            .addScaledVector(forward, -6.8)
            .addScaledVector(side, 1.05)
            .addScaledVector(up, 1.75);

        controls.target.lerp(focus, 0.24);
        camera.position.lerp(desiredCamera, 0.2);
        trackingAnchor = target.clone();
        return;
    }

    if (trackingMode === "lock") {
        controls.target.lerp(target, 0.18);
        camera.position.lerp(target.clone().add(trackingOffset), 0.14);
        trackingAnchor = target.clone();
        return;
    }

    if (!trackingAnchor) {
        trackingAnchor = target.clone();
        return;
    }

    tempVec3.copy(target).sub(trackingAnchor);
    if (tempVec3.lengthSq() > 1e-6) {
        controls.target.add(tempVec3);
        camera.position.add(tempVec3);
        trackingAnchor.copy(target);
    }
}

function bindViewerInteraction() {
    if (!renderer?.domElement) {
        return;
    }

    cacheInspectorDom();

    renderer.domElement.addEventListener("pointerdown", onViewerPointerDown);
    renderer.domElement.addEventListener("pointermove", previewSceneObject);
    renderer.domElement.addEventListener("pointerup", onViewerPointerUp);
    renderer.domElement.addEventListener("pointerleave", onViewerPointerLeave);
    document.addEventListener("keydown", onViewerKeydown);
    inspectorDom.clearBtn?.addEventListener("click", clearSelectedObject);
    inspectorDom.resetViewBtn?.addEventListener("click", () => {
        resetCameraView(true);
    });
    inspectorDom.focusBtn?.addEventListener("click", () => {
        focusSelected(true);
    });
    inspectorDom.trackBtn?.addEventListener("click", startTrackingSelected);
    inspectorDom.stopTrackBtn?.addEventListener("click", () => {
        stopTracking();
    });

    syncSelectionPanel();
}

function renderSelectionPulse(now) {
    const mesh = selectedObject?.mesh;
    if (!mesh || !mesh.material) {
        return;
    }

    const tint = selectionTintForMesh(mesh);
    const pulse = 0.5 + 0.5 * Math.sin(now * 0.0085);
    const list = Array.isArray(mesh.material) ? mesh.material : [mesh.material];

    for (const material of list) {
        if (!material?.userData?._selActive) {
            continue;
        }
        applySelectionStyle(material, tint, pulse);
    }
}

function applyModelTransform() {
    if (!gltfModel) {
        return;
    }
    gltfModel.position.set(0, -1, 0);
    gltfModel.rotation.y = MODEL_ROTATE_Y;
    gltfModel.scale.set(
        MODEL_SCALE_MULTIPLIER * FIXED_MODEL_SCALE.x,
        MODEL_SCALE_MULTIPLIER * FIXED_MODEL_SCALE.y,
        MODEL_SCALE_MULTIPLIER * FIXED_MODEL_SCALE.z
    );
}

function applyModelOpacity() {
    if (!gltfModel) {
        return;
    }

    gltfModel.traverse((child) => {
        if (!child.isMesh || !child.material) {
            return;
        }

        const materials = Array.isArray(child.material) ? child.material : [child.material];
        for (const material of materials) {
            material.transparent = true;
            material.opacity = modelOpacity;
            material.needsUpdate = true;
        }
    });
}

function applyShipVisibility() {
    if (!gltfModel) {
        return;
    }
    gltfModel.visible = shipVisible;
}

async function setShipVisible(value) {
    shipVisible = !!value;

    if (!shipVisible) {
        applyShipVisibility();
        updateViewerStatus("Ship Hidden");
        return false;
    }

    try {
        await ensureGltfModelLoaded();
        applyShipVisibility();
        updateViewerStatus("3D Simulation");
        return true;
    } catch (error) {
        console.error("setShipVisible failed:", error);
        return false;
    }
}

function qualityMultiplier() {
    if (renderQuality === "low") return 0.75;
    if (renderQuality === "medium") return 1.0;
    return 1.25;
}

function applyRenderQuality() {
    if (!renderer || !container) {
        return;
    }
    renderer.setPixelRatio(Math.max(1, window.devicePixelRatio || 1) * qualityMultiplier());
    renderer.setSize(container.clientWidth, container.clientHeight);
}

function turtlesSignature(turtles) {
    return turtles
        .slice(0, 24)
        .map((item) => `${item.id}:${item.finished ? 1 : 0}:${(item.pos || []).join(",")}`)
        .join("|");
}

function clearPersonsVisuals(markSuppressed) {
    if (markSuppressed) {
        suppressedSignature = latestTurtlesSignature || suppressedSignature;
    }

    for (const mesh of personsMap.values()) {
        unregisterClickable(mesh);
        scene.remove(mesh);
    }

    personsMap.clear();
    latestTurtles = [];
    latestTurtlesSignature = "";
    stopTracking({ silent: true });

    window.dispatchEvent(new CustomEvent("helloworld:turtles-update", {
        detail: { turtles: [] }
    }));
}

function exposeViewerApi() {
    window.helloWorldViewer = {
        setShipVisible(value) {
            return setShipVisible(value);
        },
        setModelOpacity(value) {
            modelOpacity = Math.max(0.05, Math.min(1.0, Number(value) || 0.35));
            applyModelOpacity();
        },
        setRenderQuality(value) {
            renderQuality = value === "low" || value === "medium" ? value : "high";
            applyRenderQuality();
        },
        setPickFilter(value) {
            setPickFilter(value);
        },
        setTrackingMode(value) {
            setTrackingMode(value);
        },
        clearPersons(markSuppressed = false) {
            clearPersonsVisuals(markSuppressed);
        },
        clearSelection() {
            clearSelectedObject();
        },
        resetCameraView(immediate = true) {
            return resetCameraView(immediate);
        },
        focusSelected(immediate = false) {
            return focusSelected(immediate);
        },
        selectPersonById(personId, options = {}) {
            return selectPersonById(personId, options);
        },
        startTrackingSelected() {
            return startTrackingSelected();
        },
        stopTracking() {
            stopTracking();
        },
        getLatestTurtles() {
            return latestTurtles.slice();
        },
        getSelectedMeta() {
            return selectedObject?.mesh?.userData?.pickMeta || null;
        },
        getTrackingState() {
            return {
                trackingActive: trackingPersonId != null,
                trackingPersonId,
                trackingMode
            };
        }
    };

    window.dispatchEvent(new CustomEvent("helloworld:viewer-ready"));
}

async function loadGltfModel() {
    updateViewerStatus("Loading glTF...");

    return new Promise((resolve, reject) => {
        const loader = new GLTFLoader();

        loader.load(
            MODEL_URL,
            (gltf) => {
                gltfModel = gltf.scene;
                gltfModel.name = "main-gltf-model";

                gltfModel.traverse((child) => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                });

                scene.add(gltfModel);
                applyModelTransform();
                applyModelOpacity();
                applyShipVisibility();
                updateViewerStatus(shipVisible ? "3D Simulation" : "Ship Hidden");
                resolve(gltfModel);
            },
            undefined,
            (error) => {
                console.error("loadGltfModel failed:", error);
                updateViewerStatus("glTF Load Failed");
                reject(error);
            }
        );
    });
}

function ensureGltfModelLoaded() {
    if (gltfModel) {
        return Promise.resolve(gltfModel);
    }
    if (!shipLoadPromise) {
        shipLoadPromise = loadGltfModel()
            .finally(() => {
                shipLoadPromise = null;
            });
    }
    return shipLoadPromise;
}

async function init() {
    const sceneData = await initScene(registerClickable);
    scene = sceneData.scene;
    personsMap = sceneData.personsMap;

    container = document.getElementById("viewer");
    camera = initCamera(container);
    renderer = initRenderer("viewer");
    applyRenderQuality();

    controls = initControls(camera, renderer);
    rememberDefaultView();
    bindViewerInteraction();

    window.addEventListener("resize", onWindowResize);

    setInterval(refreshPosition, 100);
    exposeViewerApi();
    queueMicrotask(() => {
        const shipToggle = document.getElementById("shipVisibleToggle");
        void setShipVisible(shipToggle ? shipToggle.checked : shipVisible);
    });
    animate();
}

async function refreshPosition() {
    try {
        const turtles = await fetchTurtles();
        const signature = turtlesSignature(turtles);

        if (suppressedSignature && signature === suppressedSignature) {
            window.dispatchEvent(new CustomEvent("helloworld:turtles-update", {
                detail: { turtles: [] }
            }));
            return;
        }

        suppressedSignature = null;
        const existingIds = new Set(personsMap.keys());

        for (const turtle of turtles) {
            if (personsMap.has(turtle.id)) {
                const mesh = personsMap.get(turtle.id);
                updatePersonMesh(mesh, turtle);
                registerClickable(mesh, mesh.userData?.pickMeta);
            } else {
                const person = makePersonMesh(turtle);
                scene.add(person);
                personsMap.set(turtle.id, person);
                registerClickable(person, person.userData?.pickMeta);
            }
            existingIds.delete(turtle.id);
        }

        for (const obsoleteId of existingIds) {
            const person = personsMap.get(obsoleteId);
            if (person) {
                unregisterClickable(person);
                scene.remove(person);
            }
            personsMap.delete(obsoleteId);
        }

        if (selectedObject?.mesh && selectedObject.mesh.userData?.pickMeta?.type === "person") {
            const personId = selectedObject.mesh.userData.pickMeta.personId;
            const currentMesh = personsMap.get(personId);
            if (currentMesh && currentMesh !== selectedObject.mesh) {
                setSelectedObject(currentMesh);
            } else if (!currentMesh) {
                clearSelectedObject();
            } else {
                syncSelectionPanel();
            }
        }

        latestTurtles = turtles.slice();
        latestTurtlesSignature = signature;
        window.dispatchEvent(new CustomEvent("helloworld:turtles-update", {
            detail: { turtles }
        }));
    } catch (err) {
        console.error("refreshPosition error", err);
        window.dispatchEvent(new CustomEvent("helloworld:turtles-error", {
            detail: { message: err?.message || String(err) }
        }));
    }
}

function onWindowResize() {
    const width = container.clientWidth;
    const height = container.clientHeight;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    applyRenderQuality();
}

document.addEventListener("DOMContentLoaded", init);

function animate(now = performance.now()) {
    requestAnimationFrame(animate);
    updateTrackingCamera();
    controls.update();
    renderSelectionPulse(now);
    renderer.render(scene, camera);
}
