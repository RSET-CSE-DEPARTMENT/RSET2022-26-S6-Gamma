# app.py
import uuid
import streamlit as st
import requests
from config import * 

st.set_page_config(layout="wide", page_title="Health Care Monitor")
st.title("Health Care Monitor")

# --- Session State Management ---
if "active_patient" not in st.session_state:
    st.session_state.active_patient = "P1047"
if "active_stay_id" not in st.session_state:
    st.session_state.active_stay_id = None
if "thread_id" not in st.session_state:
    st.session_state.thread_id = str(uuid.uuid4())

# --- Main Split Screen ---
col_left, col_right = st.columns(2)

with col_left:

    # --- Chat Interface ---
    st.header("Clinical Assistant Chat")

    # Initialize chat history
    if "messages" not in st.session_state:
        st.session_state.messages = []

    # Container for scrollable chat history
    # Setting a height makes it scrollable if the content exceeds it
    chat_container = st.container(height=400)

    # Display chat messages from history on app rerun
    with chat_container:
        for message in st.session_state.messages:
            with st.chat_message(message["role"]):
                st.markdown(message["content"])

    # React to user input
    if prompt := st.chat_input("Ask about patient history or status..."):
        # Display user message in chat message container
        with chat_container:
            with st.chat_message("user"):
                st.markdown(prompt)
        
        # Add user message to session state
        st.session_state.messages.append({"role": "user", "content": prompt})

        # Display assistant response with a loading state
        with chat_container:
            with st.chat_message("assistant"):
                # Visual loading indicator
                with st.status("AI is thinking...", expanded=True) as status:
                    try:
                        # Prepare the payload for your LangChain/FastAPI backend
                        # Inside the chat input block in app.py
                        chat_payload = {
                            "patient_id": st.session_state.active_patient,
                            "stay_id": st.session_state.active_stay_id,
                            "query": prompt,
                            "thread_id": st.session_state.get("thread_id") # Pass the thread ID
                        }

                        res = requests.post("http://127.0.0.1:8000/chat", json=chat_payload)
                        # Store the thread_id returned by the server if it's new
                        if res.status_code == 200:
                            st.session_state.thread_id = res.json().get("thread_id")
                        
                        # # Replace URL with your actual chat endpoint
                        response = requests.post("http://127.0.0.1:8000/chat", json=chat_payload)
                        
                        if response.status_code == 200:
                            full_response = response.json().get("reply", "No response from AI.")
                            status.update(label="Response received!", state="complete", expanded=False)
                        else:
                            full_response = "️ Error: Backend returned an error."
                            status.update(label="Error!", state="error")
                            
                    except Exception as e:
                        full_response = f"Connection Error: {e}"
                        status.update(label="Connection Failed", state="error")

                # Display the final reply
                st.markdown(full_response)
        
        # Add assistant response to history
        st.session_state.messages.append({"role": "assistant", "content": full_response})

with col_right:
    col_search, col_action = st.columns([2, 1])

    with col_search:
        selected_pid = st.text_input("Enter Patient ID:", value=st.session_state.active_patient)
        if selected_pid != st.session_state.active_patient:
            st.session_state.active_patient = selected_pid
            st.session_state.active_stay_id = None # Reset stay if patient changes

    with col_action:
        st.write("") 
        st.write("")
        if st.button("Re-Admit / Start New Stay", use_container_width=True):
            with st.spinner("Creating new stay in Knowledge Graph..."):
                try:
                    res = requests.post(f"http://127.0.0.1:8000/readmit/{st.session_state.active_patient}")
                    if res.status_code == 200:
                        st.session_state.active_stay_id = res.json()["stay_id"]
                        st.success(f"Admitted! Active Stay: {st.session_state.active_stay_id}")
                except Exception as e:
                    st.error("Backend offline. Start FastAPI first!")
    
    st.header(f"AI Assistant Context")
    st.info(f"Monitoring Patient: **{st.session_state.active_patient}**")
    
    if st.session_state.active_stay_id:
        st.success(f"Active Stay ID: **{st.session_state.active_stay_id}**")
    else:
        st.warning("️No active stay. Re-Admit to log vitals.")
    
    
    st.header("Real-Time Vitals Entry")
    
    v1, v2, v3 = st.columns(3)
    hr = v1.number_input("Heart Rate", value=90, step=1)
    sys = v2.number_input("Systolic BP", value=110, step=1)
    dia = v3.number_input("Diastolic BP", value=70, step=1)
    
    v4, v5, v6 = st.columns(3)
    rr = v4.number_input("Resp Rate", value=16, step=1)
    temp = v5.number_input("Temp (°C)", value=37.5, step=0.1)
    spo2 = v6.number_input("SpO2 (%)", value=98, step=1)
    
    if st.button(f"LOG VITALS & RUN AI", type="primary", use_container_width=True):
        if not st.session_state.active_stay_id:
            st.error("Please click 'Re-Admit' above to start a new stay first!")
        else:
            payload = {
                "patient_id": st.session_state.active_patient, 
                "stay_id": st.session_state.active_stay_id,
                "hr": hr, "sys": sys, "dia": dia, 
                "rr": rr, "temp": temp, "spo2": spo2
            }
            
            with st.spinner("Pushing to Graph & Running LSTM..."):
                try:
                    res = requests.post("http://127.0.0.1:8000/add_vitals", json=payload)
                    data = res.json()
                    
                    st.success(f"Vitals logged at simulated time: {data['timestamp']}")
                    
                    alert_label = data['alert']['label']
                    conf = data['alert']['confidence']
                    
                    if alert_label == "Collecting Data...":
                        st.info("AI requires 3 data points to predict. Collecting data...")
                    elif alert_label != "Stable" and conf > 0.50:
                        st.error(f"**CRITICAL ALERT:** {alert_label} DETECTED! (Confidence: {conf:.1%})")
                    else:
                        st.success(f"Patient is Stable (Confidence: {conf:.1%}).")
                        
                except Exception as e:
                    st.error(f"Failed to connect. Error: {e}")