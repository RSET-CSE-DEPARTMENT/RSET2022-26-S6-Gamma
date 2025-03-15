import React, { useEffect, useState } from 'react';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { HomeIcon, TicketIcon, CalendarIcon, UserIcon } from '@heroicons/react/24/outline';
import hi from '../assets/Home/hi.svg';
import Ticket from './Ticket';
import Profile from './Profile';
import Months from './Months';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';

const db = getFirestore();

const HomePage: React.FC = () => {
  const [userName, setUserName] = useState<string | null>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<any[]>([]); // New state for filtered events
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('home');
  const [searchQuery, setSearchQuery] = useState<string>(''); // New state for search query

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserName(user.displayName);
      } else {
        setUserName('Guest');
      }
    });

    const fetchEvents = async () => {
      try {
        console.log('Fetching events from Firestore...');
        const querySnapshot = await getDocs(collection(db, 'event'));

        if (querySnapshot.empty) {
          console.log('No events found in Firestore.');
          setError('No events available');
          setLoading(false);
          return;
        }

        const eventsData = querySnapshot.docs.map((doc) => {
          const data = doc.data();
          const eventId = doc.id;
          const eventDate = data['Event Date'] ? format(new Date(data['Event Date']), 'dd-MM-yyyy') : 'N/A';

          return {
            id: eventId,
            ...data,
            Event_Date: eventDate,
          };
        });

        console.log('Fetched events:', eventsData);
        setEvents(eventsData);
        setFilteredEvents(eventsData); // Initialize filtered events with all events
      } catch (error) {
        console.error('Error fetching events:', error);
        setError('Failed to load events. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
    return () => unsubscribe();
  }, []);

  // Search filtering logic
  useEffect(() => {
    const filtered = events.filter((event) =>
      event.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.organiser?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.category?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredEvents(filtered);
  }, [searchQuery, events]);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'home':
        return (
          <div className="p-4 flex flex-col items-center">
            {/* Welcome Section */}
            <div className="relative mb-6 w-full max-w-2xl">
              <img src={hi} alt="App logo" className="mb-8" />
              <div className="absolute top-0 left-4 mt-4 text-white">
                <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold leading-snug">Welcome back</h1>
                <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-snug">
                  {userName ? userName : 'Loading...'}
                </h2>
              </div>
            </div>

            {/* Search Input Field */}
            <div className="w-full max-w-2xl mb-6">
              <input
                type="text"
                placeholder="Search events..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Upcoming Events Header */}
            <div className="flex justify-between items-center mb-4 w-full max-w-2xl">
              <h3 className="text-xl font-medium">Upcoming events</h3>
              <div className="text-[#111113]/60 text-base">See all</div>
            </div>

            {/* Upcoming Events List */}
            <div className="w-full max-w-2xl">
              {loading ? (
                <p>Loading events...</p>
              ) : error ? (
                <p>{error}</p>
              ) : filteredEvents.length === 0 ? (
                <p>No events found</p>
              ) : (
                filteredEvents.map((event, index) => (
                  <Link 
                    key={index} 
                    to={`/event/${event.id}`}
                  >
                    <div className="bg-white rounded-md p-4 mb-4 shadow-lg flex flex-col items-center">
                      {/* Event Card */}
                      <img src={event.poster} alt={event.name} className="w-full h-70 object-cover rounded-md mb-4" />
                      <h4 className="text-xl font-semibold">{event.name}</h4>
                      <p className="text-gray-600">{event.organiser}</p>
                      <p className="text-gray-600">{event.category}</p>
                      <p className="text-gray-600">{event.venue}</p>
                      <p className="text-gray-600">{event.Event_Date}</p>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        );
      case 'tickets':
        return <Ticket />;
      case 'months':
        return <Months />;
      case 'profile':
        return <Profile />;
      default:
        return null;
    }
  };

  return (
    <div className="w-full h-screen flex flex-col bg-[#f6fcf7]">
      {/* Main content area - takes all available height minus navbar */}
      <div className="flex-1 w-full overflow-y-auto">
        {renderTabContent()}
      </div>

      {/* Fixed Bottom Navigation Bar */}
      <div className="fixed bottom-0 w-full bg-white flex justify-around items-center h-16 border-t border-gray-200">
        <button onClick={() => setActiveTab('home')} className="flex flex-col items-center">
          <HomeIcon className="h-6 w-6 text-black" />
          <span className={`text-sm ${activeTab === 'home' ? 'text-blue-500' : 'text-black'}`}>Home</span>
        </button>
        <button onClick={() => setActiveTab('tickets')} className="flex flex-col items-center">
          <TicketIcon className="h-6 w-6 text-black" />
          <span className={`text-sm ${activeTab === 'tickets' ? 'text-blue-500' : 'text-black'}`}>Pass</span>
        </button>
        <button onClick={() => setActiveTab('months')} className="flex flex-col items-center">
          <CalendarIcon className="h-6 w-6 text-black" />
          <span className={`text-sm ${activeTab === 'months' ? 'text-blue-500' : 'text-black'}`}>Events</span>
        </button>
        <button onClick={() => setActiveTab('profile')} className="flex flex-col items-center">
          <UserIcon className="h-6 w-6 text-black rounded-full" />
          <span className={`text-sm ${activeTab === 'profile' ? 'text-blue-500' : 'text-black'}`}>Profile</span>
        </button>
      </div>
    </div>
  );
};

export default HomePage;