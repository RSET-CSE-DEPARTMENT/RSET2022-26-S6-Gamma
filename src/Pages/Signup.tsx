import { useState } from 'react';
// @ts-ignore
import { auth } from '../firebaseConfig'; // Import the auth object from firebaseConfig
import { createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { useNavigate } from 'react-router-dom'; // Import useNavigate
import apple from '../assets/Login/apple.svg';
import google from '../assets/Login/google.svg';

const Signup = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const navigate = useNavigate(); // Initialize useNavigate

  const handleEmailSignup = async (e:any) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      console.error("Passwords do not match.");
      return; // Handle password mismatch
    }
    
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      navigate('/next'); 
    } catch (error) {
      console.error('Error signing up with email:', error);
      // Handle errors (e.g., show a notification)
    }
  };

  const handleGoogleSignup = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      navigate('/next'); 
    } catch (error) {
      console.error('Error signing up with Google:', error);
      // Handle errors (e.g., show a notification)
    }
  };

  // TODO: Implement handleAppleSignup if you want Apple authentication

  // Function to navigate to login page
  const handleNavigateToLogin = () => {
    navigate('/login');
  };

  return (
    <div className="w-full h-screen bg-[#f6fcf7] flex flex-col items-center justify-center">
      <div className="w-[393px] flex flex-col items-center gap-[25px]">
        <button className="bg-transparent flex items-center justify-center p-2" onClick={handleGoogleSignup}>
          <img src={google} alt="Sign in with Google" />
        </button>
        <button className="bg-transparent flex items-center justify-center p-2">
          <img src={apple} alt="Sign in with Apple" />
        </button>
        <div className="w-[295px] flex items-center relative">
          <div className="w-full h-px bg-[#111112]/20" />
          <div className="w-[22.03px] h-[19px] bg-[#f6fcf7] absolute left-[136.09px]" />
          <div className="text-black text-xs font-normal font-['Inter'] leading-[14.40px] absolute left-[142px]">or</div>
        </div>
        <form className="flex flex-col items-center gap-6" onSubmit={handleEmailSignup}>
          <input
            type="text"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-[295px] h-12 px-4 py-[13px] rounded-md border border-[#111112]/20 text-[#111112]/60 text-base font-normal font-['Inter'] leading-snug"
          />
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-[295px] h-12 px-4 py-[13px] rounded-md border border-[#111112]/20 text-[#111112]/60 text-base font-normal font-['Inter'] leading-snug"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-[295px] h-12 px-4 py-[13px] rounded-md border border-[#111112]/20 text-[#111112]/60 text-base font-normal font-['Inter'] leading-snug"
          />
          <input
            type="password"
            placeholder="Confirm password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-[295px] h-12 px-4 py-[13px] rounded-md border border-[#111112]/20 text-[#111112]/60 text-base font-normal font-['Inter'] leading-snug"
          />
          <button type="submit" className="w-[295px] pl-6 pr-5 py-[13px] bg-[#246d8c] rounded-md flex justify-center items-center">
            <div className="text-white text-base font-medium font-['Inter'] leading-snug">Join us</div>
          </button>
        </form>
        <div className="text-center">
          <span>Already a member?</span>
          <span 
            className="font-medium cursor-pointer" 
            onClick={handleNavigateToLogin} // Call the navigate function
          >
            Log in.
          </span>
        </div>
      </div>
    </div>
  );
};

export default Signup;
