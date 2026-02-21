print("Starting app.py...")
import os
import requests
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import concurrent.futures

# Local imports for modularity
import utils
import predictor

app = Flask(__name__, static_folder='resume-classifier-frontend/dist', static_url_path='')
CORS(app)  # Enable CORS for all routes

# Configuration
N8N_WEBHOOK_URL = os.environ.get('N8N_WEBHOOK_URL', 'https://optatively-punchier-pauline.ngrok-free.dev/webhook-test/upload_resume')

# Ensure OCR binaries from local conda env are found (for utils to use)
CONDA_BIN = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.conda', 'bin')
if os.path.exists(CONDA_BIN):
    os.environ['PATH'] = CONDA_BIN + os.pathsep + os.environ['PATH']


def trigger_n8n_webhook(payload):
    """
    Sends the analysis results to n8n webhook.
    """
    try:
        print(f"Sending data to n8n: {N8N_WEBHOOK_URL}")
        # Send async or with short timeout so we don't block the UI response too long
        response = requests.post(N8N_WEBHOOK_URL, json=payload, timeout=2)
        print(f"n8n response: {response.status_code}")
    except Exception as e:
        print(f"Failed to trigger n8n webhook: {e}")

@app.route('/predict_pdf', methods=['POST'])
def predict_pdf():
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file part'}), 400
            
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No selected file'}), 400
            
        if file:
            file_content = file.read() # Read once
            
            # Use unified extractor from utils
            text = utils.extract_text_from_file(file_content, file.filename)
            
            # Validation: Check if text content is sufficient and looks like a resume
            if len(text.strip()) < 50:
                 return jsonify({'error': 'File appears to be an image-scan. OCR failed (Tesseract/Poppler needed on server). Please use a text-based PDF.'}), 400
            
            # Validation: Check for common resume keywords
            resume_keywords = ['education', 'experience', 'skills', 'work', 'project', 'summary', 'profile', 'objective', 'curriculum', 'cv', 'resume']
            if not any(keyword in text.lower() for keyword in resume_keywords):
                # We can choose to be strict or lenient here. Keeping lenient for now.
                pass
                
            # Parse features using utils
            parsed_data = utils.parse_resume_text(text)
            
            # Get prediction using predictor
            response_data = predictor.get_prediction_data(
                parsed_data['skills'], 
                parsed_data['experience_years'], 
                parsed_data['education'],
                email=parsed_data['email'],
                full_text=text,
                filename=file.filename,
                name=parsed_data.get('name')
            )
            
            # Trigger webhook
            webhook_payload = response_data.copy()
            webhook_payload['parsed_data']['skills'] = parsed_data['skills'] # Full skills
            if text:
                webhook_payload['full_text'] = text
            if file.filename:
                webhook_payload['filename'] = file.filename
            
            trigger_n8n_webhook(webhook_payload)

            return jsonify(response_data)
            
    except Exception as e:
         return jsonify({'error': str(e)}), 500

@app.route('/predict_batch_pdf', methods=['POST'])
def predict_batch_pdf():
    try:
        if 'files[]' not in request.files:
            return jsonify({'error': 'No files part'}), 400
            
        files = request.files.getlist('files[]')
        
        # Pre-load model to ensure it's safe for threads
        predictor.get_model()
        
        # Read all files into memory (Flask streams are not thread-safe)
        file_data_list = []
        for file in files:
            if file.filename:
                file_data_list.append((file.filename, file.read()))
        
        results = []
        
        # Use ThreadPoolExecutor for I/O bound tasks (OCR/PDF read)
        with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
            future_to_file = {
                executor.submit(process_single_file, filename, content): filename 
                for filename, content in file_data_list
            }
            
            for future in concurrent.futures.as_completed(future_to_file):
                filename = future_to_file[future]
                try:
                    result = future.result()
                    results.append(result)
                except Exception as e:
                    results.append({
                        'filename': filename,
                        'error': f"Thread error: {str(e)}"
                    })

        return jsonify({'results': results})

    except Exception as e:
        return jsonify({'error': str(e)}), 500

def process_single_file(filename, file_content):
    """
    Helper function for processing a single file in a separate thread.
    """
    try:
        if not filename:
             return None
             
        # Process file using utils
        text = utils.extract_text_from_file(file_content, filename)
        
        if not text or len(text.strip()) < 50:
             return {
                 'filename': filename,
                 'error': 'Text extraction failed or content too short'
             }

        parsed_data = utils.parse_resume_text(text)
        
        # Get prediction using predictor
        prediction_result = predictor.get_prediction_data(
            parsed_data['skills'], 
            parsed_data['experience_years'], 
            parsed_data['education'],
            email=parsed_data['email'],
            full_text=text,
            filename=filename,
            name=parsed_data.get('name')
        )
        
        return prediction_result
        
    except Exception as e:
        return {
            'filename': filename,
            'error': str(e)
        }

@app.route('/')
def serve():
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/predict', methods=['POST'])
def predict():
    try:
        data = request.get_json()
        
        # Extract features
        skills = data.get('skills', '')
        experience_years = float(data.get('experience_years', 0))
        education = data.get('education', 'Unknown')
        
        # Get prediction
        response = predictor.get_prediction_data(skills, experience_years, education)
        
        # Webhook logic for manual entry
        webhook_payload = response.copy()
        webhook_payload['parsed_data']['skills'] = skills
        trigger_n8n_webhook(webhook_payload)
        
        return jsonify(response)

    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/stats', methods=['GET'])
def get_stats():
    return jsonify(predictor.get_stats())

if __name__ == '__main__':
    app.run(debug=False, host='0.0.0.0', port=5003)
