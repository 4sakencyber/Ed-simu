import numpy as np
from scipy.integrate import solve_ivp
from scipy.interpolate import interp1d

# 其他舱室参数
V_k = 120   # 舱室体积 (m³)
f_k = 50    # 通风流量 (m³/h)
p_k = 20    # 除碘过滤器流量 (m³/h)
    

class RadiationReactor:
    """
    三维反应堆舱室放射性核素浓度模拟（多核素支持）
    """
    
    def __init__(self, V0, f0):
        """
        初始化模型参数
        
        参数:
        V0: 堆舱体积 (m³)
        f0: 堆舱应急排风量 (m³/h)
        """
        self.V0 = V0
        self.f0 = f0
        
    def differential_equation(self, t, A, nuclide_params_list):
        """
        多核素微分方程组:
        dA_i(t)/dt = P_i(t) + Σ(j≠i) λ_ji * A_j(t) - (λ_i + f0/V0 + l_i(t)) * A_i(t)
        """
        dA_dt = np.zeros_like(A)
        
        for i, nuclide_params in enumerate(nuclide_params_list):
            # 获取当前核素参数
            lambda_i = nuclide_params['lambda_i']
            
            # 处理 l_i - 可能是函数或常数
            l_i_value = nuclide_params['l_i_func']
            l_i = l_i_value(t) if callable(l_i_value) else l_i_value
            
            # 处理 P_i - 可能是函数或常数
            P_i_value = nuclide_params['P_i_func']
            P_i = P_i_value(t) if callable(P_i_value) else P_i_value
            
            # 计算母核衰变产生的项
            parent_decay_term = 0
            if 'parent_decay' in nuclide_params:
                for parent_idx, decay_constant in nuclide_params['parent_decay']:
                    if parent_idx < len(A):
                        parent_decay_term += decay_constant * A[parent_idx]
            
            # 计算变化率
            dA_dt[i] = P_i + parent_decay_term - (lambda_i + self.f0/self.V0 + l_i) * A[i]
        
        return dA_dt
    
    def simulate_nuclides(self, nuclide_params_list, t_span, t_eval=None, A0_list=None, method='RK45', rtol=1e-6, atol=1e-8):
        """
        数值积分求解多个核素的活度变化
        
        参数:
        nuclide_params_list: 核素参数字典列表
        t_span: 时间范围 (start, end)
        t_eval: 评估时间点
        A0_list: 初始活度列表 (GBq)
        method: 积分方法
        rtol: 相对容差
        atol: 绝对容差
        
        返回:
        sol: 积分结果，包含所有核素的活度
        """
        # 确保有衰变常数
        for nuclide_params in nuclide_params_list:
            if 'lambda_i' not in nuclide_params and 'T_i' in nuclide_params:
                nuclide_params['lambda_i'] = np.log(2) / nuclide_params['T_i']
        
        # 设置初始条件
        if A0_list is None:
            A0_list = [0] * len(nuclide_params_list)
        
        # 定义微分方程函数
        def diff_eq(t, A):
            return self.differential_equation(t, A, nuclide_params_list)
        
        # 求解微分方程
        sol = solve_ivp(
            diff_eq, 
            t_span, 
            A0_list, 
            t_eval=t_eval,
            method=method,
            rtol=rtol,
            atol=atol
        )
        
        return sol


class RadiationOther:
    """
    其他舱室放射性核素浓度模拟（多核素支持，放射源来自反应堆舱室泄漏）
    """
    
    def __init__(self, V_k, f_k, p_k, Tp_lambda=0.999):
        """
        初始化模型参数
        
        参数:
        V_k: 舱室体积 (m³)
        f_k: 通风流量 (m³/h)
        p_k: 除碘过滤器流量 (m³/h)
        Tp_lambda: 除碘过滤器效率 (默认99.9%)
        """
        self.V_k = V_k
        self.f_k = f_k
        self.p_k = p_k
        self.Tp_lambda = Tp_lambda
        
    def differential_equation(self, t, A, nuclide_params_list, reactor_activity_funcs):
        """
        多核素微分方程组:
        dA_k,i(t)/dt = L_0i * A_0,i(t) + Σ(j≠i) λ_ji * A_k,j(t) - (λ_i + f_k/V_k + Tp_λ*p_k/V_k) * A_k,i(t)
        """
        dA_dt = np.zeros_like(A)
        
        for i, nuclide_params in enumerate(nuclide_params_list):
            # 获取当前核素参数
            lambda_i = nuclide_params['lambda_i']
            L_0i = nuclide_params.get('L_0i', 0.01)  # 从反应堆舱室泄漏到当前舱室的泄漏率
            
            # 获取反应堆舱室活度
            A_reactor = reactor_activity_funcs[i](t)
            
            # 计算源项 (来自反应堆舱室的泄漏)
            source_term = L_0i * A_reactor
            
            # 计算母核衰变产生的项
            parent_decay_term = 0
            if 'parent_decay' in nuclide_params:
                for parent_idx, decay_constant in nuclide_params['parent_decay']:
                    if parent_idx < len(A):
                        parent_decay_term += decay_constant * A[parent_idx]
            
            # 计算清除率
            clearance_rate = lambda_i + self.f_k/self.V_k + (self.Tp_lambda * self.p_k)/self.V_k
            
            # 计算变化率
            dA_dt[i] = source_term + parent_decay_term - clearance_rate * A[i]
        
        return dA_dt
    
    def simulate_nuclides(self, nuclide_params_list, reactor_sol, t_span, t_eval=None, A0_list=None, method='RK45', rtol=1e-6, atol=1e-8):
        """
        数值积分求解多个核素的活度变化
        
        参数:
        nuclide_params_list: 核素参数字典列表
        reactor_sol: 反应堆舱室的解 (包含时间和所有核素的活度)
        t_span: 时间范围 (start, end)
        t_eval: 评估时间点
        A0_list: 初始活度列表 (GBq)
        method: 积分方法
        rtol: 相对容差
        atol: 绝对容差
        
        返回:
        sol: 积分结果，包含所有核素的活度
        """
        # 确保有衰变常数
        for nuclide_params in nuclide_params_list:
            if 'lambda_i' not in nuclide_params and 'T_i' in nuclide_params:
                nuclide_params['lambda_i'] = np.log(2) / nuclide_params['T_i']
        
        # 设置初始条件
        if A0_list is None:
            A0_list = [0] * len(nuclide_params_list)
        
        # 创建反应堆舱室活度的插值函数列表
        reactor_interps = []
        for i in range(len(nuclide_params_list)):
            reactor_interp = interp1d(
                reactor_sol.t, 
                reactor_sol.y[i], 
                kind='linear', 
                bounds_error=False, 
                fill_value=(reactor_sol.y[i][0], reactor_sol.y[i][-1])
            )
            reactor_interps.append(reactor_interp)
        
        # 定义微分方程函数
        def diff_eq(t, A):
            return self.differential_equation(t, A, nuclide_params_list, reactor_interps)
        
        # 求解微分方程
        sol = solve_ivp(
            diff_eq, 
            t_span, 
            A0_list, 
            t_eval=t_eval,
            method=method,
            rtol=rtol,
            atol=atol
        )
        
        return sol



