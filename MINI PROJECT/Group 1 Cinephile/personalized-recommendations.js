// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBwLRRKIwsSPmvFXnDn5UcweXli12w1Qr0",
    authDomain: "cinephile-250fc.firebaseapp.com",
    databaseURL: "https://cinephile-250fc-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "cinephile-250fc",
    storageBucket: "cinephile-250fc.firebasestorage.app",
    messagingSenderId: "995080104071",
    appId: "1:995080104071:web:150cd3e9f3d8a905097022",
    measurementId: "G-QX66DDM9ZD"
};

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const auth = firebase.auth();

const API_KEY = "d8f50a3371afc220d8657c2416c8514b";
const IMAGE_URL = "https://image.tmdb.org/t/p/w500";

// DOM Elements
const loadingDiv = document.querySelector('.loading');
const errorDiv = document.querySelector('.error');
const noRecommendationsDiv = document.querySelector('.no-recommendations');

// Check if recommendation system is initialized
function ensureRecommendationSystem() {
    if (!window.recommendationSystem) {
        throw new Error('Recommendation system not initialized. Please make sure recommendation-system.js is loaded.');
    }
}

// Check authentication state
auth.onAuthStateChanged((user) => {
    if (!user) {
        window.location.href = 'login.html';
        return;
    }
    try {
        ensureRecommendationSystem();
        loadRecommendations();
    } catch (error) {
        console.error('Error initializing recommendations:', error);
        errorDiv.textContent = 'Failed to initialize recommendation system. Please try refreshing the page.';
        errorDiv.style.display = 'block';
        loadingDiv.style.display = 'none';
    }
});

// Function to get recommendations based on watchlist
async function getWatchlistRecommendations(userId) {
    try {
        const watchlistRef = db.ref(`watchlists/${userId}`);
        const snapshot = await watchlistRef.once('value');
        const watchlist = snapshot.val() || [];

        if (watchlist.length === 0) return [];

        // Get genres from watchlist movies
        const watchlistGenres = new Set();
        const watchlistMovieDetails = await Promise.all(
            watchlist.map(movie => getMovieDetails(movie.id))
        );

        watchlistMovieDetails.forEach(movie => {
            if (movie && movie.genres) {
                movie.genres.forEach(genre => watchlistGenres.add(genre.id));
            }
        });

        // Get similar movies for each watchlist movie
        const similarMovies = await Promise.all(
            watchlist.map(movie => getSimilarMovies(movie.id))
        );

        // Flatten and deduplicate similar movies
        const uniqueSimilarMovies = new Map();
        similarMovies.flat().forEach(movie => {
            if (!uniqueSimilarMovies.has(movie.id)) {
                uniqueSimilarMovies.set(movie.id, movie);
            }
        });

        // Score movies based on genre match
        const scoredMovies = Array.from(uniqueSimilarMovies.values()).map(movie => {
            let score = 0;
            if (movie.genres) {
                const matchingGenres = movie.genres.filter(genre => watchlistGenres.has(genre.id)).length;
                score += matchingGenres * 2;
            }
            score += movie.popularity / 10;
            return { ...movie, score };
        });

        return scoredMovies
            .sort((a, b) => b.score - a.score)
            .slice(0, 6);
    } catch (error) {
        console.error('Error getting watchlist recommendations:', error);
        return [];
    }
}

// Function to get similar movies from TMDb
async function getSimilarMovies(movieId) {
    try {
        const response = await fetch(`https://api.themoviedb.org/3/movie/${movieId}/similar?api_key=${API_KEY}&language=en-US&page=1`);
        const data = await response.json();
        return data.results.slice(0, 5);
    } catch (error) {
        console.error('Error getting similar movies:', error);
        return [];
    }
}

// Function to get movie details
async function getMovieDetails(movieId) {
    try {
        const response = await fetch(`https://api.themoviedb.org/3/movie/${movieId}?api_key=${API_KEY}&language=en-US`);
        if (!response.ok) return null;
        return await response.json();
    } catch (error) {
        console.error('Error getting movie details:', error);
        return null;
    }
}

// Function to display recommendations
function displayRecommendations(movies, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (movies.length === 0) {
        container.innerHTML = '<p class="no-movies">No recommendations available</p>';
        return;
    }

    container.innerHTML = movies.map(movie => `
        <div class="movie-card" onclick="window.location.href='movie-details.html?id=${movie.id}'">
            <img src="${IMAGE_URL}${movie.poster_path}" alt="${movie.title}">
            <div class="movie-info">
                <div class="movie-title">${movie.title}</div>
                <div class="movie-rating">⭐ ${movie.vote_average.toFixed(1)}</div>
            </div>
        </div>
    `).join('');
}

// Function to load all recommendations
async function loadRecommendations() {
    const user = auth.currentUser;
    if (!user) {
        console.error('No user logged in');
        return;
    }

    loadingDiv.style.display = 'block';
    errorDiv.style.display = 'none';
    noRecommendationsDiv.style.display = 'none';

    try {
        ensureRecommendationSystem();
        console.log('Recommendation system initialized');

        // Get watchlist-based recommendations
        console.log('Fetching watchlist recommendations...');
        const watchlistRecommendations = await getWatchlistRecommendations(user.uid);
        console.log('Watchlist recommendations:', watchlistRecommendations);
        displayRecommendations(watchlistRecommendations, 'watchlistRecommendations');

        // Get watched movies-based recommendations
        console.log('Fetching watched movies recommendations...');
        const watchedRecommendations = await window.recommendationSystem.getRecommendedMoviesByWatchedAndSentiment(user.uid, db);
        console.log('Watched movies recommendations:', watchedRecommendations);
        displayRecommendations(watchedRecommendations, 'watchedRecommendations');

        // Get review-based recommendations
        console.log('Fetching review-based recommendations...');
        const preferences = await window.recommendationSystem.getUserSentimentPreferences(user.uid, db);
        console.log('User preferences:', preferences);
        const reviewRecommendations = preferences ? 
            await window.recommendationSystem.getRecommendedMoviesBySentiment(preferences) : [];
        console.log('Review-based recommendations:', reviewRecommendations);
        displayRecommendations(reviewRecommendations, 'reviewRecommendations');

        // Show no recommendations message if all sections are empty
        if (watchlistRecommendations.length === 0 && 
            watchedRecommendations.length === 0 && 
            reviewRecommendations.length === 0) {
            console.log('No recommendations available');
            noRecommendationsDiv.style.display = 'block';
        }
    } catch (error) {
        console.error('Error loading recommendations:', error);
        errorDiv.textContent = 'Failed to load recommendations. Please try again later.';
        errorDiv.style.display = 'block';
    } finally {
        loadingDiv.style.display = 'none';
    }
}

// Function to refresh recommendations
function refreshRecommendations() {
    loadRecommendations();
} 