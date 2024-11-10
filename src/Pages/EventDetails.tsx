import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

const db = getFirestore();

const EventDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();  // Get the document ID from the URL
  const [eventData, setEventData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      console.log('Fetching event details for ID:', id);  // Debugging line to check the ID

      const fetchEventDetails = async () => {
        try {
          const docRef = doc(db, 'event', id);  // Fetch the specific event document by its ID
          const docSnap = await getDoc(docRef);

          if (docSnap.exists()) {
            setEventData(docSnap.data());  // Store the event data
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

  if (loading) {
    return <p>Loading event details...</p>;
  }

  if (error) {
    return <p>{error}</p>;
  }

  return (
    <div className="p-4">
      {eventData ? (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <img 
            src={eventData.Poster} 
            alt={eventData.Name} 
            className="w-full h-80 object-cover rounded-md mb-4" 
          />
          <h1 className="text-2xl font-bold mb-2">{eventData.Name}</h1>
          <p className="text-lg"><strong>Organiser:</strong> {eventData.Organiser}</p>
          <p className="text-lg"><strong>Category:</strong> {eventData.Category}</p>
          <p className="text-lg"><strong>Venue:</strong> {eventData.Venue}</p>
          <p className="text-lg"><strong>Event Date:</strong> {eventData.Event_date}</p>
          <p className="text-lg"><strong>Description:</strong> {eventData.Description}</p>
          <p className="text-lg"><strong>Number of Participants:</strong> {eventData.Num_of_participants}</p>
          <p className="text-lg"><strong>Coordinator 2:</strong> {eventData.Coordinator2.join(', ')}</p>
        </div>
      ) : (
        <p>No event details available</p>
      )}
    </div>
  );
};

export default EventDetails;
