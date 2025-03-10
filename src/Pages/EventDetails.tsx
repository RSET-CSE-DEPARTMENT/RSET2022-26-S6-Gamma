import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getFirestore, doc, getDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { getAuth, onAuthStateChanged } from 'firebase/auth';

const db = getFirestore();
const auth = getAuth();

const EventDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [eventData, setEventData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [registerMessage, setRegisterMessage] = useState<string | null>(null);
  const [isRegistered, setIsRegistered] = useState<boolean>(false); // Track registration status

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
      console.log('Fetching event details for ID:', id);

      const fetchEventDetails = async () => {
        try {
          const docRef = doc(db, 'event', id);
          const docSnap = await getDoc(docRef);

          if (docSnap.exists()) {
            const data = docSnap.data();
            setEventData(data);

            // Check if user is already registered
            if (userEmail && data.Participants?.includes(userEmail)) {
              setIsRegistered(true);
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
    } else {
      setError('Event ID is missing.');
      setLoading(false);
    }
  }, [id, userEmail]);

  const handleRegister = async () => {
    if (!userEmail) {
      setRegisterMessage('You must be logged in to register.');
      return;
    }

    try {
      // @ts-ignore
      const docRef = doc(db, 'event', id);
      await updateDoc(docRef, {
        Participants: arrayUnion(userEmail),
      });
      setRegisterMessage('Successfully registered!');
      setIsRegistered(true);
    } catch (error) {
      console.error('Error registering for event:', error);
      setRegisterMessage('Failed to register. Please try again later.');
    }
  };

  const handleUnregister = async () => {
    if (!userEmail) return;

    try {
      // @ts-ignore
      const docRef = doc(db, 'event', id);
      await updateDoc(docRef, {
        Participants: arrayRemove(userEmail),
      });
      setRegisterMessage('Successfully unregistered.');
      setIsRegistered(false);
    } catch (error) {
      console.error('Error unregistering:', error);
      setRegisterMessage('Failed to unregister. Please try again later.');
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
          <h1 className="text-3xl font-semibold text-black mb-2 text-center">{eventData.organiser}</h1>

          <div className="w-full h-70 rounded-lg overflow-hidden mb-4">
            <img 
              src={eventData.poster} 
              alt={eventData.name} 
              className="object-cover w-full h-full" 
            />
          </div>

          <h2 className="text-2xl font-semibold">{eventData.name}</h2>

          <p className="text-[#246d8c] font-medium mb-4"><strong>Date:</strong> {eventData.event_date}</p>
          <p className="text-[#246d8c] font-medium mb-4"><strong>Venue:</strong> {eventData.venue}</p>
          <p className="text-[#246d8c] font-medium mb-4"><strong>Time:</strong> {eventData.event_time}</p>
          <p className="text-[#246d8c] font-medium mb-4"><strong>Participants:</strong> {eventData.num_of_participants}</p>

          <p className="text-[#246d8c] font-medium mb-4"><strong>Description:</strong> </p>
          <p className="text-gray-700 leading-relaxed mb-4">{eventData.description}</p>

          <h3 className="text-xl font-medium mb-2">Coordinators</h3>
          <div className="flex flex-col gap-2">
            <p className="text-gray-700">
              <strong>Coordinator 1:</strong> {eventData.coordinator1 ? `${eventData.coordinator1.name} - ${eventData.coordinator1.phone}` : 'N/A'}
            </p>
            <p className="text-gray-700">
              <strong>Coordinator 2:</strong> {eventData.coordinator2 ? `${eventData.coordinator2.name} - ${eventData.coordinator2.phone}` : 'N/A'}
            </p>
          </div>

          <br/>

          {/* Register/Unregister Buttons */}
          {!isRegistered ? (
            <button
              className="w-full bg-[#246d8c] text-white py-3 rounded-md text-lg font-medium mb-4"
              onClick={handleRegister}
            >
              Register
            </button>
          ) : (
            <button
              className="w-full bg-red-500 text-white py-3 rounded-md text-lg font-medium mb-4"
              onClick={handleUnregister}
            >
              Unregister
            </button>
          )}

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
