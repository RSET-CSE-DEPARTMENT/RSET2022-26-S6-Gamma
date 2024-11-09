import React from 'react';
import { useNavigate } from 'react-router-dom';
import hi from '../assets/Home/hi.svg';
import { HomeIcon, TicketIcon, CalendarIcon, UserIcon } from '@heroicons/react/24/outline'; // Example icons

interface ImageProps {
  src: string;
  alt: string;
  className?: string;
}

const Image: React.FC<ImageProps> = ({ src, alt, className }) => (
  <img src={src} alt={alt} className={className} />
);

const EventSection: React.FC = () => {
  const navigate = useNavigate();

  const handleCardClick = () => {
    navigate('/EventDetails');
  };

  return (
    <div className="w-full h-screen bg-[#f6fcf7] p-4 flex flex-col items-center">
      {/* Welcome Section */}
      <div className="relative mb-6 w-full max-w-2xl">
        <img src={hi} alt="App logo" className="mb-8" />
        <div className="absolute top-0 left-4 mt-4 text-white">
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold leading-snug">Welcome back</h1>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-snug">Gavin!</h2>
        </div>
      </div>

      {/* Event Filters */}
      <div className="flex items-center gap-4 mb-6 w-full max-w-2xl">
        <div className="bg-[#246d8c] text-white text-base font-medium px-4 py-2 rounded-md">All</div>
        <div className="border border-[#246d8c] text-[#246d8c] text-base font-medium px-4 py-2 rounded-md">
          Workshop
        </div>
        <div className="border border-[#246d8c] text-[#246d8c] text-base font-medium px-4 py-2 rounded-md">
          Cultural
        </div>
      </div>

      {/* Upcoming Events Header */}
      <div className="flex justify-between items-center mb-4 w-full max-w-2xl">
        <h3 className="text-xl font-medium">Upcoming events</h3>
        <div className="text-[#111113]/60 text-base">See all</div>
      </div>

      {/* Upcoming Events List */}
      <div className="flex flex-col gap-4 mb-6 w-full max-w-2xl">
        <div
          className="bg-[#246d8c]/70 p-4 rounded-md border border-[#111113]/20 cursor-pointer"
          onClick={handleCardClick}
        >
          <Image
            className="w-full h-[149px] rounded-md mb-3"
            src="https://via.placeholder.com/286x149"
            alt="RSET IEDC - Resume building event"
          />
          <h4 className="text-[#f6fcf7] text-base font-medium mb-1">RSET IEDC-Resume building</h4>
          <p className="text-[#f6fcf7] text-base font-bold">Friday, 4th October<br />11:35am-12:30pm</p>
        </div>
      </div>

      {/* Fixed Bottom Navigation Bar */}
      <div className="fixed bottom-0 w-full bg-white flex justify-around items-center h-16 border-t border-gray-200">
        <button onClick={() => navigate('/OrganiserHomePage')} className="flex flex-col items-center">
          <HomeIcon className="h-6 w-6 text-black" />
          <span className="text-sm text-black">Home</span>
        </button>
        <button onClick={() => navigate('/tickets')} className="flex flex-col items-center">
          <TicketIcon className="h-6 w-6 text-black" />
          <span className="text-sm text-black">Tickets</span>
        </button>
        <button onClick={() => navigate('/events')} className="flex flex-col items-center">
          <CalendarIcon className="h-6 w-6 text-black" />
          <span className="text-sm text-black">Events</span>
        </button>
        <button onClick={() => navigate('/profile')} className="flex flex-col items-center">
          <UserIcon className="h-6 w-6 text-black rounded-full" />
          <span className="text-sm text-black">Profile</span>
        </button>
      </div>
    </div>
  );
};

export default EventSection;
