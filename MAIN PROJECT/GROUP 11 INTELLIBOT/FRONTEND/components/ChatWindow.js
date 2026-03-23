import React, { useRef, useState, useEffect, useMemo } from "react";
import { sendMessage } from "../api";
import { db, auth } from "../firebase";
import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  orderBy,
  getDocs,
  updateDoc,
  doc,
  getDoc
} from "firebase/firestore";

function ChatWindow({ subject, activeChatId, setActiveChatId, setChatList }) {

  const [input, setInput] = useState("");
  const [uid, setUid] = useState(null);
  const [messagesBySubject, setMessagesBySubject] = useState({});
  const [loading, setLoading] = useState(false);

  const chatContainerRef = useRef(null);

  // 🔐 AUTH USER
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUid(user ? user.uid : null);
    });
    return () => unsubscribe();
  }, []);

  // 🧠 CURRENT SUBJECT MESSAGES
  const messages = useMemo(
    () => messagesBySubject[subject] || [],
    [messagesBySubject, subject]
  );

  // ⬇️ AUTO SCROLL
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // 📥 LOAD MESSAGES WHEN CHAT CHANGES
  useEffect(() => {
    if (!activeChatId || !subject || !uid) return;

    const loadMessages = async () => {
      const q = query(
        collection(db, "users", uid, "chats", activeChatId, "messages"),
        orderBy("createdAt", "asc")
      );

      const snapshot = await getDocs(q);
      const msgs = snapshot.docs.map(doc => doc.data());

      setMessagesBySubject(prev => ({
        ...prev,
        [subject]: msgs
      }));
    };

    loadMessages();
  }, [activeChatId, subject, uid]);



  // 🆕 CREATE CHAT BUTTON
  const createNewChat = async () => {
    if (!uid) return;

    const docRef = await addDoc(collection(db, "users", uid, "chats"), {
      subject,
      title: "", // empty until first prompt
      createdAt: serverTimestamp()
    });

    setActiveChatId(docRef.id);
  };



  // 🚀 MAIN SEND FUNCTION
  const handleSend = async () => {
    if (!uid) return;

    const messageText = input.trim();
    if (!messageText || loading) return;

    let chatId = activeChatId;

    // ⭐ STEP 1 — CREATE CHAT IF NONE
    if (!chatId) {
      const docRef = await addDoc(collection(db, "users", uid, "chats"), {
        subject,
        title: "", // keep empty for now
        createdAt: serverTimestamp()
      });

      chatId = docRef.id;
      setActiveChatId(chatId);
    }

    setInput("");
    setLoading(true);

    // ⭐ STEP 2 — SHOW USER MESSAGE IN UI
    setMessagesBySubject(prev => ({
      ...prev,
      [subject]: [...(prev[subject] || []), { sender: "user", text: messageText }]
    }));

    // ⭐ STEP 3 — SAVE USER MESSAGE
    await addDoc(
      collection(db, "users", uid, "chats", chatId, "messages"),
      {
        sender: "user",
        text: messageText,
        subject,
        createdAt: serverTimestamp()
      }
    );

    // ⭐ STEP 4 — SET TITLE ONLY IF EMPTY (LOCK TITLE)
    const chatRef = doc(db, "users", uid, "chats", chatId);
    const chatSnap = await getDoc(chatRef);

    if (chatSnap.exists()) {
      const chatData = chatSnap.data();

      if (!chatData.title || chatData.title === "") {
        const firstTitle = messageText.slice(0, 40);

        await updateDoc(chatRef, { title: firstTitle });

        // update sidebar instantly
        setChatList(prev => {
          const exists = prev.find(c => c.id === chatId);

          if (exists) {
            return prev.map(chat =>
              chat.id === chatId ? { ...chat, title: firstTitle } : chat
            );
          }

          return [
            { id: chatId, title: firstTitle, subject },
            ...prev
          ];
        });
      }
    }

    // ⭐ STEP 5 — BOT RESPONSE
    const reply = await sendMessage(messageText, subject);

    await addDoc(
      collection(db, "users", uid, "chats", chatId, "messages"),
      {
        sender: "bot",
        text: reply,
        subject,
        createdAt: serverTimestamp()
      }
    );

    // ⭐ STEP 6 — SHOW BOT MESSAGE
    setMessagesBySubject(prev => ({
      ...prev,
      [subject]: [...(prev[subject] || []), { sender: "bot", text: reply }]
    }));

    setLoading(false);
  };



  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };



  return (
    <div
      style={{
        background: "#fff",
        borderRadius: "22px",
        padding: "15px",
        boxShadow: "0 8px 22px rgba(0,0,0,0.12)",
        height: "70vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <h2 style={{ fontSize: "23px", marginBottom: "16px" }}>
        💬 Chat ({subject})
      </h2>

      <div
        ref={chatContainerRef}
        style={{
          flex: 1,
          overflowY: "auto",
          background: "#fafafa",
          borderRadius: "18px",
          padding: "20px",
          fontSize: "15px",
          border: "1px solid #ddd",
          marginBottom: "20px",
        }}
      >
        {messages.length === 0 && (
          <div
            style={{
              color: "#999",
              textAlign: "center",
              marginTop: "15%",
              fontSize: "15px",
            }}
          >
            Ask your first question in {subject} ✨
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            style={{
              textAlign: msg.sender === "user" ? "right" : "left",
              marginBottom: "14px",
            }}
          >
            <span
              style={{
                background: msg.sender === "user" ? "#DCF8C6" : "#F1F1F1",
                padding: "13px 15px",
                borderRadius: "20px",
                display: "inline-block",
                maxWidth: "70%",
                lineHeight: "1.6",
                fontSize: "16px",
              }}
            >
              {msg.text}
            </span>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: "10px" }}>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={2}
          placeholder={`Ask ${subject} question...`}
          style={{
            flex: 1,
            padding: "10px",
            fontSize: "12px",
            borderRadius: "14px",
            border: "1px solid #ccc",
            resize: "none",
          }}
        />
        <button
          onClick={handleSend}
          disabled={loading}
          style={{
            padding: "10px 25px",
            fontSize: "13px",
            background: "#2196f3",
            color: "#fff",
            border: "none",
            borderRadius: "14px",
            cursor: "pointer",
          }}
        >
          {loading ? "..." : "Send"}
        </button>
      </div>
    </div>
  );
}

export default ChatWindow;
