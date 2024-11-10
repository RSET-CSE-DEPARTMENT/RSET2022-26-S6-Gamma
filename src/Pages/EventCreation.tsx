import React from 'react';
import {useNavigate } from "react-router-dom";

const CreateEvent: React.FC = () => {
    const navigate = useNavigate();
  return (
    <div className="w-full min-h-screen bg-[#f6fcf7] flex flex-col items-center px-4 py-8">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="text-xl font-medium text-black">Create Event</div>
          <div className="w-8 h-8 bg-gray-300 rounded-full"></div>
        </div>

        {/* Event Poster Section */}
        <div className="w-full h-36 mb-4 bg-[#d9d9d9] rounded-md opacity-80 flex flex-col justify-center items-center">
          <div className="text-2xl text-black">+</div>
          <div className="text-base text-black">Add event poster</div>
        </div>

        {/* Event Details Section */}
        <div className="text-xl font-medium text-black mb-2">Event Details</div>
        <div className="space-y-4">
          {/* Input Fields */}
          <input
            type="text"
            placeholder="Event name"
            className="w-full h-12 px-4 bg-white border border-gray-200 rounded-md placeholder-gray-500"
          />
          <input
            type="text"
            placeholder="Event type"
            className="w-full h-12 px-4 bg-white border border-gray-200 rounded-md placeholder-gray-500"
          />
          <input
            type="date"
            placeholder="Select Date"
            className="w-full h-12 px-4 bg-white border border-gray-200 rounded-md placeholder-gray-500"
          />
          <input
            type="time"
            placeholder="Select time"
            className="w-full h-12 px-4 bg-white border border-gray-200 rounded-md placeholder-gray-500"
          />
          <input
            type="text"
            placeholder="Duration"
            className="w-full h-12 px-4 bg-white border border-gray-200 rounded-md placeholder-gray-500"
          />
          <input
            type="text"
            placeholder="Venue"
            className="w-full h-12 px-4 bg-white border border-gray-200 rounded-md placeholder-gray-500"
          />
          <input
            type="text"
            placeholder="About event"
            className="w-full h-12 px-4 bg-white border border-gray-200 rounded-md placeholder-gray-500"
          />
          <input
            type="text"
            placeholder="Mode"
            className="w-full h-12 px-4 bg-white border border-gray-200 rounded-md placeholder-gray-500"
          />
          <input
            type="text"
            placeholder="Coordinator 1"
            className="w-full h-12 px-4 bg-white border border-gray-200 rounded-md placeholder-gray-500"
          />
          <input
            type="tel"
            placeholder="Contact number"
            className="w-full h-12 px-4 bg-white border border-gray-200 rounded-md placeholder-gray-500"
          />
          <input
            type="text"
            placeholder="Coordinator 2"
            className="w-full h-12 px-4 bg-white border border-gray-200 rounded-md placeholder-gray-500"
          />
          <input
            type="tel"
            placeholder="Contact number"
            className="w-full h-12 px-4 bg-white border border-gray-200 rounded-md placeholder-gray-500"
          />
          <input
            type="number"
            placeholder="Participants"
            className="w-full h-12 px-4 bg-white border border-gray-200 rounded-md placeholder-gray-500"
          />

          {/* Create Button */}
          <button onClick={() => navigate("/EventCreatSuccess")} className="w-full h-12 bg-[#246d8c] text-white font-medium rounded-md" >
            Create
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateEvent;
