import React, { useState } from 'react';
import {  ref, uploadBytes, getDownloadURL } from "firebase/storage";
import {  collection, addDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";
// @ts-ignore
import { storage, db } from '../firebaseConfig'; // Adjust the path as needed

const Test: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setFile(event.target.files[0]);
    }
  };

  const handleTextChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setText(event.target.value);
  };

  const handleUpload = async () => {
    const auth = getAuth();
    const user = auth.currentUser;

    // Check if user is authenticated
    if (!user) {
      console.error("User is not authenticated. Upload will fail.");
      alert('You must be signed in to upload files.');
      return;
    }

    if (!file || !text) {
      alert('Please select a file and enter text.');
      return;
    }

    setLoading(true);

    try {
      // Upload file to Firebase Storage
      const storageRef = ref(storage, `images/${file.name}`);
      await uploadBytes(storageRef, file);
      const imageUrl = await getDownloadURL(storageRef);

      // Save text and imageUrl in Firestore
      await addDoc(collection(db, "test"), {
        text: text,
        imageUrl: imageUrl,
        createdAt: new Date(),
        userId: user.uid,  // Optionally save the user ID
      });

      alert('Image and text uploaded successfully!');
      setText('');
      setFile(null);
    } catch (error) {
      console.error('Error uploading file:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>Upload Image and Text</h2>
      <input type="file" onChange={handleFileChange} />
      <input
        type="text"
        value={text}
        onChange={handleTextChange}
        placeholder="Enter some text"
      />
      <button onClick={handleUpload} disabled={loading}>
        {loading ? 'Uploading...' : 'Upload'}
      </button>
    </div>
  );
};

export default Test;
