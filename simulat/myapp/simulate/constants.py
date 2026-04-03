import numpy as np

# 社会力模型参数
A_SOCIAL = 2000.0 # N
B_SOCIAL = 0.08 # m
TAU = 0.5  # responsed time
V0 = 2.4  # expected velocity
PERSON_RADIUS = 0.3
DT = 0.05  # 时间步长
k = 1.2e5 # compress coeff
Kappa = 2.4e5 # friction coeff

# 环境参数
STAIR_HORISON = 2
STAIR_WIDTH = 1 
FLOOR_HEIGHT = 4
SLOPE_ANGLE = np.tanh(FLOOR_HEIGHT/STAIR_HORISON)
REACTOR_RADIUS = 2.5
REACTOR_HEIGHT = 5
GAP = 0.5

CHAMBER_WIDTH = 8

max_force = 1000
MAX_FRAMES = 5000 # 安全上限

geometry = {
    'floor': {
        1: {
            'chamber': {
                1: {
                    'x':  [-11 , -REACTOR_RADIUS - 0.5], 'y':  [-CHAMBER_WIDTH/2, CHAMBER_WIDTH/2], 'z': [0, 0],
                    'stair':{
                        1: {'x': [-9,-9],                    'y':  [1, 1+STAIR_WIDTH], 'z': [0, FLOOR_HEIGHT]},  
                        2: {'x': [-9, -9 + STAIR_HORISON],   'y':  [1, 1+STAIR_WIDTH], 'z': [FLOOR_HEIGHT, FLOOR_HEIGHT]},
                    }, 
                },   # the size of chamber
                2: {
                    'x':  [-20, -11],'y':  [-CHAMBER_WIDTH/2, CHAMBER_WIDTH/2], 'z': [0, 0],
                    # 'stair':{
                    #     1: {'x': [-13,-13],                  'y':  [1, 1+STAIR_WIDTH], 'z': [0, FLOOR_HEIGHT]},
                    #     2: {'x': [-13, -13 + STAIR_HORISON], 'y':  [1, 1+STAIR_WIDTH], 'z': [FLOOR_HEIGHT, FLOOR_HEIGHT]},
                    # } 
                },

                3: {'x':  [-32, -20],'y':  [-CHAMBER_WIDTH/2, CHAMBER_WIDTH/2], 'z': [0, 0]},  # the size of chamber

            },
            'door': {
                # Door 1: Connects Chamber 1 and Chamber 2 (Floor 1)
                1: {
                    'x': [-11, -11], 'y':  [0, 1.5], 'z': [0, 0],
                    'open': True,
                    'connects': [1, 2]
                },
                # Door 2: Connects Chamber 2 and Chamber 3 (Floor 1)
                2: {
                    'x': [-20, -20], 'y':  [0, 1.5],'z': [0, 0],
                    'open': True,
                    'connects': [2, 3]
                },
            }
        },
        2: {
            'chamber': {
                3: {
                    'x':  [-35, -20],'y':  [-CHAMBER_WIDTH/2, CHAMBER_WIDTH/2], 'z': [FLOOR_HEIGHT, FLOOR_HEIGHT],
                    # 'stair':{
                    #     1: {'x': [-16,-16],                 'y':  [0, 0+STAIR_WIDTH],   'z': [FLOOR_HEIGHT, FLOOR_HEIGHT * 2]},  
                    #     2: {'x': [-16, -16+ STAIR_HORISON], 'y':  [0, 0+STAIR_WIDTH],   'z': [FLOOR_HEIGHT * 2, FLOOR_HEIGHT * 2]},   
                    # },   
                },
                2: {
                    'x':  [-20, -10],'y':  [-CHAMBER_WIDTH/2, CHAMBER_WIDTH/2], 'z': [FLOOR_HEIGHT, FLOOR_HEIGHT],
                    'stair':{
                        1: {'x': [-18, -18],                 'y':  [0, 0+STAIR_WIDTH],   'z': [FLOOR_HEIGHT, FLOOR_HEIGHT * 2]},  
                        2: {'x': [-18, -18+ STAIR_HORISON], 'y':  [0, 0+STAIR_WIDTH],   'z': [FLOOR_HEIGHT * 2, FLOOR_HEIGHT * 2]},
                    },
                },
                1: {
                    'x':  [-10, -REACTOR_RADIUS - GAP],  'y':  [-CHAMBER_WIDTH/2, CHAMBER_WIDTH/2], 'z': [FLOOR_HEIGHT, FLOOR_HEIGHT],
                    # 'stair': {
                    #     1: {'x': [-6, -6],                  'y':  [0, 0 + STAIR_WIDTH], 'z': [FLOOR_HEIGHT, FLOOR_HEIGHT * 2]},
                    #     2: {'x': [-6, -6 + STAIR_HORISON],  'y':  [0, 0+STAIR_WIDTH],   'z': [FLOOR_HEIGHT * 2, FLOOR_HEIGHT * 2]},
                    # },
                },
                # 4: {'x':  [-30, -20],                      'y':  [-CHAMBER_WIDTH/2, CHAMBER_WIDTH/2], 'z': [FLOOR_HEIGHT, FLOOR_HEIGHT]},
                # 5: {'x':  [-40, -30],    'y':  [-CHAMBER_WIDTH/2, CHAMBER_WIDTH/2], 'z': [FLOOR_HEIGHT, FLOOR_HEIGHT]},
            },
            'door': {
                1: {
                    'x': [-10, -10],'y':  [-0.5, 1],'z': [FLOOR_HEIGHT, FLOOR_HEIGHT],
                    'open': True,
                    'connects': [1, 2]
                },
                # 2: {
                #     'x': [8, 8], 'y':  [-1, 0.5],'z': [FLOOR_HEIGHT, FLOOR_HEIGHT],
                #     'open': True,
                #     'connects': [4, 5]
                # },
                # Door 3: Connects Stair 1 and Floor 2 Stair 1 (Floor 3 - Bottom)
                2: {
                    'x': [-20, -20],'y':  [-0.5, 1.0], 'z': [FLOOR_HEIGHT, FLOOR_HEIGHT], # Floor 3 level (bottom of stair 1, connects from Floor 2)
                    'open': True,
                    'connects': [2, 3]
                }
            }
        },
        3: {
            'chamber': {
                3: {
                    'x':  [-40, -20],'y':  [-CHAMBER_WIDTH/2, CHAMBER_WIDTH/2], 'z': [FLOOR_HEIGHT*2, FLOOR_HEIGHT*2],
                    'stair':{
                        1: {'x': [-30, -30],                    'y':  [-1, -1 + STAIR_WIDTH], 'z': [FLOOR_HEIGHT*2, FLOOR_HEIGHT * 3]}, 
                        2: {'x': [-30, -30 + STAIR_HORISON],    'y':  [-1, -1 + STAIR_WIDTH], 'z': [FLOOR_HEIGHT * 3, FLOOR_HEIGHT * 3]},
                    },
                },
                2: {
                    'x':  [-20, -13],'y':  [-CHAMBER_WIDTH/2, CHAMBER_WIDTH/2], 'z': [FLOOR_HEIGHT*2, FLOOR_HEIGHT*2],
                    # 'stair':{
                    #     1: {'x': [-11,-11],                     'y':  [-1, -1 + STAIR_WIDTH], 'z': [FLOOR_HEIGHT*2, FLOOR_HEIGHT * 3]},  
                    #     2: {'x': [-11, -11+ STAIR_HORISON],     'y':  [-1, -1 + STAIR_WIDTH], 'z': [FLOOR_HEIGHT * 3, FLOOR_HEIGHT * 3]},
                    # },
                },
                1: {
                    'x':  [-13, -REACTOR_RADIUS - GAP],  'y':  [-CHAMBER_WIDTH/2, CHAMBER_WIDTH/2], 'z': [FLOOR_HEIGHT*2, FLOOR_HEIGHT*2],
                    'stair':{
                        1: {'x': [-8,-8],                       'y':  [-1, -1 + STAIR_WIDTH], 'z': [FLOOR_HEIGHT*2, FLOOR_HEIGHT * 3]},  
                        2: {'x': [-8, -8+ STAIR_HORISON],       'y':  [-1, -1 + STAIR_WIDTH], 'z': [FLOOR_HEIGHT * 3, FLOOR_HEIGHT * 3]},
                    },
                },
                # 4: {'x':  [-30, -20],    'y':  [-CHAMBER_WIDTH/2, CHAMBER_WIDTH/2], 'z': [FLOOR_HEIGHT, FLOOR_HEIGHT]},
                # 5: {'x':  [-40, -30],    'y':  [-CHAMBER_WIDTH/2, CHAMBER_WIDTH/2], 'z': [FLOOR_HEIGHT, FLOOR_HEIGHT]},
                # 4: {'x':  [REACTOR_RADIUS + GAP, 8],    'y':  [-CHAMBER_WIDTH/2, CHAMBER_WIDTH/2], 'z': [FLOOR_HEIGHT*2, FLOOR_HEIGHT*2]},
                # 5: {'x':  [8, 13],'y':  [-CHAMBER_WIDTH/2, CHAMBER_WIDTH/2], 'z': [FLOOR_HEIGHT*2, FLOOR_HEIGHT*2]},
                # 6: {'x':  [13, 20],'y':  [-CHAMBER_WIDTH/2, CHAMBER_WIDTH/2], 'z': [FLOOR_HEIGHT*2, FLOOR_HEIGHT*2]},
            },
            'door': {
                # Door 1: Connects Chamber 2 and Chamber 3 (Floor 3)
                1: {
                    'x': [-13, -13],'y':  [-1, 0.5],'z': [FLOOR_HEIGHT*2, FLOOR_HEIGHT*2],
                    'open': True,
                    'connects': [2, 1]
                },
                # Door 2: Connects Chamber 4 and Chamber 5 (Floor 3)
                # 2: {
                #     'x': [8, 8], 'y':  [-1, 0.5],'z': [FLOOR_HEIGHT*2, FLOOR_HEIGHT*2],
                #     'open': True,
                #     'connects': [4, 5]
                # },
                # Door 3: Connects Stair 1 and Floor 2 Stair 1 (Floor 3 - Bottom)
                2: {
                    'x': [-20, -20],'y':  [-1., -0.0], 'z': [FLOOR_HEIGHT*2, FLOOR_HEIGHT*2], # Floor 3 level (bottom of stair 1, connects from Floor 2)
                    'open': True,
                    'connects': [3, 2]
                }
            }
        },
    },
    'reactor':{
        'position': [0, 0, 1.5],   # position [x, y, z]
        'radius': REACTOR_RADIUS,  # radius
        'height': REACTOR_HEIGHT,  # height
        'V0': 100,                 # 反应堆体积 (m³)
        'f0': 10                   # 通风流量 (m³/h)
    }

}

def generate_obstacle(geometry, spacing=0.5):
    """从geometry生成所有墙壁障碍物点，排除门的位置"""
    obstacle_points = []
    
    for _, floor_info in geometry['floor'].items():
        # 获取该楼层所有门的信息
        floor_doors = list(floor_info.get('door', {}).values())
        
        for room_id, room_info in floor_info['chamber'].items():
            points = _generate_room_wall_points(room_info, floor_doors, room_id, spacing)
            obstacle_points.extend(points)
    
    # print(f"Generated {len(obstacle_points)} wall obstacle points (doors excluded)")
    return np.array(obstacle_points)

def _generate_room_wall_points(room_info, floor_doors, room_id, spacing):
    """为单个房间生成墙壁障碍物点，排除门的位置"""
    points = []
    x_min, x_max = room_info['x']
    y_min, y_max = room_info['y']
    z_val = room_info['z'][0]
    
    # 找到与该房间相关的门
    room_doors = [door for door in floor_doors if room_id in door.get('connects', [])]
    
    # 生成左墙点 (x = x_min)，跳过门的位置
    y_positions = np.arange(y_min, y_max + spacing/2, spacing)
    for y in y_positions:
        # 直接检查这个点是否在任何门的范围内
        in_door = False
        for door in room_doors:
            door_x, door_y = door['x'], door['y']
            # 检查是否在垂直门的范围内
            if abs(door_x[0] - x_min) < 0.1 and door_y[0] <= y <= door_y[1]:
                in_door = True
                break
        if not in_door:
            points.append(np.array([x_min, y, z_val], dtype=np.float64))
    
    # 生成右墙点 (x = x_max)，跳过门的位置
    for y in y_positions:
        in_door = False
        for door in room_doors:
            door_x, door_y = door['x'], door['y']
            if abs(door_x[0] - x_max) < 0.1 and door_y[0] <= y <= door_y[1]:
                in_door = True
                break
        if not in_door:
            points.append(np.array([x_max, y, z_val], dtype=np.float64))
    
    # 生成前墙点 (y = y_min)
    x_positions = np.arange(x_min, x_max + spacing/2, spacing)
    for x in x_positions:
        points.append(np.array([x, y_min, z_val], dtype=np.float64))
    
    # 生成后墙点 (y = y_max)
    for x in x_positions:
        points.append(np.array([x, y_max, z_val], dtype=np.float64))
    
    return np.array(points)

OBSTACLE_POINTS = generate_obstacle(geometry)


nuclide_params_list = [
    {
        'name': 'I-131',
        'T_i': 8.02 * 24 * 3600,  # 半衰期（秒），8.02天
        'P_i_func': lambda t: 1000 * np.exp(-t/(5*3600)),  # 生产率函数
        'l_i_func': 0.1,  # 泄漏率（常数）
        'L_0i': 0.01  # 从反应堆舱室泄漏到其他舱室的泄漏率
    },
    {
        'name': 'Cs-137',
        'T_i': 30.17 * 365 * 24 * 3600,  # 半衰期（秒），30.17年
        'P_i_func': lambda t: 500 * np.exp(-t/(10*3600)),  # 生产率函数
        'l_i_func': 0.05,  # 泄漏率（常数）
        'L_0i': 0.005  # 从反应堆舱室泄漏到其他舱室的泄漏率
    },
    {
        'name': 'Xe-133',
        'T_i': 5.243 * 24 * 3600,  # 半衰期（秒），5.243天
        'P_i_func': lambda t: 800 * np.exp(-t/(3*3600)),  # 生产率函数
        'l_i_func': 0.15,  # 泄漏率（常数）
        'L_0i': 0.02,  # 从反应堆舱室泄漏到其他舱室的泄漏率
        # 如果有母核衰变，可以添加parent_decay项
        # 'parent_decay': [(0, 0.001)]  # 表示从第一个核素(I-131)衰变产生，衰变常数为0.001
    }
]


def g(r_ij, d_ij):
    """
    g(x) = max(0, x), friction activating function
    """
    x = r_ij - d_ij
    return np.maximum(0, x) 


