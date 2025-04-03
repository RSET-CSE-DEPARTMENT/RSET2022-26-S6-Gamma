import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { QrCodeIcon, PencilIcon, TrashIcon, LockClosedIcon } from '@heroicons/react/24/outline';
import { doc, getDoc, deleteDoc, updateDoc } from 'firebase/firestore';
// @ts-ignore
import { db } from '../firebaseConfig';

interface EventData {
  id: string;
  name: string;
  organiser: string;
  category: string;
  venue: string;
  event_Date: string;
  poster: string;
  status?: string;
  registrationOpen?: boolean;
}

const OrganiserEventDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [eventData, setEventData] = useState<EventData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const navigate = useNavigate();

  useEffect(() => {
    if (id) {
      const fetchEventDetails = async () => {
        try {
          const docRef = doc(db, 'event', id);
          const docSnap = await getDoc(docRef);

          if (docSnap.exists()) {
            setEventData({ 
              id: docSnap.id, 
              ...docSnap.data(),
              registrationOpen: docSnap.data().registrationOpen !== false // Default to true if not set
            } as EventData);
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

  const handleDelete = async () => {
    if (!id) return;
    
    const confirmDelete = window.confirm("Are you sure you want to delete this event?");
    if (!confirmDelete) return;

    try {
      await deleteDoc(doc(db, 'event', id));
      alert("Event deleted successfully!");
      navigate('/OrganiserHomePage');
    } catch (error) {
      console.error('Error deleting event:', error);
      alert("Failed to delete event.");
    }
  };

  const handleCloseEvent = async () => {
    if (!id || !eventData) return;
    
    const confirmClose = window.confirm("Are you sure you want to close this event? This will:\n1. Move it to past events\n2. Close registration\n3. Remove it from current events");
    if (!confirmClose) return;

    try {
      const eventRef = doc(db, 'event', id);
      await updateDoc(eventRef, {
        status: 'closed',
        registrationOpen: false
      });
      
      // Update local state to reflect the changes
      setEventData({
        ...eventData,
        status: 'closed',
        registrationOpen: false
      });
      
      alert("Event closed successfully! Registration is now closed.");
      // Redirect or refresh parent component's event list
      navigate('/OrganiserHomePage'); // Or wherever makes sense in your flow
    } catch (error) {
      console.error('Error closing event:', error);
      alert("Failed to close event.");
    }
  };

  if (loading) return <div className="flex justify-center items-center h-40">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
  </div>;
  
  if (error) return <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
    <p className="text-red-700">{error}</p>
  </div>;

  return (
    <div className="w-full max-w-2xl mx-auto p-4">
      {eventData ? (
        <div className="bg-white rounded-md p-4 mb-4 shadow-lg flex flex-col items-center">
          <img 
            src={eventData.poster} 
            alt={eventData.name} 
            className="w-full aspect-square object-cover rounded-md mb-4" 
          />
          <h4 className="text-xl font-semibold">{eventData.name}</h4>
          <p className="text-gray-600">{eventData.organiser}</p>
          <p className="text-gray-600">{eventData.category}</p>
          <p className="text-gray-600">{eventData.venue}</p>
          <p className="text-gray-600">{eventData.event_Date}</p>
          
          {/* Status badges */}
          <div className="flex gap-2 mt-2">
            {eventData.status === 'closed' && (
              <div className="inline-block bg-red-100 text-red-800 text-xs px-2 py-1 rounded">
                Event Closed
              </div>
            )}
            {eventData.registrationOpen === false && (
              <div className="inline-block bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded">
                Registration Closed
              </div>
            )}
          </div>
          
          {/* Action buttons */}
          <div className="flex flex-wrap gap-4 mt-6 justify-center">
            {/* Edit Button - Only show if event is not closed */}
            {eventData.status !== 'closed' && (
              <Link to={`/OrganiserHomePage/EditEvent/${id}`}>
                <button className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-md flex items-center gap-x-2 transition-colors">
                  <PencilIcon className="h-5 w-5" />
                  Edit
                </button>
              </Link>
            )}

            {/* Delete Button */}
            <button 
              onClick={handleDelete} 
              className="bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded-md flex items-center gap-x-2 transition-colors"
            >
              <TrashIcon className="h-5 w-5" />
              Delete
            </button>

            {/* Close Event Button - Only show if event is not already closed */}
            {eventData.status !== 'closed' && (
              <button 
                onClick={handleCloseEvent} 
                className="bg-yellow-500 hover:bg-yellow-600 text-white py-2 px-4 rounded-md flex items-center gap-x-2 transition-colors"
              >
                <LockClosedIcon className="h-5 w-5" />
                Close Event
              </button>
            )}

            {/* Scan Ticket Button */}
            <button 
              onClick={() => navigate(`/OrganiserHomePage/OrganiserEventDetail/${id}/Scan`)} 
              className="bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded-md flex items-center gap-x-2 transition-colors"
            >
              <QrCodeIcon className="h-5 w-5" />
              Scan Ticket
            </button>
          </div>
        </div>
      ) : (
        <p>No event found for this ID.</p>
      )}
    </div>
  );
};

export default OrganiserEventDetail;