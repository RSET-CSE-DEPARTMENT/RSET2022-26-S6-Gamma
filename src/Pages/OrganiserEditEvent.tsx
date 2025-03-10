import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
// @ts-ignore
import { db } from '../firebaseConfig';

interface EventData {
  name: string;
  organiser: string;
  category: string;
  venue: string;
  event_Date: string;
  poster: string;
}

const OrganiserEditEvent = () => {
  const { id } = useParams<{ id: string }>(); // Get event ID from URL
  const navigate = useNavigate();
  const [eventData, setEventData] = useState<EventData>({
    name: '',
    organiser: '',
    category: '',
    venue: '',
    event_Date: '',
    poster: '',
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (!id) {
      setError('Event ID is missing.');
      setLoading(false);
      return;
    }

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
  }, [id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setEventData({
      ...eventData,
      [e.target.name]: e.target.value,
    });
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    try {
      const eventRef = doc(db, 'event', id);
      // @ts-ignore
      await updateDoc(eventRef, eventData);
      alert('Event updated successfully!');
      navigate(`/OrganiserHomePage/${id}`); // Redirect back to event details page
    } catch (error) {
      console.error('Error updating event:', error);
      alert('Failed to update event.');
    }
  };

  if (loading) return <p>Loading event details...</p>;
  if (error) return <p>{error}</p>;

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white shadow-md rounded-md">
      <h2 className="text-2xl font-semibold mb-4">Edit Event</h2>
      <form onSubmit={handleUpdate} className="space-y-4">
        <div>
          <label className="block text-sm font-medium">Event Name</label>
          <input
            type="text"
            name="name"
            value={eventData.name}
            onChange={handleChange}
            className="w-full p-2 border rounded-md"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Organiser</label>
          <input
            type="text"
            name="organiser"
            value={eventData.organiser}
            onChange={handleChange}
            className="w-full p-2 border rounded-md"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Category</label>
          <input
            type="text"
            name="category"
            value={eventData.category}
            onChange={handleChange}
            className="w-full p-2 border rounded-md"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Venue</label>
          <input
            type="text"
            name="venue"
            value={eventData.venue}
            onChange={handleChange}
            className="w-full p-2 border rounded-md"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Event Date</label>
          <input
            type="date"
            name="event_Date"
            value={eventData.event_Date}
            onChange={handleChange}
            className="w-full p-2 border rounded-md"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Poster URL</label>
          <input
            type="text"
            name="poster"
            value={eventData.poster}
            onChange={handleChange}
            className="w-full p-2 border rounded-md"
            required
          />
        </div>

        <button type="submit" className="w-full bg-blue-500 text-white py-2 rounded-md text-lg font-medium">
          Update Event
        </button>
      </form>
    </div>
  );
};

export default OrganiserEditEvent;
