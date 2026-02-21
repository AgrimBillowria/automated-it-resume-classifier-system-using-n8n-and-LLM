class LiteModel:
    def predict(self, X):
        return [1] * len(X) # Default to 'Resume'
    def predict_proba(self, X):
        # Return highly confident score (95%)
        return [[0.05, 0.95]] * len(X)
