import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; // Import useNavigate
import logo from '../assets/logo.svg';

const Splash = () => {
  const [showButtons, setShowButtons] = useState(false); // State to control buttons visibility
  const navigate = useNavigate(); // Initialize the navigate function

  useEffect(() => {
    // Show buttons after 3 seconds
    const timer = setTimeout(() => {
      setShowButtons(true); // Show the buttons after the logo animation
    }, 2000); // 2 seconds for the logo

    // Cleanup timer on component unmount
    return () => clearTimeout(timer);
  }, []);

  // Handlers for login and sign up buttons
  const handleLogin = () => {
    navigate('/login'); // Navigate to login page
  };

  const handleSignUp = () => {
    navigate('/signup'); // Navigate to signup page
  };

  return (
    <div className="w-full h-screen bg-[#f6fcf7] flex flex-col justify-center items-center">
      {/* Logo with fade-in effect */}
      <img
        src={logo}
        alt="App logo"
        className="mb-8 transition-opacity duration-1000 opacity-100"
        style={{ animation: 'fadeIn 3s ease-in-out' }}
      />
      
      {/* Content after the logo disappears */}
      {showButtons && (
        <>
          <div className="text-[#246d8c] text-[32px] font-medium font-['Inter'] mb-4">
            Let’s get started
          </div>
          <div className="w-[316px] text-[#246d8c] text-base font-normal font-['Inter'] text-center mb-8">
            Organizers manage events and check in with QR codes. Users register and get tickets in one slide.
          </div>
          <button
            onClick={handleLogin}
            className="w-[295px] py-[13px] bg-[#246d8c] text-white text-base font-medium font-['Inter'] rounded-md mb-4"
          >
            Login
          </button>
          <button
            onClick={handleSignUp}
            className="w-[295px] py-[13px] bg-[#246d8c] text-white text-base font-medium font-['Inter'] rounded-md"
          >
            Sign up
          </button>
        </>
      )}
    </div>
  );
};

export default Splash;
