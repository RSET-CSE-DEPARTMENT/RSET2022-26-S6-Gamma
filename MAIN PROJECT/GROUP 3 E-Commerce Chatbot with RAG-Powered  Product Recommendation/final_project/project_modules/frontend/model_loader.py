#frontend/model_loader.py

import streamlit as st
from project_modules.backend.embeddings import get_embedding_model


@st.cache_resource(show_spinner=False)
def _cached_model_loader(device: str):
    return get_embedding_model(device=device)


def get_or_load_model(device: str):

    try:
        if st.session_state.get("model_load_error"):
            return None

        with st.spinner("🔄 Loading embedding model..."):
            model = _cached_model_loader(device)

        st.session_state.model = model
        st.session_state.model_validated = True
        return model

    except Exception as e:
        st.session_state.model_load_error = str(e)
        st.error(f"❌ Model initialization failed: {e}")
        return None