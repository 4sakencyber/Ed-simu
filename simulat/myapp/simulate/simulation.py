import numpy as np
import matplotlib.pyplot as plt
import matplotlib.animation as animation
import csv
import json
import requests
from .simu_state import state
import time
META_API = "http://127.0.0.1:8000/myapp/api/meta/"
TURTLE_API = "http://127.0.0.1:8000/myapp/api/turtles/"
from .constants import geometry, nuclide_params_list, OBSTACLE_POINTS, DT, MAX_FRAMES
from .person import Person3D
from .path_search import generate_target_path, dijkstra_pathfinding, generate_graph
## new import for radiation simulation
from .radiation import RadiationReactor, RadiationOther

def initialize_persons(num_persons, leader = False, panic=0, expV=1.3):
    """初始化人员"""
    
    # 创建人员
    persons = {}

    return persons

def initialize_persons_per_chamber(num_persons_per_chamber,  leader = False, panic=0, expV=1.3):
    """
    初始化人员，每个房间内生成指定数量的人员。
    """
    persons = {}
    return persons

def format_float(val, decimals=2):
    """辅助函数：确保浮点数精度符合你的可视化要求"""
    return round(float(val), decimals)

def run_simulation_export_channel(num_persons,  
                               random_pos=True, leader=False, 
                               panic=0, expV=1.3):
    
    print(f"Starting simulation for {num_persons} persons...")
    frame_count = 0
    max_frames = MAX_FRAMES # 安全上限

    # 1. 初始化人员 (逻辑保持不变)
    if random_pos is True:
        persons = initialize_persons(num_persons, leader, panic, expV)
    else:
        persons = initialize_persons_per_chamber(num_persons, leader, panic, expV)
    


    # initialize radiation simulation
    radiation_reactor = RadiationReactor(V0=100, f0=10)
    radiation_other = RadiationOther( # 其他舱室参数
                                        V_k=80,   # 舱室体积 (m³)
                                        f_k=50,    # 通风流量 (m³/h)
                                        p_k=20    # 除碘过滤器流量 (m³/h)
    )
    # Radiation simulation
    t_span = [0, 100]  # 模拟时间范围
    t_eval = np.linspace(0, 100, 10000)  # 时间点
    A0_list = [100.0, 50.0, 80.0]  # 初始活度

    reactor_solution = radiation_reactor.simulate_nuclides(nuclide_params_list, t_span, t_eval, A0_list=A0_list)
    other_solution_1 = radiation_other.simulate_nuclides(
        nuclide_params_list, 
        reactor_solution, 
        t_span, 
        t_eval, 
        A0_list=[0.0] * len(nuclide_params_list)
    )
    other_solution_2 = radiation_other.simulate_nuclides(
        nuclide_params_list, 
        other_solution_1, 
        t_span, 
        t_eval, 
        A0_list=[0.0] * len(nuclide_params_list)
    )
    other_solution_3 = radiation_other.simulate_nuclides(
        nuclide_params_list, 
        other_solution_2, 
        t_span, 
        t_eval, 
        A0_list=[0.0] * len(nuclide_params_list)
    )



    current_persons = persons.copy() if persons else {}

    print("Calculating physics steps...")

    while current_persons and frame_count < max_frames:

        # 控制检查
        if state["command"] == "reset":
            print("Simulation Reset")
            break

        if state["command"] == "pause":
            time.sleep(0.01)
            continue


        current_time = frame_count * DT
        turtles = []
        to_delete = []

        # --- 查询当前时间点的活度 ---
        current_other_activity_1 = 0.0
        current_other_activity_2 = 0.0
        current_other_activity_3 = 0.0
        if len(reactor_solution.t) > 0 and current_time <= reactor_solution.t[-1]:
            # current_reactor_activity = np.interp(
            #     current_time, 
            #     reactor_solution.t, 
            #     reactor_solution.y.sum(axis=0)
            # )
            current_other_activity_1 = np.interp(
                current_time, 
                other_solution_1.t, 
                other_solution_1.y.sum(axis=0)
            )
            current_other_activity_2 = np.interp(
                current_time, 
                other_solution_2.t, 
                other_solution_2.y.sum(axis=0)
            )
            current_other_activity_3 = np.interp(
                current_time, 
                other_solution_3.t, 
                other_solution_3.y.sum(axis=0)
            )

            # --- 构建活度查找表 ---
            # Chamber ID are 1, 2, 3. 
            # 这个映射需要与 person.rid 的实际值对应。
            activity_map = {
                1: current_other_activity_1,
                2: current_other_activity_2,
                3: current_other_activity_3,
            }
        
        
        for pid, person in current_persons.items():
            agent_data = {
                "id": int(pid),
                "pos": [format_float(person.position[0]), format_float(person.position[1]), format_float(person.position[2])],
                "floor": int(person.floor),
                "room": int(person.rid),
                "is_leader": bool(person.leader),
                "finished": bool(person.reached_target),
                "region": str(person.region),
                ## New data -- I don't know if the dose shall be format_float() or not
                "dose": person.cumulative_dose

            }
            turtles.append(agent_data)

            # 3. 物理更新逻辑
            if person.reached_target:
                to_delete.append(pid)
                continue
            
            ## --- cumulative dose calculation （will be replaced by LU Jia）---
            k_simple_factor = 1e-12 # 简化的剂量转换系数
            room_activity = activity_map.get(person.rid, 0.0)
            dose_rate = k_simple_factor * room_activity
            person.cumulative_dose += dose_rate * DT # 累加剂量

            person.check_target()
            if not person.reached_target:
                person.update_acceleration(current_persons, OBSTACLE_POINTS)
                person.update_velocity()
                person.update_position()

        # 将当前帧数据添加到 JSON 结构中
        frame_count += 1
        payload = {
            "frame": frame_count,
            "turtles": turtles
        }

        requests.post(TURTLE_API, json=payload)


        if frame_count % 100 == 0:
            print(f"Processed frame {frame_count}, Time: {current_time:.2f}s, Remaining agents: {len(current_persons)}")


    completion_time = frame_count * DT

    
    print("Send successfully!")
    return completion_time