// src/api.js
import axios from "axios";

const API_URL = "http://127.0.0.1:8000";

export const sendMessage = async (message, subject) => {
  const res = await axios.post("http://127.0.0.1:8000/ask", {
    question: message,
    topic: subject
  });
  return res.data.answer;
};


export const getNotesBySubject = async (subject) => {
  try {
    const response = await axios.get(
      `${API_URL}/notes/${subject}`
    );
    return response.data;
  } catch (err) {
    console.error(err);
    return { notes: [] };
  }
};

export const uploadNote = async (subject, file) => {
  const formData = new FormData();
  formData.append("file", file);

  await axios.post(
    `${API_URL}/notes/upload/${subject}`,
    formData,
    { headers: { "Content-Type": "multipart/form-data" } }
  );
};

export const deleteNote = async (subject, filename) => {
  await axios.delete(
    `${API_URL}/notes/${subject}/${filename}`
  );
};
