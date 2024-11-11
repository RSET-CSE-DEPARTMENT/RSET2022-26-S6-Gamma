import { useState } from 'react';
// @ts-ignore
import { auth } from '../firebaseConfig'; // Import the auth object from firebaseConfig
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { useNavigate } from 'react-router-dom'; // Import useNavigate
import google from '../assets/Login/google.svg';
import { getFirestore, doc, getDoc } from 'firebase/firestore'; // Import Firestore functions

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate(); // Initialize useNavigate
  const db = getFirestore(); // Initialize Firestore

  // Function to handle email sign in
  const handleEmailSignIn = async (e: any) => {
    e.preventDefault();
    setError(''); // Clear any previous errors

    try {
      // Use Firebase Authentication to sign in the user
      await signInWithEmailAndPassword(auth, email, password);

      // Fetch organizer-specific data from Firestore if needed
      const docRef = doc(db, 'organizers', email); // Use email as document ID
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        // After successful sign-in, navigate to the organiser's home page
        navigate('/OrganiserHomePage');
      } else {
        console.error('No such user found in organizers');
        setError('No such organizer found.');
      }
    } catch (error) {
      console.error('Error signing in with email:', error);
      setError('Failed to log in. Please check your credentials.');
    }
  };

  const handleGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      navigate('/additionalinfo');
    } catch (error) {
      console.error('Error signing in with Google:', error);
      setError('Google sign-in failed.');
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
              {error && (
                <div className="text-red-500 text-sm">{error}</div>
              )}
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
