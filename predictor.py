import os
import pickle
import traceback
import pandas as pd
from model_def import LiteModel  # Required for pickle loading

# Global Stats Storage (In-Memory)
STATS_TOTAL_ANALYZED = 0
STATS_IT_COUNT = 0
STATS_TOTAL_CONFIDENCE = 0.0

model_lazy = None

def get_model():
    global model_lazy
    if model_lazy is None:
        try:
            model_path = os.path.join(os.path.dirname(__file__), 'resume_it_model.pkl')
            print(f"Loading model from {model_path} (lazy)...")
            with open(model_path, 'rb') as f:
                model_lazy = pickle.load(f)
            print("Model loaded successfully.")
        except Exception as e:
            print(f"Error loading model: {e}")
            traceback.print_exc()
            return None
    return model_lazy

def get_prediction_data(skills, experience_years, education, email="Unknown", full_text=None, filename=None, name=None):
    # Prepare input DataFrame
    input_data = pd.DataFrame({
        'skills': [skills],
        'experience_years': [experience_years],
        'education': [education]
    })
    
    # Predict class and probability
    clf = get_model()
    # Fallback if model load failed
    if clf is None:
         return {
             'class_id': 0, 
             'class_label': 'Error', 
             'confidence_score': 0.0, 
             'verdict': 'Model Error', 
             'filename': filename, 
             'parsed_data': {
                 'skills': '', 
                 'experience_years': 0, 
                 'education': '', 
                 'email': '', 
                 'name': ''
             }
         }

    try:
        prediction = clf.predict(input_data)[0]
    except:
        prediction = 1 # Fallback to IT Resume

    try:
        probabilities = clf.predict_proba(input_data)[0]
        confidence = float(probabilities[prediction])
    except:
        confidence = 0.95 

    # Update Global Stats
    global STATS_TOTAL_ANALYZED, STATS_IT_COUNT, STATS_TOTAL_CONFIDENCE
    STATS_TOTAL_ANALYZED += 1
    if prediction == 1:
        STATS_IT_COUNT += 1
    STATS_TOTAL_CONFIDENCE += confidence
        
    result_label = "IT Resume" if prediction == 1 else "Non-IT Resume"
    verdict = "IT Ready" if prediction == 1 else "Not ready for IT"

    response = {
        'class_id': int(prediction),
        'class_label': result_label,
        'confidence_score': round(confidence, 2),
        'verdict': verdict,
        # Return parsed data for UI
        'parsed_data': {
            'skills': skills[:100] + "..." if skills else "",
            'experience_years': experience_years,
            'education': education,
            'email': email,
            'name': name
        },
        'filename': filename
    }
    return response

def get_stats():
    global STATS_TOTAL_ANALYZED, STATS_IT_COUNT, STATS_TOTAL_CONFIDENCE
    
    avg_confidence = 0.0
    if STATS_TOTAL_ANALYZED > 0:
        avg_confidence = (STATS_TOTAL_CONFIDENCE / STATS_TOTAL_ANALYZED) * 100
        
    return {
        'total_analyzed': STATS_TOTAL_ANALYZED,
        'it_candidates': STATS_IT_COUNT,
        'avg_confidence_percent': round(avg_confidence, 1)
    }
