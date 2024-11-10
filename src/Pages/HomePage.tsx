import React, { useEffect, useState } from 'react';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { Link } from 'react-router-dom';  // Import Link for navigation
import { useNavigate } from 'react-router-dom';  // Import Link for navigation
import hi from '../assets/Home/hi.svg';
import { HomeIcon, TicketIcon, CalendarIcon, UserIcon } from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { Icon } from 'lucide-react';

const db = getFirestore();

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [userName, setUserName] = useState<string | null>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserName(user.displayName);
      } else {
        setUserName('Guest');
      }
    });

    // Fetch events from Firestore
    const fetchEvents = async () => {
      try {
        console.log('Fetching events from Firestore...');
        const querySnapshot = await getDocs(collection(db, 'event'));

        // Log raw Firestore data for debugging
        console.log('Raw Firestore data:', querySnapshot.docs.map(doc => doc.data()));

        // Check if there are any documents
        if (querySnapshot.empty) {
          console.log('No events found in Firestore.');
          setError('No events available');
          setLoading(false);
          return;
        }

        // Map the data and include the document ID
        const eventsData = querySnapshot.docs.map(doc => {
          const data = doc.data();
          const eventId = doc.id;  // Firestore document ID

          // Log each event's raw data
          console.log('Fetched event data:', data);

          // Format event date if it exists
          const eventDate = data['Event Date'] ? format(new Date(data['Event Date']), 'dd-MM-yyyy') : 'N/A';
          
          return {
            id: eventId,  // Add the event ID to the data
            ...data,
            Event_Date: eventDate, // Use formatted event date
          };
        });

        // Set the fetched and formatted events data
        setEvents(eventsData);

      } catch (error) {
        console.error("Error fetching events: ", error);
        setError('Failed to load events. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();

    return () => unsubscribe();
  }, []);

  return (
    <div className="w-full h-screen bg-[#f6fcf7] p-4 flex flex-col items-center">
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

      {/* Event Filters */}
      <div className="flex items-center gap-4 mb-6 w-full max-w-2xl">
        <div className="bg-[#246d8c] text-white text-base font-medium px-4 py-2 rounded-md">All</div>
        <div className="border border-[#246d8c] text-[#246d8c] text-base font-medium px-4 py-2 rounded-md">Workshop</div>
        <div className="border border-[#246d8c] text-[#246d8c] text-base font-medium px-4 py-2 rounded-md">Cultural</div>
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
          events.map((event, index) => (
            <Link 
              key={index} 
              to={`/event/${event.id}`}  // Use Link for navigation instead of onClick
            >
              <div className="bg-white rounded-md p-4 mb-4 shadow-lg flex flex-col items-center">
                {/* Event Card */}
                <img src={event.Poster} alt={event.Name} className="w-full h-70 object-cover rounded-md mb-4" />
                <h4 className="text-xl font-semibold">{event.Name}</h4>
                <p className="text-gray-600">{event.Organiser}</p>
                <p className="text-gray-600">{event.Category}</p>
                <p className="text-gray-600">{event.Venue}</p>
                <p className="text-gray-600">{event.Event_Date}</p> {/* Use the formatted Event_Date */}
              </div>
            </Link>
          ))
        )}
      </div>

      {/* Fixed Bottom Navigation Bar */}
      <div className="fixed bottom-0 w-full bg-white flex justify-around items-center h-16 border-t border-gray-200">


        <Link to="/home" className="flex flex-col items-center">
 
          <HomeIcon className="h-6 w-6 text-black" />
          <span className="text-sm text-black">Home</span>
        </Link>
        <Link to="/HomePage/TicketView" className="flex flex-col items-center">
          <TicketIcon  className="h-6 w-6 text-black" />
          <span className="text-sm text-black" >Tickets</span>
        </Link>
        <Link to="/events" className="flex flex-col items-center">
          <CalendarIcon className="h-6 w-6 text-black" />
          <span className="text-sm text-black">Events</span>
        </Link>
        <Link to="/profile" className="flex flex-col items-center">
          <UserIcon className="h-6 w-6 text-black rounded-full" />
          <span className="text-sm text-black">Profile</span>
        </Link>
      </div>
    </div>
  );
};

export default HomePage;
