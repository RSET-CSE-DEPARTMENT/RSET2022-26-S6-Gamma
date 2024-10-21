import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';

import Login from './Pages/Login';
import Splash from './Pages/Splash';
import Signup from './Pages/Signup';
import AdditionalInfo from './Pages/AdditionalInfo';
import HomePage from './Pages/HomePage';
import EventDetails from './Pages/EventDetails';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Splash />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/additionalinfo" element={<AdditionalInfo/>} />
        <Route path="/HomePage" element={<HomePage/>} />
        <Route path="/EventDetails" element={<EventDetails/>} />
      </Routes>
    </Router>
  );
}

export default App;