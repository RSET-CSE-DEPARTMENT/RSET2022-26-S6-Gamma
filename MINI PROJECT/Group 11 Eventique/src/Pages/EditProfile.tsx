import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getAuth } from "firebase/auth";
import { getFirestore, doc, getDoc, updateDoc } from "firebase/firestore";

const firestore = getFirestore();

const EditProfile: React.FC = () => {
  const [userProfile, setUserProfile] = useState({
    name: "",
    phoneNumber: "",
    batch: "",
    branch: "",
    division: "",
    gender: "",
    year: "",
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
            // @ts-ignore
            setUserProfile(userDoc.data());
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setUserProfile({ ...userProfile, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (user) {
        const uid = user.uid;
        const userDocRef = doc(firestore, "users", uid);
        await updateDoc(userDocRef, userProfile);
        alert("Profile updated successfully!");
        navigate("/HomePage/Profile"); // Redirect back to profile page
      }
    } catch (error) {
      console.error("Error updating profile: ", error);
      alert("Failed to update profile.");
    }
  };

  if (loading) {
    return <p className="text-center text-gray-600">Loading profile...</p>;
  }

  return (
    <div className="min-h-screen bg-[#F6FCF7] flex justify-center items-center">
      <div className="max-w-2xl w-full bg-[#F6FCF7] p-6  rounded-lg">
        <h2 className="text-2xl font-bold mb-4 text-center">Edit Profile</h2>
        <div className="grid grid-cols-1 gap-4">
          <InputField label="Name" name="name" value={userProfile.name} onChange={handleChange} />
          <InputField label="Phone Number" name="phoneNumber" value={userProfile.phoneNumber} onChange={handleChange} />
          <InputField label="Batch" name="batch" value={userProfile.batch} onChange={handleChange} />
          <InputField label="Branch" name="branch" value={userProfile.branch} onChange={handleChange} />
          <InputField label="Division" name="division" value={userProfile.division} onChange={handleChange} />
  
          <div>
            <label className="block font-semibold text-gray-700">Gender</label>
            <select
              name="gender"
              value={userProfile.gender}
              onChange={handleChange}
              className="w-full border-gray-300 rounded-md border p-2 mt-1"
            >
              <option value="">Select Gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>
  
          <InputField label="Year" name="year" value={userProfile.year} onChange={handleChange} />
        </div>
  
        <div className="flex justify-center mt-6">
          <button
            onClick={handleSave}
            className="bg-[#246D8C] text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-all"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );  
};

interface InputFieldProps {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const InputField: React.FC<InputFieldProps> = ({ label, name, value, onChange }) => (
  <div>
    <label className="block font-semibold text-gray-700">{label}</label>
    <input
      type="text"
      name={name}
      value={value}
      onChange={onChange}
      className="w-full border-gray-300 rounded-md border p-2 mt-1"
    />
  </div>
);

export default EditProfile;
