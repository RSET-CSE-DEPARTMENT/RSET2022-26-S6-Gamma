
import { useNavigate } from 'react-router-dom'; // Import useNavigate
import logo from '../assets/logo.svg';

const Splash = () => {
  const navigate = useNavigate(); // Initialize the navigate function

  const handleLogin = () => {
    navigate('/login'); // Change '/login' to your desired login route
  };

  const handleSignUp = () => {
    navigate('/signup'); // Change '/signup' to your desired signup route
  };

  return (
    <div className="w-full h-screen bg-[#f6fcf7] flex flex-col justify-center items-center">
      <img src={logo} alt="App logo" className="mb-8" />
      <div className="text-[#246d8c] text-[32px] font-medium font-['Inter'] mb-4">Let’s get started</div>
      <div className="w-[316px] text-[#246d8c] text-base font-normal font-['Inter'] text-center mb-8">
        Organizers manage events and check in with QR codes. Users register and get tickets in one slide.
      </div>
      <button
        onClick={handleLogin} // Add onClick handler
        className="w-[295px] py-[13px] bg-[#246d8c] text-white text-base font-medium font-['Inter'] rounded-md mb-4"
      >
        Login
      </button>
      <button
        onClick={handleSignUp} // Add onClick handler
        className="w-[295px] py-[13px] bg-[#246d8c] text-white text-base font-medium font-['Inter'] rounded-md"
      >
        Sign up
      </button>
    </div>
  );
};

export default Splash;

