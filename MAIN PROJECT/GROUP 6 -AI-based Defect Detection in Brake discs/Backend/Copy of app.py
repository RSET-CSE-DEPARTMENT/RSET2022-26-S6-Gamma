
import streamlit as st
import torch
import cv2
import numpy as np
from PIL import Image
import os
import random
from model_def import ECAHybrid
from inference import predict_defect, generate_heatmap

st.set_page_config(page_title="Visual Defect AI", layout="wide")
st.title("🔍 Automotive Brake Disc Inspection AI")

# PATH TO YOUR DRIVE DATA
TEST_DATA_DIR = "/content/drive/MyDrive/Hybrid_Project/data/test"

@st.cache_resource
def load_model():
    weights_path = "final_model_weights.pth"
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    model = ECAHybrid(num_classes=3)
    if os.path.exists(weights_path):
        checkpoint = torch.load(weights_path, map_location=device)
        if 'state_dict' in checkpoint:
            state_dict = {k.replace("model.", ""): v for k, v in checkpoint['state_dict'].items()}
            model.load_state_dict(state_dict, strict=False)
        else:
            model.load_state_dict(checkpoint, strict=False)
        model.to(device)
        model.eval()
        return model
    return None

try:
    model = load_model()
    if model:
        st.success("✅ System Online: Connected to Drive Data")
except Exception as e:
    st.error(f"Error: {e}")

st.sidebar.header("⚙️ Configuration")
threshold = st.sidebar.slider("Safety Threshold", 0.0, 1.0, 0.20, 0.05)

tab1, tab2 = st.tabs(["📤 Upload Image (Demo)", "🎲 Random Test (Drive)"])

image_path = None

# TAB 1: UPLOAD
with tab1:
    uploaded_file = st.file_uploader("Choose image...", type=["jpg", "jpeg", "png"])
    if uploaded_file:
        image_path = "temp_upload.jpg"
        Image.open(uploaded_file).convert('RGB').save(image_path)

# TAB 2: RANDOM DRIVE
with tab2:
    st.markdown("### Rapid Testing from Google Drive")
    if os.path.exists(TEST_DATA_DIR):
        col1, col2, col3 = st.columns(3)
        selected_file = None

        # BUTTON 1: FAULT
        with col1:
            if st.button("🎲 Random FAULT", type="primary"):
                # Try common names (Caps or Lowercase)
                possible_names = ["CASTING_FAULT", "Casting_Fault", "casting_fault"]
                folder = next((os.path.join(TEST_DATA_DIR, n) for n in possible_names if os.path.exists(os.path.join(TEST_DATA_DIR, n))), None)

                if folder:
                    selected_file = os.path.join(folder, random.choice(os.listdir(folder)))
                else:
                    st.error("❌ Folder 'CASTING_FAULT' not found.")

        # BUTTON 2: ACCEPT
        with col2:
            if st.button("🎲 Random ACCEPT"):
                possible_names = ["ACCEPT", "Accept", "accept"]
                folder = next((os.path.join(TEST_DATA_DIR, n) for n in possible_names if os.path.exists(os.path.join(TEST_DATA_DIR, n))), None)

                if folder:
                    selected_file = os.path.join(folder, random.choice(os.listdir(folder)))
                else:
                    st.error("❌ Folder 'ACCEPT' not found.")

        # BUTTON 3: IMPERFECTION
        with col3:
            if st.button("🎲 Random IMPERFECTION"):
                possible_names = ["SURFACE_IMPERFECTION", "Surface_Imperfection", "surface_imperfection"]
                folder = next((os.path.join(TEST_DATA_DIR, n) for n in possible_names if os.path.exists(os.path.join(TEST_DATA_DIR, n))), None)

                if folder:
                    selected_file = os.path.join(folder, random.choice(os.listdir(folder)))
                else:
                    st.error("❌ Folder 'SURFACE_IMPERFECTION' not found.")

        if selected_file:
            image_path = "temp_drive.jpg"
            Image.open(selected_file).convert('RGB').save(image_path)
            st.info(f"Loaded: {os.path.basename(selected_file)}")

# --- INFERENCE ---
if image_path and model:
    st.divider()
    c1, c2 = st.columns(2)
    with c1:
        st.image(image_path, caption="Input Image", use_column_width=True)
    with c2:
        st.subheader("Analysis")
        result, confidence = predict_defect(image_path, model, threshold)

        if "Safety" in result:
            st.error(f"🛑 {result}")
        elif "Fault" in result:
            st.error(f"🛑 {result}")
        elif "Imperfection" in result:
            st.warning(f"⚠️ {result}")
        else:
            st.success(f"✅ {result}")
        st.metric("Confidence", f"{confidence*100:.1f}%")

        # HEATMAP
        heatmap = generate_heatmap(image_path, model, target_class=1)
        st.image(heatmap, caption="Defect Localization", use_column_width=True)
