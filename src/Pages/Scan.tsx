import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from "firebase/firestore";
// @ts-ignore
import { db } from '../firebaseConfig'; // Adjust the path as needed
import BarcodeScannerComponent from "react-qr-barcode-scanner"; // QR scanner

const Scan: React.FC = () => {
  const [data, setData] = useState<string>('');
  const [status, setStatus] = useState<string>('');

  useEffect(() => {
    if (data !== "") {
      // Call Firebase to check if the scanned data exists
      console.log("Scanned Data:", data);
      checkInDatabase(data);
    }
  }, [data]);

  const checkInDatabase = async (scannedData: string) => {
    try {
      const eventRef = collection(db, "event");
      const q = query(eventRef, where("Participants", "array-contains", scannedData));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        setStatus("No record found for this QR.");
      } else {
        setStatus("Yes, the user is registered.");
      }
    } catch (error) {
      console.error("Error checking the database:", error);
      setStatus("Error occurred while checking the database.");
    }
  };

  return (
    <div>
      <h2>Scan QR Code</h2>
      <BarcodeScannerComponent
        width={500}
        height={500}
        // @ts-ignore
        onUpdate={(err, result) => {
          if (result) {
            // @ts-ignore
            setData(result.text ? result.text.replace(/^User:/i, '').trim() : "Not Found");
          } else {
            setData("Not Found");
          }
        }}
      />
      <p>Scanned Data: {data}</p>
      <p>Status: {status}</p>
    </div>
  );
};

export default Scan;
