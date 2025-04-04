import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { HomeIcon, PlusIcon, CalendarIcon, UserIcon } from "@heroicons/react/24/outline";
import hi from "../assets/Home/hi.svg";
import { doc, getDoc, getDocs, collection } from "firebase/firestore";
// @ts-ignore
import { auth, db } from "../firebaseConfig";
import { Link } from "react-router-dom";

const EventSection: React.FC = () => {
  const navigate = useNavigate();
  const [organizerName, setOrganizerName] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [activeEvents, setActiveEvents] = useState<any[]>([]);
  const [closedEvents, setClosedEvents] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeTab] = useState<string>('home');
  const [eventFilter, setEventFilter] = useState<'active' | 'closed'>('active');

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
          .map((doc) => {
            const data = doc.data();
            const isClosed = data.status === 'closed';
            return {
              id: doc.id,
              ...data,
              isClosed,
              event_date: data.event_date || data.event_Date,
              event_time: data.event_time || data.eventTime
            };
          })
          // @ts-ignore
          .filter((event) => event.organiser === user.email);

        const active = userEvents.filter(event => !event.isClosed);
        const closed = userEvents.filter(event => event.isClosed);

        setActiveEvents(active);
        setClosedEvents(closed);
      } else {
        setOrganizerName("Guest");
        setActiveEvents([]);
        setClosedEvents([]);
      }

      setLoading(false);
    };

    fetchOrganizerData();
  }, []);

  // Filter events based on search query and active/closed filter
  const filteredEvents = (eventFilter === 'active' ? activeEvents : closedEvents)
    .filter((event) => event.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="w-full min-h-screen bg-[#F6FCF7] p-4 flex flex-col items-center pb-20">
      {/* Welcome Section */}
      <div className="relative mb-6 w-full max-w-3xl">
        <div className="w-full">
          <img src={hi} alt="App logo" className="w-full h-auto mb-8" />
        </div>
        <div className="absolute top-0 left-4 mt-4 text-white">
          <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold leading-snug">Welcome back</h1>
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold leading-snug truncate max-w-xs sm:max-w-sm md:max-w-md">
            {loading ? "Loading..." : organizerName}!
          </h2>
        </div>
      </div>

      {/* Search Bar */}
      <div className="w-full max-w-3xl mb-4">
        <input
          type="text"
          placeholder="Search events..."
          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#246D8C]"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Event Tabs */}
      <div className="w-full max-w-3xl mb-6">
        <div className="flex border-b border-gray-200">
          <button
            className={`py-2 px-6 font-medium ${eventFilter === 'active' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-gray-500 hover:text-gray-700'}`}
            onClick={() => setEventFilter('active')}
          >
            Active Events
          </button>
          <button
            className={`py-2 px-6 font-medium ${eventFilter === 'closed' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-gray-500 hover:text-gray-700'}`}
            onClick={() => setEventFilter('closed')}
          >
            Closed Events
          </button>
        </div>
      </div>

      {/* Events List */}
      <div className="w-full max-w-3xl">
        {loading ? (
          <div className="flex justify-center p-4">
            <p>Loading events...</p>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="flex justify-center p-4">
            <p>No {eventFilter === 'active' ? 'active' : 'closed'} events found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredEvents.map((event) => (
              <Link key={event.id} to={`/OrganiserHomePage/${event.id}`} className="flex">
                <div className={`bg-white rounded-md p-4 shadow-lg flex flex-col items-center w-full h-full ${
                  event.isClosed ? 'opacity-80' : ''
                }`}>
                  {/* Square Poster Image */}
                  <div className="w-full aspect-square mb-3 relative">
                    <img 
                      src={event.poster} 
                      alt={event.name} 
                      className="w-full h-full object-cover rounded-md"
                      onError={(e) => {
                        // @ts-ignore
                        e.target.onerror = null;
                        // @ts-ignore
                        e.target.src = "https://via.placeholder.com/300?text=Event+Image";
                      }}
                    />
                    {event.isClosed && (
                      <div className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-md">
                        Closed
                      </div>
                    )}
                  </div>
                  <h4 className="text-lg font-semibold text-center line-clamp-1">{event.name}</h4>
                  <p className="text-gray-600 text-sm text-center line-clamp-1">{event.organiser}</p>
                  <p className="text-gray-600 text-sm text-center">{event.category}</p>
                  <p className="text-gray-600 text-sm text-center line-clamp-1">{event.venue}</p>
                  <p className="text-gray-600 text-sm text-center">{event.event_date}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white flex justify-around items-center h-16 border-t border-gray-200 z-10">
        <button onClick={() => navigate("/Home")} className="flex flex-col items-center w-1/4" aria-label="Home">
          <HomeIcon className="h-5 w-5 sm:h-6 sm:w-6 text-black" />
          <span className={`text-xs sm:text-sm ${activeTab === 'home' ? 'text-blue-500' : 'text-black'}`}>Home</span>
        </button>
        <button onClick={() => navigate("/OrganiserHomePage/EventCreation")} className="flex flex-col items-center w-1/4" aria-label="Add Event">
          <PlusIcon className="h-5 w-5 sm:h-6 sm:w-6 text-black" />
          <span className={`text-xs sm:text-sm ${activeTab === 'create' ? 'text-blue-500' : 'text-black'}`}>Create</span>
        </button>
        <button onClick={() => navigate("/OrganiserCalendar")} className="flex flex-col items-center w-1/4" aria-label="Events">
          <CalendarIcon className="h-5 w-5 sm:h-6 sm:w-6 text-black" />
          <span className={`text-xs sm:text-sm ${activeTab === 'events' ? 'text-blue-500' : 'text-black'}`}>Events</span>
        </button>
        <button onClick={() => navigate("/OrganiserProfile")} className="flex flex-col items-center w-1/4" aria-label="Profile">
          <UserIcon className="h-5 w-5 sm:h-6 sm:w-6 text-black" />
          <span className={`text-xs sm:text-sm ${activeTab === 'profile' ? 'text-blue-500' : 'text-black'}`}>Profile</span>
        </button>
      </div>
    </div>
  );
};

export default EventSection;