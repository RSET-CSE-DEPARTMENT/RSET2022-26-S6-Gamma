import numpy as np

# Load the files
X = np.load("X_data.npy")
y = np.load("y_data.npy")
classes = np.load("classes.npy",allow_pickle=True)

print("--- Classes ---")
print(classes)

print("\n--- First Sample (X) ---")
# Shows the 3 time steps for the first patient
print(X[0]) 

print("\n--- First Label (y) ---")
# Shows the class ID for this sample
print(y[0])
print(f"Meaning: {classes[y[0]]}")