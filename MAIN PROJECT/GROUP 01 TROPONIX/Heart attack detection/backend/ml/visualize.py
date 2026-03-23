from model import ExplainableAdditiveModel
from plots import plot_feature_effect

model = ExplainableAdditiveModel.load_model("models/model_eam.pkl")

plot_feature_effect(model, "Troponin", save_path="reports/global_plots/troponin_effect.png")
plot_feature_effect(model, "CK_MB", save_path="reports/global_plots/ckmb_effect.png")
plot_feature_effect(model, "Age", save_path="reports/global_plots/age_effect.png")
plot_feature_effect(model, "Gender", save_path="reports/global_plots/gender_effect.png")
