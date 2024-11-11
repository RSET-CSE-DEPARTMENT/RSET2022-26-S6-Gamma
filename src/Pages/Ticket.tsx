import React, { useEffect, useState } from 'react';
import QRCode from 'react-qr-code';
import { getAuth, onAuthStateChanged } from 'firebase/auth';

const Ticket: React.FC = () => {
  const [userEmail, setUserEmail] = useState<string | null>(null);

  // Fetch user email if logged in
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user && user.email) {
        setUserEmail(user.email); // Set the email if user is logged in
      }
    });
    return () => unsubscribe();
  }, []);

  return (
    <div className="flex flex-col p-12 items-center justify-center w-full h-screen overflow-hidden bg-gradient-to-r from-[#246d8c] to-[#F6FCF7] text-white">
      {/* TICKET heading */}
      <h2 className="text-2xl font-bold mb-4 uppercase tracking-widest text-center">Pass</h2>

      {/* Ticket container */}
      <div className="max-w-xs p-6 bg-white rounded-xl shadow-xl overflow-hidden transform transition-all duration-500 hover:scale-105">
        {/* QR Code Section */}
        <div className="flex justify-center p-8 bg-gray-100">
          <QRCode 
            size={150}
            value={userEmail ? `User: ${userEmail}` : 'No user logged in'} 
          />
        </div>
      </div>
    </div>
  );
};

export default Ticket;
