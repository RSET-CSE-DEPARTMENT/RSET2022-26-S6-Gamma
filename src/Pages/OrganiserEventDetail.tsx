import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { QrCodeIcon } from '@heroicons/react/24/outline';
import { doc, getDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom'; // Import useNavigate
// @ts-ignore
import { db } from '../firebaseConfig'; // Make sure to import your Firestore config

// Define the event data interface to type the fetched event data
interface EventData {
  id: string;
  name: string;
  organiser: string;
  category: string;
  venue: string;
  event_Date: string;
  poster: string;
}

const OrganiserEventDetail = () => {
  const { id } = useParams<{ id: string }>(); // Extract the event ID from the URL
  const [eventData, setEventData] = useState<EventData | null>(null); // Type state with EventData or null
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const navigate = useNavigate(); // Initialize useNavigate inside the component

  const handleScan = () => {
    navigate('/OrganiserHomePage/OrganiserEventDetail/Scan');
  };

  useEffect(() => {
    if (id) {
      console.log('Fetching event details for ID:', id);

      const fetchEventDetails = async () => {
        try {
          const docRef = doc(db, 'event', id); // Fetch event data by its ID
          const docSnap = await getDoc(docRef);

          if (docSnap.exists()) {
            // Cast the Firestore document data to EventData type
            setEventData(docSnap.data() as EventData);
          } else {
            setError('Event not found.');
          }
        } catch (error) {
          console.error('Error fetching event details:', error);
          setError('Failed to load event details.');
        } finally {
          setLoading(false);
        }
      };

      fetchEventDetails();
    } else {
      setError('Event ID is missing.');
      setLoading(false);
    }
  }, [id]);

  // Loading or error states
  if (loading) {
    return <p>Loading event details...</p>;
  }

  if (error) {
    return <p>{error}</p>;
  }

  // Ensure eventData is not null before rendering its properties
  return (
    <div>
      <div className="w-full max-w-2xl">
        {eventData ? (
          <Link to={`/OrganiserHomePage/${eventData.id}`}>
            <div className="bg-white rounded-md p-4 mb-4 shadow-lg flex flex-col items-center">
              {/* Event Card */}
              <img
                src={eventData.poster}
                alt={eventData.name}
                className="w-full h-70 object-cover rounded-md mb-4"
              />
              <h4 className="text-xl font-semibold">{eventData.name}</h4>
              <p className="text-gray-600">{eventData.organiser}</p>
              <p className="text-gray-600">{eventData.category}</p>
              <p className="text-gray-600">{eventData.venue}</p>
              <p className="text-gray-600">{eventData.event_Date}</p>
            </div>
          </Link>
        ) : (
          <p>No event found for this ID.</p>
        )}
      </div>

      <button onClick={handleScan} className="w-full bg-[#246d8c] text-white py-3 rounded-md text-lg font-medium flex items-center justify-center gap-x-2">
        <QrCodeIcon className="h-6 w-6 text-white" />
        Scan Ticket
      </button>
    </div>
  );
};

export default OrganiserEventDetail;
