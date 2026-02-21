
import threading
import time
import requests
import sys
import os
from app import app

def run_server():
    app.run(port=5003)

def verify():
    # Start server in a thread
    thread = threading.Thread(target=run_server)
    thread.daemon = True
    thread.start()
    
    # Wait for server to start
    time.sleep(3)
    
    try:
        # Test /stats endpoint
        print("Testing /stats endpoint...")
        response = requests.get('http://localhost:5003/stats')
        if response.status_code == 200:
            print("/stats OK:", response.json())
        else:
            print("/stats FAILED:", response.status_code)
            sys.exit(1)
            
        # Test /predict endpoint (manual entry)
        print("Testing /predict endpoint...")
        payload = {
            "skills": "python, flask, machine learning",
            "experience_years": 5,
            "education": "B.Tech Computer Science"
        }
        response = requests.post('http://localhost:5003/predict', json=payload)
        if response.status_code == 200:
            print("/predict OK:", response.json())
        else:
            print("/predict FAILED:", response.status_code, response.text)
            sys.exit(1)
            
        print("VERIFICATION SUCCESSFUL")
        
    except Exception as e:
        print(f"VERIFICATION FAILED: {e}")
        sys.exit(1)

if __name__ == "__main__":
    verify()
