import numpy as np
import matplotlib.pyplot as plt
import textwrap
import random

# --- PART 1: THE TEACHER ---
class VeridianTeacher:
    def __init__(self):
        self.students = ["Stock_Perf", "Sentiment", "Macro", "Alt_Data"]
        # UPDATED ORDER: Index 0=Buy, Index 1=Sell, Index 2=Hold
        self.labels = ["Buy", "Sell", "Hold"]

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

# --- PART 2: THE VISUALIZER ---
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
            # Logic: If Sell, bad news is Red. If Buy, good news is Green.
            impacts = [0.6, 0.3, -0.1, -0.05] if decision == "Sell" else [-0.2, -0.1, 0.5, 0.4]
            colors = ['red' if x > 0 and decision == "Sell" else 'green' for x in impacts]
            title = f"LIME Analysis: Textual Factors Driving '{winner}' Model"
            xlabel = "Impact Magnitude"
        else:
            # SHAP Style (Numeric Factors)
            factors = ['RSI Divergence', 'Mov. Avg Cross', 'Vol. Spike', 'Sector Trend']
            impacts = [0.25, 0.15, 0.10, -0.05]
            colors = ['red' if decision == "Sell" else 'green' for _ in impacts]
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

# --- PART 3: THE RAG MODULE (Retail Focused) ---
class VeridianRAG:
    def __init__(self):
        self.education_db = {
            "Stock_Perf": "Technical Analysis focuses on price patterns. We look at charts to see if the stock is 'Overbought' or 'Oversold'.",
            "Sentiment": "Sentiment Analysis reads news and social media to gauge the 'mood' of the market.",
            "Macro": "Macroeconomics looks at the big picture: Interest rates, inflation, and government policy.",
            "Alt_Data": "Alternative Data includes non-traditional signals like web traffic or app downloads."
        }

    def _simulate_web_search(self, query):
        return [
            "Analyst consensus has shifted following the recent news.",
            "Market volatility increased by 15% this week.",
            "Competitor data suggests a shift in demand."
        ]

    def generate_retail_report(self, teacher_result, ticker):
        winner = teacher_result['winner_model']
        reason = teacher_result['winner_reason']
        confidence = teacher_result['winner_confidence']
        decision = teacher_result['decision']

        query = f"{ticker} stock {winner} analysis {reason}"
        web_summary = " ".join(self._simulate_web_search(query))

        report = []
        report.append(f"### 1. EXECUTIVE SUMMARY: {ticker}")
        report.append(f"Veridian recommends a **{decision.upper()}**.")
        report.append(f"Our confidence is **{confidence*100:.1f}%**.")
        report.append("")
        report.append("### 2. WHY THIS DECISION?")
        report.append(f"The primary driver was the **{winner} Model**.")
        report.append(f"Reason: **'{reason}'**.")
        report.append("")
        report.append("### 3. EDUCATIONAL CORNER")
        report.append(f"_{self.education_db[winner]}_")
        report.append("")
        report.append("### 4. WEB VALIDATION")
        report.append(f"> \"{web_summary}\"")
        
        return "\n".join(report)

# --- MAIN EXECUTION ---
def run_veridian_pipeline(ticker, student_inputs):
    teacher = VeridianTeacher()
    visualizer = VeridianVisualizer()
    rag = VeridianRAG()
    
    print(f"Initializing Veridian for {ticker}...\n")
    decision_packet = teacher.process(student_inputs)
    
    full_report = rag.generate_retail_report(decision_packet, ticker)
    
    print("="*60)
    print(full_report)
    print("="*60)
    
    print("\n[Visualizing AI Logic below...]")
    visualizer.generate_graph(decision_packet)

# --- UPDATED TEST DATA ---
# Prediction Order: [Buy, Sell, Hold]
mock_student_data = [
    # Stock Perf says BUY (Index 0 is 0.7)
    {'model': 'Stock_Perf', 'prediction': [0.70, 0.20, 0.10], 'confidence': 0.65, 'reason': 'RSI Oversold'},
    
    # Sentiment says SELL (Index 1 is 0.95) - WINNER (High Confidence)
    {'model': 'Sentiment',  'prediction': [0.00, 0.95, 0.05], 'confidence': 0.94, 'reason': 'SEC Investigation opened'}, 
    
    # Macro says HOLD (Index 2 is 0.6)
    {'model': 'Macro',      'prediction': [0.20, 0.20, 0.60], 'confidence': 0.50, 'reason': 'Rates unchanged'},
    
    # Alt Data says SELL (Index 1 is 0.6)
    {'model': 'Alt_Data',   'prediction': [0.10, 0.60, 0.30], 'confidence': 0.70, 'reason': 'Web traffic down'}
]

run_veridian_pipeline("TSLA", mock_student_data)
