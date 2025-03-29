import React, { useState, useEffect } from "react";
import { collection, getDocs, query, where, doc, updateDoc, arrayUnion, Timestamp } from "firebase/firestore";
// @ts-ignore
import { db } from "../firebaseConfig"; // Adjust the path as needed
import BarcodeScannerComponent from "react-qr-barcode-scanner"; // QR scanner
import { getAuth, onAuthStateChanged } from "firebase/auth";

const Scan: React.FC = () => {
  const [data, setData] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [organizerEmail, setOrganizerEmail] = useState<string | null>(null);
  const [scannedUser, setScannedUser] = useState<{ name: string; email: string; uid: string } | null>(null);

  useEffect(() => {
    const auth = getAuth();
    onAuthStateChanged(auth, (user) => {
      if (user) {
        console.log("Organizer is logged in:", user.email);
        setOrganizerEmail(user.email);
      } else {
        console.error("Organizer is NOT authenticated.");
        setOrganizerEmail(null);
      }
    });
  }, []);

  useEffect(() => {
    if (data !== "" && organizerEmail) {
      console.log("Scanned Data:", data);
      checkInDatabase(data);
    }
  }, [data, organizerEmail]);

  const checkInDatabase = async (scannedData: string) => {
    try {
      const usersRef = collection(db, "users");
      const userQuery = query(usersRef, where("email", "==", scannedData));
      const userSnapshot = await getDocs(userQuery);

      if (userSnapshot.empty) {
        setStatus("❌ User not found in database.");
        return;
      }

      let userInfo: { name: string; email: string; uid: string } | null = null;

      userSnapshot.forEach((userDoc) => {
        userInfo = {
          name: userDoc.data().name || "Unknown",
          email: userDoc.data().email,
          uid: userDoc.id, // Firestore UID
        };
      });

      if (!userInfo) {
        setStatus("❌ User data retrieval failed.");
        return;
      }

      const eventRef = collection(db, "event");
      const eventQuery = query(eventRef, where("Participants", "array-contains", scannedData));
      const eventSnapshot = await getDocs(eventQuery);

      if (eventSnapshot.empty) {
        setStatus("⚠️ No matching event found for this user.");
        return;
      }

      eventSnapshot.forEach(async (docSnap) => {
        const eventId = docSnap.id;
        const eventDocRef = doc(db, "event", eventId);
        const eventData = docSnap.data();

        // Check if the user is already in attendees
        const attendees = eventData.attendees || [];
        if (attendees.some((att: { email: string }) => att.email === scannedData)) {
          // @ts-ignore
          setStatus(`⚠️ ${userInfo.name} (${scannedData}) is already marked as attended.`);
          return;
        }

        // Add ONLY email & timestamp to 'attendees' field
        const currentTime = Timestamp.now();
        await updateDoc(eventDocRef, {
          attendees: arrayUnion({
            email: scannedData,
            timestamp: currentTime,
          }),
        });

        setScannedUser(userInfo);
        // @ts-ignore
        setStatus(`✅ ${userInfo.name} (${scannedData}) marked as attended! 🎉`);

        console.log(`User ${scannedData} marked attended at ${currentTime.toDate()} in event ${eventId}`);

        // Reset scanned details after 3 seconds
        setTimeout(() => {
          setScannedUser(null);
          setStatus("");
          setData(""); // Reset scanned data
        }, 3000);
      });

    } catch (error) {
      console.error("Error checking the database:", error);
      setStatus("🚨 Error occurred while checking the database.");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white">
      <h2 className="text-3xl font-bold mb-6">📷 Scan QR Code</h2>
      
      <div className="bg-gray-800 p-6 rounded-lg shadow-lg text-center">
        <BarcodeScannerComponent
          width={400}
          height={400}
          // @ts-ignore
          onUpdate={(err, result) => {
            if (result) {
              // @ts-ignore
              setData(result.text ? result.text.replace(/^User:/i, "").trim() : "Not Found");
            }
          }}
        />
      </div>

      {scannedUser && (
        <div className="mt-6 p-4 bg-green-600 text-white rounded-lg shadow-md animate-fadeIn">
          <h3 className="text-xl font-semibold">✅ Scanned User</h3>
          <p className="text-lg"><b>Name:</b> {scannedUser.name}</p>
          <p className="text-lg"><b>Email:</b> {scannedUser.email}</p>
          <p className="text-lg"><b>UID:</b> {scannedUser.uid}</p>
        </div>
      )}

      <p className="mt-4 text-lg">{status}</p>
    </div>
  );
};

export default Scan;
