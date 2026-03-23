from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.lib.units import cm
from datetime import datetime
from textwrap import wrap


# ================== HELPERS ==================

def _format_gender(g):
    if g in [1, "1", "male", "Male"]:
        return "Male"
    if g in [0, "0", "female", "Female"]:
        return "Female"
    return "N/A"


def _draw_wrapped_text(c, text, x, y, max_width, line_height=12):
    """
    Draw word-wrapped text and return updated y position
    """
    wrapped_lines = wrap(text, max_width)
    for line in wrapped_lines:
        if y < 2 * cm:
            c.showPage()
            c.setFont("Helvetica", 9)
            y = A4[1] - 2 * cm
        c.drawString(x, y, line)
        y -= line_height
    return y


# ================== MAIN REPORT ==================

def generate_medical_report(
    prediction_result: dict,
    patient_details: dict,
    output_path: str
):
    c = canvas.Canvas(output_path, pagesize=A4)
    width, height = A4
    y = height - 2 * cm

    # ==================================================
    # HEADER
    # ==================================================
    c.setFont("Helvetica-Bold", 16)
    c.drawString(2 * cm, y, "Heart Attack Risk Assessment Report")
    y -= 0.8 * cm

    c.setFont("Helvetica", 9)
    c.drawString(
        2 * cm,
        y,
        f"Generated on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
    )
    y -= 1 * cm

    # ==================================================
    # PATIENT DETAILS
    # ==================================================
    user = prediction_result.get("user", {})
    age = user.get("Age")
    gender = _format_gender(user.get("Gender"))

    c.setFont("Helvetica-Bold", 12)
    c.drawString(2 * cm, y, "Patient Details")
    y -= 0.6 * cm

    c.setFont("Helvetica", 10)
    c.drawString(2 * cm, y, f"Name: {patient_details.get('name', 'N/A')}")
    y -= 0.4 * cm

    c.drawString(2 * cm, y, f"Patient ID: {patient_details.get('patient_id', 'N/A')}")
    y -= 0.4 * cm

    c.drawString(
        2 * cm,
        y,
        f"Age: {age if age is not None else 'N/A'}    Gender: {gender}"
    )
    y -= 1 * cm

    # ==================================================
    # INPUT BIOMARKER VALUES
    # ==================================================
    c.setFont("Helvetica-Bold", 12)
    c.drawString(2 * cm, y, "Input Biomarker Values")
    y -= 0.6 * cm

    c.setFont("Helvetica", 9)
    for key, value in user.items():
        if key == "Gender":
            value = _format_gender(value)
        if value is not None:
            if y < 2 * cm:
                c.showPage()
                c.setFont("Helvetica", 9)
                y = height - 2 * cm
            c.drawString(2 * cm, y, f"{key}: {value}")
            y -= 0.35 * cm

    y -= 0.6 * cm

    # ==================================================
    # PREDICTION OUTCOME
    # ==================================================
    c.setFont("Helvetica-Bold", 12)
    c.drawString(2 * cm, y, "Prediction Outcome")
    y -= 0.6 * cm

    c.setFont("Helvetica", 10)
    c.drawString(
        2 * cm,
        y,
        f"Final Risk Classification: {prediction_result.get('final_label', 'N/A')}"
    )
    y -= 0.4 * cm

    final_prob = prediction_result.get("final_prob")
    if final_prob is not None:
        c.drawString(
            2 * cm,
            y,
            f"Predicted Probability: {round(final_prob * 100, 2)}%"
        )
        y -= 0.4 * cm

    c.drawString(
        2 * cm,
        y,
        f"Confidence Score: {prediction_result.get('final_conf', 'N/A')}"
    )
    y -= 1 * cm

    # ==================================================
    # EXPLAINABLE AI (XAI) INSIGHTS
    # ==================================================
    c.setFont("Helvetica-Bold", 12)
    c.drawString(2 * cm, y, "Explainable AI Insights")
    y -= 0.6 * cm

    c.setFont("Helvetica", 9)

    details = prediction_result.get("details", {})

    for model_name, model_data in details.items():
        xai = model_data.get("xai")
        if not xai:
            continue

        if y < 2 * cm:
            c.showPage()
            c.setFont("Helvetica-Bold", 10)
            y = height - 2 * cm

        c.setFont("Helvetica-Bold", 10)
        c.drawString(2 * cm, y, f"{model_name} Model")
        y -= 0.4 * cm
        c.setFont("Helvetica", 9)

        for feature, contribution in xai.items():
            direction = "increases risk" if contribution > 0 else "reduces risk"
            line = f"{feature}: {contribution:+.3f} ({direction})"

            y = _draw_wrapped_text(
                c,
                line,
                x=2.5 * cm,
                y=y,
                max_width=80,      # controls wrapping width
                line_height=11
            )

        y -= 0.4 * cm

    # ==================================================
    # XAI INTERPRETATION
    # ==================================================
    c.setFont("Helvetica-Oblique", 9)
    interpretation = (
        "Interpretation: Positive contributions indicate biomarkers that increased "
        "the predicted cardiovascular risk, while negative contributions reduced it. "
        "These insights are model-derived and should be interpreted alongside clinical judgment."
    )

    y = _draw_wrapped_text(
        c,
        interpretation,
        x=2 * cm,
        y=y,
        max_width=95,
        line_height=11
    )

    # ==================================================
    # FOOTER
    # ==================================================
    c.setFont("Helvetica-Oblique", 8)
    c.drawString(
        2 * cm,
        1.5 * cm,
        "Disclaimer: This report is a clinical decision-support aid and not a definitive medical diagnosis."
    )

    c.showPage()
    c.save()
