import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getFirestore, doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { getAuth, onAuthStateChanged } from 'firebase/auth'; // Import for authentication

const db = getFirestore();
const auth = getAuth(); // Initialize Firebase Auth

const EventDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();  // Get the document ID from the URL
  const [eventData, setEventData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [registerMessage, setRegisterMessage] = useState<string | null>(null);  // To show success or error message

  // Fetch user email if logged in
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user && user.email) {
        setUserEmail(user.email);
      }
    });
    return () => unsubscribe();
  }, []);

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

  const handleRegister = async () => {
    if (!userEmail) {
      setRegisterMessage('You must be logged in to register.');
      return;
    }

    try {
      // @ts-ignore
      const docRef = doc(db, 'event', id);
      await updateDoc(docRef, {
        Participants: arrayUnion(userEmail),  // Add the user's email to the 'Participants' array
      });
      setRegisterMessage('Successfully registered!');
    } catch (error) {
      console.error('Error registering for event:', error);
      setRegisterMessage('Failed to register. Please try again later.');
    }
  };

  if (loading) {
    return <p className="text-center text-gray-600">Loading event details...</p>;
  }

  if (error) {
    return <p className="text-center text-red-600">{error}</p>;
  }

  return (
    <div className="p-4 flex justify-center items-center bg-white">
      {eventData ? (
        <div className="bg-white max-w-md w-full p-6 rounded-lg">
          {/* Header */}
          <h1 className="text-3xl font-semibold text-black mb-2 text-center">{eventData.Organiser}</h1>

          {/* Event Image */}
          <div className="w-full h-70 rounded-lg overflow-hidden mb-4">
            <img 
              src={eventData.Poster} 
              alt={eventData.Name} 
              className="object-cover w-full h-full" 
            />
          </div>

          {/* Event Title and Status */}
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-2xl font-semibold">{eventData.Name}</h2>
          </div>

          {/* Date, Time, and Venue */}
          <p className="text-[#246d8c] font-medium mb-4"><strong>Date:</strong> {eventData.Event_date}</p>
          <p className="text-[#246d8c] font-medium mb-4"><strong>Venue:</strong> {eventData.Venue}</p>
          <p className="text-[#246d8c] font-medium mb-4"><strong>Time:</strong> {eventData.Event_time}</p>
          <p className="text-[#246d8c] font-medium mb-4"><strong>Participants:</strong> {eventData.Num_of_participants}</p>

          {/* Description */}
          <p className="text-[#246d8c] font-medium mb-4"><strong>Description:</strong> </p>
          <p className="text-gray-700 leading-relaxed mb-4">{eventData.Description}</p>

          {/* Coordinators */}
          <h3 className="text-xl font-medium mb-2">Coordinators</h3>
          <div className="flex flex-col gap-2">
            <p className="text-gray-700"><strong>Coordinator 1:</strong> {eventData.Coordinator1[0]} - {eventData.Coordinator1[1]}</p>
            <p className="text-gray-700"><strong>Coordinator 2:</strong> {eventData.Coordinator2[0]} - {eventData.Coordinator2[1]}</p>
          </div>

          <br/>

          {/* Register Button */}
          <button
            className="w-full bg-[#246d8c] text-white py-3 rounded-md text-lg font-medium mb-4"
            onClick={handleRegister}
          >
            Register
          </button>

          {/* Display registration message */}
          {registerMessage && <p className="text-center text-green-600">{registerMessage}</p>}
        </div>
      ) : (
        <p>No event details available</p>
      )}
    </div>
  );
};

export default EventDetails;
