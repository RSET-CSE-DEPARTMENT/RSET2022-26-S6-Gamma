import React, { useEffect, useState } from 'react';
import QRCode from 'react-qr-code';
import { getAuth, onAuthStateChanged } from 'firebase/auth';

const Ticket: React.FC = () => {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [eventData, setEventData] = useState<any>(null);

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
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#246d8c]">
      {/* TICKET heading */}
      <h2 className="text-xl font-semibold text-white mb-4">TICKET</h2>

      {/* Ticket container */}
      <div className="max-w-xs mx-auto bg-white rounded-lg shadow-lg justify-center items-center">
        {/* Top section with event image */}
        <div className="bg-[#6094ac] rounded-t-lg p-4 flex justify-center items-center">
          {/* Event Image or Logo */}
          {/* Add your image here if available */}
        </div>

        {/* Event Title */}
        <div className="p-4 text-center">
          {eventData ? (
            <>
              <h2 className="text-lg font-semibold text-gray-800">RSET IEDC - Resume Building</h2>

              {/* Event Date */}
              <div className="mt-2 text-sm text-gray-600 flex items-center justify-center gap-1">
                <span>📅</span>
                <span>Friday, 4th October</span>
              </div>

              {/* Event Time */}
              <div className="mt-1 text-sm text-gray-600 flex items-center justify-center gap-1">
                <span>⏰</span>
                <span>11:35am - 12:00pm</span>
              </div>
            </>
          ) : (
            <p>No event details available</p>
          )}
        </div>

        {/* Separator with a cutout effect */}
        <div className="relative border-t border-dashed border-gray-300 my-4">
          <div className="absolute -top-3 left-0 h-6 w-6 bg-white rounded-full transform -translate-x-1/2" />
          <div className="absolute -top-3 right-0 h-6 w-6 bg-white rounded-full transform translate-x-1/2" />
        </div>

        {/* QR Code Section */}
        <div className="flex justify-center p-8">
          <QRCode 
            size={150}
            value={userEmail ? userEmail : 'No user logged in'} // Set QR code to user email
          />
        </div>
      </div>
    </div>
  );
};

export default Ticket;
