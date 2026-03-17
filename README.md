# 🚀 Ed-simu：Web应急撤离仿真平台

> A Django-based Web Simulation Platform for Emergency Evacuation

---

## 📌 项目简介

**Ed-simu** 是一个基于 **Django** 构建的 Web 应急撤离仿真平台原型系统。
系统通过浏览器界面实现仿真参数配置、模拟控制以及人员状态数据展示。

本项目的核心目标是：

* 构建一个 **可交互的仿真平台**
* 实现 **前后端一体化仿真流程**
* 支持 **人员状态的动态模拟与可视化展示**

> ⚠️ 本项目侧重于平台实现与系统架构设计，不包含复杂路径规划或辐射扩散模型。

---

## 🧠 核心功能

### 1️⃣ 参数配置系统

前端提供参数面板，用于控制仿真行为：

* 模拟人数（num_persons）
* 是否存在领导者（leader）
* 是否随机分布（random_pos）
* 恐慌系数（panic）
* 期望速度（expV）

---

### 2️⃣ 仿真控制机制

系统支持完整的仿真控制流程：

* ▶ Start：启动仿真线程
* ⏸ Pause：暂停仿真
* ▶ Resume：继续运行
* 🔄 Reset：重置仿真

通过后端全局状态（state）统一调度。

---

### 3️⃣ 多线程仿真执行

仿真运行在独立线程中：

* 避免阻塞 Web 请求
* 支持长时间持续计算
* 支持动态控制（暂停 / 恢复）

核心实现文件：

```
simulate/simu_runner.py
simulate/simu_state.py
```

---

### 4️⃣ 人员状态模拟

系统实现基础人员行为模拟，包括：

* 个体运动更新
* 群体差异（领导者 / 普通个体）
* 参数驱动行为变化（panic / expV）

---

### 5️⃣ 数据接口（REST API）

前后端通过 API 交互数据：

| 接口                          | 功能        |
| --------------------------- | --------- |
| `/api/meta/`                | 设置/获取仿真参数 |
| `/api/turtles/`             | 获取人员状态数据  |
| `/api/simulation/controls/` | 控制仿真运行    |
| `/api/building/`            | 获取场景数据    |

---

### 6️⃣ Web 可视化界面

系统提供一个完整的仿真控制界面：

* 参数配置面板（左侧）
* 仿真展示区域（中心）
* 数据监控模块
* 系统日志与状态信息

---

## 🏗️ 系统架构

```
前端（HTML / Bootstrap / JavaScript）
            ↓
REST API（Django Views）
            ↓
仿真控制层（线程管理）
            ↓
人员模拟模块（simulation.py）
```

---

## ⚙️ 技术栈

| 层级 | 技术                                  |
| -- | ----------------------------------- |
| 前端 | HTML / CSS / Bootstrap / JavaScript |
| 后端 | Django                              |
| 仿真 | Python（Threading）                   |
| 通信 | REST API（JSON）                      |

---

## 📁 项目结构

```
Ed-simu/
├── simulat/
│   ├── HelloWorld/        # Django 项目配置
│   ├── myapp/             # 核心应用
│   │   ├── simulate/      # 仿真模块
│   │   │   ├── simulation.py
│   │   │   ├── person.py
│   │   │   ├── simu_runner.py
│   │   │   └── simu_state.py
│   ├── templates/         # 页面模板
│   ├── statics/           # 静态资源
```

---

## 🔄 仿真运行流程

1. 前端设置参数（meta）
2. POST 到 `/api/meta/`
3. 用户点击 Start
4. 后端启动仿真线程
5. 仿真循环：

   * 更新人员状态
   * 生成数据帧
   * 发送到 `/api/turtles/`
6. 前端轮询数据并更新显示

---

## 🚀 快速启动

### 1️⃣ 克隆项目

```bash
git clone https://github.com/4sakencyber/Ed-simu.git
cd Ed-simu
```

---

### 2️⃣ 创建虚拟环境

```bash
python -m venv venv

# Windows
venv\Scripts\activate

# Linux / Mac
source venv/bin/activate
```

---

### 3️⃣ 安装依赖

```bash
pip install django requests numpy
```

---

### 4️⃣ 运行项目

```bash
cd simulat
python manage.py runserver
```

---

### 5️⃣ 打开浏览器

```
http://127.0.0.1:8000/
```

---

## 📊 当前实现情况

### ✅ 已完成

* Web 仿真平台框架
* 仿真线程控制机制
* 参数动态配置
* REST API 通信
* 基础人员行为模拟

### 🚧 待完善

* 前端三维可视化（Three.js）
* 实时通信（WebSocket）
* 模型精细化
* 系统性能优化

---

## 🎓 项目定位

本项目属于：

* 前后端集成系统

适用于：

* 仿真平台开发实践
* Web 可视化系统设计

---

## 💡 后续优化方向

* 使用 WebSocket 替代轮询
* 引入 Three.js 三维场景
* 支持多场景切换
* 增强前端交互体验

---

## 📜 License

MIT License

---

## 👨‍💻 作者

* Weinberg
