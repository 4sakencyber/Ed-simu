# Runtime Bridge

## 目标

运行态桥接层用于在不修改 `myapp/simulate/*` 上游核心源码的前提下，增强外围状态管理。

## 文件

- `myapp/runtime/state_store.py`
- `myapp/runtime/log_store.py`
- `myapp/runtime/bridge.py`

## 主要职责

- 缓存当前 `meta / frame / turtles / status`
- 记录桥接层日志
- 维护 `callback_url`
- 在启动时按当前请求 host 动态配置回调地址
- 通过 `/myapp/api/runtime/` 输出只读运行态快照
- reset 后忽略迟到帧，避免旧数据污染页面

## 对前端的作用

前端工作台会消费 `/myapp/api/runtime/` 用于：
- 状态徽标
- 运行态诊断卡片
- 桥接层日志显示
- 局部页面状态判断

## 设计边界

桥接层不负责重写仿真核心逻辑。

以下核心文件仍视为上游拥有：
- `myapp/simulate/simulation.py`
- `myapp/simulate/person.py`
- `myapp/simulate/radiation.py`
- `myapp/simulate/path_search.py`
- `myapp/simulate/constants.py`

## 当前限制

- `runtime` 更偏诊断接口，不是完整快照系统
- 历史记录仍主要在前端本地
- 如果核心仿真逻辑本身存在问题，仍需单独评审后再决定是否改动上游文件
