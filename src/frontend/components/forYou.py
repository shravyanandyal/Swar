from flask import Flask, request, jsonify
from flask_cors import CORS
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.preprocessing import normalize
import cohere
import numpy as np
from sklearn.metrics import precision_score, recall_score
from collections import defaultdict

app = Flask(__name__)
CORS(app)

# Initialize Cohere API
co = cohere.Client('gG9qYCZdnaVj8TVOocTgPKTisD6tO5QxWoPmh3rR')  # Replace with your Cohere API key

# Function to generate embeddings via Cohere API
def get_cohere_embeddings(texts):
    response = co.embed(texts=texts, model="large")
    return response.embeddings

# Get combined user profile based on preferences, liked songs, and streamed songs
def get_combined_user_profile(user_data):
    # Debug print to check structure of user_data
    print("\nUser data received:")
    print(user_data)
    
    try:
        preferences_vector = ' '.join(
            user_data.get("preferences", {}).get("favoriteGenres", []) +
            user_data.get("preferences", {}).get("languages", []) +
            user_data.get("preferences", {}).get("favoriteArtist", "").split(',')
        )
    except KeyError as e:
        print(f"\nKeyError: {e}")
        preferences_vector = ''
    
    liked_songs_vector = ' '.join([
        f"{song.get('genre', 'Unknown genre')} {song['artistName']} {song.get('language', 'Unknown language')}"
        for song in user_data.get("songsLiked", [])
    ])
    
    streamed_songs_vector = ' '.join([
        f"{song.get('genre', 'Unknown genre')} {song['artistName']} {song.get('language', 'Unknown language')}"
        for song in user_data.get("songsStreamed", [])
    ])

    combined_profile = preferences_vector + " " + liked_songs_vector + " " + streamed_songs_vector
    print("\nCombined user profile:")
    print(combined_profile)
    return combined_profile

# Function to get ground truth from user's liked and streamed songs
def get_user_liked_and_streamed_songs(user_data):
    liked_songs_ids = {song['id'] for song in user_data.get("songsLiked", [])}
    streamed_songs_ids = {song['id'] for song in user_data.get("songsStreamed", [])}
    return liked_songs_ids.union(streamed_songs_ids)

# Function to get recommended song IDs
def get_recommended_song_ids(recommended_songs):
    return {song['id'] for song in recommended_songs}

# Function to calculate precision, recall, and F1-score
def calculate_accuracy(user_data, recommended_songs):
    ground_truth_ids = get_user_liked_and_streamed_songs(user_data)
    recommended_song_ids = get_recommended_song_ids(recommended_songs)

    if not ground_truth_ids:
        return {"precision": None, "recall": None, "f1": None, "message": "No ground truth available for this user."}
    
    y_true = [1 if song_id in ground_truth_ids else 0 for song_id in recommended_song_ids]
    y_pred = [1] * len(recommended_song_ids)
    
    precision = precision_score(y_true, y_pred)
    recall = recall_score(y_true, y_pred)
    f1 = 2 * (precision * recall) / (precision + recall) if precision + recall > 0 else 0
    accuracy = sum([1 for true, pred in zip(y_true, y_pred) if true == pred]) / len(y_true)

    return {
        "precision": precision,
        "recall": recall,
        "f1": f1,
        "accuracy": accuracy
    }

# Function to select diverse recommendations by artist
def select_diverse_recommendations(recommended_songs, max_per_artist=2):
    artist_song_map = defaultdict(list)
    for song in recommended_songs:
        artist_name = song['artistName']
        artist_song_map[artist_name].append(song)

    diverse_recommendations = []
    for artist, songs in artist_song_map.items():
        diverse_recommendations.extend(songs[:max_per_artist])

    if len(diverse_recommendations) < 14:
        remaining_songs = [song for song in recommended_songs if song not in diverse_recommendations]
        diverse_recommendations.extend(remaining_songs[:14 - len(diverse_recommendations)])

    return diverse_recommendations[:14]

# Function to select diverse recommendations by genre
def select_diverse_recommendations_by_genre(recommended_songs, max_per_genre=2):
    genre_song_map = defaultdict(list)
    for song in recommended_songs:
        genre = song.get('genre', 'Unknown genre')
        genre_song_map[genre].append(song)

    diverse_recommendations = []
    for genre, songs in genre_song_map.items():
        diverse_recommendations.extend(songs[:max_per_genre])

    if len(diverse_recommendations) < 14:
        remaining_songs = [song for song in recommended_songs if song not in diverse_recommendations]
        diverse_recommendations.extend(remaining_songs[:14 - len(diverse_recommendations)])

    return diverse_recommendations[:14]

# Function to apply both diversity filters
def select_final_recommendations(recommended_songs):
    artist_filtered = select_diverse_recommendations(recommended_songs, max_per_artist=2)
    genre_filtered = select_diverse_recommendations_by_genre(artist_filtered, max_per_genre=2)
    return genre_filtered

@app.route('/api/recommend', methods=['POST'])
def recommend_songs():
    data = request.get_json()
    print("\nIncoming request data:")
    print(data)
    
    user_id = data.get('userId')
    user_data = data.get('userData', {})
    users = user_data.get('users', [])
    songs_data = data.get('songsData', [])
    
    if not users or not user_id:
        return jsonify({"error": "Invalid data"}), 400
    
    current_user_data = next((user for user in users if user["userId"] == user_id), None)
    if not current_user_data:
        return jsonify({"error": "User not found"}), 404
    
    user_profile = get_combined_user_profile(current_user_data)
    
    song_data = [f"{song.get('genre', 'Unknown genre')} {song['artistName']} {song.get('language', 'Unknown language')}" for song in songs_data]
    song_data.append(user_profile)
    
    cohere_embeddings = get_cohere_embeddings(song_data)
    
    song_vectors = np.array(cohere_embeddings[:-1])
    user_profile_vector = np.array(cohere_embeddings[-1]).reshape(1, -1)
    
    song_vectors = normalize(song_vectors)
    user_profile_vector = normalize(user_profile_vector)
    
    cohere_similarities = cosine_similarity(user_profile_vector, song_vectors).flatten()
    
    tfidf_vectorizer = TfidfVectorizer()
    tfidf_matrix = tfidf_vectorizer.fit_transform(song_data)
    
    user_vector_tfidf = tfidf_matrix[-1]
    song_vectors_tfidf = tfidf_matrix[:-1]
    
    cosine_similarities_tfidf = cosine_similarity(user_vector_tfidf, song_vectors_tfidf).flatten()
    
    combined_similarities = (cohere_similarities + cosine_similarities_tfidf) / 2
    
    recommended_indices = combined_similarities.argsort()[-14:][::-1]
    recommended_songs = [songs_data[i] for i in recommended_indices]
    
    # Apply diversity techniques to refine recommendations
    final_recommendations = select_final_recommendations(recommended_songs)
    
    accuracy_metrics = calculate_accuracy(current_user_data, final_recommendations)
    print(accuracy_metrics)
    
    return jsonify({"recommendedSongs": final_recommendations, "accuracyMetrics": accuracy_metrics})

if __name__ == '__main__':
    app.run(debug=True, port=5001)
