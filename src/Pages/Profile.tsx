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
  faSignOutAlt,
  faEdit,
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
  const navigate = useNavigate();

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
    if (window.confirm("Are you sure you want to log out?")) {
      try {
        await signOut(auth);
        navigate("/");
      } catch (error) {
        console.error("Error during logout: ", error);
      }
    }
  };

  const handleEditProfile = () => {
    navigate("/HomePage/Profile/EditProfile"); // Navigate to edit profile page
  };

  if (loading) {
    return <p className="text-center text-gray-600">Loading profile...</p>;
  }

  return (
    <div className="min-h-screen bg-[#F6FCF7] flex flex-col items-center py-8 overflow-auto">
      <div className="max-w-2xl w-full bg-white p-6 shadow-xl rounded-xl transition-all duration-300 hover:shadow-2xl overflow-auto">
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
  
        {/* Buttons - Ensuring logout is visible */}
        <div className="flex flex-col md:flex-row gap-4 mt-6 pb-10">
          <button
            onClick={handleEditProfile}
            className="w-full md:w-1/2 bg-[#246D8C] text-white py-2 px-4 rounded-lg flex items-center justify-center gap-2 hover:bg-[#2B8D9C] transition-all"
          >
            <FontAwesomeIcon icon={faEdit} />
            Edit Profile
          </button>
          <button
            onClick={handleLogout}
            className="w-full md:w-1/2 bg-red-500 text-white py-2 px-4 rounded-lg flex items-center justify-center gap-2 hover:bg-red-600 transition-all"
          >
            <FontAwesomeIcon icon={faSignOutAlt} />
            Log out
          </button>
        </div>
      </div>
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
