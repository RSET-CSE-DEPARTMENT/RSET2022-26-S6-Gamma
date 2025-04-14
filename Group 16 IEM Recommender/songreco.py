=import pandas as pd
import os
import random

# Load dataset
def load_songs(file_path='data/spotify_songs.csv'):
    """Loads the songs dataset from a CSV file."""
    if not os.path.exists(file_path):
        print(f"Error: File {file_path} not found.")
        return None

    try:
        df = pd.read_csv(file_path)
        return df
    except Exception as e:
        print(f"Error loading song dataset: {e}")
        return None

# Define sound signature mappings for IEMs
sound_signature_mapping = {
    "V-shaped": {"energy": 0.9, "valence": 0.8, "danceability": 0.7},
    "Mild V-shape": {"energy": 0.8, "valence": 0.7, "danceability": 0.6},
    "Bright V-shape": {"energy": 0.9, "valence": 0.9},
    "U-shaped": {"energy": 0.7, "valence": 0.6, "danceability": 0.7},
    "Bright U-shape": {"energy": 0.8, "valence": 0.8},
    "Mild U-shape": {"energy": 0.7, "valence": 0.6},
    "Neutral": {"energy": 0.5, "valence": 0.5, "danceability": 0.5},
    "Neutral-bright": {"energy": 0.6, "valence": 0.6},
    "Balanced": {"energy": 0.55, "valence": 0.55},
    "Warm": {"acousticness": 0.7, "energy": 0.5, "valence": 0.4},
    "Warm neutral": {"acousticness": 0.6, "energy": 0.5, "valence": 0.5},
    "Warm U-shape": {"acousticness": 0.6, "energy": 0.6, "valence": 0.5},
    "Warm V-shape": {"acousticness": 0.5, "energy": 0.7, "valence": 0.6},
    "Dark": {"acousticness": 0.8, "energy": 0.4, "valence": 0.3},
    "Dark neutral": {"acousticness": 0.8, "energy": 0.5, "valence": 0.4},
    "Bassy": {"danceability": 0.9, "energy": 0.8},
    "Mid-centric": {"speechiness": 0.7, "acousticness": 0.8},
    "Variable": {"energy": 0.5, "valence": 0.5, "danceability": 0.5},
    "Unique": {"energy": 0.5, "valence": 0.5, "speechiness": 0.6},
    "Complete failure": {"energy": 0.2, "valence": 0.2, "danceability": 0.2},
}

def recommend_songs(iem_signature, num_songs=5, file_path='data/spotify_songs.csv'):
    """Recommends songs based on the IEM's sound signature."""
    df = load_songs(file_path)
    if df is None or df.empty:
        return [{"error": "Song dataset could not be loaded."}]

    # Ensure the dataset has the needed columns
    required_columns = ["track_name", "track_artist", "track_album_name", "playlist_genre", 
                        "playlist_name", "danceability", "energy", "valence", "acousticness"]
    if not all(col in df.columns for col in required_columns):
        return [{"error": "Dataset is missing required columns."}]

    # If IEM signature is invalid or not found, return random songs
    if iem_signature not in sound_signature_mapping:
        return df.sample(n=num_songs).apply(format_song, axis=1).tolist()

    # Get the IEM target sound signature features
    target_features = sound_signature_mapping[iem_signature]

    # Normalize relevant features
    feature_columns = ["danceability", "energy", "valence", "acousticness"]
    df[feature_columns] = df[feature_columns].apply(pd.to_numeric, errors='coerce')
    df[feature_columns] = df[feature_columns].apply(lambda x: (x - x.min()) / (x.max() - x.min()))

    # Calculate similarity score
    df["similarity"] = df[feature_columns].apply(lambda row: sum(
        abs(row[feat] - target_features.get(feat, 0)) for feat in feature_columns
    ), axis=1)

    # Get top matches
    recommended_songs = df.nsmallest(10, "similarity")

    # If no strong match is found, return random songs
    if recommended_songs.empty:
        recommended_songs = df.sample(n=num_songs)

    # Select random songs from the best matches
    selected_songs = recommended_songs.sample(n=min(num_songs, len(recommended_songs)), random_state=random.randint(0, 10000))

    return selected_songs.apply(format_song, axis=1).tolist()

def format_song(row):
    """Formats song details for API response."""
    return {
        "track_name": row.get("track_name", "Unknown"),
        "track_artist": row.get("track_artist", "Unknown"),
        "album": row.get("track_album_name", "N/A"),
        "genre": row.get("playlist_genre", "Unknown"),
        "playlist": row.get("playlist_name", "Unknown"),
    }

# Test function
if __name__ == "__main__":
    test_signature = "Balanced"
    recommended = recommend_songs(test_signature)
    for song in recommended:
        print(f"{song['track_name']} by {song['track_artist']} (Album: {song['album']}, Genre: {song['genre']})")
