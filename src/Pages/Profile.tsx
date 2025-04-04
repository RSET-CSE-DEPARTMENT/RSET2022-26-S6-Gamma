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
    navigate("/HomePage/Profile/EditProfile");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#246d8c]">
        <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#e9f7f1] flex items-start md:items-center justify-center p-4 lg:pl-16 xl:pl-64">
      <div className="w-full max-w-4xl bg-white rounded-xl shadow-lg md:shadow-2xl overflow-hidden lg:ml-4 xl:ml-8">
        {/* Profile Header */}
        <div className="bg-[#246d8c] p-4 md:p-6 text-white text-center">
          <h1 className="text-xl sm:text-2xl font-bold">{userProfile.name}</h1>
          <p className="text-blue-100 text-sm sm:text-base mt-1">{userProfile.email}</p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 p-4 bg-blue-50">
          <button
            onClick={handleEditProfile}
            className="px-4 py-2 bg-[#246d8c] text-white rounded-lg flex items-center justify-center space-x-2 hover:bg-[#1a4f63] transition-all"
          >
            <FontAwesomeIcon icon={faEdit} className="text-white" />
            <span>Edit Profile</span>
          </button>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-500 text-white rounded-lg flex items-center justify-center space-x-2 hover:bg-red-600 transition-all"
          >
            <FontAwesomeIcon icon={faSignOutAlt} className="text-white" />
            <span>Logout</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-200">
          {/* Personal Information */}
          <div className="p-4 sm:p-6">
            <div className="space-y-3 sm:space-y-4">
              <h3 className="text-lg font-semibold text-gray-700 mb-3 sm:mb-4 pb-2 border-b border-gray-200">
                Personal Information
              </h3>
              <div className="space-y-3 sm:space-y-4">
                <ProfileItem icon={faUser} label="Full Name" value={userProfile.name} />
                <ProfileItem icon={faIdBadge} label="UID" value={userProfile.uid} />
                <ProfileItem icon={faEnvelope} label="Email" value={userProfile.email} />
                <ProfileItem icon={faPhone} label="Phone" value={userProfile.phoneNumber} />
                <ProfileItem icon={faUser} label="Gender" value={userProfile.gender} />
              </div>
            </div>
          </div>

          {/* Academic Information */}
          <div className="p-4 sm:p-6">
            <div className="space-y-3 sm:space-y-4">
              <h3 className="text-lg font-semibold text-gray-700 mb-3 sm:mb-4 pb-2 border-b border-gray-200">
                Academic Information
              </h3>
              <div className="space-y-3 sm:space-y-4">
                <ProfileItem icon={faCalendar} label="Batch" value={userProfile.batch} />
                <ProfileItem icon={faUserGraduate} label="Year" value={userProfile.year} />
                <ProfileItem icon={faBook} label="Branch" value={userProfile.branch} />
                <ProfileItem icon={faMapPin} label="Division" value={userProfile.division} />
              </div>
            </div>
          </div>
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
  <div className="flex items-start">
    <div className="bg-blue-100 p-2 rounded-lg mr-3 sm:mr-4 text-[#246d8c]">
      <FontAwesomeIcon icon={icon} className="w-3 h-3 sm:w-4 sm:h-4" />
    </div>
    <div>
      <p className="text-xs sm:text-sm font-medium text-gray-500">{label}</p>
      <p className="text-gray-800 font-medium text-sm sm:text-base">
        {value || <span className="text-gray-400">Not provided</span>}
      </p>
    </div>
  </div>
);

export default Profile;