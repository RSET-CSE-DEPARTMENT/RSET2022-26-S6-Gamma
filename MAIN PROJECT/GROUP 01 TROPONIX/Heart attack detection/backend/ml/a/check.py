import os
import pandas as pd

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
csv_path = os.path.join(BASE_DIR, "MI_Temporal_Augmented.csv")

df = pd.read_csv(csv_path)

print(df.columns)
print("\nTroponin summary:")
print(df["Troponin"].describe())

print("\nTroponin grouped by MI label:")
print(df.groupby("MI")["Troponin"].describe())