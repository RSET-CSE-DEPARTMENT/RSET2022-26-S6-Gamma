import numpy as np

class MotorKalmanFilter:
    def __init__(self, dt=0.02, J=0.01, b=0.1, K=0.1):
        self.dt = dt
        self.J, self.b, self.K = J, b, K
        self.x = np.array([[0.0]]) # State: Speed
        self.P = np.array([[1.0]]) # Uncertainty
        self.Q = np.array([[0.001]]) # Process Noise
        self.R = np.array([[0.05]])  # Measurement Noise
        self._update_matrices()

    def _update_matrices(self):
        """Rebuilds A and B matrices when physics parameters (b, J) change"""
        self.A = np.array([[1 - (self.b * self.dt / self.J)]])
        self.B = np.array([[self.K * self.dt / self.J]])
        self.H = np.array([[1.0]])

    def update_parameters(self, b=None, J=None):
        """Called by the Adaptive Engine to keep the Twin accurate"""
        if b is not None: self.b = b
        if J is not None: self.J = J
        self._update_matrices()

    def filter(self, voltage, z_measured):
        # Predict
        x_pred = self.A @ self.x + self.B * voltage
        self.P = self.A @ self.P @ self.A.T + self.Q
        # Update
        innovation = z_measured - (self.H @ x_pred)
        S = self.H @ self.P @ self.H.T + self.R
        K_gain = self.P @ self.H.T @ np.linalg.inv(S)
        self.x = x_pred + K_gain @ innovation
        self.P = (np.eye(1) - K_gain @ self.H) @ self.P
        return float(self.x[0][0]), float(innovation[0][0])