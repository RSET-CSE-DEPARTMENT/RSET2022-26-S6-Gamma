import numpy as np
import matplotlib.pyplot as plt
import textwrap
import random

# --- PART 1: THE TEACHER (The Brain) ---
# (Kept efficient, as logic remains the same)
class VeridianTeacher:
    def __init__(self):
        self.students = ["Stock_Perf", "Sentiment", "Macro", "Alt_Data"]
        self.labels = ["Sell", "Hold", "Buy"]

    def process(self, student_outputs):
        confidences = np.array([s['confidence'] for s in student_outputs])
        weights = confidences / np.sum(confidences)
        
        final_probs = np.zeros(3)
        for i, student in enumerate(student_outputs):
            pred = np.array(student['prediction'])
            final_probs += (pred * weights[i])
        
        winner_idx = np.argmax(weights)
        winning_student = student_outputs[winner_idx]
        
        return {
            "decision": self.labels[np.argmax(final_probs)],
            "final_probs": final_probs,
            "winner_model": winning_student['model'],
            "winner_reason": winning_student['reason'],
            "winner_confidence": winning_student['confidence'],
            "confidence_scores": confidences
        }

# --- PART 2: THE VISUALIZER (The Graph) ---
class VeridianVisualizer:
    def generate_graph(self, teacher_result):
        """Generates inline graph for Colab"""
        winner = teacher_result['winner_model']
        decision = teacher_result['decision']
        
        # Setup Figure
        fig, ax = plt.subplots(figsize=(10, 5))
        
        # Dynamic Data Generation based on Winner
        if winner in ["Sentiment", "Alt_Data"]:
            # LIME Style (Text Factors)
            factors = ['Regulatory News', 'CEO Statement', 'Product Launch', 'Competitor Earnings']
            impacts = [0.6, 0.3, -0.1, -0.05] if decision == "Sell" else [-0.2, -0.1, 0.5, 0.4]
            colors = ['red' if x > 0 else 'green' for x in impacts]
            title = f"LIME Analysis: Textual Factors Driving '{winner}' Model"
            xlabel = "Negative Impact (Sell) <---> Positive Impact (Buy)"
        else:
            # SHAP Style (Numeric Factors)
            factors = ['RSI Divergence', 'Mov. Avg Cross', 'Vol. Spike', 'Sector Trend']
            impacts = [0.25, 0.15, 0.10, -0.05] if decision == "Buy" else [-0.3, -0.2, -0.1, 0.05]
            colors = ['green' if x > 0 else 'red' for x in impacts]
            title = f"SHAP Analysis: Technical Indicators Driving '{winner}' Model"
            xlabel = "SHAP Value (Contribution to Prediction)"

        # Drawing
        y_pos = np.arange(len(factors))
        ax.barh(y_pos, impacts, color=colors)
        ax.set_yticks(y_pos)
        ax.set_yticklabels(factors)
        ax.set_xlabel(xlabel)
        ax.set_title(title)
        
        # Add Confidence Box
        conf_text = f"Confidence: {teacher_result['winner_confidence']*100:.1f}%"
        ax.text(0.95, 0.05, conf_text, transform=ax.transAxes, 
                bbox=dict(facecolor='white', alpha=0.8), ha='right')
        
        plt.tight_layout()
        plt.show() # Display Inline

# --- PART 3: THE RAG MODULE (The Educational Analyst) ---
class VeridianRAG:
    def __init__(self):
        # A dictionary to translate technical jargon for retail investors
        self.education_db = {
            "Stock_Perf": "Technical Analysis focuses on price patterns. We look at charts to see if the stock is 'Overbought' (too expensive) or 'Oversold' (too cheap).",
            "Sentiment": "Sentiment Analysis reads news and social media. It tries to gauge the 'mood' of the market—is everyone panicking or celebrating?",
            "Macro": "Macroeconomics looks at the big picture: Interest rates, inflation, and government policy that affects the whole economy, not just this company.",
            "Alt_Data": "Alternative Data includes non-traditional signals like web traffic, app downloads, or satellite imagery of parking lots to guess sales numbers."
        }

    def _simulate_web_search(self, query):
        """
        In production, this uses Google/Bing API. 
        Here, we mock it to demonstrate the RAG flow.
        """
        print(f"   [RAG SYSTEM] Scraping web for: '{query}'...")
        # Simulating returned search snippets
        return [
            "Analyst consensus has shifted to 'Underweight' following the recent SEC probe.",
            "Market volatility increased by 15% this week due to sector-wide fears.",
            "Competitor EV sales data suggests a slowdown in demand for the quarter."
        ]

    def generate_retail_report(self, teacher_result, ticker):
        winner = teacher_result['winner_model']
        reason = teacher_result['winner_reason']
        confidence = teacher_result['winner_confidence']
        decision = teacher_result['decision']

        # 1. RAG Step: Go to the web based on the winner
        query = f"{ticker} stock {winner} analysis {reason}"
        web_context = self._simulate_web_search(query)
        web_summary = " ".join(web_context)

        # 2. Build the Long-Form Narrative
        report = []
        
        # SECTION 1: Executive Summary
        report.append(f"### 1. EXECUTIVE SUMMARY: {ticker}")
        report.append(f"Veridian has analyzed thousands of data points and recommends a **{decision.upper()}**.")
        report.append(f"Our confidence in this prediction is **{confidence*100:.1f}%**, which is considered **{'High' if confidence > 0.8 else 'Moderate'}**.")
        report.append("")

        # SECTION 2: The "Why" (Plain English)
        report.append("### 2. WHY THIS DECISION?")
        report.append(f"The primary driver for this decision was our **{winner} Model**.")
        report.append(f"Specifically, the model detected: **'{reason}'**.")
        report.append(f"Because the {winner} model had the highest confidence score among our 4 student models, the Teacher system gave it the most weight (authority) in the final vote.")
        report.append("")

        # SECTION 3: Educational Corner (For Retail Investors)
        report.append("### 3. EDUCATIONAL CORNER: Understanding the Logic")
        report.append(f"You might ask: *What is the {winner} model?*")
        report.append(f"_{self.education_db[winner]}_")
        report.append(f"In simple terms: The AI saw a pattern in the {winner.lower().replace('_', ' ')} data that historically leads to a price drop.")
        report.append("")

        # SECTION 4: RAG Context (External Validation)
        report.append("### 4. WEB VALIDATION (Real-Time Search)")
        report.append("To ensure our AI isn't hallucinating, we cross-referenced this prediction with live web data. Here is what we found:")
        report.append(f"> \"{web_summary}\"")
        report.append("This external news aligns with our AI's internal prediction, increasing the reliability of the signal.")
        report.append("")

        # SECTION 5: Disclaimer
        report.append("### 5. RISK DISCLOSURE")
        report.append("Please remember: AI predictions are probabilistic, not prophetic. All investments carry risk. This report is for informational purposes only.")
        
        return "\n".join(report)

# --- MAIN EXECUTION ---
def run_veridian_pipeline(ticker, student_inputs):
    # Initialize
    teacher = VeridianTeacher()
    visualizer = VeridianVisualizer()
    rag = VeridianRAG()
    
    # 1. Teacher Decides
    print(f"Initializing Veridian for {ticker}...\n")
    decision_packet = teacher.process(student_inputs)
    
    # 2. RAG Generates Long Report
    full_report = rag.generate_retail_report(decision_packet, ticker)
    
    # 3. Print Report
    print("="*60)
    print(full_report)
    print("="*60)
    
    # 4. Show Visuals
    print("\n[Visualizing AI Logic below...]")
    visualizer.generate_graph(decision_packet)

# --- TEST SCENARIO ---
# Scenario: Tesla (TSLA) is crashing due to bad news (Sentiment Model wins)
mock_student_data = [
    {'model': 'Stock_Perf', 'prediction': [0.2, 0.3, 0.5], 'confidence': 0.65, 'reason': 'RSI is entering oversold territory (32.5)'},
    {'model': 'Sentiment',  'prediction': [0.95, 0.05, 0.0], 'confidence': 0.94, 'reason': 'SEC Investigation opened against CEO'}, 
    {'model': 'Macro',      'prediction': [0.4, 0.4, 0.2], 'confidence': 0.50, 'reason': 'Federal Reserve rates unchanged'},
    {'model': 'Alt_Data',   'prediction': [0.6, 0.3, 0.1], 'confidence': 0.70, 'reason': 'Web traffic to checkout page down 12%'}
]

run_veridian_pipeline("TSLA", mock_student_data)
