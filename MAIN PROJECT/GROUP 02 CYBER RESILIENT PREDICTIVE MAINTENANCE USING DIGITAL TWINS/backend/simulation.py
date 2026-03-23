import numpy as np

class DigitalTwinSimulation:
    def __init__(self, params):
        self.dt = params.get("dt", 0.02)
        self.duration = params.get("duration", 5.0)
        
        # Physics Parameters
        self.J  = params.get("J",  0.01)
        self.b  = params.get("b",  0.1)
        self.K  = params.get("Kt", 0.1)
        self.R  = params.get("R",  2.0)
        self.Ke = params.get("Ke", 0.1)
        
        # State Variables
        # State Variables
        self.omega_true = 0.0
        self.voltage = 12.0
        self.temp = 25.0 # Ambient Temp (deg C)
        
        # Attack/Fault Parameters
        self.attack_type = params.get("attack_type", "None")
        self.attack_start = params.get("attack_start_time", 2.0)
        self.mag = params.get("attack_magnitude", 0.0)
        
        # Physical Fault Parameters
        self.fault_type = params.get("fault_type", "None")
        self.fault_start = params.get("fault_start_time", 1.0)
        self.noise_level = params.get("noise_level", 0.1) # Default 0.1

    def step(self, t):
        # 1. Calculate True Physics (Mechanical)
        # Torque = J*alpha + b*omega => alpha = (K*V - b*omega)/J
        alpha = (self.K * self.voltage - self.b * self.omega_true) / self.J
        self.omega_true += alpha * self.dt

        # 2. Calculate True Physics (Electrical) - NEW
        # Ohm's Law: V = I*R + Ke*omega => I = (V - Ke*omega) / R
        true_current = (self.voltage - self.Ke * self.omega_true) / self.R
        
        # 2a. Inject Physical Faults
        if t >= self.fault_start:
            if self.fault_type == "Friction Buildup":
                # Linear increase in friction - Aggressive for Demo
                self.b += 0.05 * self.dt  # 10x faster degradation
            elif self.fault_type == "Bearing Fault":
                self.omega_true += np.sin(t * 50) * 0.5

        # 2b. Simulate Temperature Rise
        power_loss = self.b * (self.omega_true ** 2)
        k_heat, k_cool = 20.0, 0.1 # 10x more heat, less cooling
        d_temp = (power_loss * k_heat - (self.temp - 25.0) * k_cool) * self.dt
        self.temp += d_temp

        # 3. Generate Sensor Data with Noise
        sensor_speed = self.omega_true + np.random.normal(0, self.noise_level)
        sensor_current = true_current + np.random.normal(0, 0.02)
        sensor_temp = self.temp + np.random.normal(0, 0.5)

        # 4. Apply Cyber Attacks
        if t >= self.attack_start:
            if self.attack_type == "Sensor Spoofing":
                sensor_speed += self.mag
            elif self.attack_type == "Freezing Sensor":
                # Concept: sensor stops updating (logic handled in run loop usually)
                pass 
            elif self.attack_type == "Packet Dropout":
                sensor_speed = np.nan

        return {
            "time": t,
            "omega_true": self.omega_true,
            "omega_sensor": sensor_speed,
            "current_true": true_current,     # NEW
            "current_sensor": sensor_current, # NEW
            "voltage": self.voltage,
            "temp_sensor": sensor_temp        # NEW for RUL
        }

    def run(self):
        data = []
        for t in np.arange(0, self.duration, self.dt):
            data.append(self.step(t))
        return data