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

const API_KEY = "e7dab9ac70474bbfe363ad906dd566d5";
const IMAGE_URL = "https://image.tmdb.org/t/p/w500";

// DOM Elements
const loadingDiv = document.querySelector('.loading');
const errorDiv = document.querySelector('.error');
const noMoviesDiv = document.querySelector('.no-movies');
const watchedMoviesGrid = document.getElementById('watchedMoviesGrid');
const sortButtons = document.querySelectorAll('.sort-btn');

let currentSort = 'date';
let watchedMovies = [];

// Check authentication state
auth.onAuthStateChanged((user) => {
    if (!user) {
        window.location.href = 'login.html';
        return;
    }
    loadWatchedMovies(user.uid);
});

// Function to load watched movies
async function loadWatchedMovies(userId) {
    loadingDiv.style.display = 'block';
    errorDiv.style.display = 'none';
    noMoviesDiv.style.display = 'none';

    try {
        const watchedRef = db.ref(`watched/${userId}`);
        const snapshot = await watchedRef.once('value');
        const watchedData = snapshot.val() || {};

        // Convert the numbered indices structure to array
        const movies = [];
        Object.keys(watchedData).forEach(key => {
            const movieData = watchedData[key];
            if (movieData && movieData.id) {
                movies.push({
                    id: movieData.id,
                    watchedDate: movieData.watchedDate || movieData.date || new Date().toISOString()
                });
            }
        });

        console.log('Raw watched data:', watchedData); // Debug log
        console.log('Processed movies array:', movies); // Debug log

        if (movies.length === 0) {
            loadingDiv.style.display = 'none';
            noMoviesDiv.style.display = 'block';
            return;
        }

        // Get detailed movie information
        const movieDetailsPromises = movies.map(movie => 
            fetch(`https://api.themoviedb.org/3/movie/${movie.id}?api_key=${API_KEY}&language=en-US`)
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    return response.json();
                })
                .catch(error => {
                    console.error(`Error fetching movie ${movie.id}:`, error);
                    return null;
                })
        );

        const movieDetails = await Promise.all(movieDetailsPromises);
        
        // Combine watched date with movie details, filter out any failed requests
        watchedMovies = movies.map((movie, index) => {
            const details = movieDetails[index];
            if (!details || details.success === false) return null;
            return {
                ...movie,
                ...details,
                watchedDate: movie.watchedDate
            };
        }).filter(movie => movie !== null);

        console.log('Final processed movies:', watchedMovies); // Debug log

        // Sort and display movies
        sortAndDisplayMovies();

        loadingDiv.style.display = 'none';
    } catch (error) {
        console.error('Error loading watched movies:', error);
        loadingDiv.style.display = 'none';
        errorDiv.textContent = 'Failed to load watched movies. Please try again later.';
        errorDiv.style.display = 'block';
    }
}

// Function to sort and display movies
function sortAndDisplayMovies() {
    let sortedMovies = [...watchedMovies];

    switch (currentSort) {
        case 'date':
            sortedMovies.sort((a, b) => new Date(b.watchedDate) - new Date(a.watchedDate));
            break;
        case 'rating':
            sortedMovies.sort((a, b) => b.vote_average - a.vote_average);
            break;
        case 'title':
            sortedMovies.sort((a, b) => a.title.localeCompare(b.title));
            break;
    }

    displayMovies(sortedMovies);
}

// Function to display movies
function displayMovies(movies) {
    watchedMoviesGrid.innerHTML = movies.map(movie => `
        <div class="movie-card" onclick="window.location.href='movie-details.html?id=${movie.id}'">
            <div class="watched-badge">Watched</div>
            <img src="${IMAGE_URL}${movie.poster_path}" alt="${movie.title}">
        </div>
    `).join('');
}

// Add event listeners for sort buttons
sortButtons.forEach(button => {
    button.addEventListener('click', () => {
        // Remove active class from all buttons
        sortButtons.forEach(btn => btn.classList.remove('active'));
        // Add active class to clicked button
        button.classList.add('active');
        // Update current sort and re-sort movies
        currentSort = button.dataset.sort;
        sortAndDisplayMovies();
    });
}); 