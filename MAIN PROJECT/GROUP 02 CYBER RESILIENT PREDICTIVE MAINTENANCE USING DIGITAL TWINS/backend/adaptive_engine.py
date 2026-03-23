import numpy as np

class MotorParameterEstimator:
    def __init__(self, initial_b=0.1, initial_J=0.01):
        # We want to estimate theta = [b, J]
        self.theta = np.array([initial_b, initial_J])
        self.P = np.eye(2) * 100   # Covariance matrix (uncertainty)
        self.lambda_ = 0.999       # Forgetting factor

    def update(self, v_input, omega_current, omega_prev, dt):
        """
        Uses Recursive Least Squares (RLS) to update friction (b) and inertia (J).
        Includes Guardrails to prevent parameter poisoning during attacks.
        """
        # 1. Calculate the derivative (acceleration)
        alpha = (omega_current - omega_prev) / dt
        
        # 2. Regressor vector [omega, alpha]
        phi = np.array([[omega_current], [alpha]])
        
        # 3. Target (The force applied by voltage)
        K = 0.1 # FIXED: Was 0.01, must match Simulation & Kalman
        y = K * v_input
        
        # 4. RLS Math: Error calculation
        error = y - (phi.T @ self.theta)
        
        # 5. Gain update
        K_gain = (self.P @ phi) / (self.lambda_ + phi.T @ self.P @ phi)
        
        # 6. Update parameters
        new_theta = self.theta + (K_gain.flatten() * error)
        
        # 7. --- GUARDRAILS (The "Sanity Check") ---
        # Friction (b) should be positive and within a reasonable range [0.01, 0.5]
        # Inertia (J) should be positive and within a reasonable range [0.005, 0.05]
        new_theta[0] = np.clip(new_theta[0], 0.01, 0.5)
        new_theta[1] = np.clip(new_theta[1], 0.005, 0.05)
        self.theta = new_theta
        
        # 8. Update uncertainty covariance
        self.P = (self.P - (K_gain @ phi.T @ self.P)) / self.lambda_
        
        return self.theta[0], self.theta[1] # Returns [guarded_b, guarded_J]