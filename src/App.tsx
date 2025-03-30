import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
// @ts-ignore
import { auth } from './firebaseConfig';

import Login from './Pages/Login';
import Splash from './Pages/Splash';
import LogoSplash from './Pages/LogoSplash';
import Signup from './Pages/Signup';
import AdditionalInfo from './Pages/AdditionalInfo';
import HomePage from './Pages/HomePage';
import EventDetails from './Pages/EventDetails';
import OrganiserHomePage from './Pages/OrganiserHomePage';
import OrganiserProfile from './Pages/OrganiserProfile';
import EventCreation from './Pages/EventCreation';
import EventCreateSuccess from './Pages/EventCreateSuccess';
import OrganiserEventDetail from './Pages/OrganiserEventDetail';
import OrganiserEditEvent from './Pages/OrganiserEditEvent';
import Profile from './Pages/Profile';
import EditProfile from './Pages/EditProfile';
import Ticket from './Pages/Ticket';
import Scan from './Pages/Scan';
import Months from './Pages/Months';


function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // For Firebase auth state
  const [showLogoSplash, setShowLogoSplash] = useState(true); // For LogoSplash screen
  const [showSecondarySplash, setShowSecondarySplash] = useState(false); // For Splash screen

  useEffect(() => {
    // Display LogoSplash for 2 seconds
    const logoSplashTimeout = setTimeout(() => {
      setShowLogoSplash(false);
      setShowSecondarySplash(true); // Show Splash after LogoSplash
    }, 2000);

    // Display Splash for 2 seconds after LogoSplash
    const splashTimeout = setTimeout(() => {
      setShowSecondarySplash(false);
    }, 4000); // Total 4 seconds (2 for LogoSplash + 2 for Splash)

    // Check Firebase auth state
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      // @ts-ignore
      setUser(currentUser);
      setLoading(false); // Stop showing loader once the auth state is resolved
    });

    return () => {
      clearTimeout(logoSplashTimeout);
      clearTimeout(splashTimeout);
      unsubscribe(); // Cleanup Firebase listener
    };
  }, []);

  if (loading) {
    return <div>Loading...</div>; // Optional: Replace with a loading spinner or component
  }

  return (
    <Router>
      {showLogoSplash ? (
        <LogoSplash />
      ) : showSecondarySplash ? (
        <Splash />
      ) : (
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={user ? <Navigate to="/HomePage" /> : <Login />} />
          <Route path="/login" element={user ? <Navigate to="/HomePage" /> : <Login />} />
          <Route path="/signup" element={user ? <Navigate to="/HomePage" /> : <Signup />} />
          <Route path="/additionalinfo" element={user ? <Navigate to="/HomePage" /> : <AdditionalInfo />} />

          {/* Protected Routes */}
          <Route path="/HomePage" element={user ? <HomePage /> : <Navigate to="/login" />} />
          <Route path="/HomePage/TicketView" element={user ? <Ticket /> : <Navigate to="/login" />} />
          <Route path="/EventDetails" element={user ? <EventDetails /> : <Navigate to="/login" />} />
          <Route path="/OrganiserHomePage" element={user ? <OrganiserHomePage /> : <Navigate to="/login" />} />
          <Route path="/OrganiserHomePage/EventCreation" element={user ? <EventCreation /> : <Navigate to="/login" />} />
          <Route path="/OrganiserHomePage/EventCreateSuccess" element={user ? <EventCreateSuccess /> : <Navigate to="/login" />} />
          <Route path="/OrganiserHomePage/OrganiserEventDetail" element={user ? <OrganiserEventDetail /> : <Navigate to="/login" />} />
          <Route path="/OrganiserHomePage/OrganiserEventDetail/Scan" element={user ? <Scan /> : <Navigate to="/login" />} />
          <Route path="/OrganiserHomePage/EditEvent/:id" element={user ? <OrganiserEditEvent /> : <Navigate to="/login" />} />
          <Route path="/OrganiserHomePage/Profile" element={user ? <OrganiserProfile /> : <Navigate to="/login" />} />
          <Route path="/HomePage/Profile" element={user ? <Profile /> : <Navigate to="/login" />} />
          <Route path="/HomePage/Profile/EditProfile" element={user ? <EditProfile /> : <Navigate to="/login" />} />
          <Route path="/event/:id" element={user ? <EventDetails /> : <Navigate to="/login" />} />
          <Route path="/OrganiserHomePage/:id" element={user ? <OrganiserEventDetail /> : <Navigate to="/login" />} />
          <Route path="/HomePage/Months" element={user ? <Months /> : <Navigate to="/months " />} />
          
        </Routes>
      )}
    </Router>
  );
}

export default App;
