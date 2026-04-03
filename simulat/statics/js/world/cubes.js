import * as THREE from "three";

function formatRange(range) {
    if (!Array.isArray(range) || range.length < 2) {
        return "-";
    }
    return `${range[0]} ~ ${range[1]}`;
}

function registerMesh(registerClickable, mesh, meta) {
    if (typeof registerClickable === "function" && mesh) {
        registerClickable(mesh, meta);
    }
}

function buildRoomMeta(floorId, chamberId, chamber) {
    const floor = `F${floorId}`;
    return {
        type: "room",
        title: `${floor} 舱室 ${chamberId}`,
        detail: `${floor} | 舱室 ${chamberId} | X ${formatRange(chamber.x)} | Y ${formatRange(chamber.y)} | Z ${formatRange([chamber.z[0], chamber.z[0] + 3.5])}`,
        floor: floorId,
        chamberId
    };
}

function buildDoorMeta(floorId, doorId, door) {
    const floor = `F${floorId}`;
    const connects = Array.isArray(door.connects) ? door.connects.join(" <-> ") : "-";
    return {
        type: "other",
        title: `${floor} 舱门 ${doorId}`,
        detail: `${floor} | 连接舱室 ${connects} | Y ${formatRange(door.y)} | 高度 ${formatRange([door.z[0], door.z[0] + 2.5])} | 状态 ${door.open ? "开启" : "关闭"}`,
        floor: floorId,
        doorId
    };
}

function buildStairMeta(floorId, chamberId, stair) {
    return {
        type: "room",
        title: `F${floorId} 楼梯连通面`,
        detail: `连接 F${floorId} 舱室 ${chamberId} 与上层 | X ${formatRange(stair.x)} | Y ${formatRange(stair.y)} | Z ${formatRange(stair.z)}`,
        floor: floorId,
        chamberId
    };
}

function buildReactorMeta(reactor) {
    return {
        type: "task",
        title: "反应堆区域",
        detail: `中心位置 (${reactor.position.join(", ")}) | 半径 ${reactor.radius} | 高度 ${reactor.height}`,
        radius: reactor.radius
    };
}

export async function loadBuildings(scene, registerClickable) {
    const response = await fetch("/myapp/api/building/");
    const data = await response.json();
    drawBuilding(scene, data, registerClickable);
}

export function createBox(scene, xRange, yRange, zRange, color, options = {}) {
    const {
        opacity = 0.25,
        wireframe = false,
        registerClickable = null,
        meta = null,
        name = "building-box"
    } = options;

    const xmin = xRange[0];
    const xmax = xRange[1];

    const ymin = yRange[0];
    const ymax = yRange[1];

    const zmin = zRange[0];
    const zmax = zRange[1];

    const width = xmax - xmin - 0.1;
    const depth = ymax - ymin - 0.1;
    const height = zmax - zmin - 0.1;

    const cx = (xmin + xmax) / 2;
    const cy = (ymin + ymax) / 2;
    const cz = (zmin + zmax) / 2;

    const geometry = new THREE.BoxGeometry(width, height, depth);
    const material = new THREE.MeshStandardMaterial({
        color,
        transparent: true,
        opacity,
        wireframe
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = name;
    mesh.rotation.y = Math.PI / 2;
    mesh.position.set(cy, cz, cx);

    scene.add(mesh);
    registerMesh(registerClickable, mesh, meta);
    return mesh;
}

function drawBuilding(scene, data, registerClickable) {
    const floors = data.building.floor;
    const reactor = data.building.reactor;

    for (const id in floors) {
        const floor = floors[id];
        const floorId = Number(id);
        drawChambers(scene, floorId, floor, registerClickable);
        drawDoors(scene, floorId, floor, registerClickable);
    }

    drawReactor(scene, reactor, registerClickable);
}

function drawChambers(scene, floorId, floor, registerClickable) {
    const chambers = floor.chamber;

    for (const id in chambers) {
        const chamber = chambers[id];
        const chamberId = Number(id);

        createBox(
            scene,
            [chamber.x[0] + 0.2, chamber.x[1] - 0.2],
            chamber.y,
            [chamber.z[0], chamber.z[0] + 3.5],
            0x99ffff,
            {
                registerClickable,
                meta: buildRoomMeta(floorId, chamberId, chamber),
                name: `floor-${floorId}-chamber-${chamberId}`
            }
        );

        if (chamber.stair) {
            drawStairs(scene, floorId, chamberId, chamber.stair, registerClickable);
        }
    }
}

function drawStairs(scene, floorId, chamberId, stairs, registerClickable) {
    const s1 = stairs[1];
    const s2 = stairs[2];
    const stair = {
        x: s2.x,
        y: s1.y,
        z: s1.z
    };

    const xmin = stair.x[0];
    const xmax = stair.x[1];
    const ymin = stair.y[0];
    const ymax = stair.y[1];
    const zmin = stair.z[0];
    const zmax = stair.z[1];

    const width = xmax - xmin;
    const depth = ymax - ymin;
    const height = zmax - zmin;

    const cx = (xmin + xmax) / 2;
    const cy = (ymin + ymax) / 2;
    const cz = (zmin + zmax) / 2;

    const length = Math.sqrt(width * width + height * height);
    const theta = Math.atan2(height, width);

    const geometry = new THREE.PlaneGeometry(depth, length);
    const material = new THREE.MeshStandardMaterial({
        color: 0xffff00,
        side: THREE.DoubleSide
    });

    const plane = new THREE.Mesh(geometry, material);
    plane.name = `floor-${floorId}-stair-${chamberId}`;
    plane.rotation.x = Math.PI / 2 - theta;
    plane.position.set(cy, cz, cx);

    scene.add(plane);
    registerMesh(registerClickable, plane, buildStairMeta(floorId, chamberId, stair));
}

function drawDoors(scene, floorId, floor, registerClickable) {
    const doors = floor.door;

    for (const id in doors) {
        const door = doors[id];
        const doorId = Number(id);
        const color = door.open ? 0xa52a2a : 0xa52a2a;

        createBox(
            scene,
            door.x,
            door.y,
            [door.z[0], door.z[0] + 2.5],
            color,
            {
                opacity: 0.45,
                registerClickable,
                meta: buildDoorMeta(floorId, doorId, door),
                name: `floor-${floorId}-door-${doorId}`
            }
        );
    }
}

function drawReactor(scene, reactor, registerClickable) {
    const geometry = new THREE.CylinderGeometry(
        reactor.radius,
        reactor.radius,
        reactor.height,
        32
    );

    const material = new THREE.MeshStandardMaterial({
        color: 0x00ffff,
        transparent: true,
        opacity: 0.5,
        wireframe: true
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = "reactor-core";
    mesh.position.set(reactor.position[1], reactor.position[2], reactor.position[0]);

    scene.add(mesh);
    registerMesh(registerClickable, mesh, buildReactorMeta(reactor));
}
