import pandas as pd
import numpy as np
from sklearn.preprocessing import MinMaxScaler
from sklearn.cluster import KMeans


# ---------- Load Dataset ----------
def load_data():
    df = pd.read_excel('/Users/visalvijay/Desktop/Mini project/Code/data/Crinacle iem ranking.xlsx')
    df['Price (MSRP)'] = pd.to_numeric(df['Price (MSRP)'], errors='coerce')

    rank_mapping = {
        'S+': 11.0, 'S': 10.5, 'S-': 10.0, 'A+': 9.5, 'A': 9.0, 'A-': 8.5, 'B+': 8.0, 'B': 7.5, 'B-': 7.0,
        'C+': 6.5, 'C': 6.0, 'C-': 5.5, 'D+': 5.0, 'D': 4.5, 'D-': 4.0, 'E+': 3.5, 'E': 3.0, 'F': 2.5
    }
    df['Rank'] = df['Rank'].map(rank_mapping)
    df.dropna(subset=['Rank', 'Price (MSRP)'], inplace=True)

    df['Signature'] = df['Signature'].fillna('Unknown')
    df = df[df['Signature'] != 'Unknown']

    scaler = MinMaxScaler()
    df['Price (Normalized)'] = scaler.fit_transform(df[['Price (MSRP)']])
    df['Score_1'] = df['Rank'] * (1 - df['Price (Normalized)'])

    signature_map = {sig: i for i, sig in enumerate(df['Signature'].unique())}
    df['Signature_Cluster'] = df['Signature'].map(signature_map)

    kmeans = KMeans(n_clusters=5, random_state=42, n_init=10)
    df['Cluster'] = kmeans.fit_predict(df[['Signature_Cluster']])

    return df

# ---------- Use Case Weighting ----------
use_case_mapping = {
    "Casual Listening": ["Balanced", "Warm", "Harman"],
    "Professional Audio": ["Neutral", "Flat", "Reference"],
    "Gaming": ["V-shaped", "U-shaped", "Wide"],
    "Podcast & Audiobook Listening": ["Mid-centric", "Neutral", "Clear"],
    "Workout & Running": ["Bass", "Energetic", "V-shaped"],
    "Movie Watching": ["Cinematic", "Immersive", "Wide"]
}

# ---------- Recommend IEMs ----------
def recommend_iems(selected_use_cases, df, budget=None):
    if not selected_use_cases:
        matching_iems = df.copy()  # If no use case selected, return all IEMs
    else:
        matching_iems = pd.DataFrame()
        for use_case in selected_use_cases:
            keywords = use_case_mapping.get(use_case, [])
            subset = df[df['Signature'].str.contains('|'.join(keywords), case=False, na=False)]
            matching_iems = pd.concat([matching_iems, subset])

        if matching_iems.empty:
            matching_iems = df.copy()

    # Normalize scoring for better ranking
    matching_iems['Score'] = matching_iems['Rank'] / (matching_iems['Price (MSRP)'] + 1)
    matching_iems['Norm_Score'] = (matching_iems['Score'] - matching_iems['Score'].min()) / (
        matching_iems['Score'].max() - matching_iems['Score'].min() + 1e-9  # Avoid division by zero
    )

    top_3 = matching_iems.sort_values(by='Norm_Score', ascending=False).drop_duplicates('Model').head(3).copy()
    top_3['Match'] = [f"{round(95 - i * 5, 1)}%" for i in range(len(top_3))]

    return top_3[['Model', 'Signature', 'Price (MSRP)', 'Norm_Score', 'Match']]
