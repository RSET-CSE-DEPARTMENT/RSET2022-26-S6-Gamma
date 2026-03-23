import React, { useEffect, useState } from "react";
import { db, auth } from "../firebase";
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  addDoc,
  serverTimestamp,
  updateDoc,
  doc,
  deleteDoc
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import ChatWindow from "./ChatWindow";

function StudentDashboard() {
  const [subject, setSubject] = useState("");
  const [uid, setUid] = useState(null);
  const [chatList, setChatList] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const navigate = useNavigate();

  // 🔐 AUTH USER
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUid(user ? user.uid : null);
    });
    return () => unsubscribe();
  }, []);

  // 📥 LOAD CHATS WHEN SUBJECT CHANGES
  useEffect(() => {
    if (!subject || !uid) return;

    const loadChats = async () => {
      const q = query(
        collection(db, "users", uid, "chats"),
        where("subject", "==", subject),
        orderBy("createdAt", "desc")
      );

      const snapshot = await getDocs(q);

      const chats = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        title: doc.data().title || ""   // 🔥 IMPORTANT FIX
      }));

      setChatList(chats);

      // auto open latest chat if none active
      if (!activeChatId && chats.length > 0) {
        setActiveChatId(chats[0].id);
      }
    };

    loadChats();
  }, [subject, uid]);



  // 🆕 CREATE NEW CHAT
  const createNewChat = async () => {
    if (!uid || !subject) return;

    const docRef = await addDoc(collection(db, "users", uid, "chats"), {
      subject,
      title: "", // 🔥 empty — first prompt will set title
      createdAt: serverTimestamp()
    });

    setActiveChatId(docRef.id);

    // show instantly in sidebar
    setChatList(prev => [
      {
        id: docRef.id,
        title: "",
        subject
      },
      ...prev
    ]);
  };



  // 🗑 DELETE CHAT
  const deleteChat = async (chatId) => {
    await deleteDoc(doc(db, "users", uid, "chats", chatId));

    setChatList(prev => {
      const updatedChats = prev.filter(chat => chat.id !== chatId);

      // auto open next chat
      if (activeChatId === chatId) {
        if (updatedChats.length > 0) {
          setActiveChatId(updatedChats[0].id);
        } else {
          setActiveChatId(null);
        }
      }

      return updatedChats;
    });
  };



  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #43cea2, #185a9d)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "20px",
      }}
    >
      <div
        style={{
          width: "90%",
          maxWidth: "1200px",
          minHeight: "90vh",
          background: "#fff",
          borderRadius: "28px",
          padding: "40px",
          boxShadow: "0 12px 35px rgba(0,0,0,0.15)",
          display: "flex",
          flexDirection: "column",
        }}
      >

        {/* HEADER */}
        <h1 style={{ textAlign: "center", fontSize: "32px", marginBottom: "26px" }}>
          🎓 Select Subject
        </h1>

        {/* SUBJECT SELECT */}
        <select
          value={subject}
          onChange={(e) => {
            const newSubject = e.target.value;

            setSubject(newSubject);

            // reset chat when subject changes
            setActiveChatId(null);
            setChatList([]);
          }}
          style={{
            padding: "15px",
            fontSize: "15px",
            borderRadius: "14px",
            border: "2px solid #90caf9",
            marginBottom: "15px",
          }}
        >
          <option value="">-- Select Subject --</option>
          <option value="CD">Compiler Design</option>
          <option value="COA">Computer Organization & Architecture</option>
          <option value="DBMS">Database Management System</option>
          <option value="OS">Operating Systems</option>
          <option value="PY">Python</option>
        </select>

        {/* NOTES BUTTON */}
        {subject && (
          <div style={{ textAlign: "right", marginBottom: "18px" }}>
            <button
              onClick={() => navigate(`/notes/${subject}`)}
              style={{
                padding: "14px 26px",
                fontSize: "15px",
                background: "#6a5acd",
                color: "#fff",
                border: "none",
                borderRadius: "12px",
                cursor: "pointer",
              }}
            >
              📘 Notes
            </button>
          </div>
        )}

        {/* CHAT AREA */}
        {subject && (
          <div style={{ display: "flex", height: "70vh", marginTop: "10px" }}>

            {/* SIDEBAR */}
            <div
              style={{
                width: "260px",
                background: "#fafafa",
                borderRadius: "16px",
                padding: "15px",
                marginRight: "18px",
                border: "1px solid #ddd",
                display: "flex",
                flexDirection: "column"
              }}
            >
              <button
                onClick={createNewChat}
                style={{
                  padding: "12px",
                  background: "#eee",
                  border: "none",
                  borderRadius: "10px",
                  cursor: "pointer",
                  fontWeight: "bold",
                  marginBottom: "12px"
                }}
              >
                + New Chat
              </button>

              {chatList.map(chat => (
                <div
                  key={chat.id}
                  onClick={() => setActiveChatId(chat.id)}
                  style={{
                    padding: "10px",
                    borderRadius: "8px",
                    cursor: "pointer",
                    background: activeChatId === chat.id ? "#e3f2fd" : "transparent",
                    marginBottom: "6px",
                    display: "flex",
                    flexDirection: "column"
                  }}
                >

                  {/* CHAT TITLE */}
                  <input
                    value={chat.title}
                    placeholder="New Chat"
                    onChange={async (e) => {
                      const newTitle = e.target.value;

                      setChatList(prev =>
                        prev.map(c =>
                          c.id === chat.id ? { ...c, title: newTitle } : c
                        )
                      );

                      await updateDoc(doc(db, "users", uid, "chats", chat.id), {
                        title: newTitle
                      });
                    }}
                    style={{
                      border: "none",
                      background: "transparent",
                      width: "100%",
                      outline: "none",
                      fontWeight: "500"
                    }}
                  />

                  {/* DELETE */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteChat(chat.id);
                    }}
                    style={{
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      fontSize: "16px"
                    }}>
                    🗑
                  </button>

                </div>
              ))}
            </div>

            {/* CHAT WINDOW */}
            <div style={{ flex: 1 }}>
              <ChatWindow
                subject={subject}
                activeChatId={activeChatId}
                setActiveChatId={setActiveChatId}
                setChatList={setChatList}
              />
            </div>

          </div>
        )}

        {/* BACK BUTTON */}
        <div style={{ textAlign: "center", marginTop: "26px" }}>
          <button
            onClick={() => navigate("/")}
            style={{
              padding: "13px 30px",
              fontSize: "15px",
              background: "#2196f3",
              color: "#fff",
              border: "none",
              borderRadius: "14px",
              cursor: "pointer",
            }}
          >
            ⬅ Back
          </button>
        </div>
      </div>
    </div>
  );
}

export default StudentDashboard;
