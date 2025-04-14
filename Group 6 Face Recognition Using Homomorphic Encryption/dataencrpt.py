import os
import sqlite3
import tenseal as ts
import pickle
from deepface import DeepFace
import cv2
import numpy as np
import logging

logging.basicConfig(level=logging.INFO)

# Load shared CKKS context
def load_context():
    with open("ckks_context.tenseal", "rb") as f:
        return ts.context_from(f.read())

context = load_context()

# Connect DB
conn = sqlite3.connect("new_encrypted_dataset.db")
cursor = conn.cursor()
cursor.execute("DROP TABLE IF EXISTS encrypted_embeddings")
cursor.execute("CREATE TABLE encrypted_embeddings (label TEXT, encrypted_embedding BLOB)")

# Load dataset (update path as needed)
dataset_path = r"C:\Users\sandr\cryptovisison2\image\lfw-deepfunneled"
for label in os.listdir(dataset_path):
    person_path = os.path.join(dataset_path, label)
    if not os.path.isdir(person_path):
        continue

    for img_file in os.listdir(person_path):
        img_path = os.path.join(person_path, img_file)
        img = cv2.imread(img_path)
        if img is None:
            continue

        try:
            embedding = DeepFace.represent(img, model_name="Facenet", enforce_detection=False)[0]["embedding"]
            enc_vec = ts.ckks_vector(context, embedding)
            serialized = enc_vec.serialize()
            cursor.execute("INSERT INTO encrypted_embeddings (label, encrypted_embedding) VALUES (?, ?)", (label, serialized))
            logging.info(f"✅ Encrypted and stored: {label}")
        except Exception as e:
            logging.error(f"❌ Failed {label} - {img_file}: {e}")

conn.commit()
conn.close()
print("✅ Dataset encrypted and stored.")