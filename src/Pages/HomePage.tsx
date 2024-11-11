import React, { useEffect, useState } from 'react';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { HomeIcon, TicketIcon, CalendarIcon, UserIcon } from '@heroicons/react/24/outline';
import hi from '../assets/Home/hi.svg';
import Ticket from './Ticket';
import Profile from './Profile';
import { format } from 'date-fns';

const db = getFirestore();

const HomePage: React.FC = () => {
  const [userName, setUserName] = useState<string | null>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('home'); // Add state to track active tab

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

        console.log('Fetched events:', eventsData); // Log fetched events
        setEvents(eventsData);
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

  const renderTabContent = () => {
    switch (activeTab) {
      case 'home':
        return (
          <>
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
              ) : events.length === 0 ? (
                <p>No events available</p>
              ) : (
                events.map((event) => (
                  <div key={event.id} className="bg-white rounded-md p-4 mb-4 shadow-lg flex flex-col items-center">
                    <img
                      src={event.poster ?? 'fallback-image-url'}
                      alt={event.name ?? 'Event Image'}
                      className="w-full h-70 object-cover rounded-md mb-4"
                    />
                    <h4 className="text-xl font-semibold">{event.name ?? 'Event Name'}</h4>
                    <p className="text-gray-600">{event.organiser ?? 'Unknown Organiser'}</p>
                    <p className="text-gray-600">{event.category ?? 'Unknown Category'}</p>
                    <p className="text-gray-600">{event.venue ?? 'Unknown Venue'}</p>
                    <br/>
                    <br/>
                  </div>
                ))
              )}
            </div>
          </>
        );
      case 'tickets':
        return <div>
          <Ticket/>
        </div>;
      case 'events':
        return <div>Event Listings</div>;
      case 'profile':
        return <div>
          <Profile/>
        </div>;
      default:
        return null;
    }
  };

  return (
    <div className="w-full h-screen bg-[#f6fcf7] p-4 flex flex-col items-center">
      {/* Render Tab Content */}
      {renderTabContent()}

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
        <button onClick={() => setActiveTab('events')} className="flex flex-col items-center">
          <CalendarIcon className="h-6 w-6 text-black" />
          <span className={`text-sm ${activeTab === 'events' ? 'text-blue-500' : 'text-black'}`}>Events</span>
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
