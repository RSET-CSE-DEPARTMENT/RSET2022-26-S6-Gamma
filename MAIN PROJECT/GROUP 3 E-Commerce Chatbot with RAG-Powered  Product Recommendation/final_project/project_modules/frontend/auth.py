#frontend/auth.py

import streamlit as st
from project_modules.config.supabase_config import supabase


def sign_up(email, password):
    try:
        response = supabase.auth.sign_up({
            "email": email,
            "password": password
        })
        return response
    except Exception as e:
        return str(e)


def sign_in(email, password):
    try:
        response = supabase.auth.sign_in_with_password({
            "email": email,
            "password": password
        })
        return response
    except Exception as e:
        return str(e)


def sign_out():
    supabase.auth.sign_out()
    st.session_state.user = None