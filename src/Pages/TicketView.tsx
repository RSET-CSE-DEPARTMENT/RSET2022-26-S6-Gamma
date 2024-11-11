import React from 'react';
import QRCode from 'react-qr-code';

const Ticket: React.FC = () => { // Get the event ID from the URL
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="max-w-xs mx-auto bg-white rounded-lg shadow-lg justify-center items-center">
        {/* Top section with event image */}
        <div className="bg-[#246D8C] rounded-t-lg p-4 flex justify-center items-center">
          
        </div>

        {/* Event Title */}
        <div className="p-4 text-center">
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
        </div>

        {/* Separator with a cutout effect */}
        <div className="relative border-t border-dashed border-gray-300 my-4">
          <div className="absolute -top-3 left-0 h-6 w-6 bg-white rounded-full transform -translate-x-1/2" />
          <div className="absolute -top-3 right-0 h-6 w-6 bg-white rounded-full transform translate-x-1/2" />
        </div>

        {/* Placeholder for QR Code */}
        <div className="flex justify-center p-4">
         <QRCode 
           size={150}
           value='text'
          />

        </div>
      </div>
    </div>
  );
};

export default Ticket