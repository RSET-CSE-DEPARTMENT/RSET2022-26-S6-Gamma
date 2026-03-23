import requests
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

# TMDb API Configuration
API_KEY = "d8f50a3371afc220d8657c2416c8514b"  # Replace with your actual API key
BASE_URL = "https://api.themoviedb.org/3"

def get_movie_details(movie_name):
    """Fetch movie details including genres, overview, and keywords from TMDb."""
    search_url = f"{BASE_URL}/search/movie?api_key={API_KEY}&query={movie_name}"
    response = requests.get(search_url)
    data = response.json()

    if "results" in data and data["results"]:
        movie = data["results"][0]  # Take the first search result
        movie_id = movie["id"]

        # Fetch full movie details
        details_url = f"{BASE_URL}/movie/{movie_id}?api_key={API_KEY}&append_to_response=keywords,similar"
        details_response = requests.get(details_url)
        details = details_response.json()

        genres = [genre["name"] for genre in details.get("genres", [])]
        keywords = [kw["name"] for kw in details.get("keywords", {}).get("keywords", [])]

        return {
            "Title": details["title"],
            "Genres": genres,
            "Overview": details.get("overview", ""),
            "Keywords": keywords,
            "ID": movie_id,
            "Sequels": [movie["title"] for movie in details.get("similar", {}).get("results", []) if "sequel" in movie["title"].lower()]
        }
    return None

def get_similar_movies_api(movie_id):
    """Fetch similar movies using TMDb's similar movies API."""
    similar_url = f"{BASE_URL}/movie/{movie_id}/similar?api_key={API_KEY}&language=en-US&page=1"
    response = requests.get(similar_url).json()
    
    return [movie["title"] for movie in response.get("results", [])]

def get_top_movies():
    """Fetch popular or top-rated movies from TMDb in case no similar movies are found."""
    movies_url = f"{BASE_URL}/movie/top_rated?api_key={API_KEY}&language=en-US&page=1"
    response = requests.get(movies_url).json()
    
    return [movie["title"] for movie in response.get("results", [])]

def get_similar_movies(movie_name, num_recommendations=5):
    """Get movie recommendations based on similarity using TMDb API and content-based filtering."""
    movie = get_movie_details(movie_name)
    if not movie:
        return f" Movie '{movie_name}' not found in TMDb."

    movie_id = movie["ID"]

    # Try TMDb's built-in similar movies API first
    similar_movies = get_similar_movies_api(movie_id)
    if len(similar_movies) >= num_recommendations:
        recommendations = similar_movies[:num_recommendations]
    else:
        recommendations = similar_movies

    # Include sequels in the recommendations
    if movie["Sequels"]:
        recommendations += movie["Sequels"]

    # Remove duplicates
    recommendations = list(set(recommendations))

    # If not enough similar movies, use content-based filtering
    if len(recommendations) < num_recommendations:
        top_movies = get_top_movies()
        vectorizer = TfidfVectorizer(stop_words="english")
        movie_text = " ".join(movie["Genres"]) + " " + movie["Overview"] + " " + " ".join(movie["Keywords"])
        movie_matrix = vectorizer.fit_transform([movie_text] + top_movies)

        similarity_scores = cosine_similarity(movie_matrix[0], movie_matrix[1:])[0]
        recommended_indices = np.argsort(similarity_scores)[::-1][:num_recommendations - len(recommendations)]
        recommended_movies = [top_movies[i] for i in recommended_indices]

        recommendations += recommended_movies

    return recommendations[:num_recommendations]

# Example Usage
movie_name = input("Enter a movie name: ")
recommendations = get_similar_movies(movie_name)

if isinstance(recommendations, list):
    print(f"\n **Recommendations for '{movie_name}':**")
    for i, rec in enumerate(recommendations, start=1):
        print(f"{i}. {rec}")
else:
    print(recommendations)
