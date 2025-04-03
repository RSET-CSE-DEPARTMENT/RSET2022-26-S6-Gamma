import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
// @ts-ignore
import { auth } from './firebaseConfig';

import Login from './Pages/Login';
import Splash from './Pages/Splash';
import Signup from './Pages/Signup';
import AdditionalInfo from './Pages/AdditionalInfo';
import HomePage from './Pages/HomePage';
import EventDetails from './Pages/EventDetails';
import OrganiserHomePage from './Pages/OrganiserHomePage';
import EventCreation from './Pages/EventCreation';
import EventCreateSuccess from './Pages/EventCreateSuccess';
import OrganiserEventDetail from './Pages/OrganiserEventDetail';
import OrganiserExtraDetails from './Pages/OrganiserExtraDetails';
import OrganiserProfile from './Pages/OrganiserProfile';
import Profile from './Pages/Profile';
import Ticket from './Pages/Ticket';
import Scan from './Pages/Scan';
import Months from './Pages/Months';
import OrganiserCalendar from './Pages/OrganiserCalendar';

function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      // @ts-ignore
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Splash />} />
        <Route path="/login" element={user ? <Navigate to="/HomePage" /> : <Login />} />
        <Route path="/signup" element={user ? <Navigate to="/HomePage" /> : <Signup />} />
        <Route path="/additionalinfo" element={user ? <AdditionalInfo /> : <Navigate to="/login" />} />

        {/* Protected Routes */}
        <Route path="/HomePage" element={user ? <HomePage /> : <Navigate to="/login" />} />
        <Route path="/HomePage/TicketView" element={user ? <Ticket /> : <Navigate to="/login" />} />
        <Route path="/EventDetails" element={user ? <EventDetails /> : <Navigate to="/login" />} />
        <Route path="/OrganiserHomePage" element={user ? <OrganiserHomePage /> : <Navigate to="/login" />} />
        <Route path="/OrganiserHomePage/EventCreation" element={user ? <EventCreation /> : <Navigate to="/login" />} />
        <Route path="/OrganiserHomePage/EventCreateSuccess" element={user ? <EventCreateSuccess /> : <Navigate to="/login" />} />
        <Route path="/OrganiserHomePage/OrganiserEventDetail" element={user ? <OrganiserEventDetail /> : <Navigate to="/login" />} />
        <Route path="/OrganiserHomePage/OrganiserEventDetail/Scan/:id" element={user ? <Scan /> : <Navigate to="/login" />} />
        <Route path="/OrganiserExtraDetails/:id" element={user ? <OrganiserExtraDetails /> : <Navigate to="/login" />} />
        <Route path="/OrganiserProfile" element={user ? <OrganiserProfile /> : <Navigate to="/login" />} />
        <Route path="/HomePage/Profile" element={user ? <Profile /> : <Navigate to="/login" />} />
        <Route path="/event/:id" element={user ? <EventDetails /> : <Navigate to="/login" />} />
        <Route path="/OrganiserHomePage/:id" element={user ? <OrganiserEventDetail /> : <Navigate to="/login" />} />
        <Route path="/HomePage/Months" element={user ? <Months /> : <Navigate to="/login" />} />
        <Route path="/OrganiserCalendar" element={user ? <OrganiserCalendar /> : <Navigate to="/login" />} />
      </Routes>
    </Router>
  );
}

export default App;
