import { OrbitControls } from "../three/OrbitControls.js";

export function initControls(camera, renderer) {

    const controls = new OrbitControls(
        camera,
        renderer.domElement
    );

    // 启用阻尼效果（平滑拖动）
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;

    // 启用鼠标缩放
    controls.enableZoom = true;
    controls.zoomSpeed = 1.0;

    // 启用自动旋转
    controls.autoRotate = false;
    controls.autoRotateSpeed = 2;

    // 设置控制灵敏度
    controls.enablePan = true;
    controls.panSpeed = 0.8;

    // 设置旋转灵敏度
    controls.rotateSpeed = 1.0;

    // 设置目标点
    controls.target.set(0, 3, 0);
    controls.update();

    return controls;

}