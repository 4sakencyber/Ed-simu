import * as THREE from "three";

export function initCamera(container) {

    const width = container.clientWidth;
    const height = container.clientHeight;

    const camera = new THREE.PerspectiveCamera(
        75,
        width / height,
        0.1,
        1000
    );

    camera.position.set(10, 10, 10);

    return camera;

}