from .simulation import run_simulation_export_channel
import matplotlib.pyplot as plt
import numpy as np

# gitee private token 4de6735c30ce46658be800134897ddca
if __name__ == "__main__":


    run_simulation_export_channel(10, 
                        leader =True,
                        random_pos=True, 
                        panic=0.2,
                        expV =2,)
