from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer,
    Table, TableStyle, HRFlowable
)
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.lib.pagesizes import A4
from io import BytesIO


def generate_mi_report(data):

    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4)
    elements = []

    styles = getSampleStyleSheet()

    # ---------------- TITLE ----------------
    title_style = styles["Heading1"]
    elements.append(Paragraph("Myocardial Infarction (MI) Prediction Report", title_style))
    elements.append(Spacer(1, 12))
    elements.append(HRFlowable(width="100%", thickness=1, color=colors.grey))
    elements.append(Spacer(1, 12))

    # ---------------- PATIENT DETAILS ----------------
    elements.append(Paragraph("<b>Patient Details</b>", styles["Heading3"]))
    elements.append(Spacer(1, 6))

    user = data.get("user", {})

    patient_lines = [
        f"Age: {user.get('Age', '-')}",
        f"Gender: {'Female' if user.get('Gender') == 0 else 'Male'}",
        f"Troponin: {user.get('Troponin', '-')}",
        f"CK-MB: {user.get('CK_MB', '-')}",
    ]

    for line in patient_lines:
        elements.append(Paragraph(line, styles["Normal"]))

    elements.append(Spacer(1, 14))

    # ---------------- PREDICTION OUTPUT ----------------
    elements.append(Paragraph("<b>Prediction Output</b>", styles["Heading3"]))
    elements.append(Spacer(1, 6))

    prob = round(data.get("final_prob", 0) * 100, 2)
    label = data.get("final_label", "Unknown")

    risk_text = f"Predicted MI Risk: {prob}% ({'LOW' if prob < 50 else 'HIGH'})"

    risk_style = ParagraphStyle(
        name="RiskStyle",
        parent=styles["Normal"],
        textColor=colors.darkgreen if prob < 50 else colors.red,
        fontSize=12
    )

    elements.append(Paragraph(f"<b>{risk_text}</b>", risk_style))
    elements.append(Spacer(1, 14))

    # ---------------- MEDICAL INTERPRETATION ----------------
    elements.append(Paragraph("<b>Medical Interpretation</b>", styles["Heading3"]))
    elements.append(Spacer(1, 6))

    interpretation = data.get("explanation", {}).get("summary", "")
    elements.append(Paragraph(interpretation, styles["Normal"]))
    elements.append(Spacer(1, 14))

    # ---------------- SUMMARY ----------------
    elements.append(Paragraph("<b>Summary</b>", styles["Heading3"]))
    elements.append(Spacer(1, 6))

    summary = (
        "The model predicts a low chance of heart attack. "
        "Most biomarker values look safe."
        if prob < 50
        else
        "The model predicts a higher risk of heart attack. "
        "Immediate medical consultation is advised."
    )

    elements.append(Paragraph(summary, styles["Normal"]))
    elements.append(Spacer(1, 16))

    # ---------------- EXPLAINABLE AI TABLE ----------------
    elements.append(Paragraph("<b>Explainable AI Breakdown (Feature Contributions)</b>", styles["Heading3"]))
    elements.append(Spacer(1, 8))

    details = data.get("details", {}).get("MI", {})
    contributions = details.get("feature_contributions", [])

    table_data = [["Feature", "Value", "Contribution"]]

    # features we DO NOT want in the report
    excluded_features = {
        "Troponin_Initial",
        "Troponin_Peak",
        "Troponin_Delta",
        "Troponin_Slope",
        "Troponin_AUC",
        "Time_To_Peak",
        "Troponin_Rise_Flag"
    }

    for feat in contributions:

        feature_name = feat["feature"]

        if feature_name in excluded_features:
            continue

        table_data.append([
            feature_name.replace("_", " "),
            str(feat["value"]),
            f"{feat['contribution']:.4f}"
        ])

    table = Table(table_data, colWidths=[2*inch, 1.5*inch, 1.5*inch])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,0), colors.lightgrey),
        ("GRID", (0,0), (-1,-1), 0.5, colors.grey),
        ("ALIGN", (2,1), (-1,-1), "RIGHT")
    ]))

    elements.append(table)
    elements.append(Spacer(1, 16))

    # ---------------- TOP REASONS ----------------
    elements.append(Paragraph("<b>Top Reasons</b>", styles["Heading3"]))
    elements.append(Spacer(1, 6))

    reasons = data.get("explanation", {}).get("details", [])
    for r in reasons:
        elements.append(Paragraph(f"- {r}", styles["Normal"]))

    doc.build(elements)
    buffer.seek(0)

    return buffer