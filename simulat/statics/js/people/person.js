import * as THREE from "three";

function createHealthBar() {

    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 8;

    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "gray";
    ctx.fillRect(0, 0, 64, 8);

    ctx.fillStyle = "green";
    ctx.fillRect(0, 0, 64, 8);

    const texture = new THREE.CanvasTexture(canvas);

    const material = new THREE.SpriteMaterial({
        map: texture,
        depthTest: false
    });

    const sprite = new THREE.Sprite(material);

    sprite.scale.set(1.5, 0.2, 1);

    return {
        sprite,
        canvas,
        ctx,
        texture
    };
}

function updateHealthBar(bar, hp, maxHp) {

    const ratio = Math.max(0, Math.min(1, hp / maxHp));

    const ctx = bar.ctx;

    ctx.clearRect(0, 0, 64, 8);

    ctx.fillStyle = "gray";
    ctx.fillRect(0, 0, 64, 8);

    if (ratio > 0.6) ctx.fillStyle = "green";
    else if (ratio > 0.3) ctx.fillStyle = "orange";
    else ctx.fillStyle = "red";

    ctx.fillRect(0, 0, 64 * ratio, 8);

    bar.texture.needsUpdate = true;
}

export function makePersonMesh(t) {
    const geo = new THREE.SphereGeometry(t.is_leader ? 0.6 : 0.4, 16, 16);
    const mat = new THREE.MeshStandardMaterial({
        color: t.is_leader ? 0xff0000 : (t.finished ? 0x999999 : 0x00ff00),
        opacity: t.finished ? 0.6 : 1.0,
        transparent: t.finished ? true : false
    });

    const p = new THREE.Mesh(geo, mat);

    const [x, y, z] = t.pos || [0, 0, 0];
    p.position.set(y, z, x);

    const hpBar = createHealthBar();

    hpBar.sprite.position.set(0, 1.2, 0); // 头顶
    p.add(hpBar.sprite);

    // 保存血条对象
    p.userData.hpBar = hpBar;

    updateHealthBar(hpBar, t.hp || 100, t.maxHp || 100);

    // console.log("t", t);
    p.userData = {
        id: t.id,
        floor: t.floor,
        room: t.room,
        is_leader: t.is_leader,
        finished: t.finished
    };

    return p;
}

export function updatePersonMesh(p, t) {
    if (!p || !p.isMesh) return;

    let x = t.pos[0], y = t.pos[1], z = 0;

    if (t.region === "stair") {
        z = t.pos[2];
    } else {
        z = Math.floor((t.pos[2] + 0.5) / 4) * 4; // 每层高度4米，向下取整
    }
    if (t.is_leader) {
        z = t.pos[2];
    }

    p.position.set(y, z, x);

    p.userData = {
        ...p.userData,
        id: t.id,
        floor: t.floor,
        room: t.room,
        is_leader: t.is_leader,
        finished: t.finished
    };

    p.scale.setScalar(t.is_leader ? 1.5 : 1.0);
    p.material.color.setHex(t.is_leader ? 0xff0000 : (t.finished ? 0x999999 : 0x00ff00));
    p.material.opacity = t.finished ? 0.6 : 1.0;
    p.material.transparent = t.finished ? true : false;

    if (p.userData.hpBar) {
        updateHealthBar(p.userData.hpBar, t.hp || 100, t.maxHp || 100);
    }

    if (p.userData.hpBar) {
        p.userData.hpBar.sprite.visible = !t.finished;
    }
}

export async function fetchTurtles() {
    const res = await fetch("/myapp/api/turtles/");
    if (!res.ok) throw new Error(`/myapp/api/turtles/ 请求失败：${res.status}`);
    const json = await res.json();
    return json.turtles || [];
}

export async function createPersons() {
    const turtles = await fetchTurtles();
    return turtles.map(makePersonMesh);
}

