from flask import Flask, request, jsonify, send_from_directory
import sqlite3
import smtplib
import random
import os
from werkzeug.utils import secure_filename
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__)

UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg'}
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)


def init_db():
    conn = sqlite3.connect('users.db')
    cursor = conn.cursor()

    # Create users table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            phone TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            profile_image TEXT
        )
    ''')

    # Create otps table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS otps (
            email TEXT PRIMARY KEY,
            otp TEXT NOT NULL
        )
    ''')

    # Create contacts table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS contacts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_phone TEXT NOT NULL,
            contact_phone TEXT NOT NULL,
            FOREIGN KEY (user_phone) REFERENCES users(phone),
            FOREIGN KEY (contact_phone) REFERENCES users(phone),
            UNIQUE(user_phone, contact_phone) -- Prevent duplicate contacts
        )
    ''')

    conn.commit()
    conn.close()

init_db()

def get_db_connection():
    conn = sqlite3.connect("users.db")
    conn.row_factory = sqlite3.Row  # Allows fetching rows as dictionaries
    return conn
def send_email(email, otp):
    SMTP_SERVER = "smtp.gmail.com"
    SMTP_PORT = 587
    EMAIL_ADDRESS = "karthikvenu20@gmail.com"
    EMAIL_PASSWORD = "wrmh yhwp govx xizm"
    try:
        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()
        server.login(EMAIL_ADDRESS, EMAIL_PASSWORD)
        subject = "Your OTP Code"
        body = f"Your OTP code is {otp}. It is valid for a short period."
        message = f"Subject: {subject}\n\n{body}"
        server.sendmail(EMAIL_ADDRESS, email, message)
        server.quit()
    except Exception as e:
        print(f"Error sending email: {e}")

@app.route('/send_otp', methods=['POST'])
def send_otp():
    print("fssffsf")
    data = request.json
    email = data.get('email')
    print("???????????????????????????")
    print(email)
    if not email:
        return jsonify({'error': 'Email is required!'}), 400
    
    otp = str(random.randint(100000, 999999))
    conn = sqlite3.connect('users.db')
    cursor = conn.cursor()
    cursor.execute("INSERT OR REPLACE INTO otps (email, otp) VALUES (?, ?)", (email, otp))
    conn.commit()
    conn.close()

    send_email(email, otp)
    return jsonify({'message': 'OTP sent successfully!'}), 200

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/register', methods=['POST'])
def register():
    name = request.form.get('name')
    email = request.form.get('email')
    phone = request.form.get('phone')
    password = request.form.get('password')
    otp = request.form.get('otp')
    profile_image = request.files.get('profile_image')
    
    if not all([name, email, phone, password, otp]):
        return jsonify({'error': 'All fields are required!'}), 400

    conn = sqlite3.connect('users.db')
    cursor = conn.cursor()
    
    cursor.execute("SELECT otp FROM otps WHERE email=?", (email,))
    stored_otp = cursor.fetchone()
    
    if not stored_otp or stored_otp[0] != otp:
        return jsonify({'error': 'Invalid OTP!'}), 400

    cursor.execute("SELECT id FROM users WHERE email=? OR phone=?", (email, phone))
    existing_user = cursor.fetchone()
    if existing_user:
        return jsonify({'error': 'Email or phone number already exists!'}), 400

    hashed_password = generate_password_hash(password)
    image_path = None
    if profile_image and allowed_file(profile_image.filename):
        filename = secure_filename(profile_image.filename)
        image_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        profile_image.save(image_path)
    
    try:
        cursor.execute("INSERT INTO users (name, email, phone, password, profile_image) VALUES (?, ?, ?, ?, ?)",
                       (name, email, phone, hashed_password, image_path))
        conn.commit()
    finally:
        conn.close()

    return jsonify({'message': 'User registered successfully!'}), 201

@app.route('/uploads/<filename>')
def get_uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)
SERVER_IP = "http://192.168.108.124:5000" 



@app.route('/login', methods=['POST'])
def login():
    data = request.json
    phone = data.get('phone')
    password = data.get('password')

    if not phone or not password:
        return jsonify({'error': 'Email and password are required!'}), 400

    conn = sqlite3.connect('users.db')
    cursor = conn.cursor()
    cursor.execute("SELECT id, name, email, phone, password, profile_image FROM users WHERE phone=?", (phone,))
    user = cursor.fetchone()
    conn.close()

    if user and check_password_hash(user[4], password):
        profile_image_url = f"{SERVER_IP}/{user[5]}" if user[5] else ""
        print(profile_image_url)
        return jsonify({
            'email': user[2],
            'name': user[1],
            'phone': user[3],
            'profile_image': profile_image_url,
        }), 200
    else:
        return jsonify({'error': 'Invalid email or password!'}), 401

@app.route('/get_users', methods=['GET'])
def get_users():
    logged_in_phone = request.args.get('logged_in_phone')  

    if not logged_in_phone:
        return jsonify({'error': 'logged_in_phone is required'}), 400

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute('''
        SELECT id, name, email, phone, profile_image FROM users WHERE phone != ?
    ''', (logged_in_phone,))
    
    users = cursor.fetchall()
    conn.close()

    user_list = [{
        'id': u['id'],
        'name': u['name'],
        'email': u['email'],
        'phone': u['phone'],
        'profile_image': f"{SERVER_IP}/{u['profile_image']}" if u['profile_image'] else ""
    } for u in users]

    return jsonify(user_list), 200

@app.route("/get_contacts", methods=["GET"])
def get_contacts():
    user_phone = request.args.get("user_phone")  

    if not user_phone:
        return jsonify({"error": "User phone is required"}), 400

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT users.id, users.name, users.phone, users.profile_image 
        FROM contacts 
        JOIN users ON contacts.contact_phone = users.phone  
        WHERE contacts.user_phone = ?  
    """, (user_phone,))

    contacts = []
    for row in cursor.fetchall():
        profile_image_url = f"{SERVER_IP}/{row['profile_image']}" if row['profile_image'] else ""
        contacts.append({
            "id": row["id"],
            "name": row["name"],
            "phone": row["phone"],
            "profile_image": profile_image_url
        })

    conn.close()
    return jsonify(contacts), 200

import sqlite3
from typing import Dict, Optional

def get_user_profile(phone: str) -> Optional[Dict[str, str]]:
    """
    Fetch user profile data (name and profile image) from the database based on phone number.
    
    Args:
        phone: The user's phone number (used as ID)
        
    Returns:
        Dictionary containing 'name' and 'profile_image' if user found, None otherwise
    """
    conn = None
    try:
        conn = sqlite3.connect('your_database.db')  # Replace with your actual database path
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT name, profile_image FROM users WHERE phone = ?
        ''', (phone,))
        
        result = cursor.fetchone()
        
        if result:
            return {
                'name': result[0],
                'profile_image': result[1]
            }
        return None
        
    except sqlite3.Error as e:
        print(f"Database error: {e}")
        return None
    finally:
        if conn:
            conn.close()

@app.route('/api/user-profile', methods=['GET'])
def user_profile():
    phone = request.args.get('phone')
    if not phone:
        return jsonify({'error': 'Phone number is required'}), 400
    
    profile = get_user_profile(phone)
    if profile:
        return jsonify(profile)
    else:
        return jsonify({'error': 'User not found'}), 404
@app.route('/add_contact', methods=['POST'])
def add_contact():
    data = request.json
    logged_in_user_phone = data.get('logged_in_user_phone')
    contact_user_phone = data.get('contact_user_phone')

    if not logged_in_user_phone or not contact_user_phone:
        return jsonify({'error': 'Both phone numbers are required'}), 400

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute('''
            INSERT INTO contacts (user_phone, contact_phone) VALUES (?, ?)
        ''', (logged_in_user_phone, contact_user_phone))
        
        conn.commit()
        conn.close()

        return jsonify({'message': 'Contact added successfully'}), 200

    except sqlite3.IntegrityError:
        conn.close()
        return jsonify({'error': 'Contact already exists'}), 400


from flask import Flask, request, jsonify
import smtplib
from email.mime.text import MIMEText
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import datetime
@app.route('/send_emergymail', methods=['POST'])
def send_emergency_mail():
    data = request.get_json()


    sender_email = "karthikvenu20@gmail.com"
    sender_password = "wrmh yhwp govx xizm"  # Use env variables in production

    conn = None

    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Get ALL user emails (including the triggering user)
    cursor.execute("SELECT email FROM users")
    recipient_emails = [row['email'] for row in cursor.fetchall()]

    if not recipient_emails:
        return jsonify({"warning": "No recipients found in database"}), 200

    # Email setup (simplified body)
    msg = MIMEMultipart()
    msg['Subject'] = "🚨 EMERGENCY ALERT 🚨"
    msg['From'] = sender_email
    msg['To'] = ", ".join(recipient_emails)

    email_body = f"""
    EMERGENCY NOTIFICATION
    ----------------------
    Time: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
    
    URGENT: Immediate action required!
    """
    msg.attach(MIMEText(email_body, 'plain'))

    # Send email
    with smtplib.SMTP("smtp.gmail.com", 587) as server:
        server.starttls()
        server.login(sender_email, sender_password)
        server.sendmail(sender_email, recipient_emails, msg.as_string())

    return jsonify({
        "message": f"Emergency alert sent to ALL {len(recipient_emails)} recipients",
        "recipients": recipient_emails
    }), 200
@app.route('/user_profile/<int:user_id>', methods=['GET'])
def get_user_profile(user_id):
    print(user_id)
    
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute('''
        SELECT name, profile_image FROM users WHERE phone = ?
    ''', (user_id,))

    user = cursor.fetchone()
    
    cursor.close()
    conn.close()

    if user:
        return jsonify({
            "name": user["name"],  # Using dictionary access
            "profile_image": user["profile_image"] if user["profile_image"] else ""
        }), 200
    else:
        return jsonify({"error": "User not found"}), 404
            
    
   
if __name__ == '__main__':
    init_db()
    app.run(host='0.0.0.0', port=5000, debug=True)
