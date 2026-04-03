# HelloWorld API 说明

## 概览

- Base URL: `http://127.0.0.1:8000`
- API 前缀: `/myapp/api/`
- 数据格式: `application/json`
- 当前为开发态接口，无登录鉴权

## 接口清单

- `GET/POST /myapp/api/meta/`
- `GET/POST /myapp/api/turtles/`
- `GET /myapp/api/runtime/`
- `POST /myapp/api/simulation/controls/`
- `GET /myapp/api/building/`

## 1. Meta 参数接口

### `POST /myapp/api/meta/`

用途：下发仿真参数。

请求示例：

```json
{
  "num_persons": 10,
  "random_pos": true,
  "leader": false,
  "panic": 0.2,
  "expV": 1.3
}
```

响应示例：

```json
{
  "status": "meta received"
}
```

字段说明：
- `num_persons`: 人数
- `random_pos`: 是否随机初始位置
- `leader`: 是否启用领队
- `panic`: 恐慌系数
- `expV`: 期望速度

### `GET /myapp/api/meta/`

用途：获取当前参数缓存。

响应示例：

```json
{
  "meta": {
    "num_persons": 10,
    "random_pos": true,
    "leader": false,
    "panic": 0.2,
    "expV": 1.3
  }
}
```

## 2. Turtles 帧数据接口

### `POST /myapp/api/turtles/`

用途：仿真线程回写当前帧个体数据，主要由后端内部调用。

请求示例：

```json
{
  "frame": 123,
  "turtles": [
    {
      "id": 1,
      "pos": [-10.1, 0.2, 4.0],
      "floor": 2,
      "room": 1,
      "region": "chamber",
      "is_leader": false,
      "finished": false,
      "dose": 0.000001
    }
  ]
}
```

响应示例：

```json
{
  "status": "turtles received"
}
```

### `GET /myapp/api/turtles/`

用途：前端轮询最新个体帧数据。

响应示例：

```json
{
  "turtles": [
    {
      "id": 1,
      "pos": [-10.1, 0.2, 4.0],
      "floor": 2,
      "room": 1,
      "region": "chamber",
      "is_leader": false,
      "finished": false,
      "dose": 0.000001
    }
  ]
}
```

## 3. Runtime 运行态接口

### `GET /myapp/api/runtime/`

用途：返回运行态桥接层维护的诊断快照。

说明：
- 该接口不替代 `turtles` 帧数据接口
- 主要用于工作台状态、运行态诊断和桥接层日志展示
- 前端可用它判断 `idle / running / paused / completed / error`

响应示例：

```json
{
  "status": "running",
  "last_command": "start",
  "frame": 18,
  "turtle_count": 10,
  "thread_alive": true,
  "started_at": "2026-04-03T11:02:31+00:00",
  "updated_at": "2026-04-03T11:02:34+00:00",
  "completed_at": null,
  "last_error": null,
  "callback_url": "http://127.0.0.1:8000/myapp/api/turtles/",
  "meta": {
    "num_persons": 10,
    "random_pos": true,
    "leader": false,
    "panic": 0.2,
    "expV": 1.3
  },
  "recent_logs": [
    {
      "time": "2026-04-03T11:02:31+00:00",
      "level": "event",
      "message": "Simulation start requested via http://127.0.0.1:8000/myapp/api/turtles/"
    }
  ]
}
```

## 4. 仿真控制接口

### `POST /myapp/api/simulation/controls/`

用途：控制仿真生命周期。

请求示例：

```json
{
  "command": "start"
}
```

支持命令：
- `start`
- `pause`
- `resume`
- `reset`

成功响应：

```json
{
  "status": "start"
}
```

错误响应：

```json
{
  "error": "unknown command"
}
```

## 5. 建筑几何接口

### `GET /myapp/api/building/`

用途：返回建筑、楼梯、门、反应堆等几何数据，供 Three.js 场景初始化使用。

响应结构示例：

```json
{
  "building": {
    "floor": {},
    "reactor": {}
  }
}
```

## 6. 当前前后端关系

- 页面初始化：
  - `GET /myapp/api/meta/`
  - `GET /myapp/api/runtime/`
  - `GET /myapp/api/building/`
- 仿真启动：
  - `POST /myapp/api/meta/`
  - `POST /myapp/api/simulation/controls/`
- 运行中：
  - 后端仿真线程 `POST /myapp/api/turtles/`
  - 前端轮询 `GET /myapp/api/turtles/`
  - 前端轮询 `GET /myapp/api/runtime/`

## 7. 当前限制

- 接口仍处于开发态，安全边界较弱
- `runtime` 为诊断接口，不是完整历史快照系统
- 历史记录和大部分前端日志目前仍保存在浏览器本地
