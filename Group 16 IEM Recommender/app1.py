from flask import Flask, render_template, request, jsonify
import pandas as pd
from scrapper import scrape_and_save_images  # Image Scraper
from songreco import recommend_songs  # Song Recommendation
from recommender import load_data, recommend_iems  # IEM Recommendation

app = Flask(__name__)

# Load dataset once
df = load_data()

# ---------- Routes ----------

@app.route('/')
def intro():
    """ Renders the intro page. """
    return render_template('intro.html')

@app.route('/index1')
def index1():
    """ Renders the index1 page where users input their preferences. """
    return render_template('index1.html')

@app.route('/reco_iem1')
def reco_iem1():
    """ Handles IEM recommendations based on user preferences. """
    global df  # Use the globally loaded dataset
    categories = request.args.get('categories', '').strip()
    budget = request.args.get('budget', '').strip()
    sound_signature = request.args.get('signature', '').strip()  # Optional

    # Ensure at least one category is selected
    selected_categories = [c.strip() for c in categories.split(',') if c.strip()]
    if not selected_categories:
        return render_template('reco_iem1.html', iems=[], message="Please select at least one category.")

    # Convert budget to float if provided
    budget = float(budget) if budget else None

    # Filter dataset based on optional sound signature
    filtered_df = df.copy()
    if sound_signature:
        filtered_df = filtered_df[filtered_df['Signature'].str.contains(sound_signature, case=False, na=False)]

    recommendations = rec‹ommend_iems(selected_categories, filtered_df, budget)

    # If no IEMs match, show a message
    if recommendations.empty:
        return render_template('reco_iem1.html', iems=[], message="No recommendations found.")

    # Fetch images for recommended IEMs
    iem_models = recommendations['Model'].tolist()
    scrape_and_save_images(iem_models)

    # Prepare data for frontend
    iems = [
        {
            'model': row['Model'],
            'signature': row['Signature'],
            'price': f"${row['Price (MSRP)']:.2f}" if pd.notna(row['Price (MSRP)']) else "N/A",
            'match': row['Match'],
            'image': f"/static/images/{row['Model'].replace(' ', '_').replace('/', '_').replace('&', 'and')}.jpg",
            'amazon_link': f"https://www.amazon.com/s?k={row['Model'].replace(' ', '+')}",
            'hpz_link': f"https://www.headphonezone.in/search?q={row['Model'].replace(' ', '+')}"
        }
        for _, row in recommendations.iterrows()
    ]

    return render_template('reco_iem1.html', iems=iems, sound_signature=sound_signature)

# ---------- Song Recommendation Route ----------
@app.route("/song_recommendation", methods=["POST"])
def song_recommendation():
    """API endpoint to return song recommendations based on IEM sound signature."""
    data = request.get_json()
    iem_signature = data.get("signature", "").strip()

    if not iem_signature:
        return jsonify({"error": "No IEM signature provided"}), 400

    recommended_songs = recommend_songs(iem_signature)  # Ensure this function works correctly

    if not recommended_songs or (isinstance(recommended_songs, list) and len(recommended_songs) == 0):
        return jsonify({"error": "No suitable songs found."})

    # Add Spotify search URL to each song
    for song in recommended_songs:
        song["spotify_link"] = f"https://open.spotify.com/search/{song['track_name'].replace(' ', '%20')}%20{song['track_artist'].replace(' ', '%20')}"

    return jsonify(recommended_songs)


@app.route('/song_reco')
def song_reco_page():
    """Render song recommendation page with IEM's sound signature."""
    iem_signature = request.args.get("signature", "Neutral")  # Default to "Neutral"
    return render_template('songreco.html', sound_signature=iem_signature)

# ---------- Run Flask ----------
if __name__ == '__main__':
    app.run(debug=True, port=5000)
