import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getAuth, signOut } from "firebase/auth";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUser, faLock, faSignOutAlt, faEdit } from "@fortawesome/free-solid-svg-icons";

// Initialize Firestore
const firestore = getFirestore();

const OrganiserProfile: React.FC = () => {
  const [organiserProfile, setOrganiserProfile] = useState({
    name: "",
    password: "",
  });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  
  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        const auth = getAuth();
        const user = auth.currentUser;
  
        if (user) {
          const email = user.email; // Fetch organizer's email
          const organiserDocRef = doc(firestore, "organizers", email); // Use email as document ID
          const organiserDoc = await getDoc(organiserDocRef);
  
          if (organiserDoc.exists()) {
            const organiserData = organiserDoc.data();
            setOrganiserProfile({
              name: organiserData.name || "",
              password: organiserData.password || "",
            });
          } else {
            console.log("No such organiser profile found!");
          }
        }
      } catch (error) {
        console.error("Error fetching organiser profile data: ", error);
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
    navigate("/HomePage/OrganiserProfile/EditProfile"); // Navigate to edit profile page
  };

  if (loading) {
    return <p className="text-center text-gray-600">Loading profile...</p>;
  }

  return (
    <div className="max-w-xl mx-auto bg-white p-6 shadow-xl rounded-xl mt-10 transition-all duration-300 hover:shadow-2xl">
      <h2 className="text-3xl font-bold mb-6 text-gray-900 text-center">Organiser Profile</h2>
      <div className="grid grid-cols-1 gap-6">
        <ProfileItem icon={faUser} label="Name" value={organiserProfile.name} />
        <ProfileItem icon={faLock} label="Password" value={organiserProfile.password} />
      </div>

      {/* Buttons */}
      <div className="flex flex-col md:flex-row gap-4 mt-6">
        <button
          onClick={handleEditProfile}
          className="w-full md:w-1/2 bg-blue-500 text-white py-2 px-4 rounded-lg flex items-center justify-center gap-2 hover:bg-blue-600 transition-all"
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
  );
};

interface ProfileItemProps {
  icon: any;
  label: string;
  value: string;
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

export default OrganiserProfile;
