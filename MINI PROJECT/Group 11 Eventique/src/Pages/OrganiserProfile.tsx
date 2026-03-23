import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getAuth, signOut } from "firebase/auth";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUser, faLock, faSignOutAlt } from "@fortawesome/free-solid-svg-icons";

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
          // @ts-ignore
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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto bg-white p-8 shadow-lg rounded-2xl mt-10 transition-all duration-300 hover:shadow-xl">
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-800">Organiser Profile</h2>
        <p className="text-gray-600 mt-2">View your account details</p>
      </div>

      {/* Profile Card */}
      <div className="bg-gray-50 p-6 rounded-xl mb-8">
        {/* Profile Picture Placeholder */}
        <div className="flex justify-center mb-6">
          <div className="w-24 h-24 rounded-full bg-indigo-100 flex items-center justify-center">
            <span className="text-3xl text-indigo-600 font-bold">
              {organiserProfile.name.charAt(0).toUpperCase()}
            </span>
          </div>
        </div>

        {/* Profile Details */}
        <div className="space-y-6">
          <ProfileItem 
            icon={faUser} 
            label="Name" 
            value={organiserProfile.name || "Not provided"} 
          />
          
          <ProfileItem 
            icon={faLock} 
            label="Password" 
            value={organiserProfile.password || "Not set"} 
          />
        </div>
      </div>

      {/* Action Button */}
      <div className="flex justify-center">
        <button
          onClick={handleLogout}
          className="w-full sm:w-1/2 bg-red-500 text-white py-3 px-6 rounded-lg flex items-center justify-center gap-2 hover:bg-red-600 transition-all"
          aria-label="Log out"
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