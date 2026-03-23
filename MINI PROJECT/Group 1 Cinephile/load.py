import pandas as pd
from surprise import Dataset, Reader

# Load dataset
file_path = r"C:\Users\bijum\Downloads\ml-latest-small (1)\ml-latest-small\ratings.csv"
ratings = pd.read_csv(file_path)

# Define reader format (rating scale is 0.5 to 5)
reader = Reader(rating_scale=(0.5, 5.0))

# Load data into Surprise format
data = Dataset.load_from_df(ratings[['userId', 'movieId', 'rating']], reader)
