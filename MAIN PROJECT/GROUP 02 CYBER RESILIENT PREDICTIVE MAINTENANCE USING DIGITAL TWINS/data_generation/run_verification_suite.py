import pandas as pd
import numpy as np
from resilient_active_defense import run_active_defense_simulation

def verify_scenarios():
    print("="*60)
    print("STARTING VERIFICATION SUITE (ROBUST MODE)")
    print("="*60)
    
    results = []
    baseline_final_speed = 0.0

    # 1. Normal Operation (Control) - LOW NOISE to verify False Positives
    print("\n>>> Running Scenario: 1. Normal Operation (Control)...")
    try:
        # Reduced noise to 0.02 (closer to ideal) to checking if model triggers
        df_normal = run_active_defense_simulation({"attack_type": "None", "noise_level": 0.02})
        attack_rate = df_normal['attack'].mean()
        noise_std = df_normal['sensor'].std()
        
        # Check: Attack rate should be LOW (< 10%)
        passed = attack_rate < 0.1
        
        baseline_final_speed = df_normal['sensor'].iloc[-1]
        
        status = "PASSED" if passed else "FAILED"
        print(f"    - Attack Rate: {attack_rate*100:.1f}%")
        print(f"    - Noise Level: {noise_std:.4f}")
        print(f"    - Final Speed: {baseline_final_speed:.4f}")
        results.append(("1. Normal Operation", status))
    except Exception as e:
        results.append(("1. Normal Operation", f"ERROR: {e}"))

    # 2. Cyber Attack: Sensor Spoofing
    print("\n>>> Running Scenario: 2. Cyber Attack: Sensor Spoofing...")
    try:
        df = run_active_defense_simulation({"attack_type": "Sensor Spoofing", "attack_start_time": 4.0})
        # Check: High detection rate after attack start
        passed = df[df['time'] > 4.5]['attack'].mean() > 0.8
        status = "PASSED" if passed else "FAILED"
        results.append(("2. Sensor Spoofing", status))
    except Exception as e:
        results.append(("2. Sensor Spoofing", f"ERROR: {e}"))

    # 3. Cyber Attack: Packet Dropout
    print("\n>>> Running Scenario: 3. Cyber Attack: Packet Dropout...")
    try:
        df = run_active_defense_simulation({"attack_type": "Packet Dropout", "attack_start_time": 4.0})
        # Check: High detection rate
        passed = df[df['time'] > 4.5]['attack'].mean() > 0.8
        status = "PASSED" if passed else "FAILED"
        results.append(("3. Packet Dropout", status))
    except Exception as e:
        results.append(("3. Packet Dropout", f"ERROR: {e}"))

    # 4. Physical Fault: Friction Buildup
    print("\n>>> Running Scenario: 4. Physical Fault: Friction Buildup...")
    try:
        # Use Normal noise (0.1) but aggressive friction
        df_friction = run_active_defense_simulation({"fault_type": "Friction Buildup", "fault_start_time": 2.0})
        friction_final_speed = df_friction['sensor'].iloc[-1]
        
        # Check: Final speed should be significantly LOWER than baseline (sag due to friction)
        # Note: Friction Buildup in simulation adds to 'b'.
        passed = friction_final_speed < (baseline_final_speed * 0.95) # Expect >5% drop
        
        status = "PASSED" if passed else "FAILED"
        print(f"    - Final Speed (Friction): {friction_final_speed:.4f} (Baseline: {baseline_final_speed:.4f})")
        results.append(("4. Friction Buildup", status))
    except Exception as e:
        results.append(("4. Friction Buildup", f"ERROR: {e}"))

    # 5. Physical Fault: Bearing Fault
    print("\n>>> Running Scenario: 5. Physical Fault: Bearing Fault...")
    try:
        df = run_active_defense_simulation({"fault_type": "Bearing Fault", "fault_start_time": 2.0})
        noise = df[df['time'] > 2.5]['sensor'].std()
        # Check: High variance due to vibration
        passed = noise > 0.2
        status = "PASSED" if passed else "FAILED"
        print(f"    - Vibration (Std): {noise:.4f}")
        results.append(("5. Bearing Fault", status))
    except Exception as e:
        results.append(("5. Bearing Fault", f"ERROR: {e}"))

    print("\n" + "="*60)
    print("VERIFICATION SUMMARY")
    print("="*60)
    for name, status in results:
        print(f"{status: <8} | {name}")
    print("="*60)

if __name__ == "__main__":
    verify_scenarios()
