import subprocess
import time

def launch_conveyor_system():
    print("  Starting Multi-Motor Conveyor Belt Simulation...")
    print("---------------------------------------------------")
    
    # Motor 1: The Drive Motor (Subject to Spoofing)
    print(" Launching Motor 1 [Lead Drive]...")
    m1 = subprocess.Popen(['python', 'resilient_active_defense.py'])

    # Wait 2 seconds to stagger the start
    time.sleep(2)

    # Motor 2: The Tension Motor (Subject to Freeze Attack)
    print(" Launching Motor 2 [Tensioner]...")
    # Note: You can modify the attack_type in a copy of the script to 'Freeze'
    m2 = subprocess.Popen(['python', 'resilient_active_defense.py'])

    print("\n Both Digital Twins are active and monitoring.")
    print("Close the plot windows to stop the simulation.")

    m1.wait()
    m2.wait()

if __name__ == "__main__":
    launch_conveyor_system()