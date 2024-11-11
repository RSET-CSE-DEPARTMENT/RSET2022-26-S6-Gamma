import React, { useState, useEffect } from "react";
import { getAuth } from "firebase/auth";
import { getFirestore, doc, getDoc } from "firebase/firestore";

// Initialize Firestore
const firestore = getFirestore();

const Profile: React.FC = () => {
  const [userProfile, setUserProfile] = useState({
    batch: "",
    branch: "",
    division: "",
    gender: "",
    name: "",
    phoneNumber: 0,
    uid: "",
    year: 0,
    email: "",
  });
  const [loading, setLoading] = useState(true);

  // Fetch authenticated user's profile data from Firestore
  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        const auth = getAuth();
        const user = auth.currentUser;

        if (user) {
          const uid = user.uid;
          const userDocRef = doc(firestore, "users", uid);
          const userDoc = await getDoc(userDocRef);

          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUserProfile({
              batch: userData.batch || "",
              branch: userData.branch || "",
              division: userData.division || "",
              gender: userData.gender || "",
              name: userData.name || "",
              phoneNumber: userData.phoneNumber || 0,
              uid: userData.uid || "",
              year: userData.year || 0,
              email: user.email || "",
            });
          }
        }
      } catch (error) {
        console.error("Error fetching profile data: ", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfileData();
  }, []);

  if (loading) {
    return <p className="text-center text-gray-600">Loading profile...</p>;
  }

  return (
    <div className="max-w-2xl mx-auto bg-white p-6 shadow-lg rounded-lg mt-10">
      <h2 className="text-2xl font-semibold mb-4 text-gray-800 text-center">User Profile</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <p className="text-lg"><strong className="font-medium text-gray-700">Batch:</strong> {userProfile.batch}</p>
        <p className="text-lg"><strong className="font-medium text-gray-700">Branch:</strong> {userProfile.branch}</p>
        <p className="text-lg"><strong className="font-medium text-gray-700">Division:</strong> {userProfile.division}</p>
        <p className="text-lg"><strong className="font-medium text-gray-700">Gender:</strong> {userProfile.gender}</p>
        <p className="text-lg"><strong className="font-medium text-gray-700">Name:</strong> {userProfile.name}</p>
        <p className="text-lg"><strong className="font-medium text-gray-700">Phone Number:</strong> {userProfile.phoneNumber}</p>
        <p className="text-lg"><strong className="font-medium text-gray-700">UID:</strong> {userProfile.uid}</p>
        <p className="text-lg"><strong className="font-medium text-gray-700">Year:</strong> {userProfile.year}</p>
        <p className="text-lg"><strong className="font-medium text-gray-700">Email:</strong> {userProfile.email}</p>
      </div>
    </div>
  );
};

export default Profile;
