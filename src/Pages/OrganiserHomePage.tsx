import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { HomeIcon, TicketIcon, PlusIcon, CalendarIcon, UserIcon } from "@heroicons/react/24/outline"; // Import icons
import hi from "../assets/Home/hi.svg"; // Import logo
import { doc, getDoc, getDocs, collection } from "firebase/firestore";
// @ts-ignore
import { auth, db } from "../firebaseConfig"; // Adjust to match Firebase config
import { Link } from 'react-router-dom';


const EventSection: React.FC = () => {
  const navigate = useNavigate();
  const [organizerName, setOrganizerName] = useState<string>(""); // State for organizer name
  const [loading, setLoading] = useState<boolean>(true); // Loading state
  const [events, setEvents] = useState<any[]>([]); // State for events
  // @ts-ignore
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrganizerData = async () => {
      const user = auth.currentUser;

      if (user) {
        const docRef = doc(db, "organizers", user.email);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          setOrganizerName(data.name);
        } else {
          setOrganizerName("Default Organizer Name");
        }

        const eventsCollection = collection(db, "event");
        const querySnapshot = await getDocs(eventsCollection);

        const userEvents = querySnapshot.docs
          .map((doc) => ({ ...doc.data(), id: doc.id })) // Add ID here
          // @ts-ignore
          .filter((event) => event.organiser === user.email);

        setEvents(userEvents); // Set the events with the ID

      } else {
        setOrganizerName("Guest");
        setEvents([]);
      }

      setLoading(false);
    };

    fetchOrganizerData();
  }, []);

 

  return (
    <div className="w-full min-h-screen bg-[#F6FCF7] p-4 flex flex-col items-center">
      {/* Welcome Section */}
      <div className="relative mb-6 w-full max-w-2xl">
        <img src={hi} alt="App logo" className="mb-8" />
        <div className="absolute top-0 left-4 mt-4 text-white">
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold leading-snug">Welcome back</h1>
          {/* Conditionally render loading or name */}
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-snug">
            {loading ? "Loading..." : organizerName}!
          </h2>
        </div>
      </div>

      {/* Event Filters */}
      <div className="flex items-center gap-4 mb-6 w-full max-w-2xl justify-center">
        <div className="bg-[#246D8C] text-white text-base font-medium px-4 py-2 rounded-md cursor-pointer">All</div>
        <div className="border border-[#246D8C] text-[#246D8C] text-base font-medium px-4 py-2 rounded-md cursor-pointer">
          Workshop
        </div>
        <div className="border border-[#246D8C] text-[#246D8C] text-base font-medium px-4 py-2 rounded-md cursor-pointer">
          Cultural
        </div>
      </div>

      {/* Upcoming Events Header */}
      <div className="flex justify-between items-center mb-4 w-full max-w-2xl">
        <h3 className="text-xl font-medium text-[#246D8C]">Upcoming events</h3>
        <div className="text-[#111113]/60 text-base cursor-pointer" onClick={() => navigate("/events")}>
          See all
        </div>
      </div>

      {/* Upcoming Events List */}
      <div className="w-full max-w-2xl">
        {loading ? (
          <p>Loading events...</p>
        ) : error ? (
          <p>{error}</p>
        ) : events.length === 0 ? (
          <p>No events available</p>
        ) : (
          events.map((event, index) => (
            <Link 
              key={index} 
              to={`/OrganiserHomePage/${event.id}`}  // Use Link for navigation instead of onClick
            >
              <div className="bg-white rounded-md p-4 mb-4 shadow-lg flex flex-col items-center">
                {/* Event Card */}
                <img src={event.poster} alt={event.name} className="w-full h-70 object-cover rounded-md mb-4" />
                <h4 className="text-xl font-semibold">{event.name}</h4>
                <p className="text-gray-600">{event.organiser}</p>
                <p className="text-gray-600">{event.category}</p>
                <p className="text-gray-600">{event.venue}</p>
                <p className="text-gray-600">{event.event_Date}</p> {/* Use the formatted Event_Date */}
              </div>
            </Link>
          ))
        )}
      </div>

      {/* Fixed Bottom Navigation Bar */}
      <div className="fixed bottom-0 w-full bg-[#F6FCF7] flex justify-around items-center h-16 border-t border-gray-200">
        <button onClick={() => navigate("/Home")} className="flex flex-col items-center" aria-label="Home">
          <HomeIcon className="h-6 w-6 text-black" />
        </button>
        <button onClick={() => navigate("/tickets")} className="flex flex-col items-center" aria-label="Tickets">
          <TicketIcon className="h-6 w-6 text-black" />
        </button>
        <button onClick={() => navigate("/OrganiserHomePage/EventCreation")} className="flex flex-col items-center" aria-label="Add Event">
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
