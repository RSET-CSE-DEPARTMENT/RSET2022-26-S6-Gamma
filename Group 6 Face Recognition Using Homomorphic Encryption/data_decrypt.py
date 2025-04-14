import tenseal as ts
import sqlite3
import numpy as np

# Step 1: Initialize CKKS Encryption Context
def create_context():
    context = ts.context(
        scheme=ts.SCHEME_TYPE.CKKS,
        poly_modulus_degree=8192,
        coeff_mod_bit_sizes=[60, 40, 40, 60]
    )
    context.global_scale = 2**40
    context.generate_galois_keys()
    return context

context = create_context()

# Step 2: Create SQLite Database
conn = sqlite3.connect("verification_db.db")  # Create a new test database
cursor = conn.cursor()

cursor.execute("""
    CREATE TABLE IF NOT EXISTS encrypted_data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        original_embedding TEXT NOT NULL,
        encrypted_embedding BLOB NOT NULL
    )
""")
conn.commit()

# Step 3: Encrypt and Store Data
def encrypt_and_store(embedding):
    print("\n🔹 Original Embedding:", embedding)

    # Encrypt using CKKS
    encrypted_vector = ts.ckks_vector(context, embedding)
    
    # Serialize for storage
    serialized_encrypted_vector = encrypted_vector.serialize()

    # Store both original and encrypted in the database
    cursor.execute("INSERT INTO encrypted_data (original_embedding, encrypted_embedding) VALUES (?, ?)", 
                   (str(embedding), serialized_encrypted_vector))
    conn.commit()
    print("✅ Data encrypted and stored in database.")

# Step 4: Retrieve, Decrypt, and Verify Data
def verify_decryption():
    cursor.execute("SELECT original_embedding, encrypted_embedding FROM encrypted_data")
    rows = cursor.fetchall()

    for original_str, encrypted_blob in rows:
        # Convert stored string to list
        original_embedding = eval(original_str)  # Convert string back to list

        # Deserialize and decrypt
        encrypted_vector = ts.ckks_vector_from(context, encrypted_blob)
        decrypted_embedding = encrypted_vector.decrypt()

        print("\n🔹 Decrypted Embedding:", decrypted_embedding)

        # Compare Original vs. Decrypted
        if np.allclose(original_embedding, decrypted_embedding, atol=1e-4):  
            print("✅ Encryption & Decryption Successful! Data is preserved.")  
        else:  
            print("❌ Mismatch detected! Check encryption and decryption process.")

# Step 5: Run Verification
if __name__ == "__main__":
    sample_embedding = [0.1, 0.2, 0.3, 0.4, 0.5]  # Example face embedding
    encrypt_and_store(sample_embedding)
    verify_decryption()

