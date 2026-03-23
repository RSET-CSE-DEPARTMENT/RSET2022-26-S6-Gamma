import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, setDoc } from 'firebase/firestore';
// @ts-ignore
import { auth, db } from '../firebaseConfig'; // Ensure this is correctly configured

const ProfileCompletion: React.FC = () => {
  const [batch, setBatch] = useState<string>('');  // Initialize batch as string
  const [branch, setBranch] = useState<string>(''); // Initialize branch as string
  const [division, setDivision] = useState<string>(''); // Initialize division as string
  const [gender, setGender] = useState<string>(''); // Initialize gender as string
  const [phoneNumber, setPhoneNumber] = useState<string>(''); // Initialize phone number as string
  const [universityID, setUniversityID] = useState<string>(''); // University ID field
  const [year, setYear] = useState<number | string>(1); // Initialize year as number | string
  const [name, setName] = useState<string>(''); // Initialize name as string
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false); // Track submission state

  const navigate = useNavigate();

  // Auto-fetch name from Google Auth
  useEffect(() => {
    const user = auth.currentUser;
    if (user) {
      setName(user.displayName || ''); // Set the user's display name from Google Auth
    } else {
      console.log('No user signed in');
    }
  }, []);

  const handleContinue = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true); // Prevent multiple submissions

    // Validate fields (including University ID)
    if (!batch || !branch || !division || !gender || !name || !phoneNumber || !universityID || !year) {
      alert('Please fill all the fields.');
      setIsSubmitting(false);
      return;
    }

    // Get current user's UID
    const user = auth.currentUser;
    if (!user) {
      alert('No user is signed in!');
      setIsSubmitting(false);
      return;
    }

    // Firestore: Save user profile data to the 'users' collection
    try {
      await setDoc(doc(db, 'users', user.uid), {
        batch,
        branch,
        division,
        gender,
        name: name || user.displayName || '',
        phoneNumber,
        uid: universityID, // Store the university ID in the uid field
        year,
        email: user.email, // Use email from Firebase Auth
        profileCompleted: true, // Add this flag to easily check profile completion
        firebaseUID: user.uid // Store Firebase UID separately for reference
      });
      console.log('Profile data saved successfully!');

      // Redirect to homepage after successful submission
      navigate('/HomePage');
    } catch (error) {
      console.error('Error saving profile data: ', error);
      alert('There was an error saving your profile. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="h-[100vh] bg-gradient-to-br from-[#f6fcf7] to-[#f6fcf7] flex flex-col justify-center items-center">
      <form
        className="flex flex-col items-center gap-6 bg-white p-8 rounded-lg shadow-lg w-[90%] max-w-md"
        onSubmit={handleContinue}
      >
        <h2 className="text-2xl font-semibold text-center text-[#246d8c]">Complete your profile</h2>

        <input
          type="text"
          placeholder="Phone number"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          className="w-[380px] h-12 px-4 py-[13px] rounded-md border text-base font-normal"
        />

        <Dropdown
          label="Batch"
          options={['2025', '2026', '2027', '2028', '2029', '2030']}
          value={batch}
          // @ts-ignore
          setValue={setBatch}
        />
        <Dropdown
          label="Branch"
          options={['CSE', 'ECE', 'EEE', 'Mech', 'Civil', 'AEI', 'AIDS', 'IT', 'CU']}
          value={branch}
          // @ts-ignore
          setValue={setBranch}
        />
        <Dropdown
          label="Division"
          options={['A', 'B', 'C', 'D', 'None']}
          value={division}
          // @ts-ignore
          setValue={setDivision}
        />
        <Dropdown
          label="Year"
          options={[1, 2, 3, 4]}
          value={year}
          setValue={setYear}
        />
        <Dropdown
          label="Gender"
          options={['Male', 'Female', 'Rather not say']}
          value={gender}
          // @ts-ignore
          setValue={setGender}
        />

        <input
          type="text"
          placeholder="University ID"
          value={universityID}
          onChange={(e) => setUniversityID(e.target.value)}
          className="w-[380px] h-12 px-4 py-[13px] rounded-md border text-base font-normal"
        />

        <button
          type="submit"
          className="w-full py-3 bg-[#246d8c] text-white rounded-md text-lg font-medium hover:bg-[#1d5b73] transition-all"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Submitting...' : 'Continue'}
        </button>
      </form>
    </div>
  );
};

// Dropdown Component
type DropdownProps = {
  label: string;
  options: (string | number)[];  // Options can be either string or number
  value: string | number;        // The value can also be string or number
  setValue: React.Dispatch<React.SetStateAction<string | number>>;  // setValue should handle both types
};

const Dropdown: React.FC<DropdownProps> = ({ label, options, value, setValue }) => (
  <div className="w-full">
    <label
      htmlFor={label}
      className="block text-sm font-medium text-gray-700 mb-1"
    >
      {label}
    </label>
    <select
      id={label}
      value={value}
      onChange={(e) => {
        // If the label is 'Year', convert the value to a number
        if (label === 'Year') {
          setValue(Number(e.target.value)); // Ensure it's treated as a number for 'Year'
        } else {
          setValue(e.target.value); // Otherwise, treat the value as a string
        }
      }}
      className="w-full h-12 px-3 border rounded-md border-gray-300 bg-white text-[#111112]/60 focus:outline-none focus:border-[#246d8c]"
    >
      <option value="" disabled>Select {label}</option>
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  </div>
);

export default ProfileCompletion;