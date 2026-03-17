function sendCommand(cmd) {

    fetch("/myapp/api/simulation/controls/", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            command: cmd
        })
    })
        .then(res => res.json())
        .then(data => {
            console.log("Command:", cmd, data)
        })
}
let simStarted = false
let paused = false

function toggleSim() {

    const btn = document.getElementById("simBtn")

    // 第一次点击 -> start
    if (!simStarted) {

        send_meta()
        sendCommand("start")

        simStarted = true
        paused = false

        btn.classList.remove("btn-success")
        btn.classList.add("btn-warning")

        btn.innerText = "⏸"

        console.log("simulation started")

        return
    }

    // 已启动 -> pause
    if (!paused) {

        sendCommand("pause")

        paused = true

        btn.classList.remove("btn-warning")
        btn.classList.add("btn-success")

        btn.innerText = "▶"

        console.log("pause")

    } else {

        // resume
        sendCommand("resume")

        paused = false

        btn.classList.remove("btn-success")
        btn.classList.add("btn-warning")

        btn.innerText = "⏸"

        console.log("resume")

    }

}

function resetSimUI() {

    sendCommand("reset")

    simStarted = false
    paused = false

    const btn = document.getElementById("simBtn")

    btn.classList.remove("btn-warning")
    btn.classList.add("btn-success")

    btn.innerText = "▶"

    console.log("simulation reset")

}

function send_meta() {

    const params = {
        num_persons: Number(document.getElementById("totalPeople").value),
        random_pos: document.getElementById("randomPosition").checked,
        leader: document.getElementById("hasLeader").checked,
        panic: Number(document.getElementById("panicFactor").value),
        expV: Number(document.getElementById("desiredSpeed").value)
    };

    console.log("发送参数:", params);

    fetch("/myapp/api/meta/", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(params)
    })
        .then(res => res.json())
        .then(data => {
            console.log("后端返回:", data);
        })
        .catch(err => {
            console.error("请求失败:", err);
        });

}

function toggleSidebar(){

    const sidebar = document.getElementById("sidebar");

    sidebar.classList.toggle("collapsed");

}