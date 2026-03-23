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
const db = firebase.database(app);
const auth = firebase.auth(app);

const API_KEY = "e7dab9ac70474bbfe363ad906dd566d5"; // Replace with your TMDb API Key
const BASE_URL = "https://api.themoviedb.org/3";
const IMAGE_URL = "https://image.tmdb.org/t/p/w500";

// Get movie ID from URL
const urlParams = new URLSearchParams(window.location.search);
const movieId = urlParams.get("id");

const movieContainer = document.querySelector(".movie-container");
const loadingDiv = document.querySelector(".loading");
const errorDiv = document.querySelector(".error");
const watchlistButton = document.querySelector(".add-watchlist");
const watchedButton = document.querySelector(".mark-watched");
const reviewText = document.getElementById('reviewText');
const submitReviewBtn = document.querySelector('.submit-review');
const reviewsList = document.getElementById('reviewsList');
const stars = document.querySelectorAll('.star');

let selectedRating = 0;
let currentUser = null;

// Check authentication state
auth.onAuthStateChanged((user) => {
    currentUser = user;
    const reviewFormContent = document.getElementById('reviewFormContent');
    const loginPrompt = document.getElementById('loginPrompt');
    
    if (user) {
        // User is signed in
        reviewFormContent.style.display = 'block';
        loginPrompt.style.display = 'none';
        submitReviewBtn.disabled = false;
        reviewText.disabled = false;
        stars.forEach(star => star.style.cursor = 'pointer');
    } else {
        // User is signed out
        reviewFormContent.style.display = 'none';
        loginPrompt.style.display = 'block';
        submitReviewBtn.disabled = true;
        reviewText.disabled = true;
        stars.forEach(star => star.style.cursor = 'not-allowed');
    }
});

// Function to format date
function formatDate(dateString) {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
}

// Function to create review element
function createReviewElement(review) {
    const isLiked = review.likes && review.likes[currentUser?.uid] === true;
    const likeCount = review.likes ? Object.keys(review.likes).length : 0;
    
    return `
        <div class="review-item">
            <div class="review-header">
                <span class="review-author">${review.username || 'Anonymous'}</span>
                <span class="review-date">${formatDate(review.date)}</span>
            </div>
            <div class="review-rating">${'★'.repeat(review.rating)}${'☆'.repeat(5-review.rating)}</div>
            <div class="review-content">${review.text}</div>
            <div class="review-actions">
                <button class="like-button ${isLiked ? 'liked' : ''}" onclick="toggleLike('${review.id}')">
                    <span class="heart-icon">${isLiked ? '❤️' : '🤍'}</span>
                    <span class="like-count">${likeCount}</span>
                </button>
            </div>
        </div>
    `;
}

// Function to load reviews
function loadReviews() {
    const reviewsRef = db.ref(`reviews/${movieId}`);
    reviewsRef.on('value', (snapshot) => {
        const reviews = [];
        snapshot.forEach((childSnapshot) => {
            reviews.push({
                id: childSnapshot.key,
                ...childSnapshot.val()
            });
        });
        // Sort reviews by date (newest first)
        reviews.sort((a, b) => new Date(b.date) - new Date(a.date));
        reviewsList.innerHTML = reviews.map(review => createReviewElement(review)).join('');
    });
}

// Function to submit review
async function submitReview() {
    if (!currentUser) {
        window.location.href = 'login.html';
        return;
    }

    const reviewText = document.getElementById('reviewText').value.trim();
    if (!reviewText) {
        alert('Please enter a review');
        return;
    }

    if (selectedRating === 0) {
        alert('Please select a rating');
        return;
    }

    try {
        // Analyze sentiment using the simple approach
        const sentiment = window.sentimentAnalysis.simpleSentimentAnalysis(reviewText);
        
        const reviewsRef = db.ref(`reviews/${movieId}`);
        const newReviewRef = reviewsRef.push();
        
        await newReviewRef.set({
            text: reviewText,
            rating: selectedRating,
            date: new Date().toISOString(),
            userId: currentUser.uid,
            username: currentUser.displayName || currentUser.email.split('@')[0],
            movieId: movieId,
            movieTitle: document.getElementById('movieTitle').textContent,
            poster_path: document.getElementById('moviePoster').src.split('/').pop(),
            sentiment: sentiment
        });

        // Clear form
        document.getElementById('reviewText').value = '';
        selectedRating = 0;
        stars.forEach(star => star.classList.remove('active'));
    } catch (error) {
        console.error('Error submitting review:', error);
        alert('Failed to submit review. Please try again.');
    }
}

// Event listeners
submitReviewBtn.addEventListener('click', submitReview);

// Function to check if movie is in watchlists
async function isInWatchlist(movieId) {
    try {
        const user = auth.currentUser;
        if (!user) return false;
        
        const watchlistsRef = db.ref(`watchlists/${user.uid}`);
        const snapshot = await watchlistsRef.once('value');
        const watchlists = snapshot.val() || [];
        return Array.isArray(watchlists) && watchlists.some(movie => movie.id === movieId);
    } catch (error) {
        console.error('Error checking watchlists:', error);
        return false;
    }
}

// Function to check if movie is watched
async function isWatched(movieId) {
    const user = auth.currentUser;
    if (!user) return false;

    try {
        const watchedRef = db.ref(`watched/${user.uid}`);
        const snapshot = await watchedRef.once('value');
        const watched = snapshot.val() || [];
        return Array.isArray(watched) && watched.some(movie => movie.id === movieId);
    } catch (error) {
        console.error('Error checking watched status:', error);
        return false;
    }
}

// Function to update button state
function updateWatchlistButton(isInWatchlist) {
    if (isInWatchlist) {
        watchlistButton.textContent = '✓ Added to Watchlist';
        watchlistButton.style.borderColor = '#4CAF50';
        watchlistButton.style.color = '#4CAF50';
    } else {
        watchlistButton.textContent = '+ Add to Watchlist';
        watchlistButton.style.borderColor = 'white';
        watchlistButton.style.color = 'white';
    }
}

// Function to toggle watchlists
async function toggleWatchlist(movieId, movieData) {
    try {
        const user = auth.currentUser;
        if (!user) {
            alert('Please sign in to add movies to your watchlist');
            return;
        }

        const watchlistsRef = db.ref(`watchlists/${user.uid}`);
        const snapshot = await watchlistsRef.once('value');
        const watchlists = snapshot.val() || [];

        const index = watchlists.findIndex(movie => movie.id === movieId);
        if (index === -1) {
            // Add to watchlists
            watchlists.push(movieData);
            await watchlistsRef.set(watchlists);
            updateWatchlistButton(true);
            alert('Added to watchlist!');
        } else {
            // Remove from watchlists
            watchlists.splice(index, 1);
            await watchlistsRef.set(watchlists);
            updateWatchlistButton(false);
            alert('Removed from watchlist!');
        }
    } catch (error) {
        console.error('Error updating watchlists:', error);
        alert('Failed to update watchlist. Please try again.');
    }
}

// Function to toggle watched status
async function toggleWatched(movieId, movieData) {
    const user = auth.currentUser;
    if (!user) {
        window.location.href = 'login.html';
        return;
    }

    try {
        const watchedRef = db.ref(`watched/${user.uid}`);
        const snapshot = await watchedRef.once('value');
        const watched = snapshot.val() || [];
        
        const index = watched.findIndex(movie => movie.id === movieId);
        
        if (index === -1) {
            // Add to watched list
            watched.push(movieData);
            await watchedRef.set(watched);
            updateWatchedButton(true);
            alert('Marked as watched!');
        } else {
            // Remove from watched list
            watched.splice(index, 1);
            await watchedRef.set(watched);
            updateWatchedButton(false);
            alert('Removed from watched list!');
        }
    } catch (error) {
        console.error('Error updating watched status:', error);
        alert('Failed to update watched status. Please try again.');
    }
}

// Function to update watched button appearance
function updateWatchedButton(isWatched) {
    watchedButton.textContent = isWatched ? '✓ Watched' : '✓ Mark as Watched';
    watchedButton.classList.toggle('watched', isWatched);
}

// Function to toggle like on a review
async function toggleLike(reviewId) {
    if (!currentUser) {
        window.location.href = 'login.html';
        return;
    }

    try {
        const reviewRef = db.ref(`reviews/${movieId}/${reviewId}`);
        const snapshot = await reviewRef.once('value');
        const review = snapshot.val();
        
        // Initialize likes object if it doesn't exist
        if (!review.likes) {
            review.likes = {};
        }
        
        // Toggle like status
        if (review.likes[currentUser.uid]) {
            // Unlike
            delete review.likes[currentUser.uid];
        } else {
            // Like
            review.likes[currentUser.uid] = true;
        }
        
        // Update the review
        await reviewRef.update({ likes: review.likes });
        
        // Reload reviews to update the UI
        loadReviews();
    } catch (error) {
        console.error('Error toggling like:', error);
        alert('Failed to update like. Please try again.');
    }
}

if (!movieId) {
    errorDiv.textContent = "Movie ID is missing!";
    errorDiv.style.display = "block";
} else {
    fetchMovieDetails(movieId);
}

async function fetchMovieDetails(id) {
    loadingDiv.style.display = "block";
    try {
        const response = await fetch(`${BASE_URL}/movie/${id}?api_key=${API_KEY}&append_to_response=credits`);
        if (!response.ok) throw new Error("Movie not found!");

        const data = await response.json();
        displayMovieDetails(data);
        
        // Check if movie is in watchlists using Firebase
        const movieInWatchlists = await isInWatchlist(data.id);
        updateWatchlistButton(movieInWatchlists);
        
        // Check if movie is watched
        const movieWatched = await isWatched(data.id);
        updateWatchedButton(movieWatched);
        
        // Add click event listeners to buttons
        watchlistButton.addEventListener('click', () => {
            toggleWatchlist(data.id, {
                id: data.id,
                title: data.title,
                poster_path: data.poster_path,
                release_date: data.release_date,
                vote_average: data.vote_average
            });
        });

        watchedButton.addEventListener('click', () => {
            toggleWatched(data.id, {
                id: data.id,
                title: data.title,
                poster_path: data.poster_path,
                release_date: data.release_date,
                vote_average: data.vote_average
            });
        });

        // Load reviews
        loadReviews();
    } catch (error) {
        errorDiv.textContent = error.message;
        errorDiv.style.display = "block";
    } finally {
        loadingDiv.style.display = "none";
    }
}

function displayMovieDetails(data) {
    document.getElementById("movieTitle").textContent = data.title;
    document.getElementById("tagline").textContent = data.tagline || "No tagline available";
    document.getElementById("rating").textContent = data.vote_average.toFixed(1);
    document.getElementById("releaseDate").textContent = data.release_date;
    document.getElementById("runtime").textContent = `${data.runtime} min`;
    document.getElementById("overview").textContent = data.overview;
    document.getElementById("moviePoster").src = `${IMAGE_URL}${data.poster_path}`;

    // Get genres
    document.getElementById("genre").textContent = data.genres.map(genre => genre.name).join(", ");

    // Get director's name
    const director = data.credits.crew.find(person => person.job === "Director");
    document.getElementById("director").textContent = director ? director.name : "Not available";

    // Show content after loading
    movieContainer.style.display = "flex";
}

// Star rating functionality
stars.forEach(star => {
    star.addEventListener('click', () => {
        selectedRating = parseInt(star.dataset.rating);
        stars.forEach(s => {
            s.classList.toggle('active', parseInt(s.dataset.rating) <= selectedRating);
        });
    });
});
