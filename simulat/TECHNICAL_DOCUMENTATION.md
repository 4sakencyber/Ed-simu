# HelloWorld 技术文档

## 1. 项目定位

`HelloWorld` 是一个面向三维疏散仿真的 Django + Three.js 项目。

当前版本已经从单页面演示逐步演进为工作台结构，重点在于：
- 保留原有仿真核心
- 增强前端交互、监控和日志
- 用运行态桥接层改善状态管理

## 2. 当前功能

### 工作台页面

- 仿真工作台
- 监控中心
- 系统日志
- 本地设置
- 项目说明

### 前端能力

- Three.js 场景渲染
- glTF 船体显隐
- 对象选中、高亮、聚焦与人物追踪
- 个体监视与全体统计
- 趋势图、日志导出、本地历史

### 后端能力

- 参数下发
- 仿真控制
- 最新帧数据输出
- 建筑几何输出
- 运行态桥接与诊断接口

## 3. 关键文件

### Django 入口

- `HelloWorld/settings.py`
- `HelloWorld/urls.py`
- `HelloWorld/views.py`

### 业务层

- `myapp/views.py`
- `myapp/urls.py`
- `myapp/runtime/*`

### 仿真核心

- `myapp/simulate/simu_state.py`
- `myapp/simulate/simu_runner.py`
- `myapp/simulate/simulation.py`
- `myapp/simulate/person.py`
- `myapp/simulate/path_search.py`
- `myapp/simulate/radiation.py`
- `myapp/simulate/constants.py`

### 前端

- `templates/webapp/*`
- `statics/js/main.js`
- `statics/js/dashboard.js`
- `statics/css/main.css`

## 4. 运行流程

### 页面初始化

前端加载页面后会请求：
- `/myapp/api/meta/`
- `/myapp/api/runtime/`
- `/myapp/api/building/`

### 启动仿真

1. 前端发送参数到 `/myapp/api/meta/`
2. 前端发送 `start` 到 `/myapp/api/simulation/controls/`
3. 桥接层配置仿真回调地址
4. 仿真线程开始执行

### 运行中

- 仿真线程回写 `/myapp/api/turtles/`
- 前端轮询 `/myapp/api/turtles/`
- 前端轮询 `/myapp/api/runtime/`

## 5. 运行态桥接层

桥接层的存在是为了在不改动 `myapp/simulate/*` 的前提下，增强外围运行态管理。

它负责：
- 保存运行状态
- 记录桥接层日志
- 动态设置回调地址
- 提供只读诊断快照
- reset 后屏蔽迟到帧

## 6. 当前边界

### 明确保留

- 原有仿真接口形态
- 上游仿真核心目录
- 本地浏览器历史方案

### 当前未做

- 登录与账户
- 后端历史持久化
- 全量快照接口
- 前端模块级自动化测试

## 7. 当前完成度评估

- 前端工作台：高
- Three.js 场景交互：高
- 监控与日志：中高
- 运行态桥接：中高
- 工程化与测试：中

整体判断：
项目已经达到“可稳定演示的工作台版本”，但还不是最终的长期维护成品版本。

## 8. 常用命令

```powershell
python manage.py runserver 127.0.0.1:8000
python manage.py check
python manage.py test myapp
node --check statics\js\dashboard.js
node --check statics\js\main.js
```

## 9. 后续推荐

- 继续拆分 `dashboard.js`
- 逐步让更多状态以 `/myapp/api/runtime/` 为准
- 评估是否需要后端 `snapshot/history/logs`
- 建立更完整的前端与集成测试
