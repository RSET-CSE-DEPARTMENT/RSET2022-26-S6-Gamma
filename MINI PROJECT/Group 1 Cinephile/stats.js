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
const noDataDiv = document.querySelector('.no-data');

// Check authentication state
auth.onAuthStateChanged((user) => {
    if (!user) {
        window.location.href = 'login.html';
        return;
    }
    loadUserStats(user.uid);
});

// Function to load user statistics
async function loadUserStats(userId) {
    loadingDiv.style.display = 'block';
    errorDiv.style.display = 'none';
    noDataDiv.style.display = 'none';

    try {
        // Get user's watched movies
        const watchedRef = db.ref(`watched/${userId}`);
        const snapshot = await watchedRef.once('value');
        const watchedMovies = snapshot.val() || [];

        if (watchedMovies.length === 0) {
            loadingDiv.style.display = 'none';
            noDataDiv.style.display = 'block';
            return;
        }

        // Get genre counts
        const genreCounts = {};
        const movieDetailsPromises = watchedMovies.map(movie => 
            fetch(`https://api.themoviedb.org/3/movie/${movie.id}?api_key=${API_KEY}&language=en-US`)
                .then(response => response.json())
        );

        const movieDetails = await Promise.all(movieDetailsPromises);
        
        movieDetails.forEach(movie => {
            if (movie.genres) {
                movie.genres.forEach(genre => {
                    genreCounts[genre.name] = (genreCounts[genre.name] || 0) + 1;
                });
            }
        });

        // Sort genres by count
        const sortedGenres = Object.entries(genreCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10); // Show top 10 genres

        // Create chart
        createGenreChart(sortedGenres);

        loadingDiv.style.display = 'none';
    } catch (error) {
        console.error('Error loading user stats:', error);
        loadingDiv.style.display = 'none';
        errorDiv.textContent = 'Failed to load statistics. Please try again later.';
        errorDiv.style.display = 'block';
    }
}

// Function to create genre chart
function createGenreChart(genreData) {
    const ctx = document.getElementById('genresChart').getContext('2d');
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: genreData.map(item => item[0]),
            datasets: [{
                label: 'Number of Movies',
                data: genreData.map(item => item[1]),
                backgroundColor: 'rgba(135, 206, 235, 0.5)',
                borderColor: 'rgba(135, 206, 235, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: '#fff'
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    }
                },
                x: {
                    ticks: {
                        color: '#fff'
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    }
                }
            },
            plugins: {
                legend: {
                    labels: {
                        color: '#fff'
                    }
                }
            }
        }
    });
} 