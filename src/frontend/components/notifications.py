from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import mean_absolute_error, r2_score
import numpy as np
import joblib  # Import joblib for model persistence

app = Flask(__name__)
CORS(app)

def prepare_data(data):
    rows = []
    for song_id, weekly_data in data['data'].items():
        for week_date, days in weekly_data.items():
            total_likes = 0
            total_listens = 0
            total_nft = 0
            for day, metrics in days.items():
                total_likes += metrics.get('likes', 0)
                total_listens += metrics.get('listens', 0)
                total_nft += metrics.get('nft', 0)  # Default to 0 if missing
            rows.append({
                'song_id': song_id,
                'likes': total_likes,
                'listens': total_listens,
                'nft': total_nft
            })
    
    return pd.DataFrame(rows)

@app.route('/notifications', methods=['POST'])
def notify_users():
    archived_data_list = request.json  # Expecting a list of data objects.
    
    all_data = pd.DataFrame()

    for archived_data in archived_data_list:
        try:
            df = prepare_data(archived_data)
            all_data = pd.concat([all_data, df], ignore_index=True)
        except Exception as e:
            return jsonify({"error": f"Data preparation failed for song_id {archived_data.get('song_id', 'unknown')}: {str(e)}"}), 400

    if all_data.empty:
        return jsonify({"error": "No data available for predictions."}), 400

    train_data, predict_data = train_test_split(all_data, test_size=0.2, random_state=42)

    if len(train_data) < 10:  # Adjust this threshold based on your data characteristics
        return jsonify({"error": "Not enough data for training."}), 400

    scaler = StandardScaler()
    X_train = scaler.fit_transform(train_data[['likes', 'listens', 'nft']])
    y_train = train_data['likes'] + train_data['listens'] + train_data['nft']

    # Create a Random Forest model with some regularization
    model = RandomForestRegressor(n_estimators=100, max_depth=5, min_samples_split=4, random_state=42)
    model.fit(X_train, y_train)

    # Save the trained model to disk
    joblib.dump(model, 'music_popularity_model.pkl')

    # Prepare prediction data
    X_predict = scaler.transform(predict_data[['likes', 'listens', 'nft']])
    predictions = model.predict(X_predict)

    # Evaluate the model performance
    mae = mean_absolute_error(predict_data['likes'] + predict_data['listens'] + predict_data['nft'], predictions)
    r2 = r2_score(predict_data['likes'] + predict_data['listens'] + predict_data['nft'], predictions)

    # Log the performance metrics
    print(f"Model Evaluation Metrics: MAE: {mae:.2f}, R²: {r2:.2f}")

    # Calculate mean prediction and threshold
    mean_prediction = np.mean(predictions)
    std_dev = np.std(predictions)
    print(f"Mean Prediction: {mean_prediction:.2f}")

    # Generate notifications based on the predictions.
    notifications = []
    threshold = mean_prediction + std_dev  # Dynamic threshold

    for i, predicted_popularity in enumerate(predictions):
        song_id = predict_data.iloc[i]['song_id']
        if predicted_popularity > threshold:
            # Create a dynamic message based on the features and predicted popularity.
            message = f"Song {song_id} is expected to be popular soon with a predicted popularity score of {predicted_popularity:.2f}. "
            
            # Add specific suggestions based on feature values
            if predict_data.iloc[i]['nft'] > 0:
                message += "This song has NFTs available, so it's a good time to consider buying them before the price increases."
            if predict_data.iloc[i]['likes'] > predict_data.iloc[i]['listens']:
                message += " The song has been receiving a lot of likes, showing strong user interest."
            else:
                message += " The song has been gaining many listens recently, indicating a rising trend."

            notifications.append(message)

    # Feature importance analysis
    importances = model.feature_importances_
    feature_names = ['likes', 'listens', 'nft']
    print("Feature Importances:")
    for name, importance in zip(feature_names, importances):
        print(f"{name}: {importance:.4f}")

    return jsonify(notifications)


if __name__ == '__main__':
    app.run(debug=True, port=5000)
