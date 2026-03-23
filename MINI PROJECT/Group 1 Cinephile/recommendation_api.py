import requests
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from datetime import datetime
import logging
import firebase_admin
from firebase_admin import credentials, db

# Configure logging
logger = logging.getLogger(__name__)

# Initialize Firebase Admin SDK
cred = credentials.Certificate('cinephile-250fc-firebase-adminsk-1.json')
firebase_admin.initialize_app(cred, {
    'databaseURL': 'https://cinephile-250fc-default-rtdb.asia-southeast1.firebasedatabase.app'
})

# TMDb API Configuration
API_KEY = "e7dab9ac70474bbfe363ad906dd566d5"  # Updated API key
BASE_URL = "https://api.themoviedb.org/3"

# Default number of recommendations
DEFAULT_RECOMMENDATIONS = 20

logging.basicConfig(level=logging.INFO)

def get_user_data(user_id):
    """Fetch user's watchlists, watched movies, and reviews from Firebase."""
    try:
        # Get reference to the database
        ref = db.reference()
        
        # Fetch user's data
        user_data = ref.child(f'users/{user_id}').get()
        logger.info(f"Raw user data: {user_data}")  # Log raw data
        
        if not user_data:
            logger.info(f"No data found for user {user_id}")
            return None, None, None
            
        # Extract watchlists and watched movies
        watchlists = user_data.get('watchlists', {})
        watched = user_data.get('watched', {})
        reviews = user_data.get('reviews', {})
        
        logger.info(f"Watchlists data from Firebase: {watchlists}")
        logger.info(f"Found {len(watchlists) if isinstance(watchlists, dict) else 0} movies in watchlists")
        logger.info(f"Watched movies data from Firebase: {watched}")
        logger.info(f"Found {len(watched) if isinstance(watched, dict) else 0} movies in watched list")
        logger.info(f"Reviews data from Firebase: {reviews}")
        logger.info(f"Found {len(reviews) if isinstance(reviews, dict) else 0} reviews")
        
        return watchlists, watched, reviews
    except Exception as e:
        logger.error(f"Error fetching user data: {str(e)}")
        return None, None, None

def get_movie_details(movie_name):
    """Fetch movie details including genres, overview, and keywords from TMDb."""
    search_url = f"{BASE_URL}/search/movie?api_key={API_KEY}&query={movie_name}"
    response = requests.get(search_url)
    data = response.json()

    if "results" in data and data["results"]:
        movie = data["results"][0]  # Take the first search result
        movie_id = movie["id"]

        # Fetch full movie details
        details_url = f"{BASE_URL}/movie/{movie_id}?api_key={API_KEY}&append_to_response=keywords,similar,credits,production_companies"
        details_response = requests.get(details_url)
        details = details_response.json()

        genres = [genre["name"] for genre in details.get("genres", [])]
        keywords = [kw["name"] for kw in details.get("keywords", {}).get("keywords", [])]
        production_companies = [company["name"] for company in details.get("production_companies", [])]
        directors = [crew["name"] for crew in details.get("credits", {}).get("crew", []) if crew["job"] == "Director"]
        cast = [cast["name"] for cast in details.get("credits", {}).get("cast", [])[:5]]  # Top 5 cast members

        return {
            "Title": details["title"],
            "Genres": genres,
            "Overview": details.get("overview", ""),
            "Keywords": keywords,
            "ID": movie_id,
            "Release_Date": details.get("release_date", ""),
            "Production_Companies": production_companies,
            "Directors": directors,
            "Cast": cast,
            "Vote_Average": details.get("vote_average", 0),
            "Vote_Count": details.get("vote_count", 0),
            "Popularity": details.get("popularity", 0),
            "Sequels": [movie["title"] for movie in details.get("similar", {}).get("results", []) if "sequel" in movie["title"].lower()]
        }
    return None

def get_similar_movies_api(movie_id):
    """Fetch similar movies using TMDb's similar movies API."""
    try:
        similar_url = f"{BASE_URL}/movie/{movie_id}/similar?api_key={API_KEY}&language=en-US&page=1"
        response = requests.get(similar_url)
        
        if not response.ok:
            logger.error(f"Error fetching similar movies: {response.status_code}")
            return []
            
        data = response.json()
        if not data.get("results"):
            logger.info(f"No similar movies found for movie ID: {movie_id}")
            return []
            
        # Get more details about each similar movie
        similar_movies = []
        for movie in data["results"][:10]:  # Limit to top 10 similar movies
            if movie.get("title") and movie.get("vote_average", 0) >= 6.0:  # Only include movies with rating >= 6
                similar_movies.append(movie["title"])
                
        logger.info(f"Found {len(similar_movies)} similar movies for movie ID: {movie_id}")
        return similar_movies
        
    except Exception as e:
        logger.error(f"Error in get_similar_movies_api: {str(e)}")
        return []

def get_top_movies():
    """Fetch popular or top-rated movies from TMDb in case no similar movies are found."""
    # Fetch from multiple pages to get more movies
    all_movies = []
    for page in range(1, 4):  # Fetch first 3 pages
        movies_url = f"{BASE_URL}/movie/top_rated?api_key={API_KEY}&language=en-US&page={page}"
        response = requests.get(movies_url).json()
        all_movies.extend([movie["title"] for movie in response.get("results", [])])
    
    return all_movies

def calculate_review_weight(rating, review_text):
    """Calculate a sophisticated weight for a review based on rating and content."""
    # Base weight from rating (1-10 scale)
    base_weight = 1 + (rating - 5) / 5  # Converts 1-10 to 0.8-1.2
    
    # Additional weight based on review length (longer reviews are more detailed)
    text_weight = 1 + min(len(review_text.split()) / 100, 0.5)  # Up to 50% bonus for longer reviews
    
    return base_weight * text_weight

def get_personalized_recommendations(user_id, num_recommendations=DEFAULT_RECOMMENDATIONS):
    """Get personalized recommendations based on user's watchlists, watched movies, and reviews."""
    logger.info(f"Starting personalized recommendations for user {user_id}...")
    
    # Get user's data from Firebase
    watchlists, watched, reviews = get_user_data(user_id)
    
    # If no data found, try direct access to watchlists and watched collections
    if not watchlists and not watched:
        logger.info("No data found in user object, trying direct access to collections")
        try:
            ref = db.reference()
            
            # Try to get watchlists directly
            watchlists_ref = ref.child('watchlists').get()
            if watchlists_ref:
                logger.info(f"Found watchlists directly: {watchlists_ref}")
                watchlists = watchlists_ref
                
            # Try to get watched movies directly
            watched_ref = ref.child('watched').get()
            if watched_ref:
                logger.info(f"Found watched movies directly: {watched_ref}")
                watched = watched_ref
                
        except Exception as e:
            logger.error(f"Error accessing collections directly: {str(e)}")
    
    if not watchlists and not watched:
        logger.info("No movies found in lists, returning top movies")
        return get_top_movies()[:num_recommendations]
    
    # Convert Firebase data structure to movie titles
    all_movies = []
    
    # Handle watchlists data structure
    if isinstance(watchlists, dict):
        logger.info(f"Processing watchlists: {watchlists}")
        for movie_id, movie in watchlists.items():
            logger.info(f"Processing movie in watchlists: {movie}")
            if isinstance(movie, dict):
                # Handle both title formats
                title = movie.get('title') or movie.get('Title')
                if title:
                    all_movies.append(title)
                    logger.info(f"Added to watchlists: {title}")
    
    # Handle watched movies data structure
    if isinstance(watched, dict):
        logger.info(f"Processing watched movies: {watched}")
        for movie_id, movie in watched.items():
            logger.info(f"Processing movie in watched: {movie}")
            if isinstance(movie, dict):
                # Handle both title formats
                title = movie.get('title') or movie.get('Title')
                if title:
                    all_movies.append(title)
                    logger.info(f"Added to watched: {title}")
    
    # Remove duplicates and empty titles
    all_movies = list(set(title for title in all_movies if title))
    logger.info(f"Total unique movies: {len(all_movies)}")
    logger.info(f"All movies found: {all_movies}")
    
    if not all_movies:
        logger.info("No movies found in lists, returning top movies")
        return get_top_movies()[:num_recommendations]

    # Get details for all movies in user's lists
    movie_details = []
    for movie_name in all_movies:
        logger.info(f"Getting details for: {movie_name}")
        details = get_movie_details(movie_name)
        if details:
            movie_details.append(details)
            logger.info(f"Found genres for {movie_name}: {details['Genres']}")
        else:
            logger.warning(f"Could not get details for movie: {movie_name}")

    if not movie_details:
        logger.info("No movie details found, returning top movies")
        return get_top_movies()[:num_recommendations]

    # Get all unique genres from user's movies
    user_genres = set()
    for movie in movie_details:
        user_genres.update(movie["Genres"])
    logger.info(f"User's preferred genres: {user_genres}")
    
    # Get genre IDs from TMDb
    genre_url = f"{BASE_URL}/genre/movie/list?api_key={API_KEY}&language=en-US"
    genre_response = requests.get(genre_url).json()
    genre_id_map = {genre["name"]: genre["id"] for genre in genre_response.get("genres", [])}
    logger.info(f"Available genre IDs: {genre_id_map}")
    
    # Search for movies in user's preferred genres
    similar_movies_details = []
    
    # Try searching with multiple genres first
    if len(user_genres) >= 2:
        genre_ids = [genre_id_map[genre] for genre in list(user_genres)[:2] if genre in genre_id_map]
        if genre_ids:
            logger.info(f"Searching for movies with genres: {genre_ids}")
            search_url = f"{BASE_URL}/discover/movie?api_key={API_KEY}&with_genres={','.join(map(str, genre_ids))}&sort_by=popularity.desc&page=1&vote_count.gte=100&vote_average.gte=7.0"
            response = requests.get(search_url).json()
            logger.info(f"Search response: {response}")
            if "results" in response:
                logger.info(f"Found {len(response['results'])} movies with multiple genres")
                for movie in response["results"]:
                    if movie["title"] not in all_movies:
                        details = get_movie_details(movie["title"])
                        if details:
                            # Calculate genre match score
                            genre_match_score = sum(1 for g in details["Genres"] if g in user_genres) / len(details["Genres"])
                            logger.info(f"Genre match score for {movie['title']}: {genre_match_score}")
                            if genre_match_score >= 0.7:  # Increased threshold to 70%
                                similar_movies_details.append(details)
                                logger.info(f"Added {movie['title']} to recommendations")

    # Then try individual genres
    for genre in user_genres:
        if len(similar_movies_details) >= num_recommendations:
            break
            
        if genre in genre_id_map:
            genre_id = genre_id_map[genre]
            logger.info(f"Searching for movies in genre: {genre} (ID: {genre_id})")
            search_url = f"{BASE_URL}/discover/movie?api_key={API_KEY}&with_genres={genre_id}&sort_by=popularity.desc&page=1&vote_count.gte=100&vote_average.gte=7.0&language=en-US"
            response = requests.get(search_url).json()
            logger.info(f"Search response for genre {genre}: {response}")
            if "results" in response:
                logger.info(f"Found {len(response['results'])} movies in genre {genre}")
                for movie in response["results"]:
                    if movie["title"] not in all_movies and len(similar_movies_details) < num_recommendations:
                        details = get_movie_details(movie["title"])
                        if details:
                            # Calculate genre match score
                            genre_match_score = sum(1 for g in details["Genres"] if g in user_genres) / len(details["Genres"])
                            logger.info(f"Genre match score for {movie['title']}: {genre_match_score}")
                            if genre_match_score >= 0.7:  # Increased threshold to 70%
                                similar_movies_details.append(details)
                                logger.info(f"Added {movie['title']} to recommendations")

    logger.info(f"Found {len(similar_movies_details)} movies in primary genres")

    # If we don't have enough movies, try searching by similar movies to your watchlist
    if len(similar_movies_details) < num_recommendations:
        logger.info("Not enough movies, trying similar movies")
        for movie in movie_details:
            similar = get_similar_movies_api(movie["ID"])
            logger.info(f"Found {len(similar)} similar movies to {movie['Title']}")
            for movie_name in similar:
                if movie_name not in all_movies and len(similar_movies_details) < num_recommendations:
                    details = get_movie_details(movie_name)
                    if details and details["Vote_Average"] >= 7.0:
                        # Calculate genre match score
                        genre_match_score = sum(1 for g in details["Genres"] if g in user_genres) / len(details["Genres"])
                        logger.info(f"Genre match score for {movie_name}: {genre_match_score}")
                        if genre_match_score >= 0.5:  # At least 50% genre match
                            similar_movies_details.append(details)
                            logger.info(f"Added {movie_name} to recommendations")

    logger.info(f"Final number of movies found: {len(similar_movies_details)}")

    # Only use top-rated movies as a last resort
    if not similar_movies_details:
        logger.info("No movies found, returning top movies")
        return get_top_movies()[:num_recommendations]

    # Calculate final scores based on genre match and rating
    final_scores = []
    for details in similar_movies_details:
        # Calculate genre match score
        genre_match_score = sum(1 for g in details["Genres"] if g in user_genres) / len(details["Genres"])
        
        # Calculate rating score (normalized to 0-1)
        rating_score = details["Vote_Average"] / 10.0
        
        # Combine scores with 90% weight on genre match and 10% on rating
        final_score = (genre_match_score * 0.9) + (rating_score * 0.1)
        final_scores.append(final_score)
        logger.info(f"Final score for {details['Title']}: {final_score} (genre: {genre_match_score}, rating: {rating_score})")
    
    # Get top recommendations
    recommended_indices = np.argsort(final_scores)[::-1][:num_recommendations]
    recommendations = [similar_movies_details[i]["Title"] for i in recommended_indices]
    
    logger.info(f"Final recommendations: {recommendations}")
    return recommendations

def get_similar_movies(movie_name, num_recommendations=DEFAULT_RECOMMENDATIONS):
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
        vectorizer = TfidfVectorizer(stop_words="english", ngram_range=(1, 2))
        
        # Create rich text representation for the input movie
        movie_text = (
            " ".join(movie["Genres"]) + " " + 
            movie["Overview"] + " " + 
            " ".join(movie["Keywords"]) + " " +
            " ".join(movie["Production_Companies"]) + " " +
            " ".join(movie["Directors"]) + " " +
            " ".join(movie["Cast"])
        )
        
        # Create text representations for top movies
        top_movies_text = []
        top_movies_details = []
        for movie_name in top_movies:
            details = get_movie_details(movie_name)
            if details:
                top_movies_details.append(details)
                top_movies_text.append(
                    " ".join(details["Genres"]) + " " + 
                    details["Overview"] + " " + 
                    " ".join(details["Keywords"]) + " " +
                    " ".join(details["Production_Companies"]) + " " +
                    " ".join(details["Directors"]) + " " +
                    " ".join(details["Cast"])
                )

        if top_movies_text:
            # Calculate similarity scores
            movie_matrix = vectorizer.fit_transform([movie_text] + top_movies_text)
            similarity_scores = cosine_similarity(movie_matrix[0], movie_matrix[1:])[0]
            
            # Apply genre-based filtering
            final_scores = []
            for i, details in enumerate(top_movies_details):
                genre_score = 0
                for genre in details["Genres"]:
                    if genre in movie["Genres"]:
                        genre_score += 1
                
                # Normalize genre score
                genre_score = genre_score / len(details["Genres"]) if details["Genres"] else 0
                
                # Combine similarity score with genre score
                final_score = (similarity_scores[i] * 0.7) + (genre_score * 0.3)
                final_scores.append(final_score)
            
            # Get additional recommendations
            recommended_indices = np.argsort(final_scores)[::-1][:num_recommendations - len(recommendations)]
            recommended_movies = [top_movies[i] for i in recommended_indices]
            recommendations += recommended_movies

    return recommendations[:num_recommendations]
