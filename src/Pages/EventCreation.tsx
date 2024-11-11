import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
// @ts-ignore
import { db, collection, addDoc, auth, storage } from '../firebaseConfig'; // Import storage
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getDoc, doc, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'; // Import Firebase Storage functions

const CreateEvent: React.FC = () => {
  const navigate = useNavigate();
  const auth = getAuth();
  const [organizerName, setOrganizerName] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [file, setFile] = useState<File | null>(null);

  const [eventData, setEventData] = useState({
    category: '',
    coordinator1: { name: '', phone: '' },
    coordinator2: { name: '', phone: '' },
    date: '',
    description: '',
    duration: '',
    event_date: '',
    event_time: '',
    name: '',
    num_of_participants: 0,
    organiser: '',
    participants: [''],
    poster: null, // Set poster as null initially
    venue: '',
  });

  useEffect(() => {
    const fetchOrganizerName = async () => {
      const user = auth.currentUser;

      if (user) {
        // @ts-ignore
        const docRef = doc(db, 'organizers', user.email);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setOrganizerName(data.name || 'Default Organizer Name');
        } else {
          setOrganizerName('Default Organizer Name');
        }
      } else {
        setOrganizerName('Guest');
      }
      setLoading(false);
    };

    fetchOrganizerName();
  }, [auth]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setEventData((prevData) => ({
          ...prevData,
          organiser: user.displayName || user.email || 'Unknown Organizer',
        }));
      }
    });

    return () => unsubscribe();
  }, [auth]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEventData({ ...eventData, [name]: value });
  };

  const handleCoordinatorChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const { name, value } = e.target;
    const key = `coordinator${index + 1}`;
    setEventData({
      ...eventData,
      // @ts-ignore
      [key]: { ...eventData[key as keyof typeof eventData], [name]: value },
    });
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setFile(event.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    

    setLoading(true);

    try {
      // Step 1: Upload the poster to Firebase Storage
      // @ts-ignore
      const posterRef = ref(storage, `eventPosters/${file.name}`);
      // @ts-ignore
      const snapshot = await uploadBytes(posterRef, file);
      const posterURL = await getDownloadURL(snapshot.ref); // Step 2: Get the download URL

      // Step 3: Save the event data, including the poster URL, to Firestore
      await addDoc(collection(db, 'event'), {
        ...eventData,
        date: Timestamp.fromDate(new Date(eventData.event_date + 'T' + eventData.event_time)),
        poster: posterURL, // Save the poster URL in Firestore
      });

      alert('Event created successfully!');
      navigate('/OrganiserHomePage/EventCreateSuccess');
    } catch (error) {
      console.error('Error adding event: ', error);
      alert('An error occurred while creating the event.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-[#f6fcf7] flex flex-col items-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-between mb-8">
          <div className="text-xl font-medium text-black">Create Event</div>
          <div className="w-8 h-8 bg-gray-300 rounded-full"></div>
        </div>

        <div className="w-full h-36 mb-4 bg-[#d9d9d9] rounded-md opacity-80 flex flex-col justify-center items-center">
          <div className="text-2xl text-black">+</div>
          <div className="text-base text-black">Add event poster</div>
          <input type="file" onChange={handleFileChange} />
        </div>

        <div className="text-xl font-medium text-black mb-2">Event Details</div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            name="category"
            placeholder="Category"
            value={eventData.category}
            onChange={handleInputChange}
            className="w-full h-12 px-4 bg-white border border-gray-200 rounded-md placeholder-gray-500"
          />
          <input
            type="text"
            name="name"
            placeholder="Event Name"
            value={eventData.name}
            onChange={handleInputChange}
            className="w-full h-12 px-4 bg-white border border-gray-200 rounded-md placeholder-gray-500"
          />
          <input
            type="text"
            name="organiser"
            placeholder="Organizer"
            value={loading ? 'Loading...' : organizerName}
            className="w-full h-12 px-4 bg-white border border-gray-200 rounded-md placeholder-gray-500"
            disabled
          />
          <input
            type="text"
            name="venue"
            placeholder="Venue"
            value={eventData.venue}
            onChange={handleInputChange}
            className="w-full h-12 px-4 bg-white border border-gray-200 rounded-md placeholder-gray-500"
          />
          <textarea
            name="description"
            placeholder="Description"
            value={eventData.description}
            onChange={handleInputChange}
            className="w-full h-24 px-4 bg-white border border-gray-200 rounded-md placeholder-gray-500"
          />
          <input
            type="date"
            name="event_date"
            placeholder="Event Date"
            value={eventData.event_date}
            onChange={handleInputChange}
            className="w-full h-12 px-4 bg-white border border-gray-200 rounded-md placeholder-gray-500"
          />
          <input
            type="time"
            name="event_time"
            placeholder="Event Time"
            value={eventData.event_time}
            onChange={handleInputChange}
            className="w-full h-12 px-4 bg-white border border-gray-200 rounded-md placeholder-gray-500"
          />
          <input
            type="text"
            name="duration"
            placeholder="Duration"
            value={eventData.duration}
            onChange={handleInputChange}
            className="w-full h-12 px-4 bg-white border border-gray-200 rounded-md placeholder-gray-500"
          />
          <input
            type="number"
            name="num_of_participants"
            placeholder="Number of Participants"
            value={eventData.num_of_participants}
            onChange={handleInputChange}
            className="w-full h-12 px-4 bg-white border border-gray-200 rounded-md placeholder-gray-500"
          />

          <div>
            <div className="text-lg font-medium text-black">Coordinator 1</div>
            <input
              type="text"
              name="name"
              placeholder="Coordinator 1 Name"
              value={eventData.coordinator1.name}
              onChange={(e) => handleCoordinatorChange(e, 0)}
              className="w-full h-12 px-4 bg-white border border-gray-200 rounded-md placeholder-gray-500"
            />
            <input
              type="tel"
              name="phone"
              placeholder="Coordinator 1 Phone"
              value={eventData.coordinator1.phone}
              onChange={(e) => handleCoordinatorChange(e, 0)}
              className="w-full h-12 px-4 bg-white border border-gray-200 rounded-md placeholder-gray-500"
            />
          </div>

          <div>
            <div className="text-lg font-medium text-black">Coordinator 2</div>
            <input
              type="text"
              name="name"
              placeholder="Coordinator 2 Name"
              value={eventData.coordinator2.name}
              onChange={(e) => handleCoordinatorChange(e, 1)}
              className="w-full h-12 px-4 bg-white border border-gray-200 rounded-md placeholder-gray-500"
            />
            <input
              type="tel"
              name="phone"
              placeholder="Coordinator 2 Phone"
              value={eventData.coordinator2.phone}
              onChange={(e) => handleCoordinatorChange(e, 1)}
              className="w-full h-12 px-4 bg-white border border-gray-200 rounded-md placeholder-gray-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-500 text-white rounded-md"
          >
            {loading ? 'Submitting...' : 'Create Event'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateEvent;
