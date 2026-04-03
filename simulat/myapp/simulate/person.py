import random 
import numpy as np
from .constants import A_SOCIAL, B_SOCIAL, TAU, V0, PERSON_RADIUS, DT, geometry, FLOOR_HEIGHT, k, Kappa,  max_force, g
# from constants import OBSTACLE_POINTS, SLOPE_ANGLE


def calcu_target(target):
    """target is the dict of next desination"""
    return np.array([target['x'][1],
                    (target['y'][0] + target['y'][1]) / 2,
                    target['z'][0]])


class Person3D:
    def __init__(self, position, target_path=[], slope_angle=0, panic=0,expV=1.3):
        self.radius = np.random.uniform(0.5, 0.7) / 2.0
        self.mass = np.random.normal(65, 20)  # random mass distribusion(50-80 kg)
        self.max_speed = 2.0
        self.slope_angle = slope_angle 
        self.expV = expV

        ## target management
        self.target_list = target_path ## record all the targets
        self.target = target_path.pop(0) ## pop out first item of target_list as current target

        self.position = np.array(position).astype(np.float64)
        self.velocity = np.array([0.0, 0.0, 0.0], dtype=np.float64)
        self.acceleration = np.zeros(3, dtype=np.float64)
        self.e = np.zeros(3, dtype=np.float64)  # desired direction unit vector
        self.reached_target = False
        self.arround = False # check the environment(persons, obstacles etc.) around self

        ## the default position of person
        self.floor = None
        self.region = None
        self.rid = None

        # --- Mass Behaviour Model Attributes ---
        self.p = panic # p_i (0: individualistic, 1: herding)
        self.R_n = self.radius * 10  # neighborhood radius 
        self.tot_f = np.zeros(3)  # total force acting on the person
        
        ## --- Leadership ----
        self.leader = False

        ## ---- cummulative dose ----
        self.cumulative_dose = 0.0  # 累积剂量
    
    def f_drive(self, persons):
        """计算朝向目标的内驱力, with influence of slope and Mass Behaviour Effect"""
        effective_v0 = self.expV
        e = self.target - self.position
        e_norm = np.linalg.norm(e)

        if e_norm < 1e-3:
            e_norm = 1e-3
        e_init = e / e_norm
        
        if  self.leader == False :
            e_bar = e_init 
            neighbor_directions = []
            for person in persons.values():
                if (person is self or 
                    person.floor != self.floor or
                    person.region != self.region or
                    person.rid != self.rid):
                    continue
                else:
                    distance_to_neighbor = np.linalg.norm(self.position - person.position)

                    if distance_to_neighbor <= self.R_n:
                        if person.leader == True and self.region == person.region: 
                            if np.linalg.norm(person.velocity) < 1e-3:
                                neighbor_e0 = person.velocity / 1e-3
                            else:
                                neighbor_e0 = person.velocity / np.linalg.norm(person.velocity)

                            self.target = person.target
                            
                            neighbor_directions.clear()
                            neighbor_directions.append(neighbor_e0)
                            break
                        else:

                            neighbor_e0 = person.velocity / max(np.linalg.norm(person.velocity), 1e-3)
                            neighbor_directions.append(neighbor_e0)                    

            if neighbor_directions:
                e_bar = np.mean(neighbor_directions, axis=0)
                if np.linalg.norm(e_bar) > 0:
                    e_bar = e_bar / np.linalg.norm(e_bar)

            # e0_i(t) = N[(1 - p_i) * e_i + p_i * <e0_j(t)>_i]
            e_tot = (1 - self.p) * e_init + self.p * e_bar
            if np.linalg.norm(e_tot) > 1e-3:
                e0 = e_tot / np.linalg.norm(e_tot)
            else:
                e0 = e_init  

        elif self.leader == True:
            e0 = e_init

        if self.region == "stair":
            slope_factor = np.cos(self.slope_angle)
            effective_v0 = self.expV * slope_factor
        
        # e0 = e_init
        self.e = e0
        # F_self = m * (v0 * e - v) / tau
        force = self.mass * (effective_v0 * e0 - self.velocity) / TAU
        return force

    def f_person(self, persons):
        """计算人与人之间的社会力"""
        total_force = np.zeros(3)

        for person in persons.values():
            if (person is self or
                person.floor != self.floor or 
                person.region != self.region or 
                person.rid != self.rid):

                continue

            diff =  person.position - self.position
            d_ij = np.linalg.norm(diff)
            if d_ij < 1e-3:
                d_ij = 1e-3
            # 法向单位向量 n_ij
            n = -diff / d_ij
            r_ij = self.radius + person.radius
            # 法向力
            f_n = (A_SOCIAL * np.exp((r_ij - d_ij) / B_SOCIAL) + k * g(r_ij, d_ij)) * n

            # 切向单位向量 t_ij
            t = np.array([-n[1], n[0], 0.0])

            # 切向力：-κ * g * (dv · t) * t
            dv_t = np.dot(person.velocity - self.velocity, t)
            f_t = Kappa * g(r_ij, d_ij) * dv_t * t

            # 累加
            total_force += f_n + f_t

        norm_tot_f = np.linalg.norm(total_force)
        if norm_tot_f == 0: # 防止除以零
            return total_force
        elif norm_tot_f < max_force:
            return total_force
        else:
            e_f = total_force / norm_tot_f
            return max_force * e_f

    ## Obstracle Force
    def _get_closest_point_on_segment(self, P, A, B):
        ap = P - A
        ab = B - A
        l2 = np.dot(ab, ab)
        if l2 < 1e-3:
            return A.copy()
        t = np.dot(ap, ab) / l2
        t = np.clip(t, 0.0, 1.0)
        return A + t * ab

    def get_nearby_obstacle_points(self, obstacle_points):
        nearby = []
        for point in obstacle_points:
            dist = np.linalg.norm(self.position - point)
            if dist <= self.radius * 2:
                nearby.append({'point': point, 'dist': dist})
        if not nearby:
            return None
        nearby.sort(key=lambda x: x['dist'])
        p1 = nearby[0]['point']
        p2 = nearby[1]['point'] if len(nearby) > 1 else p1
        return [p1, p2]
    
    def f_obs(self, obs):
        """
        动态寻找最近两点组成线段，并计算线段对行人的合力
        """
        nearby = self.get_nearby_obstacle_points(obs)
        if nearby is None:
            return np.zeros(3)
        p1, p2 = nearby
        p_closed = self._get_closest_point_on_segment(self.position, p1, p2)
        d_ij = np.linalg.norm(self.position - p_closed)
        if d_ij < 1e-3:
            d_ij = 1e-3
        n = (self.position - p_closed) / d_ij  # points from wall to person
        r_ij = self.radius  # wall has no radius

        f_n = (A_SOCIAL * np.exp((r_ij - d_ij) / B_SOCIAL) + k * g(r_ij, d_ij)) * n
        t = np.array([-n[1], n[0], 0.0])
        dv_t = np.dot(-self.velocity, t)  # wall velocity = 0
        f_t = Kappa * g(r_ij, d_ij) * dv_t * t

        f_tot = f_t + f_n 
        return f_tot
        # e_f = f_tot / np.linalg.norm(f_tot)
        # if np.linalg.norm(f_tot) < max_force:
        #     return f_tot
        # else:
        #     return max_force * e_f

 
    ## update pos
    def update_acceleration(self, persons, obs):
        """更新加速度"""
        # 内驱力
        f_self = self.f_drive(persons)
        
        # 人与人之间的力
        f_social = self.f_person(persons)

        if self.region == 'chamber':
            f_social = self.f_person(persons)
        else:
            f_social = np.zeros(3)

        f_iO = np.zeros(3)
        # obstacle force
        if self.region == 'chamber' and self.rid is not None:
            f_iO = self.f_obs(obs)
        f_viscous = - self.mass * self.velocity/TAU

        total_force = f_self + f_social + f_iO + f_viscous
        e_f = total_force / max(np.linalg.norm(total_force), 1e-3)
        if np.linalg.norm(total_force) > max_force:
            total_force = max_force * e_f

        self.tot_f = total_force
        self.acceleration = total_force / self.mass

    def update_velocity(self, persons):
        """更新速度"""
        self.velocity += self.acceleration * DT
        
        # 限制最大速度
        speed = np.linalg.norm(self.velocity)
        if speed > self.max_speed :
            self.velocity = self.velocity / speed * self.max_speed

        # # in stair, control person numbers
        if self.region == 'stair':
            for _, other_person in persons.items(): 
                if (other_person is not self and 
                    other_person.floor == self.floor and 
                    other_person.region == self.region and 
                    other_person.rid == self.rid and
                    other_person.position[2] > self.position[2]):  
                    
                    distance = np.linalg.norm(self.position - other_person.position)
                    if distance < self.radius:
                        self.velocity = self.velocity * 0.5
                        break

    def update_position(self):
        """更新位置"""

        P = np.identity(3)

        self.position += P.dot(self.velocity) * DT
        
        # 确保人员不会落到地面以下s
        if self.region == 'chamber' and self.rid is not None:
        # # 获取对应楼层的地面高度
            ground_z = geometry['floor'][self.floor]['chamber'][self.rid]['z'][0]
            if self.position[2] < ground_z:
                self.position[2] = ground_z

    ## for target_list version
    def check_target(self):
        """check if the person reachs target"""
        self._update_region(geometry)
        threshold= self.radius * 1
        if np.linalg.norm(self.position - self.target) < threshold:
            
            if self.leader == True:
                if len(self.target_list) > 0:
                    self.position[2] += self.radius 
                    self.target = self.target_list.pop(0)
                    self._update_region(geometry)
                    return False
                elif len(self.target_list) == 0:
                    self.reached_target = True
                    self.velocity = np.zeros(3)
                    return True
                
            elif self.leader == False:
                if self.region == 'stair':
                    self.position[2] += self.radius
                else:
                    e = self.e[0:1]
                    # e[2] = 0
                    self.position[0:1] += threshold * e
                    self.position[2] += self.radius * 0.5
                self.target = self._next_target(geometry)
                if self.target is None:
                    self.reached_target = True
                    self.velocity = np.zeros(3)
                    return True

    ## dynamic target update
    def _next_target(self, geometry):
        """Generate the next target based on current position."""

        current_room = self._update_region(geometry)
        if current_room is None:
            return None

        floor_num = self.floor
        chambers = geometry['floor'][floor_num]['chamber']
        room_info = chambers[current_room]

        # If the room has stairs, select the stair bottom as next target and
        # queue the stair top as the following target.
        next_target = None
        stair_entries = room_info.get('stair')
        if stair_entries:
            if np.linalg.norm(self.target - calcu_target(stair_entries[1])) < self.radius: ## reach stair bottom
                self.region = 'stair'
                next_target = calcu_target(stair_entries[2])
                return next_target
            else:
                direction =  calcu_target(stair_entries[1]) - self.position
                e = direction/np.linalg.norm(direction)
                next_target = calcu_target(stair_entries[1]) + 0.1 * e
                return next_target
        else:
            # No stair: select nearest door that connects to current room on the same floor
            doors = geometry['floor'][floor_num].get('door', {})
            candidate_doors = []
            for _, door_info in doors.items():
                if current_room in door_info.get('connects', []):
                    door_center = calcu_target(door_info) 
                    direction =  door_center - self.position
                    e = direction/np.linalg.norm(direction)
                    next_target = door_center[0:1] + 0.1 * e[0:1]
                    candidate_doors.append(door_center)

            return random.choice(candidate_doors) if candidate_doors else None

    def _update_region(self, geo):
        x, y, z = self.position
        
        # 确定楼层
        self.floor =  int (z // FLOOR_HEIGHT) + 1
        
        if self.floor not in geo['floor']:
            self.floor = max(geo['floor'].keys())
            return None
        
        floor_geo = geo['floor'][self.floor]
        chambers = floor_geo['chamber']

        # 检查所有房间
        for room_id, room_info in chambers.items():
            # 检查是否在房间边界内
            if not (
                    room_info['x'][0] <= x <= room_info['x'][1] and
                    room_info['y'][0] <= y <= room_info['y'][1]
                ):
                continue

            # 如果在房间内，进一步检查是否在楼梯区域
            if 'stair' in room_info:
                ground_z = geometry['floor'][self.floor]['chamber'][self.rid]['z'][0]
                # 检查是否在楼梯区域（底部或顶部）
                if (z - ground_z  > self.radius/2):
                # if (self.acceleration[2] > 0.5):
                    self.region = 'stair'
                else:
                    self.region = 'chamber'
            else:
                self.region = 'chamber'
            
            self.rid = room_id
            break  
        
        return room_id
    
    def is_overlapping(self, persons):
        """
        Args:
            persons: {id: Person3D}
        
        Returns:
            bool: True or False
        """
        for other_id, other_person in persons.items():
            if (other_person is not self and 
                other_person.floor == self.floor and 
                other_person.region == self.region and 
                other_person.rid == self.rid):  
                
                distance = np.linalg.norm(self.position - other_person.position)
                min_required_distance = PERSON_RADIUS
                
                if distance < min_required_distance:
                    return True
        return False