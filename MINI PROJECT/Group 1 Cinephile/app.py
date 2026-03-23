from flask import Flask, request, jsonify
from flask_cors import CORS
from rec import get_similar_movies, get_similar_movies_api, get_personalized_recommendations

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

@app.route('/api/recommendations', methods=['GET'])
def get_recommendations():
    user_id = request.args.get('userId')
    movie_name = request.args.get('movie_name')
    
    if not user_id and not movie_name:
        return jsonify({"error": "Either userId or movie_name is required"}), 400
    
    try:
        if user_id:
            # Get personalized recommendations based on user's watchlist and watched movies
            recommendations = get_personalized_recommendations(user_id)
            return jsonify({"recommendations": recommendations})
        else:
            # Get recommendations based on a specific movie
            recommendations = get_similar_movies(movie_name)
            return jsonify({"recommendations": recommendations})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/similar-movies')
def get_similar():
    movie_id = request.args.get('movieId')
    if not movie_id:
        return jsonify({'error': 'Movie ID is required'}), 400
        
    try:
        similar_movies = get_similar_movies_api(movie_id)
        return jsonify({
            'success': True,
            'recommendations': similar_movies
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(port=8000, debug=True) 