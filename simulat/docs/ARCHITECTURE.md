# HelloWorld 架构说明

## 1. 目标

`HelloWorld` 当前采用“保留上游仿真核心 + 外围工作台增强”的架构。

核心原则：
- 保留 `myapp/simulate/*` 作为上游核心区
- 前端工作台、运行态管理、日志与监控增强尽量放在外围
- 不直接迁入账户系统

## 2. 总体结构

项目可以分成四层：

1. 页面层  
   Django Template + Three.js 工作台界面

2. API 层  
   `myapp/views.py` 提供参数、帧数据、运行态、控制和建筑接口

3. 运行态桥接层  
   `myapp/runtime/*` 负责运行状态缓存、日志、回调地址适配

4. 仿真核心层  
   `myapp/simulate/*` 负责路径、剂量、人物行为与主循环

## 3. 当前目录边界

### 允许优先改动的区域

- `myapp/views.py`
- `myapp/runtime/*`
- `templates/webapp/*`
- `statics/js/*`
- `statics/css/*`
- `docs/*`

### 尽量不直接改动的核心区域

- `myapp/simulate/simulation.py`
- `myapp/simulate/person.py`
- `myapp/simulate/radiation.py`
- `myapp/simulate/path_search.py`
- `myapp/simulate/constants.py`

## 4. 前端结构

### 模板层

- `templates/base.html`: 公共基座
- `templates/runbood.html`: 兼容入口
- `templates/webapp/dashboard.html`: 工作台主壳
- `templates/webapp/partials/*`: 顶栏、侧栏、面板头等公共片段
- `templates/webapp/pages/*`: 仿真、监控、日志、设置、项目说明

### 前端脚本层

- `statics/js/main.js`
  - Three.js 场景初始化
  - 建筑与人物可视化
  - 对象选中、高亮、聚焦、追踪
- `statics/js/dashboard.js`
  - 页面切换
  - 参数下发与仿真控制
  - 监控卡片、趋势图、日志、本地历史
  - 运行态诊断展示
- `statics/js/interaction/click.js`
  - 兼容旧入口

## 5. 运行态桥接层

桥接层文件：
- `myapp/runtime/state_store.py`
- `myapp/runtime/log_store.py`
- `myapp/runtime/bridge.py`

职责：
- 维护 `meta / frame / turtles / status / callback_url`
- 记录桥接层日志
- 在请求时动态设置回调地址
- 提供 `/myapp/api/runtime/` 运行态诊断接口
- 在 reset 后屏蔽迟到帧，避免旧数据污染前端

## 6. 数据流

当前主要数据流如下：

1. 用户在工作台修改参数
2. 前端调用 `POST /myapp/api/meta/`
3. 前端调用 `POST /myapp/api/simulation/controls/`
4. 桥接层在启动时动态配置回调地址
5. 仿真核心线程运行并回写 `POST /myapp/api/turtles/`
6. 前端轮询 `GET /myapp/api/turtles/` 更新场景与统计
7. 前端轮询 `GET /myapp/api/runtime/` 更新状态、诊断和桥接层日志

## 7. 当前成品状态

已经完成：
- 多页工作台
- Three.js 对象交互
- 个体监视与全体监控
- 日志与本地历史
- 运行态桥接层接入
- 页面精简与结构收口

仍未完成：
- 后端历史持久化
- 统一快照接口
- 自动化前端测试
- 更细粒度的模块拆分

## 8. 当前非目标

- 登录/账户系统
- 后端多用户会话管理
- 直接重写 `myapp/simulate/*`

## 9. 后续推荐方向

- 继续拆分 `dashboard.js`
- 让更多工作台状态优先由 `runtime` 接口驱动
- 评估是否需要后端历史与快照接口
