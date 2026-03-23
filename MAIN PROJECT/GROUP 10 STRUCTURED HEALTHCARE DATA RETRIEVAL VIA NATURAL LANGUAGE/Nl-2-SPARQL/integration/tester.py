import sys
import json
from datetime import datetime, timedelta
import os

# FIX: allow importing integration package
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from integration.triple_builder import build_vital_triples, build_stay_triples
from integration.local_uploader import append_triples
from integration.remote_uploader import upload_triples, upload_newdata_file_safe
from integration.validator import validate_vital, validate_stay
from integration.utils import *
from integration.predict import *

FIXED_STAY_LEN_HRS = 48

def insert_vital(data):

    if not validate_vital(data):
        print("❌ Invalid vital data")
        return

    graph = build_vital_triples(data)

    append_triples(graph)
    upload_triples(graph)

    print("✅ Vital inserted successfully")

    risk, confidence = run_prediction(data["stay_id"])

    print(f"🧠 LSTM Prediction: {risk} ({confidence:.3f})")

def insert_stay(data):

    if not validate_stay(data):
        print("❌ Invalid stay data")
        return

    graph = build_stay_triples(data)

    append_triples(graph)
    upload_triples(graph)

    print("✅ Stay inserted successfully")

# ==========================
# TERMINAL MODE
# ==========================

def terminal_mode():

    print("\n=== Terminal Data Entry ===")

    while True:
        input_str = input("Enter type (vital/stay): ").strip()

        if input_str == "vital":

            data = {
                "patient_id": input("patient_id: "),
                "stay_id": input("stay_id: "),
                "timestamp": get_date_now().isoformat(),
                "systolicBP": int(input("systolicBP: ")),
                "diastolicBP": int(input("diastolicBP: ")),
                "heartRate": int(input("heartRate: ")),
                "respiratoryRate": int(input("respiratoryRate: ")),
                "temperature": float(input("temperature: ")),
                "spO2": int(input("spO2: "))
            }

            insert_vital(data)


        elif input_str == "stay":

            admission_time = get_date_now()
            discharge_time = admission_time + timedelta(hours=FIXED_STAY_LEN_HRS)

            data = {
                "patient_id": convert_num_to_id_long(input("patient_id: ")),
                "stay_id": get_next_stay_id(),
                "admissionTime": admission_time.isoformat(),
                "dischargeTime": discharge_time.isoformat(),
                "lengthOfStayHours": FIXED_STAY_LEN_HRS,
                "glucose": float(input("glucose: ")),
                "cholesterol": float(input("cholesterol: ")),
                "creatinine": float(input("creatinine: "))
            }

            insert_stay(data)
        
        elif input_str == "load all":
            upload_newdata_file_safe()


        elif input_str == "e" or input == "exit":
            break


        else:
            print("❌ Invalid type")


# ==========================
# STREAMLIT MODE
# ==========================

def streamlit_mode():

    import streamlit as st
    from datetime import timedelta

    st.title("KG Data Tester")

    st.sidebar.title("Options")

    # Load all button
    if st.sidebar.button("Upload new_data.ttl to Fuseki"):
        upload_newdata_file_safe()
        st.sidebar.success("Uploaded successfully")

    dtype = st.selectbox(
        "Select data type",
        ["vital", "stay"]
    )

    patient_id = st.text_input("Patient ID")

    if dtype == "vital":

        st.subheader("Vital Entry")

        systolicBP = st.number_input("Systolic BP", min_value=0, max_value=300, step=1)
        diastolicBP = st.number_input("Diastolic BP", min_value=0, max_value=200, step=1)
        heartRate = st.number_input("Heart Rate", min_value=0, max_value=250, step=1)
        respiratoryRate = st.number_input("Respiratory Rate", min_value=0, max_value=100, step=1)
        temperature = st.number_input("Temperature", min_value=30.0, max_value=45.0, step=0.1)
        spO2 = st.number_input("SpO2", min_value=0, max_value=100, step=1)

        if st.button("Insert Vital"):

            stay_id = get_next_stay_id()

            data = {
                "patient_id": patient_id,
                "stay_id": stay_id,
                "timestamp": get_date_now().isoformat(),
                "systolicBP": int(systolicBP),
                "diastolicBP": int(diastolicBP),
                "heartRate": int(heartRate),
                "respiratoryRate": int(respiratoryRate),
                "temperature": float(temperature),
                "spO2": int(spO2)
            }

            insert_vital(data)

            st.success(f"Vital inserted (Stay ID: {stay_id})")


    elif dtype == "stay":

        st.subheader("Hospital Stay Entry")

        glucose = st.number_input("Glucose", min_value=0.0, max_value=1000.0, step=0.1)
        cholesterol = st.number_input("Cholesterol", min_value=0.0, max_value=1000.0, step=0.1)
        creatinine = st.number_input("Creatinine", min_value=0.0, max_value=50.0, step=0.01)

        if st.button("Insert Stay"):

            admission_time = get_date_now()
            discharge_time = admission_time + timedelta(hours=FIXED_STAY_LEN_HRS)

            stay_id = get_next_stay_id()

            data = {
                "patient_id": patient_id,
                "stay_id": stay_id,
                "admissionTime": admission_time.isoformat(),
                "dischargeTime": discharge_time.isoformat(),
                "lengthOfStayHours": FIXED_STAY_LEN_HRS,
                "glucose": float(glucose),
                "cholesterol": float(cholesterol),
                "creatinine": float(creatinine)
            }

            insert_stay(data)

            st.success(f"Stay inserted (Stay ID: {stay_id})")
    
    st.subheader("View new_data.ttl")

    if st.button("Show new_data.ttl"):

        try:
            with open("./dataset/new_data.ttl", "r", encoding="utf-8") as f:

                content = f.read()

                st.text_area(
                    "new_data.ttl contents",
                    content,
                    height=400
                )

        except FileNotFoundError:
            st.error("new_data.ttl not found")


# ==========================
# MAIN ENTRY
# ==========================

if __name__ == "__main__":

    if len(sys.argv) < 2:

        print("Usage:")
        print("python -m integration.tester --terminal/-t")
        print("streamlit run tester.py")

    else:

        mode = sys.argv[1]

        if mode == "--terminal" or mode == "-t":
            terminal_mode()

if "streamlit" in sys.modules:
    streamlit_mode()