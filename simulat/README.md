# HelloWorld

`HelloWorld` 是一个基于 Django + Three.js 的三维疏散仿真工作台。

当前版本的重点是：
- 保留原有仿真核心与接口形态
- 升级前端工作台、监控、日志、设置和 3D 场景交互
- 通过运行时桥接层增强运行状态管理，但不直接修改 `myapp/simulate/*`

## 当前状态

项目目前已经具备：
- 仿真控制：开始、暂停、恢复、重置
- 参数下发：人数、随机位置、领队、恐慌系数、期望速度
- 3D 场景：建筑、人物、对象选中、高亮、聚焦、追踪
- 工作台页面：仿真、监控、日志、设置、项目说明
- 监控能力：剂量统计、趋势图、实时人员表、本地历史
- 运行态桥接：`/myapp/api/runtime/` 诊断接口

当前仍保留的边界：
- 不包含登录和账户系统
- 历史记录和大部分前端日志仍为浏览器本地聚合
- `myapp/simulate/*` 视为上游核心区，尽量不改

## 文档入口

- 总体说明: `TECHNICAL_DOCUMENTATION.md`
- 架构说明: `docs/ARCHITECTURE.md`
- 接口说明: `docs/API_SPEC.md`
- 运行态桥接层: `docs/RUNTIME_BRIDGE.md`

## 快速启动

在 `D:\dac_bs\HelloWorld` 下执行：

```powershell
python manage.py runserver 127.0.0.1:8000
```

浏览器访问：

```text
http://127.0.0.1:8000/
```

## 常用检查

```powershell
python manage.py check
python manage.py test myapp
node --check statics\js\dashboard.js
node --check statics\js\main.js
```

## 关键目录

- `HelloWorld/`: Django 配置与页面入口
- `myapp/`: API、运行态桥接层、仿真接入层
- `myapp/simulate/`: 上游仿真核心
- `templates/`: 工作台模板
- `statics/`: Three.js、前端状态与样式

## 目录边界

建议后续开发优先落在这些位置：
- `myapp/views.py`
- `myapp/runtime/*`
- `templates/webapp/*`
- `statics/js/*`
- `statics/css/*`

尽量不要直接改这些核心文件：
- `myapp/simulate/simulation.py`
- `myapp/simulate/person.py`
- `myapp/simulate/radiation.py`
- `myapp/simulate/path_search.py`
- `myapp/simulate/constants.py`
