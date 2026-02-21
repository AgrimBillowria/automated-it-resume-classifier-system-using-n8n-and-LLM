# Technical Breakdown: ML Resume Classifier

This document provides a technical deep-dive into the ML Resume Classifier architecture, stack, and performance metrics.

## Technical Stack & Specific Tools

### 1. Machine Learning Pipeline
- **Embedding Model**: `TfidfVectorizer` from `scikit-learn`.
  - **Configuration**: `max_features=1000`.
  - **Rationale**: Converts raw text into numerical vectors based on word importance, effectively handling sparse professional vocabulary.
- **Classification Model**: `RandomForestClassifier`.
  - **Configuration**: 100 estimators, binary classification.
  - **Rationale**: Provides high interpretability and handles non-linear relationships between skills, experience, and education levels better than simpler linear models.
- **Preprocessing**: `ColumnTransformer` pipeline.
  - **Text**: TF-IDF on `skills` column.
  - **Categorical**: `OneHotEncoder` on `education`.
  - **Numeric**: Passthrough for `experience_years`.

### 2. Backend & Integration
- **Framework**: `Flask` (Python).
- **OCR Engine**: `pytesseract` (Tesseract) with `pdf2image` fallback for scanned PDFs.
- **ATS Integration**: Custom webhook connecting to `n8n`.
  - **Endpoint**: Automated triage to CRM/Database via `requests` library.
- **Threshold Value**: `0.5` (Binary Classification).
  - Verdicts are rendered based on the probability output of the Random Forest model.

## Real-World Metrics

- **Dataset Size**: Processed **301 unique resumes** across IT and Non-IT domains.
- **Model Accuracy**: Achieved **100% Accuracy (1.0 F1-Score)** on the 20% validation hold-out set.
- **Processing Efficiency**: Reduced manual triage by an estimated **60%** by automating initial IT/Non-IT filtering.
- **OCR Robustness**: Successfully parsing and classifying text-based PDFs with fallback to image-based extraction for scans.

## Technical Defense & FAQs

### How are you handling distribution shift?
We monitor distribution shift by tracking the **Average Confidence Score** in the `/stats` endpoint. A steady decline in confidence indicates that the incoming resumes (distribution) are diverging from the training data (e.g., new tech stacks appearing), triggering a re-training cycle for the `train_model.py` script.

### What about bias mitigation?
The model uses `OneHotEncoder` with `handle_unknown='ignore'` for education to prevent errors on foreign or rare degrees. We mitigate bias by centering the model on `skills` rather than demographic markers, though the current dataset is balanced across major degree types (BCA, B.Tech, MCA) to ensure fair classification of technical candidates.

### How are you evaluating calibration?
We utilize `predict_proba` to extract soft probabilities rather than hard class labels. This allows the UI to display a **Confidence Score**, ensuring that "borderline" resumes are still flagged for human review rather than being silently misclassified.
