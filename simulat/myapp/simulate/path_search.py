import numpy as np
import random

def generate_target_path(start_floor, start_room, geometry):
    """
    Generate a complete target path for a person moving upward
    Simple logic: if current room has stair, use it; otherwise find door to next room
    """
    target_path = []
    current_floor = start_floor
    current_room = start_room
    
    # Get highest floor
    max_floor = current_floor # max(geometry['floor'].keys())
    
    # print(f"Starting path: Floor {current_floor}, Room {current_room} -> Max floor: {max_floor}")
    
    # Move upward until reaching highest floor
    while current_floor <= max_floor:
        
        floor_geo = geometry['floor'][current_floor]
        chambers = floor_geo['chamber']
        
        # Check if current room has stair
        if 'stair' in chambers[current_room]:
            # Use the stair in current room
            stair = chambers[current_room]['stair']
            target_path.append(calcu_target(stair[1]))  # Stair bottom
            target_path.append(calcu_target(stair[2]))  # Stair top
            
            # Move to next floor
            if current_floor < max_floor:
                current_floor += 1

                # Find which room contains the stair top on the new floor
                current_room = find_room_id(
                    geometry['floor'][current_floor]['chamber'], 
                    calcu_target(stair[2])
                )
            else:
                return target_path
            
        else:
            # Find door to next room
            door_result = find_door(current_floor, current_room, geometry)
            
            if door_result is None:
                # print(f"No door found from room {current_room} on floor {current_floor}")
                break
                
            target_door, next_room = door_result
            target_path.append(target_door)
            current_room = next_room
            
            # print(f"Used door to move to Room {current_room} on Floor {current_floor}")
    
    # print(f"Final path length: {len(target_path)}")
    return target_path

def generate_graph(geometry):
    """
    构建门和楼梯节点的图结构
    """
    # 收集所有节点
    nodes = []
    node_dict = {}
    
    # 收集门节点
    for floor_num, floor_info in geometry['floor'].items():
        doors = floor_info.get('door', {})
        for door_id, door_info in doors.items():
            node_id = f"door_F{floor_num}_{door_id}"
            nodes.append({
                'id': node_id,
                'type': 'door',
                'floor': floor_num,
                'door_id': door_id,
                'position': calcu_target(door_info),
                'connects': door_info.get('connects', [])
            })
            node_dict[node_id] = len(nodes) - 1
    
    # 收集楼梯节点
    for floor_num, floor_info in geometry['floor'].items():
        chambers = floor_info['chamber']
        for room_id, chamber_info in chambers.items():
            if 'stair' in chamber_info:
                stair = chamber_info['stair']
                for stair_id, stair_info in stair.items():
                    node_id = f"stair_F{floor_num}_R{room_id}_S{stair_id}"
                    nodes.append({
                        'id': node_id,
                        'type': 'stair',
                        'floor': floor_num,  # 保持原始楼层信息
                        'room': room_id,
                        'stair_id': stair_id,
                        'position': calcu_target(stair_info),
                        'z_coord': calcu_target(stair_info)[2]  # 添加Z坐标用于判断
                    })
                    node_dict[node_id] = len(nodes) - 1
    
    n = len(nodes)
    adj_matrix = np.zeros((n, n), dtype=int)
    
    # 策略1: 房间内连接（优化版：楼梯底部在当前层，顶部在下一层）
    for floor_num, floor_info in geometry['floor'].items():
        chambers = floor_info['chamber']
        doors = floor_info.get('door', {})
        
        # 当前楼层的房间节点
        current_floor_room_nodes = {}
        for room_id in chambers.keys():
            current_floor_room_nodes[room_id] = []
        
        # 添加当前楼层的门
        for door_id, door_info in doors.items():
            connects = door_info.get('connects', [])
            door_node_id = f"door_F{floor_num}_{door_id}"
            if door_node_id in node_dict:
                for connected_room in connects:
                    if connected_room in current_floor_room_nodes:
                        current_floor_room_nodes[connected_room].append(door_node_id)
        
        # 添加当前楼层的楼梯底部（Z坐标较低的楼梯节点）
        for room_id, chamber_info in chambers.items():
            if 'stair' in chamber_info:
                stair = chamber_info['stair']
                stair_ids = sorted(stair.keys())
                
                # 找到Z坐标最低的楼梯节点作为底部（当前层），最高的作为顶部（下一层）
                if len(stair_ids) >= 2:
                    # 获取所有楼梯节点的Z坐标并排序
                    stair_z_coords = []
                    for stair_id in stair_ids:
                        stair_node_id = f"stair_F{floor_num}_R{room_id}_S{stair_id}"
                        if stair_node_id in node_dict:
                            z_coord = nodes[node_dict[stair_node_id]]['z_coord']
                            stair_z_coords.append((stair_id, z_coord, stair_node_id))
                    
                    stair_z_coords.sort(key=lambda x: x[1])  # 按Z坐标排序
                    
                    # Z坐标最低的作为底部（属于当前层）
                    bottom_stair_id, _, bottom_node_id = stair_z_coords[0]
                    current_floor_room_nodes[room_id].append(bottom_node_id)
                    
                    # Z坐标最高的作为顶部（属于下一层，稍后处理）
                    top_stair_id, _, top_node_id = stair_z_coords[-1]
                    # 顶部楼梯将在下一层的处理中加入
    
    # 策略1b: 为下一层添加楼梯顶部
    for floor_num in range(1, max(geometry['floor'].keys()) + 1):
        if floor_num in geometry['floor'] and floor_num > 1:  # 从第2层开始
            prev_floor_chambers = geometry['floor'][floor_num - 1]['chamber']
            
            # 下一层的房间节点
            next_floor_room_nodes = {}
            floor_chambers = geometry['floor'][floor_num]['chamber']
            for room_id in floor_chambers.keys():
                next_floor_room_nodes[room_id] = []
            
            # 添加下一层的门
            next_floor_doors = geometry['floor'][floor_num].get('door', {})
            for door_id, door_info in next_floor_doors.items():
                connects = door_info.get('connects', [])
                door_node_id = f"door_F{floor_num}_{door_id}"
                if door_node_id in node_dict:
                    for connected_room in connects:
                        if connected_room in next_floor_room_nodes:
                            next_floor_room_nodes[connected_room].append(door_node_id)
            
            # 添加来自上一层的楼梯顶部
            for room_id, chamber_info in prev_floor_chambers.items():
                if 'stair' in chamber_info:
                    stair = chamber_info['stair']
                    stair_ids = sorted(stair.keys())
                    
                    if len(stair_ids) >= 2:
                        # 获取Z坐标最高的楼梯节点作为顶部（属于下一层）
                        stair_z_coords = []
                        for stair_id in stair_ids:
                            stair_node_id = f"stair_F{floor_num-1}_R{room_id}_S{stair_id}"
                            if stair_node_id in node_dict:
                                z_coord = nodes[node_dict[stair_node_id]]['z_coord']
                                stair_z_coords.append((stair_id, z_coord, stair_node_id))
                        
                        stair_z_coords.sort(key=lambda x: x[1])
                        top_stair_id, top_z, top_node_id = stair_z_coords[-1]
                        
                        # 检查这个顶部楼梯是否应该属于下一层的房间
                        top_pos = nodes[node_dict[top_node_id]]['position']
                        target_room_id = find_room_id(floor_chambers, top_pos)
                        
                        if target_room_id is not None and target_room_id in next_floor_room_nodes:
                            next_floor_room_nodes[target_room_id].append(top_node_id)
                        elif room_id in next_floor_room_nodes:  # 如果找不到对应房间，使用相同房间ID
                            next_floor_room_nodes[room_id].append(top_node_id)
            
            # 在下一层房间内建立连接
            for room_id, room_node_list in next_floor_room_nodes.items():
                if len(room_node_list) > 1:
                    for i in range(len(room_node_list)):
                        for j in range(i + 1, len(room_node_list)):
                            idx1 = node_dict[room_node_list[i]]
                            idx2 = node_dict[room_node_list[j]]
                            
                            pos1 = nodes[idx1]['position']
                            pos2 = nodes[idx2]['position']
                            dist = np.linalg.norm(pos1 - pos2)
                            
                            adj_matrix[idx1, idx2] = dist
                            adj_matrix[idx2, idx1] = dist
    
    # 策略2: 同层房间内连接（门和楼梯底部）
    for floor_num, floor_info in geometry['floor'].items():
        chambers = floor_info['chamber']
        doors = floor_info.get('door', {})
        
        # 按房间组织节点
        room_nodes = {}
        for room_id in chambers.keys():
            room_nodes[room_id] = []
        
        # 添加门到对应房间
        for door_id, door_info in doors.items():
            connects = door_info.get('connects', [])
            door_node_id = f"door_F{floor_num}_{door_id}"
            if door_node_id in node_dict:
                for connected_room in connects:
                    if connected_room in room_nodes:
                        room_nodes[connected_room].append(door_node_id)
        
        # 添加楼梯底部到对应房间
        for room_id, chamber_info in chambers.items():
            if 'stair' in chamber_info:
                stair = chamber_info['stair']
                stair_ids = sorted(stair.keys())
                
                if len(stair_ids) >= 2:
                    # 获取Z坐标最低的楼梯节点作为底部
                    stair_z_coords = []
                    for stair_id in stair_ids:
                        stair_node_id = f"stair_F{floor_num}_R{room_id}_S{stair_id}"
                        if stair_node_id in node_dict:
                            z_coord = nodes[node_dict[stair_node_id]]['z_coord']
                            stair_z_coords.append((stair_id, z_coord, stair_node_id))
                    
                    stair_z_coords.sort(key=lambda x: x[1])
                    bottom_stair_id, _, bottom_node_id = stair_z_coords[0]
                    room_nodes[room_id].append(bottom_node_id)
        
        # 在房间内建立连接
        for room_id, room_node_list in room_nodes.items():
            if len(room_node_list) > 1:
                for i in range(len(room_node_list)):
                    for j in range(i + 1, len(room_node_list)):
                        idx1 = node_dict[room_node_list[i]]
                        idx2 = node_dict[room_node_list[j]]
                        
                        pos1 = nodes[idx1]['position']
                        pos2 = nodes[idx2]['position']
                        dist = np.linalg.norm(pos1 - pos2)
                        
                        adj_matrix[idx1, idx2] = dist
                        adj_matrix[idx2, idx1] = dist
    
    # 策略3: 楼梯内部连接（底部到顶部）
    for floor_num, floor_info in geometry['floor'].items():
        chambers = floor_info['chamber']
        for room_id, chamber_info in chambers.items():
            if 'stair' in chamber_info:
                stair = chamber_info['stair']
                stair_ids = sorted(stair.keys())
                
                if len(stair_ids) >= 2:
                    # 获取底部和顶部楼梯
                    stair_z_coords = []
                    for stair_id in stair_ids:
                        stair_node_id = f"stair_F{floor_num}_R{room_id}_S{stair_id}"
                        if stair_node_id in node_dict:
                            z_coord = nodes[node_dict[stair_node_id]]['z_coord']
                            stair_z_coords.append((stair_id, z_coord, stair_node_id))
                    
                    stair_z_coords.sort(key=lambda x: x[1])
                    bottom_stair_id, bottom_z, bottom_node_id = stair_z_coords[0]
                    top_stair_id, top_z, top_node_id = stair_z_coords[-1]
                    
                    if bottom_node_id in node_dict and top_node_id in node_dict:
                        idx1 = node_dict[bottom_node_id]
                        idx2 = node_dict[top_node_id]
                        
                        pos1 = nodes[idx1]['position']
                        pos2 = nodes[idx2]['position']
                        dist = np.linalg.norm(pos1 - pos2)
                        
                        adj_matrix[idx1, idx2] = dist
                        adj_matrix[idx2, idx1] = dist
    
    # 策略4: 楼层间楼梯连接（当前层楼梯顶部到下一层楼梯底部）
    for floor_num in range(1, max(geometry['floor'].keys())):
        if floor_num + 1 in geometry['floor']:
            current_floor_chambers = geometry['floor'][floor_num]['chamber']
            next_floor_chambers = geometry['floor'][floor_num + 1]['chamber']
            
            for room_id, chamber_info in current_floor_chambers.items():
                if 'stair' in chamber_info:
                    stair = chamber_info['stair']
                    stair_ids = sorted(stair.keys())
                    if len(stair_ids) >= 2:
                        # 获取当前层楼梯顶部
                        stair_z_coords = []
                        for stair_id in stair_ids:
                            stair_node_id = f"stair_F{floor_num}_R{room_id}_S{stair_id}"
                            if stair_node_id in node_dict:
                                z_coord = nodes[node_dict[stair_node_id]]['z_coord']
                                stair_z_coords.append((stair_id, z_coord, stair_node_id))
                        
                        stair_z_coords.sort(key=lambda x: x[1])
                        top_stair_id, top_z, current_top_id = stair_z_coords[-1]
                        
                        # 找到下一层对应位置的房间和楼梯底部
                        point = nodes[node_dict[current_top_id]]['position']
                        next_chamber_id = find_room_id(next_floor_chambers, point)
                        
                        if next_chamber_id is not None:
                            next_chamber_info = next_floor_chambers[next_chamber_id]
                            if 'stair' in next_chamber_info:
                                next_stair = next_chamber_info['stair']
                                next_stair_ids = sorted(next_stair.keys())
                                
                                if len(next_stair_ids) >= 2:
                                    # 获取下一层楼梯底部
                                    next_stair_z_coords = []
                                    for next_stair_id in next_stair_ids:
                                        next_stair_node_id = f"stair_F{floor_num + 1}_R{next_chamber_id}_S{next_stair_id}"
                                        if next_stair_node_id in node_dict:
                                            next_z = nodes[node_dict[next_stair_node_id]]['z_coord']
                                            next_stair_z_coords.append((next_stair_id, next_z, next_stair_node_id))
                                    
                                    next_stair_z_coords.sort(key=lambda x: x[1])
                                    bottom_stair_id, bottom_z, next_bottom_id = next_stair_z_coords[0]
                                    
                                    if current_top_id in node_dict and next_bottom_id in node_dict:
                                        idx1 = node_dict[current_top_id]
                                        idx2 = node_dict[next_bottom_id]
                                        
                                        adj_matrix[idx1, idx2] = 1.0  # 楼层间连接权重小
                                        adj_matrix[idx2, idx1] = 1.0
    
    return adj_matrix, nodes

def dijkstra_pathfinding(adj_matrix, nodes, start_node_id, end_node_id):
    """
    Dijkstra最短路径算法
    """
    n = len(nodes)
    
    try:
        start_idx = next(i for i, node in enumerate(nodes) if node['id'] == start_node_id)
        end_idx = next(i for i, node in enumerate(nodes) if node['id'] == end_node_id)
    except StopIteration:
        return [], float('inf')
    
    distances = [float('inf')] * n
    previous = [-1] * n
    distances[start_idx] = 0
    unvisited = set(range(n))
    
    while unvisited:
        current = min(unvisited, key=lambda x: distances[x])
        if distances[current] == float('inf'):
            break
        unvisited.remove(current)
        
        if current == end_idx:
            break
            
        for neighbor in range(n):
            if adj_matrix[current, neighbor] > 0 and neighbor in unvisited:
                new_distance = distances[current] + adj_matrix[current, neighbor]
                if new_distance < distances[neighbor]:
                    distances[neighbor] = new_distance
                    previous[neighbor] = current
    
    # 重构路径
    path = []
    pos_path = []
    current = end_idx
    while current != -1:
        path.append(nodes[current]['id'])
        pos_path.append(nodes[current]['position'])
        current = previous[current]
    path.reverse()
    pos_path.reverse()
    
    if path[0] != start_node_id:
        return [], float('inf')
    
    return path, pos_path, distances[end_idx]

def find_room_id(chambers, point):
    """Find which room contains the given point"""
    for room_id, room_info in chambers.items():
        room_x = room_info['x']
        room_y = room_info['y']
        
        if (room_x[0] <= point[0] <= room_x[1] and 
            room_y[0] <= point[1] <= room_y[1]):
            return room_id
    return None

def find_door(current_floor, current_chamber_id, geometry):
    """
    Return a random door connecting current chamber to next chamber
    """
    if current_floor not in geometry['floor']:
        return None
        
    doors = geometry['floor'][current_floor].get('door', {})
    
    # Collect all possible doors and connected rooms
    possible_doors = []
    
    for _, door_info in doors.items():
        connects = door_info.get('connects', [])
        
        if current_chamber_id in connects:
            # Find the connected room (the one that's not current_chamber_id)
            connected_rooms = [room for room in connects if room != current_chamber_id]
            if connected_rooms:
                target_door = calcu_target(door_info)
                next_room = connected_rooms[0]  # Take the first connected room
                possible_doors.append((target_door, next_room))
    
    # Randomly select one door if there are multiple options
    if possible_doors:
        return random.choice(possible_doors)
    
    return None

def calcu_target(target):
    """Calculate target position from geometry dict"""
    if isinstance(target, dict) and 'x' in target and 'y' in target and 'z' in target:
        return np.array([target['x'][1],
                        (target['y'][0] + target['y'][1]) / 2,
                        target['z'][0]])
    else:
        return np.array(target)


# from constants import geometry
# # print(generate_target_path(1,2,geometry))
# adj_matrix,node_info = generate_graph(geometry) 
# # print("number of nodes:", len(node_info))
# for i, node in enumerate(node_info):
#     print(f"node {i}: {node}")

# # 打印邻接矩阵
# print("the shape of matrix:", adj_matrix.shape)
# print("adjoint matrix:")
# print(adj_matrix)

# start_node = "door_F1_1"
# end_node = "stair_F3_R1_S2"

# path,pos, _ = dijkstra_pathfinding(adj_matrix,node_info, start_node, end_node)
# print("dijkstra_path:")
# print(path)
# print(pos)
