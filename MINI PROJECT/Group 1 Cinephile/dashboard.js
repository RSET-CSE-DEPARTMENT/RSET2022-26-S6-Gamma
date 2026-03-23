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
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database();

// TMDb API configuration
const TMDB_API_KEY = 'e7dab9ac70474bbfe363ad906dd566d5';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

// DOM Elements
let movieGrid;
let searchInput;
let searchButton;
let loadingIndicator;
let filterSelect;

// Initialize the dashboard
document.addEventListener('DOMContentLoaded', () => {
    initializeElements();
    setupEventListeners();
    checkAuthState();
});

// Initialize DOM elements
function initializeElements() {
    movieGrid = document.getElementById('movieGrid');
    searchInput = document.getElementById('searchInput');
    searchButton = document.getElementById('searchButton');
    loadingIndicator = document.getElementById('loadingIndicator');
    filterSelect = document.getElementById('filterSelect');
}

// Setup event listeners
function setupEventListeners() {
    searchButton?.addEventListener('click', handleSearch);
    searchInput?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSearch();
    });
    filterSelect?.addEventListener('change', handleFilterChange);
}

// Check authentication state
function checkAuthState() {
    auth.onAuthStateChanged((user) => {
        if (user) {
            loadDashboard();
        } else {
            window.location.href = 'login.html';
        }
    });
}

// Load dashboard content
async function loadDashboard() {
    try {
        showLoading();
        const movies = await fetchPopularMovies();
        displayMovies(movies);
    } catch (error) {
        console.error('Error loading dashboard:', error);
        showError('Failed to load movies. Please try again later.');
    } finally {
        hideLoading();
    }
}

// Fetch popular movies from TMDb
async function fetchPopularMovies(page = 1) {
    const response = await fetch(
        `${TMDB_BASE_URL}/movie/popular?api_key=${TMDB_API_KEY}&language=en-US&page=${page}`
    );
    const data = await response.json();
    return data.results;
}

// Search movies
async function handleSearch() {
    const query = searchInput.value.trim();
    if (!query) return;

    try {
        showLoading();
        const response = await fetch(
            `${TMDB_BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&language=en-US&page=1`
        );
        const data = await response.json();
        displayMovies(data.results);
    } catch (error) {
        console.error('Error searching movies:', error);
        showError('Failed to search movies. Please try again.');
    } finally {
        hideLoading();
    }
}

// Handle filter change
async function handleFilterChange() {
    const filter = filterSelect.value;
    try {
        showLoading();
        let movies;
        switch (filter) {
            case 'popular':
                movies = await fetchPopularMovies();
                break;
            case 'top_rated':
                movies = await fetchTopRatedMovies();
                break;
            case 'now_playing':
                movies = await fetchNowPlayingMovies();
                break;
            default:
                movies = await fetchPopularMovies();
        }
        displayMovies(movies);
    } catch (error) {
        console.error('Error filtering movies:', error);
        showError('Failed to filter movies. Please try again.');
    } finally {
        hideLoading();
    }
}

// Fetch top rated movies
async function fetchTopRatedMovies() {
    const response = await fetch(
        `${TMDB_BASE_URL}/movie/top_rated?api_key=${TMDB_API_KEY}&language=en-US&page=1`
    );
    const data = await response.json();
    return data.results;
}

// Fetch now playing movies
async function fetchNowPlayingMovies() {
    const response = await fetch(
        `${TMDB_BASE_URL}/movie/now_playing?api_key=${TMDB_API_KEY}&language=en-US&page=1`
    );
    const data = await response.json();
    return data.results;
}

// Display movies in the grid
function displayMovies(movies) {
    if (!movieGrid) return;
    
    movieGrid.innerHTML = '';
    
    if (!movies || movies.length === 0) {
        movieGrid.innerHTML = '<p class="no-results">No movies found</p>';
        return;
    }

    movies.forEach(movie => {
        const movieCard = createMovieCard(movie);
        movieGrid.appendChild(movieCard);
    });
}

// Create a movie card element
function createMovieCard(movie) {
    const card = document.createElement('div');
    card.className = 'movie-card';
    
    const posterPath = movie.poster_path
        ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
        : 'placeholder-image.jpg';
    
    card.innerHTML = `
        <img src="${posterPath}" alt="${movie.title}" class="movie-poster">
        <div class="movie-info">
            <h3>${movie.title}</h3>
            <p class="movie-rating">⭐ ${movie.vote_average.toFixed(1)}</p>
            <p class="movie-year">${movie.release_date?.split('-')[0] || 'N/A'}</p>
        </div>
        <div class="movie-overlay">
            <button onclick="viewMovieDetails('${movie.id}')" class="view-details-btn">
                View Details
            </button>
        </div>
    `;
    
    return card;
}

// Navigate to movie details page
function viewMovieDetails(movieId) {
    window.location.href = `movie-details.html?id=${movieId}`;
}

// Show loading indicator
function showLoading() {
    if (loadingIndicator) {
        loadingIndicator.style.display = 'block';
    }
}

// Hide loading indicator
function hideLoading() {
    if (loadingIndicator) {
        loadingIndicator.style.display = 'none';
    }
}

// Show error message
function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    movieGrid.innerHTML = '';
    movieGrid.appendChild(errorDiv);
}

// Handle logout
function logout() {
    auth.signOut()
        .then(() => {
            window.location.href = 'login.html';
        })
        .catch((error) => {
            console.error('Error signing out:', error);
        });
}
