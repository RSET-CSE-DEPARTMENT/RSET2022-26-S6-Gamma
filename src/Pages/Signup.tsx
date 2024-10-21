import { useState, FormEvent, CSSProperties } from 'react';
// @ts-ignore
import { auth } from '../firebaseConfig';
import { 
  createUserWithEmailAndPassword, 
  GoogleAuthProvider, 
  signInWithPopup 
} from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import google from '../assets/Login/google.svg';

const Signup: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState({ name: false, email: false, password: false, confirmPassword: false });
  const navigate = useNavigate();

  const validateFields = () => {
    const newErrors = {
      name: !name,
      email: !email,
      password: !password,
      confirmPassword: !confirmPassword || password !== confirmPassword,
    };
    setErrors(newErrors);
    return Object.values(newErrors).every((error) => !error); // Return true if no errors
  };

  const handleEmailSignup = async (e: FormEvent) => {
    e.preventDefault();
    if (!validateFields()) return; // Stop if validation fails

    try {
      await createUserWithEmailAndPassword(auth, email, password);
      navigate('/additionalinfo');
    } catch (error) {
      console.error('Error signing up with email:', error);
    }
  };

  const handleGoogleSignup = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      navigate('/additionalinfo');
    } catch (error) {
      console.error('Error signing up with Google:', error);
    }
  };

  const navigateToAdditionalInfo = () => {
    navigate('/AdditionalInfo');
  };

  const handleNavigateToLogin = () => {
    navigate('/login');
  };

  // Define styles for red border on error
  const errorStyle: CSSProperties = {
    borderColor: 'red',
  };

  return (
    <div className="w-full h-screen bg-[#f6fcf7] flex flex-col items-center justify-center">
      <div className="w-[393px] flex flex-col items-center gap-[25px]">
        <button
          className="bg-transparent flex items-center justify-center p-2"
          onClick={handleGoogleSignup}
        >
          <img src={google} alt="Sign in with Google" />
        </button>
        
        <div className="w-[295px] flex items-center relative">
          <div className="w-full h-px bg-[#111112]/20" />
          <div className="w-[22.03px] h-[19px] bg-[#f6fcf7] absolute left-[136.09px]" />
          <div className="text-black text-xs font-normal absolute left-[142px]">or</div>
        </div>
        <form className="flex flex-col items-center gap-6" onSubmit={handleEmailSignup}>
          <input
            type="text"
            placeholder="Name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setErrors((prev) => ({ ...prev, name: false }));
            }}
            className="w-[295px] h-12 px-4 py-[13px] rounded-md border text-base font-normal"
            style={errors.name ? errorStyle : {}}
          />
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setErrors((prev) => ({ ...prev, email: false }));
            }}
            className="w-[295px] h-12 px-4 py-[13px] rounded-md border text-base font-normal"
            style={errors.email ? errorStyle : {}}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setErrors((prev) => ({ ...prev, password: false }));
            }}
            className="w-[295px] h-12 px-4 py-[13px] rounded-md border text-base font-normal"
            style={errors.password ? errorStyle : {}}
          />
          <input
            type="password"
            placeholder="Confirm password"
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              setErrors((prev) => ({ ...prev, confirmPassword: false }));
            }}
            className="w-[295px] h-12 px-4 py-[13px] rounded-md border text-base font-normal"
            style={errors.confirmPassword ? errorStyle : {}}
          />
          <button
            type="submit"
            className="w-[295px] pl-6 pr-5 py-[13px] bg-[#246d8c] rounded-md flex justify-center items-center"
            onClick={navigateToAdditionalInfo}
          >
            <div className="text-white text-base font-medium">Join us</div>
          </button>
        </form>
        <div className="text-center">
          <span>Already a member? </span>
          <span
            className="font-medium cursor-pointer"
            onClick={handleNavigateToLogin}
          >
            Log in.
          </span>
        </div>
      </div>
    </div>
  );
};

export default Signup;
