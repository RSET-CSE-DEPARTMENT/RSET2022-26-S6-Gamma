import pandas as pd
from model import ExplainableAdditiveModel

from xai import generate_text_explanation, plot_local_explanation, risk_category
from pdf_report import save_patient_pdf_report


def get_custom_input():
    """
    Take custom patient input from user.
    """
    print("\nEnter patient details:")

    age = float(input("Age (years): "))
    gender = int(input("Gender (1 = Male, 0 = Female): "))
    troponin = float(input("Troponin level: "))
    ck_mb = float(input("CK-MB level: "))

    return {
        "Age": age,
        "Gender": gender,
        "Troponin": troponin,
        "CK_MB": ck_mb
    }


def explain_custom_patient(model):
    """
    Predict + explain for a custom user-entered patient.
    """
    sample = get_custom_input()

    # Explain
    explanation, risk = model.explain_instance(sample)
    category = risk_category(risk)

    # Human-readable explanation
    text = generate_text_explanation(risk, explanation)

    print("\n--- Explainable AI Output (Custom Patient) ---")
    print(text)

    # Local explanation plot
    chart_path = "reports/local_explanations/custom_patient_explanation.png"
    plot_local_explanation(explanation, risk, save_path=chart_path)

    # PDF Report
    pdf_path = save_patient_pdf_report(
        patient_data=sample,
        risk=risk,
        category=category,
        explanation=explanation,
        text_explanation=text
    )

    print(f"\n✅ PDF Patient report generated successfully: {pdf_path}")


def explain_dataset_patient(model, index=0):
    """
    Predict + explain for a patient from dataset by index.
    """
    df = pd.read_csv("data/MI_Augmented_10k_Cleaned.csv")
    X = df[["Age", "Gender", "Troponin", "CK_MB"]]

    sample = X.iloc[index].to_dict()

    # Explain
    explanation, risk = model.explain_instance(sample)
    category = risk_category(risk)

    text = generate_text_explanation(risk, explanation)

    print(f"\n--- Explainable AI Output (Dataset Patient Index {index}) ---")
    print(text)

    # Local explanation plot
    chart_path = f"reports/local_explanations/patient_{index}_explanation.png"
    plot_local_explanation(explanation, risk, save_path=chart_path)

    # PDF Report
    pdf_path = save_patient_pdf_report(
        patient_data=sample,
        risk=risk,
        category=category,
        explanation=explanation,
        text_explanation=text
    )

    print(f"\n✅ PDF Patient report generated successfully: {pdf_path}")


if __name__ == "__main__":

    # Load trained model
    model = ExplainableAdditiveModel.load_model("models/model_eam.pkl")

    print("\nChoose explanation mode:")
    print("1 → Custom patient input")
    print("2 → Dataset patient")

    choice = input("Enter choice (1 or 2): ").strip()

    if choice == "1":
        explain_custom_patient(model)

    elif choice == "2":
        idx = int(input("Enter dataset index (e.g., 0, 10, 100): "))
        explain_dataset_patient(model, idx)

    else:
        print("Invalid choice. Please enter 1 or 2.")
