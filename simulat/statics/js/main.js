import { initScene } from "./core/scene.js";
import { initCamera } from "./core/camera.js";
import { initRenderer } from "./core/renderer.js";
import { initControls } from "./core/controls.js";
import { fetchTurtles, makePersonMesh, updatePersonMesh } from "./people/person.js";

let scene;
let camera;
let renderer;
let controls;
let container;
let personsMap = new Map();

async function init() {
    const sceneData = await initScene();
    scene = sceneData.scene;
    personsMap = sceneData.personsMap;

    container = document.getElementById("viewer");

    camera = initCamera(container);

    renderer = initRenderer("viewer");

    controls = initControls(camera, renderer);

    window.addEventListener('resize', onWindowResize);

    // 定时刷新位置
    setInterval(refreshPosition, 100);

    animate();
}

async function refreshPosition() {
    try {
        const turtles = await fetchTurtles();
        const existingIds = new Set(personsMap.keys());

        for (const t of turtles) {
            if (personsMap.has(t.id)) {
                updatePersonMesh(personsMap.get(t.id), t);
            } else {
                const p = makePersonMesh(t);
                scene.add(p);
                personsMap.set(t.id, p);
            }
            existingIds.delete(t.id);
        }

        // 删除不再存在的个体（可选）
        for (const obsoleteId of existingIds) {
            const p = personsMap.get(obsoleteId);
            if (p) scene.remove(p);
            personsMap.delete(obsoleteId);
        }

    } catch (err) {
        console.error("refreshPosition 错误", err);
    }
}

function onWindowResize() {
    const width = container.clientWidth;
    const height = container.clientHeight;

    // 更新camera宽高比
    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    // 更新renderer大小
    renderer.setSize(width, height);
}

// 等待DOM加载完成后再初始化
document.addEventListener('DOMContentLoaded', init);

function animate() {

    requestAnimationFrame(animate);

    // 更新控件（必须在每帧调用以支持阻尼和自动旋转）
    controls.update();

    renderer.render(scene, camera);

}

