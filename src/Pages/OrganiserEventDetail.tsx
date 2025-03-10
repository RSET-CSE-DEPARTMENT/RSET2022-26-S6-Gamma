import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { QrCodeIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import { doc, getDoc, deleteDoc } from 'firebase/firestore';
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

  const handleDelete = async () => {
    if (!id) return;
    
    const confirmDelete = window.confirm("Are you sure you want to delete this event?");
    if (!confirmDelete) return;

    try {
      await deleteDoc(doc(db, 'event', id));
      alert("Event deleted successfully!");
      navigate('/OrganiserHomePage'); // Redirect to organiser home page after deletion
    } catch (error) {
      console.error('Error deleting event:', error);
      alert("Failed to delete event.");
    }
  };

  if (loading) return <p>Loading event details...</p>;
  if (error) return <p>{error}</p>;

  return (
    <div className="w-full max-w-2xl mx-auto p-4">
      {eventData ? (
        <div className="bg-white rounded-md p-4 mb-4 shadow-lg flex flex-col items-center">
          <img src={eventData.poster} alt={eventData.name} className="w-full h-70 object-cover rounded-md mb-4" />
          <h4 className="text-xl font-semibold">{eventData.name}</h4>
          <p className="text-gray-600">{eventData.organiser}</p>
          <p className="text-gray-600">{eventData.category}</p>
          <p className="text-gray-600">{eventData.venue}</p>
          <p className="text-gray-600">{eventData.event_Date}</p>
          
          {/* Buttons for Edit, Delete, and Scan */}
          <div className="flex gap-4 mt-4">
            {/* Edit Button */}
            <Link to={`/OrganiserHomePage/EditEvent/${id}`}>
              <button className="bg-blue-500 text-white py-2 px-4 rounded-md flex items-center gap-x-2">
                <PencilIcon className="h-5 w-5" />
                Edit
              </button>
            </Link>

            {/* Delete Button */}
            <button onClick={handleDelete} className="bg-red-500 text-white py-2 px-4 rounded-md flex items-center gap-x-2">
              <TrashIcon className="h-5 w-5" />
              Delete
            </button>

            {/* Scan Ticket Button */}
            <button onClick={() => navigate('/OrganiserHomePage/OrganiserEventDetail/Scan')} className="bg-green-500 text-white py-2 px-4 rounded-md flex items-center gap-x-2">
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
