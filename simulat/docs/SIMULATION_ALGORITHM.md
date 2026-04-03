# HelloWorld 仿真算法文档

## 1. 概述
项目仿真由三部分组成：
- 行人运动学/动力学（Social Force + 群体行为）
- 几何导航（门、楼梯、图搜索）
- 辐射活度与个体累积剂量

主入口函数: `myapp/simulate/simulation.py::run_simulation_export_channel`

## 2. 符号与参数
核心参数来自 `myapp/simulate/constants.py`：

- `A_SOCIAL`, `B_SOCIAL`: 社会力模型参数
- `TAU`: 驱动力响应时间常数
- `V0`, `expV`: 期望速度
- `PERSON_RADIUS`: 行人半径
- `DT`: 时间步长
- `k`, `Kappa`: 压缩力与切向摩擦系数
- `max_force`: 合力限幅
- `MAX_FRAMES`: 仿真最大帧数

## 3. 人员初始化算法
### 3.1 随机初始化
`initialize_persons(num_persons, ...)`：
1. 随机选择楼层与房间。
2. 在房间几何范围内随机采样 `(x,y,z)`。
3. 调用 `generate_target_path` 生成目标路径。
4. 检测与已有个体重叠，若重叠则扰动位置。
5. 若启用领导者，构造图并使用 Dijkstra 设置领导路径。

### 3.2 按房间固定人数初始化
`initialize_persons_per_chamber(num_persons_per_chamber, ...)`：
- 遍历所有有效 chamber，每个 chamber 生成固定人数。

## 4. 力模型
个体 `i` 的总受力:

`F_i = F_drive + F_person + F_obstacle + F_viscous`

对应加速度:

`a_i = F_i / m_i`

### 4.1 驱动力 `F_drive`
`person.py::f_drive` 实现：

`F_drive = m_i * (v0_i * e_i - v_i) / TAU`

- `e_i`: 目标方向单位向量
- `v0_i`: 期望速度，楼梯区域会做坡度修正
- 非领导者方向可受邻居平均速度方向影响（恐慌系数 `p`）

### 4.2 人际作用力 `F_person`
对同房间/同区域邻居累计：
- 法向排斥与压缩项
- 切向摩擦项
- 结果限幅 `max_force`

### 4.3 障碍作用力 `F_obstacle`
1. 从离散墙体点中选取最近点对。
2. 用线段最近点近似墙面接触点。
3. 计算法向排斥 + 切向摩擦。

## 5. 运动更新
每帧对未完成个体执行：
1. `check_target()`：目标是否到达
2. `update_acceleration(persons, OBSTACLE_POINTS)`
3. `update_velocity(persons)`：并做速度上限截断
4. `update_position()`：位置积分并做楼层地面约束

## 6. 区域与目标切换
### 6.1 区域判定
`_update_region()` 通过坐标判断：
- `floor`
- `rid`（room id）
- `region`（`chamber` / `stair`）

### 6.2 目标策略
- 有楼梯:
  - 先到楼梯底，再到楼梯顶
- 无楼梯:
  - 在可用门中选择目标门中心
- 领导者:
  - 使用 `generate_graph + dijkstra_pathfinding` 预生成路径

## 7. 导航图与最短路
`path_search.py` 构建节点图：
- 节点类型: `door`, `stair`
- 边权:
  - 房间内节点距离
  - 楼梯上下连接
  - 跨层楼梯连接（权重较小）

然后用 Dijkstra 求解从起点到终点的最短路径。

## 8. 辐射活度与剂量
### 8.1 反应堆舱室
`radiation.py::RadiationReactor`：
- 对每个核素建立常微分方程
- `solve_ivp` 数值积分求解活度曲线

### 8.2 其他舱室
`radiation.py::RadiationOther`：
- 以上游舱室活度插值作为源项
- 级联求解多个舱室

### 8.3 个体剂量累计
`simulation.py` 当前采用简化计算：
- 按个体所在 room 映射当前活度
- `dose += k_simple_factor * activity * DT`

## 9. 主循环伪代码
```text
init persons
init radiation solutions
frame = 0
while persons not empty and frame < MAX_FRAMES:
  if command == reset: break
  if command == pause: sleep; continue
  current_time = frame * DT
  activity_map = interpolate(radiation, current_time)
  for person in persons:
    export turtle record
    if finished: mark remove
    else:
      update dose
      check_target
      update_acceleration
      update_velocity
      update_position
  POST turtles to API
  frame += 1
return frame * DT
```

## 10. 复杂度与性能关注点
- 近邻计算: 当前为全量遍历，人数增长时 `O(N^2)` 风险明显。
- 障碍点搜索: 当前线性扫描，点数大时开销增加。
- 内部 HTTP 回写: 增加序列化和网络栈成本。

优化建议:
1. 引入空间索引（网格桶或 KD-Tree）。
2. 障碍点按房间分块缓存。
3. 用进程内队列替代 `requests.post` 回写。

## 11. 模型局限与改进方向
- 剂量模型当前为比例近似，未包含人体屏蔽、停留时间细化与路径暴露差异。
- 群体行为参数缺少校准流程。
- 楼梯与门通过逻辑可进一步引入拥堵容量约束。

