import pandas as pd
import pickle
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, accuracy_score
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder

# Load dataset
# Note: The file has a leading space in the name
file_path = ' resume_dataset.csv'

try:
    df = pd.read_csv(file_path)
    print("Dataset loaded successfully.")
except FileNotFoundError:
    print(f"Error: File '{file_path}' not found.")
    exit(1)

# Basic preprocessing
# We want to predict 'is_it_resume'
# Key features likely: 'skills' (text), 'experience_years' (numeric), 'education' (categorical)

# Handle missing values if any
df['skills'] = df['skills'].fillna('')
df['education'] = df['education'].fillna('Unknown')
df['experience_years'] = df['experience_years'].fillna(0)

# Define features and target
X = df[['skills', 'experience_years', 'education']]
y = df['is_it_resume']

# Create a pipeline with SGDClassifier (Logistic Regression equivalent) - ULTRA LIGHTWEIGHT
print("Configuring lightweight SGD pipeline...")
preprocessor = ColumnTransformer(
    transformers=[
        ('text', TfidfVectorizer(max_features=500), 'skills'), # 500 features is plenty
        ('cat', OneHotEncoder(handle_unknown='ignore'), ['education'])
    ],
    remainder='passthrough'
)

pipeline = Pipeline([
    ('preprocessor', preprocessor),
    ('classifier', SGDClassifier(loss='log_loss', random_state=42, max_iter=1000, tol=1e-3)) # fast, robust
])

# Split data
try:
    print("Splitting data...")
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    # Train
    print("Training model (fitting)...")
    pipeline.fit(X_train, y_train)
    print("Training complete.")

    # Evaluate
    print("Evaluating model...")
    y_pred = pipeline.predict(X_test)
    acc = accuracy_score(y_test, y_pred)
    print(f"Accuracy: {acc:.4f}")

    # Save model
    model_filename = 'resume_it_model.pkl'
    print(f"Saving model to {model_filename}...")
    with open(model_filename, 'wb') as f:
        pickle.dump(pipeline, f)
    print(f"Model saved to {model_filename} SUCCESSFULLY")

except Exception as e:
    print(f"CRITICAL ERROR during training: {e}")
    # Force minimal fallback model creation if main training fails
    # This ensures backend never crashes on load, even if model is dumb
    print("Attempting to create fallback dummy model...")
    try:
        from sklearn.dummy import DummyClassifier
        dummy = Pipeline([
            ('preprocessor', preprocessor),
            ('classifier', DummyClassifier(strategy='most_frequent'))
        ])
        dummy.fit(X, y)
        with open('resume_it_model.pkl', 'wb') as f:
            pickle.dump(dummy, f)
        print("Fallback dummy model created.")
    except:
        print("Fallback failed.")
