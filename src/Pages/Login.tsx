import { useState } from 'react';
// @ts-ignore
import { auth } from '../firebaseConfig'; // Import the auth object from firebaseConfig
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { useNavigate } from 'react-router-dom'; // Import useNavigate
import google from '../assets/Login/google.svg';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate(); // Initialize useNavigate

  const handleEmailSignIn = async (e:any) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/additionalinfo');
    } catch (error) {
      console.error('Error signing in with email:', error);
      // Handle errors (e.g., show a notification)
    }
  };

  const handleGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      navigate('/additionalinfo');
    } catch (error) {
      console.error('Error signing in with Google:', error);
      // Handle errors (e.g., show a notification)
    }
  };

  // Function to handle navigation to signup
  const handleNavigateToSignup = () => {
    navigate('/signup');
  };

  return (
    <div className="h-[100vh] bg-[#f5fbf7] flex flex-row justify-center items-center">
      <div className="flex flex-col justify-center items-center gap-[25px]">
        <div className="flex flex-col items-center gap-[25px]">
          <button className="bg-transparent flex items-center justify-center p-2" onClick={handleGoogleSignIn}>
            <img src={google} alt="Sign in with Google" />
          </button>
          <div className="flex flex-col items-center gap-6">
            <div className="relative w-[295px] h-[19px] flex items-center justify-center">
              <div className="bg-[#f6fcf7] px-2 text-black text-xs font-normal">or</div>
            </div>
            <form className="flex flex-col items-center gap-6" onSubmit={handleEmailSignIn}>
              <div className="w-[295px] h-12 px-4 py-[13px] rounded-md border border-[#e5e7eb] flex items-center bg-white">
                <input
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full text-[#111112]/60 text-base font-normal focus:outline-none bg-transparent"
                />
              </div>
              <div className="w-[295px] h-12 px-4 py-[13px] rounded-md border border-[#e5e7eb] flex items-center bg-white">
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full text-[#111112]/60 text-base font-normal focus:outline-none bg-transparent"
                />
              </div>
              <button
                type="submit"
                className="w-[295px] pl-6 pr-5 py-[13px] bg-[#246d8c] text-white rounded-md flex items-center justify-center"
              >
                Log in
              </button>
            </form>
            <div className="text-center">
              <span>Not a member? </span>
              <span 
                className="text-[#246d8c] cursor-pointer" 
                onClick={handleNavigateToSignup} // Call the navigate function
              >
                Create an account.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
