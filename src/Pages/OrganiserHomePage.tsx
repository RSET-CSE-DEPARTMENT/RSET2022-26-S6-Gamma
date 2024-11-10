import React from "react";
import { useNavigate } from "react-router-dom";
import { HomeIcon, TicketIcon, PlusIcon, CalendarIcon, UserIcon  } from "@heroicons/react/24/outline"; // Import icons from Heroicons
import hi from "../assets/Home/hi.svg"; // Import logo

interface ImageProps {
  src: string;
  alt: string;
  className?: string;
}

const Image: React.FC<ImageProps> = ({ src, alt, className }) => (
  <img src={src} alt={alt} className={className} />
);

const EventCard: React.FC<{ title: string; date: string; time: string; imageSrc: string; onClick: () => void }> = ({
  title,
  date,
  time,
  imageSrc,
  onClick,
}) => (
  <div className="bg-[#246D8C]/70 p-4 rounded-md border border-[#111113]/20 cursor-pointer" onClick={onClick}>
    <Image className="w-full h-[149px] rounded-md mb-3" src={imageSrc} alt={title} />
    <h4 className="text-[#F6FCF7] text-base font-medium mb-1">{title}</h4>
    <p className="text-[#F6FCF7] text-base font-bold">
      {date}
      <br />
      {time}
    </p>
  </div>
);

const EventSection: React.FC = () => {
  const navigate = useNavigate();

  const handleCardClick = () => {
    navigate("/OrganiserEventDetail");
  };

  return (
    <div className="w-full h-screen bg-[#F6FCF7] p-4 flex flex-col items-center">
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
        <div className="bg-[#246D8C] text-white text-base font-medium px-4 py-2 rounded-md">All</div>
        <div className="border border-[#246D8C] text-[#246D8C] text-base font-medium px-4 py-2 rounded-md">Workshop</div>
        <div className="border border-[#246D8C] text-[#246D8C] text-base font-medium px-4 py-2 rounded-md">Cultural</div>
      </div>

      {/* Upcoming Events Header */}
      <div className="flex justify-between items-center mb-4 w-full max-w-2xl">
        <h3 className="text-xl font-medium text-[#246D8C]">Upcoming events</h3>
        <div className="text-[#111113]/60 text-base cursor-pointer">See all</div>
      </div>

      {/* Upcoming Events List */}
      <div className="flex flex-col gap-4 mb-6 w-full max-w-2xl">
        <EventCard
          title="RSET IEDC-Resume building"
          date="Friday, 4th October"
          time="11:35am - 12:30pm"
          imageSrc="https://via.placeholder.com/286x149"
          onClick={handleCardClick}
        />

      </div>

      {/* Fixed Bottom Navigation Bar */}
      <div className="fixed bottom-0 w-full bg-[#F6FCF7] flex justify-around items-center h-16 border-t border-gray-200">
        <button onClick={() => navigate("/Home")} className="flex flex-col items-center" aria-label="Home">
          <HomeIcon className="h-6 w-6 text-black" />
        </button>
        <button onClick={() => navigate("/tickets")} className="flex flex-col items-center" aria-label="Tickets">
          <TicketIcon className="h-6 w-6 text-black" />
        </button>
        <button onClick={() => navigate("/EventCreation")} className="flex flex-col items-center" aria-label="Add Event">
          <PlusIcon className="h-6 w-6 text-black" />
        </button>
        <button onClick={() => navigate("/events")} className="flex flex-col items-center" aria-label="Events">
          <CalendarIcon className="h-6 w-6 text-black" />
        </button>
        <button onClick={() => navigate("/profile")} className="flex flex-col items-center" aria-label="Profile">
           <UserIcon className="h-6 w-6 text-black rounded-full" />
        </button>
      </div>

    </div>
  );
};

export default EventSection;
