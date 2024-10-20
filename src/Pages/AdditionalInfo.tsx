import { useState } from 'react';
import { useNavigate } from 'react-router-dom'; // Navigation for redirection

const ProfileCompletion: React.FC = () => {
  const [batch, setBatch] = useState('');
  const [branch, setBranch] = useState('');
  const [gender, setGender] = useState('');
  const navigate = useNavigate(); // Initialize useNavigate for navigation

  const handleContinue = (e: React.FormEvent) => {
    e.preventDefault();
    console.log({ batch, branch, gender });

    if (!batch || !branch || !gender) {
      alert("Please fill all the fields.");
      return;
    }

    // Perform validation or other logic here
    navigate('/HomePage'); // Example navigation on form submission
  };

  return (
    <div className="h-[100vh] bg-gradient-to-br from-[#f6fcf7] to-[#f6fcf7] flex flex-col justify-center items-center">
      <form 
        className="flex flex-col items-center gap-6 bg-white p-8 rounded-lg shadow-lg w-[90%] max-w-md" 
        onSubmit={handleContinue}
      >
        <h2 className="text-2xl font-semibold text-center text-[#246d8c]">Complete your profile</h2>

        <Dropdown 
          label="Batch" 
          options={['2025', '2026', '2027', '2028', '2029', '2030']} 
          value={batch} 
          setValue={setBatch} 
        />
        <Dropdown 
          label="Branch" 
          options={[
            'CSE', 'ECE', 'EEE', 'Mech', 'Civil', 
            'AEI', 'AIDS', 'IT', 'CU'
          ]}
          value={branch} 
          setValue={setBranch} 
        />
        <Dropdown 
          label="Gender" 
          options={['Male', 'Female', 'Rather not say']} 
          value={gender} 
          setValue={setGender} 
        />

        <button
          type="submit"
          className="w-full py-3 bg-[#246d8c] text-white rounded-md text-lg font-medium hover:bg-[#1d5b73] transition-all"
        >
          Continue
        </button>
      </form>
    </div>
  );
};

// Dropdown Component
type DropdownProps = {
  label: string;
  options: string[];
  value: string;
  setValue: React.Dispatch<React.SetStateAction<string>>;
};

const Dropdown: React.FC<DropdownProps> = ({ label, options, value, setValue }) => (
    <div className="w-full">
      <label 
        htmlFor={label} // Associate label with select using htmlFor
        className="block text-sm font-medium text-gray-700 mb-1"
      >
        {label}
      </label>
      <select
        id={label} // Use matching id for accessibility
        value={value}
        onChange={(e) => setValue(e.target.value)}
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
