import random 
import numpy as np
from .constants import A_SOCIAL, B_SOCIAL, TAU, V0, PERSON_RADIUS, DT, geometry, FLOOR_HEIGHT, k, Kappa,  max_force, g


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
        self.R_n = self.radius*10  # neighborhood radius 
        self.tot_f = np.zeros(3)  # total force acting on the person
        
        ## --- Leadership ----
        self.leader = False

        ## ---- cummulative dose ----
        self.cumulative_dose = 0.0  # 累积剂量
    
    def f_drive(self, persons):
        """计算朝向目标的内驱力, with influence of slope and Mass Behaviour Effect"""

        return force

    def f_person(self, persons):
        """计算人与人之间的社会力"""
        
        if norm_tot_f == 0: # 防止除以零
            return total_force
        elif norm_tot_f < max_force:
            return total_force
        else:
            e_f = total_force / norm_tot_f
            return max_force * e_f

    ## Obstracle Force
    def _get_closest_point_on_segment(self, P, A, B):
        

    def get_nearby_obstacle_points(self, obstacle_points):
        
        return [p1, p2]
    
    def f_obs(self, obs):
        """
        动态寻找最近两点组成线段，并计算线段对行人的合力
        """
        
        return f_tot
        # e_f = f_tot / np.linalg.norm(f_tot)
        # if np.linalg.norm(f_tot) < max_force:
        #     return f_tot
        # else:
        #     return max_force * e_f

 
    ## update pos
    def update_acceleration(self, persons, obs):
        """更新加速度"""
        

    def update_velocity(self):
        """更新速度"""
        

    def update_position(self):
        """更新位置"""

    ## for target_list version
    def check_target(self):
        """check if the person reachs target"""
        
    ## dynamic target update
    def _next_target(self, geometry):
        """Generate the next target based on current position."""


    def _update_region(self, geo):
        
        return room_id
    
    def is_overlapping(self, persons):
        """
        Args:
            persons: {id: Person3D}
        
        Returns:
            bool: True or False
        """
        