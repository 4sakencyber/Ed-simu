import * as THREE from "three";

export async function loadBuildings(scene) {

    const response = await fetch("/myapp/api/building/")
    const data = await response.json()

    // console.log("data", data);
    // console.log("data.building.reactor",data.building.reactor);

    drawBuilding(scene, data)
}


export function createBox(scene, xRange, yRange, zRange, color) {

    const xmin = xRange[0]
    const xmax = xRange[1]

    const ymin = yRange[0]
    const ymax = yRange[1]

    const zmin = zRange[0]
    const zmax = zRange[1]

    const width = xmax - xmin-0.1;
    const depth = ymax - ymin-0.1;
    const height = zmax - zmin-0.1;

    const cx = (xmin + xmax) / 2
    const cy = (ymin + ymax) / 2
    const cz = (zmin + zmax) / 2

    const geometry = new THREE.BoxGeometry(width, height, depth)

    const material = new THREE.MeshStandardMaterial({
        color: color,
        transparent: true,   // 必须开启
        opacity: 0.25,
        // wireframe: true
    })

    const mesh = new THREE.Mesh(geometry, material)

    mesh.rotation.y = Math.PI / 2;
    // Python(x,y,z) → Three(x,z,y)
    mesh.position.set(cy, cz, cx)

    scene.add(mesh)
}


function drawBuilding(scene, data) {

    const floors = data.building.floor

    const reactor = data.building.reactor;

    for (let id in floors) {

        const floor = floors[id]

        drawChambers(scene, floor)
        drawDoors(scene, floor)
    }

    drawReactor(scene, reactor);
}


function drawChambers(scene, floor) {

    const chambers = floor.chamber

    for (let id in chambers) {

        const c = chambers[id]
        console.log("chamber", c);
        createBox(
            scene,
            [c.x[0]+0.2, c.x[1]-0.2],
            c.y,
            [c.z[0], c.z[0] + 3.5],
            0x99ffff
        )

        if (c.stair) {
            drawStairs(scene, c.stair)
        }
    }
}


function drawStairs(scene, stairs) {


    const s1 = stairs[1];
    const s2 = stairs[2];
    const s = {
        x: s2.x,
        y: s1.y,
        z: s1.z
    };
    // 位置 
    const xmin = s.x[0]
    const xmax = s.x[1]

    const ymin = s.y[0]
    const ymax = s.y[1]

    const zmin = s.z[0]
    const zmax = s.z[1]

    const width = xmax - xmin
    const depth = ymax - ymin
    const height = zmax - zmin

    const cx = (xmin + xmax) / 2
    const cy = (ymin + ymax) / 2
    const cz = (zmin + zmax) / 2

    const length = Math.sqrt(width * width + height * height);
    const theta = Math.atan2(height, width);

    const geometry = new THREE.PlaneGeometry(depth, length);

    const material = new THREE.MeshStandardMaterial({
        color: 0xffff00,
        side: THREE.DoubleSide
    });

    const plane = new THREE.Mesh(geometry, material);

    // 旋转成斜面
    plane.rotation.x = Math.PI/2 - theta;  // 45°
    plane.position.set(cy, cz, cx);

    scene.add(plane);

}


function drawDoors(scene, floor) {

    const doors = floor.door

    for (let id in doors) {

        const d = doors[id]

        const color = d.open ? 0xa52a2a : 0xa52a2a

        createBox(
            scene,
            d.x,
            d.y,
            [d.z[0], d.z[0] + 2.5],
            color
        )
    }
}

function drawReactor(scene, reactor) {

    const geometry = new THREE.CylinderGeometry(
        reactor.radius,   // top radius
        reactor.radius,   // bottom radius
        reactor.height,   // height
        32        // segments (越大越圆)
    );

    const material = new THREE.MeshStandardMaterial({
        color: 0x00ffff,
        transparent: true,   // 必须开启
        opacity: 0.5,
        wireframe: true
    });

    const mesh = new THREE.Mesh(geometry, material);

    // Python(x,y,z) → Three(x,z,y)
    mesh.position.set(reactor.position[1], reactor.position[2], reactor.position[0]);

    scene.add(mesh);
}