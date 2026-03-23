import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
// @ts-ignore
import { db } from '../firebaseConfig';

interface EventData {
  name: string;
  organiser: string;
  category: string;
  venue: string;
  event_Date: string;
  poster: string;
  logo?: string; // Add logo field
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
    logo: '',
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [uploading, setUploading] = useState<boolean>(false);

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
          const data = docSnap.data() as EventData;
          setEventData(data);
          if (data.logo) {
            setLogoPreview(data.logo);
          }
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

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setLogoFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target && event.target.result) {
          setLogoPreview(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    
    setUploading(true);
    
    try {
      let updatedData = {...eventData};
      
      // Upload logo if a new file was selected
      if (logoFile) {
        const storage = getStorage();
        const logoRef = ref(storage, `event-logos/${id}-${logoFile.name}`);
        await uploadBytes(logoRef, logoFile);
        const logoUrl = await getDownloadURL(logoRef);
        updatedData.logo = logoUrl;
      }
      
      const eventRef = doc(db, 'event', id);
      await updateDoc(eventRef, updatedData);
      
      alert('Event updated successfully!');
      navigate(`/OrganiserHomePage/${id}`); // Redirect back to event details page
    } catch (error) {
      console.error('Error updating event:', error);
      alert('Failed to update event.');
    } finally {
      setUploading(false);
    }
  };

  if (loading) return <p>Loading event details...</p>;
  if (error) return <p>{error}</p>;

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white shadow-md rounded-md">
      <h2 className="text-2xl font-semibold mb-4">Edit Event</h2>
      <form onSubmit={handleUpdate} className="space-y-4">
        <div>
          <label htmlFor="event-name" className="block text-sm font-medium">Event Name</label>
          <input
            id="event-name"
            type="text"
            name="name"
            value={eventData.name}
            onChange={handleChange}
            className="w-full p-2 border rounded-md"
            placeholder="Enter event name"
            aria-label="Event Name"
            required
          />
        </div>

        <div>
          <label htmlFor="event-organiser" className="block text-sm font-medium">Organiser</label>
          <input
            id="event-organiser"
            type="text"
            name="organiser"
            value={eventData.organiser}
            onChange={handleChange}
            className="w-full p-2 border rounded-md"
            placeholder="Enter organiser name"
            aria-label="Organiser"
            required
          />
        </div>

        <div>
          <label htmlFor="event-category" className="block text-sm font-medium">Category</label>
          <input
            id="event-category"
            type="text"
            name="category"
            value={eventData.category}
            onChange={handleChange}
            className="w-full p-2 border rounded-md"
            placeholder="Enter event category"
            aria-label="Category"
            required
          />
        </div>

        <div>
          <label htmlFor="event-venue" className="block text-sm font-medium">Venue</label>
          <input
            id="event-venue"
            type="text"
            name="venue"
            value={eventData.venue}
            onChange={handleChange}
            className="w-full p-2 border rounded-md"
            placeholder="Enter event venue"
            aria-label="Venue"
            required
          />
        </div>

        <div>
          <label htmlFor="event-date" className="block text-sm font-medium">Event Date</label>
          <input
            id="event-date"
            type="date"
            name="event_Date"
            value={eventData.event_Date}
            onChange={handleChange}
            className="w-full p-2 border rounded-md"
            aria-label="Event Date"
            required
          />
        </div>

        <div>
          <label htmlFor="event-poster" className="block text-sm font-medium">Poster URL</label>
          <input
            id="event-poster"
            type="text"
            name="poster"
            value={eventData.poster}
            onChange={handleChange}
            className="w-full p-2 border rounded-md"
            placeholder="Enter poster image URL"
            aria-label="Poster URL"
            required
          />
        </div>

        {/* New Logo Upload Field */}
        <div>
          <label htmlFor="event-logo" className="block text-sm font-medium">Event Logo</label>
          <div className="flex items-start space-x-4">
            <div className="flex-1">
              <input
                id="event-logo"
                type="file"
                accept="image/*"
                onChange={handleLogoChange}
                className="w-full p-2 border rounded-md"
                aria-label="Event Logo"
              />
              <p className="text-sm text-gray-500 mt-1">Upload your event or organization logo</p>
            </div>
            
            {/* Logo Preview */}
            {logoPreview && (
              <div className="w-24 h-24 border rounded-md overflow-hidden flex items-center justify-center bg-gray-100">
                <img 
                  src={logoPreview} 
                  alt="Logo preview" 
                  className="max-w-full max-h-full object-contain" 
                />
              </div>
            )}
          </div>
        </div>

        <button 
          type="submit" 
          disabled={uploading}
          className="w-full bg-blue-500 text-white py-2 rounded-md text-lg font-medium disabled:bg-blue-300"
        >
          {uploading ? 'Updating...' : 'Update Event'}
        </button>
      </form>
    </div>
  );
};

export default OrganiserEditEvent;