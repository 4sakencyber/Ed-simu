import * as THREE from "three";
import { createPersons } from "../people/person.js";
import { loadBuildings } from "../world/cubes.js";
import { RGBELoader } from "../three/RGBELoader.js";

export async function initScene() {
    const scene = new THREE.Scene();

    const persons = await createPersons().catch(err => {
        console.error('createPersons失败:', err);
        return [];
    });

    const personsMap = new Map();
    persons.forEach(p => {
        if (p && p.isMesh) {
            scene.add(p);
            if (p.userData && p.userData.id != null) {
                personsMap.set(p.userData.id, p);
            }
        }
    });

    scene.background = new THREE.Color(0x020617);

    // 创建地面
    const groundGeometry = new THREE.PlaneGeometry(100, 100);
    const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x1e293b });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    ground.position.set(0, -10, 0);
    scene.add(ground);

    // 添加网格辅助
    const grid = new THREE.GridHelper(50, 50);
    grid.material.transparent = true;  // 开启透明
    grid.material.opacity = 0.3;       // 设置透明度 (0~1)
    grid.position.set(0, -1, 0); // 稍微抬高一点，避免与地面重叠导致闪烁
    scene.add(grid);

    const light = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(light);

    const axesHelper = new THREE.AxesHelper(10); // 10 = 坐标轴长度
    scene.add(axesHelper);

    // const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
    // directionalLight.position.set(20, 20, 10);
    // directionalLight.castShadow = true;
    // directionalLight.shadow.mapSize.width = 2048;
    // directionalLight.shadow.mapSize.height = 2048;
    // scene.add(directionalLight);

    new RGBELoader()
        .load("/static/images/sky_10k.hdr", function (texture) {

            texture.mapping = THREE.EquirectangularReflectionMapping;

            scene.background = texture;
            scene.environment = texture;
        });

    loadBuildings(scene);


    return { scene, personsMap };
}
