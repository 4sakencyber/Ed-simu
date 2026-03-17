# 🚀 Ed-simu：事故应急撤离仿真平台

> A Web-based Emergency Evacuation Simulation Platform with Behavior Modeling and Radiation Coupling

---

## 📌 项目简介

**Ed-simu** 是一个基于 **Django + Web 前端技术** 构建的事故应急撤离仿真平台原型系统。
系统支持在复杂建筑环境中，对人员疏散过程进行动态模拟，并结合行为模型与放射性扩散场，实现可视化分析与交互控制。

该项目主要面向以下应用场景：

* 🚢 海上核动力装置事故应急撤离
* 🏭 工业设施突发事故人员疏散
* 🧪 多因素耦合（行为 + 环境）仿真研究

---

## 🧠 核心功能

### 1️⃣ 仿真参数控制

* 模拟人数（num_persons）
* 是否存在领导者（leader）
* 初始位置随机分布（random_pos）
* 恐慌系数（panic）
* 期望速度（expV）

---

### 2️⃣ 行为建模（Social Force Model）

系统基于社会力模型（SFM），考虑：

* 人员间相互作用力
* 人员与障碍物作用
* 驱动力（期望速度）
* 拥挤与碰撞影响

---

### 3️⃣ 路径搜索与空间建模

* 多层建筑结构建模（房间 / 门 / 楼梯）
* 路径搜索（Path Finding）
* 出口导向行为

---

### 4️⃣ 放射性扩散模拟

* 支持多核素（I-131, Cs-137, Xe-133 等）
* 反应堆与舱室扩散建模
* 剂量累积计算

---

### 5️⃣ 实时仿真数据输出

每一帧输出：

* 人员位置（x, y）
* 所在楼层 / 房间
* 是否到达安全区域
* 是否为领导者
* 累积辐射剂量

---

### 6️⃣ Web 可视化与交互

* 参数面板（左侧控制）
* 三维仿真展示区域（Three.js）
* 实时数据监控
* 系统日志与状态反馈

---

## 🏗️ 系统架构

```
前端（Bootstrap + Three.js）
        ↓
REST API（Django）
        ↓
仿真引擎（多线程）
        ↓
行为模型 + 路径规划 + 辐射模型
```

---

## ⚙️ 技术栈

| 层级 | 技术                                             |
| -- | ---------------------------------------------- |
| 前端 | HTML / CSS / Bootstrap / JavaScript / Three.js |
| 后端 | Django                                         |
| 仿真 | Python（多线程）                                    |
| 通信 | REST API（JSON）                                 |

---

## 📁 项目结构

```
Ed-simu/
├── simulat/
│   ├── HelloWorld/        # Django 主项目
│   ├── myapp/             # 核心应用
│   │   ├── simulate/      # 仿真模块
│   │   │   ├── simulation.py
│   │   │   ├── person.py
│   │   │   ├── radiation.py
│   │   │   ├── path_search.py
│   │   │   ├── simu_runner.py
│   │   │   └── simu_state.py
│   ├── templates/         # 前端页面
│   ├── statics/           # 静态资源
```

---

## 🔄 仿真运行机制

1. 前端设置参数（meta）
2. 发送至 `/api/meta/`
3. 用户点击“Start Simulation”
4. 后端开启仿真线程
5. 每一帧：

   * 更新人员状态
   * 计算路径与行为
   * 更新辐射剂量
   * 通过 API 推送数据
6. 前端实时渲染结果

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
venv\Scripts\activate   # Windows
# 或
source venv/bin/activate  # Linux / Mac
```

---

### 3️⃣ 安装依赖

```bash
pip install django requests numpy
```

---

### 4️⃣ 运行服务

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

## 📊 当前项目状态

✅ 已实现：

* 基础仿真框架
* 人员行为模型（SFM）
* 仿真线程控制
* Web 前端界面
* REST API 通信

🚧 进行中：

* 三维可视化优化
* 辐射模型精细化
* 性能优化（多线程 / 异步）
* WebSocket 实时通信

---

## 📜 License

MIT License

---

## 🤝 作者

* Weinberg
