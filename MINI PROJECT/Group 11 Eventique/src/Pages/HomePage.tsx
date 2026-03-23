import React, { useEffect, useState } from 'react';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { HomeIcon, TicketIcon, CalendarIcon, UserIcon } from '@heroicons/react/24/outline';
import hi from '../assets/Home/hi.svg';
import Ticket from './Ticket';
import Profile from './Profile';
import Months from './Months';
import { format } from 'date-fns';
import { Link, useLocation } from 'react-router-dom';

const db = getFirestore();

const HomePage: React.FC = () => {
  const [userName, setUserName] = useState<string | null>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [currentEvents, setCurrentEvents] = useState<any[]>([]);
  const [pastEvents, setPastEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('home');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeEventTab, setActiveEventTab] = useState<'current' | 'past'>('current');
  const location = useLocation();
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 768);

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchEvents = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'event'));

      if (querySnapshot.empty) {
        setError('No events available');
        setLoading(false);
        return;
      }

      const eventsData = querySnapshot.docs.map((doc) => {
        const data = doc.data();
        const eventId = doc.id;
        const eventDate = data['Event Date'] ? new Date(data['Event Date']) : null;
        const formattedDate = eventDate ? format(eventDate, 'dd-MM-yyyy') : 'N/A';
        const isClosed = data.status === 'closed';

        return {
          id: eventId,
          ...data,
          Event_Date: formattedDate,
          rawDate: eventDate,
          isClosed
        };
      });

      const current = eventsData.filter(event => !event.isClosed);
      const past = eventsData.filter(event => event.isClosed);

      setEvents(eventsData);
      setCurrentEvents(current);
      setPastEvents(past);
    } catch (error) {
      console.error('Error fetching events:', error);
      setError('Failed to load events. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserName(user.displayName);
      } else {
        setUserName('Guest');
      }
    });

    fetchEvents();

    if (location.state?.shouldRefresh) {
      fetchEvents();
      window.history.replaceState({}, document.title);
    }

    return () => unsubscribe();
  }, [location.state]);

  useEffect(() => {
    const filterEvents = (eventList: any[]) => {
      return eventList.filter((event) =>
        event.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.organiser?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.category?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    };

    if (activeEventTab === 'current') {
      setCurrentEvents(filterEvents(events.filter(event => !event.isClosed)));
    } else {
      setPastEvents(filterEvents(events.filter(event => event.isClosed)));
    }
  }, [searchQuery, events, activeEventTab]);

  const renderDesktopNavigation = () => (
    <div className="w-64 h-screen bg-white border-r border-gray-200 fixed left-0 top-0 p-6 flex flex-col">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-blue-600">Eventique</h1>
      </div>
      <nav className="flex-1">
        <ul className="space-y-2">
          <li>
            <button 
              onClick={() => setActiveTab('home')} 
              className={`flex items-center w-full p-3 rounded-lg ${activeTab === 'home' ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              <HomeIcon className="h-6 w-6 mr-3" />
              <span className="font-medium">Home</span>
            </button>
          </li>
          <li>
            <button 
              onClick={() => setActiveTab('tickets')} 
              className={`flex items-center w-full p-3 rounded-lg ${activeTab === 'tickets' ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              <TicketIcon className="h-6 w-6 mr-3" />
              <span className="font-medium">Tickets</span>
            </button>
          </li>
          <li>
            <button 
              onClick={() => setActiveTab('months')} 
              className={`flex items-center w-full p-3 rounded-lg ${activeTab === 'months' ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              <CalendarIcon className="h-6 w-6 mr-3" />
              <span className="font-medium">Events</span>
            </button>
          </li>
          <li>
            <button 
              onClick={() => setActiveTab('profile')} 
              className={`flex items-center w-full p-3 rounded-lg ${activeTab === 'profile' ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              <UserIcon className="h-6 w-6 mr-3" />
              <span className="font-medium">Profile</span>
            </button>
          </li>
        </ul>
      </nav>
      <div className="mt-auto pt-6 border-t border-gray-200">
        <div className="flex items-center">
          <div className="w-10 h-10 rounded-full bg-blue-200 flex items-center justify-center text-blue-600 font-bold">
            {userName ? userName.charAt(0) : 'G'}
          </div>
          <div className="ml-3">
            <p className="font-medium">{userName || 'Guest'}</p>
            <p className="text-xs text-gray-500">Account Settings</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderMobileNavigation = () => (
    <div className="fixed bottom-0 w-full bg-white flex justify-around items-center h-16 border-t border-gray-200">
      <button 
        onClick={() => setActiveTab('home')} 
        className={`flex flex-col items-center p-2 ${activeTab === 'home' ? 'text-blue-500' : 'text-gray-600'}`}
      >
        <HomeIcon className="h-6 w-6" />
        <span className="text-xs mt-1">Home</span>
      </button>
      <button 
        onClick={() => setActiveTab('tickets')} 
        className={`flex flex-col items-center p-2 ${activeTab === 'tickets' ? 'text-blue-500' : 'text-gray-600'}`}
      >
        <TicketIcon className="h-6 w-6" />
        <span className="text-xs mt-1">Tickets</span>
      </button>
      <button 
        onClick={() => setActiveTab('months')} 
        className={`flex flex-col items-center p-2 ${activeTab === 'months' ? 'text-blue-500' : 'text-gray-600'}`}
      >
        <CalendarIcon className="h-6 w-6" />
        <span className="text-xs mt-1">Events</span>
      </button>
      <button 
        onClick={() => setActiveTab('profile')} 
        className={`flex flex-col items-center p-2 ${activeTab === 'profile' ? 'text-blue-500' : 'text-gray-600'}`}
      >
        <UserIcon className="h-6 w-6" />
        <span className="text-xs mt-1">Profile</span>
      </button>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'home':
        return (
          <div className={`p-4 flex flex-col items-center ${isDesktop ? 'ml-64' : ''}`}>
            {/* Welcome Section */}
            <div className={`relative mb-6 w-full ${isDesktop ? 'max-w-4xl' : 'max-w-2xl'}`}>
              {isDesktop ? (
                <div className="flex items-center p-8 bg-[#246d8c] rounded-2xl shadow-xl">
                  <div className="flex-1 text-white">
                    <h1 className="text-4xl font-bold leading-snug">Welcome back</h1>
                    <h2 className="text-5xl font-extrabold leading-snug">
                      {userName ? userName : 'Loading...'}
                    </h2>
                    <p className="mt-2 text-blue-100 max-w-xl">
                      Discover and manage events all in one place.
                    </p>
                  </div>
                  <img src={hi} alt="App logo" className="h-48 ml-4" />
                </div>
              ) : (
                <>
                  <img src={hi} alt="App logo" className="mb-8" />
                  <div className="absolute top-0 left-4 mt-4 text-white">
                    <h1 className="text-2xl md:text-3xl font-bold leading-snug">Welcome back</h1>
                    <h2 className="text-3xl md:text-4xl font-extrabold leading-snug">
                      {userName ? userName : 'Loading...'}
                    </h2>
                  </div>
                </>
              )}
            </div>

            {/* Search and Tabs Container */}
            <div className={`w-full ${isDesktop ? 'max-w-4xl' : 'max-w-2xl'}`}>
              {/* Search Input Field */}
              <div className="mb-6">
                <input
                  type="text"
                  placeholder="Search events..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Events Tabs */}
              <div className="mb-6">
                <div className="flex border-b border-gray-200">
                  <button
                    className={`py-2 px-6 font-medium ${activeEventTab === 'current' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-gray-500 hover:text-gray-700'}`}
                    onClick={() => setActiveEventTab('current')}
                  >
                    Current Events
                  </button>
                  <button
                    className={`py-2 px-6 font-medium ${activeEventTab === 'past' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-gray-500 hover:text-gray-700'}`}
                    onClick={() => setActiveEventTab('past')}
                  >
                    Past Events
                  </button>
                </div>
              </div>

              {/* Events List */}
              <div className="w-full">
                {loading ? (
                  <div className="flex justify-center items-center h-40">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                  </div>
                ) : error ? (
                  <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
                    <p className="text-red-700">{error}</p>
                  </div>
                ) : activeEventTab === 'current' ? (
                  currentEvents.length === 0 ? (
                    <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">
                      <p className="text-blue-700">No current events available</p>
                    </div>
                  ) : (
                    <div className={`grid gap-6 ${isDesktop ? 'grid-cols-3' : 'grid-cols-1'}`}>
                      {currentEvents.map((event, index) => (
                        <Link 
                          key={index} 
                          to={`/event/${event.id}`}
                          state={{ fromHome: true }}
                        >
                          <div className="bg-white rounded-lg p-4 h-full shadow-lg hover:shadow-xl transition-shadow">
                            <div className="w-full aspect-square overflow-hidden rounded-md mb-4">
                              <img 
                                src={event.poster} 
                                alt={event.name} 
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <h4 className="text-xl font-semibold mb-2">{event.name}</h4>
                            <div className="flex items-center text-gray-600 mb-1">
                              <UserIcon className="h-4 w-4 mr-2" />
                              <span>{event.organiser}</span>
                            </div>
                            <div className="flex items-center text-gray-600 mb-1">
                              <CalendarIcon className="h-4 w-4 mr-2" />
                              <span>{event.Event_Date}</span>
                            </div>
                            <div className="text-gray-600">{event.venue}</div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )
                ) : pastEvents.length === 0 ? (
                  <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">
                    <p className="text-blue-700">No past events available</p>
                  </div>
                ) : (
                  <div className={`grid gap-6 ${isDesktop ? 'grid-cols-3' : 'grid-cols-1'}`}>
                    {pastEvents.map((event, index) => (
                      <Link 
                        key={index} 
                        to={`/event/${event.id}`}
                        state={{ fromHome: true }}
                      >
                        <div className="bg-gray-50 rounded-lg p-4 h-full shadow hover:shadow-md transition-shadow">
                          <div className="w-full aspect-square overflow-hidden rounded-md mb-4">
                            <img 
                              src={event.poster} 
                              alt={event.name} 
                              className="w-full h-full object-cover opacity-80" 
                            />
                          </div>
                          <h4 className="text-xl font-semibold mb-2 text-gray-700">{event.name}</h4>
                          <div className="flex items-center text-gray-500 mb-1">
                            <UserIcon className="h-4 w-4 mr-2" />
                            <span>{event.organiser}</span>
                          </div>
                          <div className="flex items-center text-gray-500 mb-1">
                            <CalendarIcon className="h-4 w-4 mr-2" />
                            <span>{event.Event_Date}</span>
                          </div>
                          <div className="text-gray-500">{event.venue}</div>
                          <div className="mt-2 inline-block bg-red-100 text-red-800 text-xs px-2 py-1 rounded">
                            Event Closed
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
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
      {isDesktop && renderDesktopNavigation()}

      <div className={`flex-1 w-full overflow-y-auto ${isDesktop ? '' : 'pb-16'}`}>
        {renderTabContent()}
      </div>

      {!isDesktop && renderMobileNavigation()}
    </div>
  );
};

export default HomePage;