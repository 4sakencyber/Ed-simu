import * as THREE from "three";
import { createPersons } from "../people/person.js";
import { loadBuildings } from "../world/cubes.js";
import { RGBELoader } from "../three/RGBELoader.js";

function attachClickable(registerClickable, mesh) {
    if (typeof registerClickable !== "function" || !mesh?.isObject3D) {
        return;
    }
    registerClickable(mesh, mesh.userData?.pickMeta || null);
}

export async function initScene(registerClickable) {
    const scene = new THREE.Scene();

    const persons = await createPersons().catch((err) => {
        console.error("createPersons failed:", err);
        return [];
    });

    const personsMap = new Map();
    persons.forEach((person) => {
        if (person && person.isMesh) {
            scene.add(person);
            attachClickable(registerClickable, person);
            if (person.userData && person.userData.id != null) {
                personsMap.set(person.userData.id, person);
            }
        }
    });

    scene.background = new THREE.Color(0x020617);

    const groundGeometry = new THREE.PlaneGeometry(100, 100);
    const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x1e293b });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    ground.position.set(0, -10, 0);
    scene.add(ground);

    const grid = new THREE.GridHelper(50, 50);
    grid.material.transparent = true;
    grid.material.opacity = 0.3;
    grid.position.set(0, -1, 0);
    scene.add(grid);

    const light = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(light);

    const axesHelper = new THREE.AxesHelper(10);
    scene.add(axesHelper);

    new RGBELoader().load("/static/images/sky_2k.hdr", (texture) => {
        texture.mapping = THREE.EquirectangularReflectionMapping;
        scene.background = texture;
        scene.environment = texture;
    });

    void loadBuildings(scene, registerClickable).catch((error) => {
        console.error("loadBuildings failed:", error);
    });

    return { scene, personsMap };
}
