import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getAuth, signOut } from "firebase/auth";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faUser,
  faEnvelope,
  faPhone,
  faIdBadge,
  faCalendar,
  faBook,
  faUserGraduate,
  faMapPin,
} from "@fortawesome/free-solid-svg-icons";

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
  const navigate = useNavigate(); // For navigation

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

  const handleLogout = async () => {
    const auth = getAuth();
    try {
      await signOut(auth); // Sign out the user
      navigate("/"); // Redirect to login page
    } catch (error) {
      console.error("Error during logout: ", error);
    }
  };

  if (loading) {
    return <p className="text-center text-gray-600">Loading profile...</p>;
  }

  return (
    <div className="max-w-2xl mx-auto bg-white p-8 shadow-xl rounded-xl mt-10 transition-all duration-300 hover:shadow-2xl">
      <h2 className="text-3xl font-bold mb-6 text-gray-900 text-center">User Profile</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ProfileItem icon={faUser} label="Name" value={userProfile.name} />
        <ProfileItem icon={faEnvelope} label="Email" value={userProfile.email} />
        <ProfileItem icon={faPhone} label="Phone Number" value={userProfile.phoneNumber} />
        <ProfileItem icon={faIdBadge} label="UID" value={userProfile.uid} />
        <ProfileItem icon={faCalendar} label="Batch" value={userProfile.batch} />
        <ProfileItem icon={faUserGraduate} label="Year" value={userProfile.year} />
        <ProfileItem icon={faBook} label="Branch" value={userProfile.branch} />
        <ProfileItem icon={faMapPin} label="Division" value={userProfile.division} />
        <ProfileItem icon={faUser} label="Gender" value={userProfile.gender} />
      </div>
      <button
        onClick={handleLogout}
        className="mt-6 w-full bg-indigo-500 text-white py-2 px-4 rounded-lg hover:bg-indigo-600 transition-all"
      >
        Log out
      </button>
    </div>
  );
};

interface ProfileItemProps {
  icon: any;
  label: string;
  value: string | number;
}

const ProfileItem: React.FC<ProfileItemProps> = ({ icon, label, value }) => (
  <div className="flex items-center text-lg text-gray-700">
    <FontAwesomeIcon icon={icon} className="text-indigo-500 mr-4 w-6 h-6" />
    <div>
      <p className="font-semibold">{label}:</p>
      <p className="text-gray-800">{value}</p>
    </div>
  </div>
);

export default Profile;
