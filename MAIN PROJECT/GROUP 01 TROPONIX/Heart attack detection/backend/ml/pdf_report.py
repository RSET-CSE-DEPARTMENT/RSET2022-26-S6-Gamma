import os
from datetime import datetime
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.lib import colors


def format_gender(g):
    try:
        return "Male" if int(g) == 1 else "Female"
    except (TypeError, ValueError):
        return "N/A"


def clinical_interpretation(prob):
    if prob < 0.30:
        return (
            "Low probability of acute myocardial infarction (MI). "
            "Biomarker pattern is more consistent with non-MI status. "
            "Clinical correlation is advised."
        )
    elif prob < 0.70:
        return (
            "Moderate probability of acute myocardial infarction (MI). "
            "Biomarker pattern suggests possible cardiac involvement. "
            "Recommend ECG correlation and repeat troponin if clinically indicated."
        )
    else:
        return (
            "High probability of acute myocardial infarction (MI). "
            "Biomarkers strongly suggest myocardial injury. "
            "Immediate clinical evaluation is recommended."
        )


def human_interpretation(prob):
    if prob < 0.30:
        return (
            "The model predicts a low chance of heart attack. "
            "Most biomarker values look safe."
        )
    elif prob < 0.70:
        return (
            "The model predicts a medium chance of heart attack. "
            "Some values are concerning, so monitoring is needed."
        )
    else:
        return (
            "The model predicts a high chance of heart attack. "
            "The results look serious and urgent medical attention is needed."
        )


def save_patient_pdf_report(patient_data, risk, category, explanation, text_explanation):
    """
    Generates a PDF patient report and returns file path.
    """

    os.makedirs("reports/patient_reports", exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filepath = f"reports/patient_reports/patient_report_{timestamp}.pdf"

    c = canvas.Canvas(filepath, pagesize=A4)
    width, height = A4

    y = height - 50

    # Title
    c.setFont("Helvetica-Bold", 16)
    c.drawString(50, y, "Myocardial Infarction (MI) Prediction Report")
    y -= 30

    c.setStrokeColor(colors.grey)
    c.line(50, y, width - 50, y)
    y -= 25

    # Patient details
    c.setFont("Helvetica-Bold", 12)
    c.drawString(50, y, "Patient Details")
    y -= 18

    c.setFont("Helvetica", 11)
    c.drawString(60, y, f"Age: {patient_data['Age']}")
    y -= 15
    c.drawString(60, y, f"Gender: {format_gender(patient_data['Gender'])}")
    y -= 15
    troponin_display = patient_data.get('Troponin_Initial', patient_data.get('Troponin', 'N/A'))
    c.drawString(60, y, f"Troponin: {troponin_display}")
    y -= 15
    c.drawString(60, y, f"CK-MB: {patient_data['CK_MB']}")
    y -= 25

    # Prediction
    c.setFont("Helvetica-Bold", 12)
    c.drawString(50, y, "Prediction Output")
    y -= 18

    c.setFont("Helvetica-Bold", 12)
    c.setFillColor(colors.darkred if risk >= 0.70 else (colors.orange if risk >= 0.30 else colors.darkgreen))
    c.drawString(60, y, f"Predicted MI Risk: {risk*100:.2f}%  ({category})")
    c.setFillColor(colors.black)
    y -= 25

    # Medical Interpretation
    c.setFont("Helvetica-Bold", 12)
    c.drawString(50, y, "Medical Interpretation")
    y -= 18

    c.setFont("Helvetica", 11)
    for line in split_text(clinical_interpretation(risk), 95):
        c.drawString(60, y, line)
        y -= 14
    y -= 10

    # Human Interpretation
    c.setFont("Helvetica-Bold", 12)
    c.drawString(50, y, "Summary")
    y -= 18

    c.setFont("Helvetica", 11)
    for line in split_text(human_interpretation(risk), 95):
        c.drawString(60, y, line)
        y -= 14
    y -= 15

    # Feature table
    c.setFont("Helvetica-Bold", 12)
    c.drawString(50, y, "Explainable AI Breakdown (Feature Contributions)")
    y -= 20

    # Table header
    c.setFont("Helvetica-Bold", 10)
    c.drawString(60, y, "Feature")
    c.drawString(220, y, "Value")
    c.drawString(380, y, "Contribution")
    y -= 12

    c.setStrokeColor(colors.black)
    c.line(55, y, width - 55, y)
    y -= 15

    # Table rows
    c.setFont("Helvetica", 10)
    for f, val, contrib in explanation:
        c.drawString(60, y, str(f))
        c.drawString(220, y, str(val))
        c.drawString(380, y, f"{contrib:.4f}")
        y -= 14

        if y < 100:  # new page if needed
            c.showPage()
            y = height - 50

    y -= 10

    # Top reasons text
    c.setFont("Helvetica-Bold", 12)
    c.drawString(50, y, "Top Reasons")
    y -= 18

    c.setFont("Helvetica", 10)
    for line in split_text(text_explanation.replace("\n", " "), 105):
        c.drawString(60, y, line)
        y -= 12

        if y < 70:
            c.showPage()
            y = height - 50
        # Reference Ranges
    y -= 25
    c.setFont("Helvetica-Bold", 12)
    c.drawString(50, y, "Reference Ranges")
    y -= 18

    c.setFont("Helvetica", 10)

    ranges = [
        "Troponin (0h, 1h, 2h): Normal < 0.04 ng/mL",
        "CK-MB: Normal < 5 U/L"
    ]

    for r in ranges:
        c.drawString(60, y, r)
        y -= 14
    # Footer
    y -= 20
    c.setFont("Helvetica-Oblique", 9)
    c.drawString(50, 40, "Generated by GAM-inspired Explainable Additive Model (Project Prototype)")

    c.save()
    return filepath


def split_text(text, max_chars):
    """
    Split long text into lines that fit PDF.
    """
    words = text.split()
    lines = []
    line = []

    count = 0
    for w in words:
        if count + len(w) + 1 <= max_chars:
            line.append(w)
            count += len(w) + 1
        else:
            lines.append(" ".join(line))
            line = [w]
            count = len(w) + 1

    if line:
        lines.append(" ".join(line))

    return lines