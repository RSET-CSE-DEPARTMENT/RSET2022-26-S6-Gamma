import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';

import Login from './Pages/Login';
import Splash from './Pages/Splash';
import Signup from './Pages/Signup';
import AdditionalInfo from './Pages/AdditionalInfo';
import HomePage from './Pages/HomePage';
import EventDetails from './Pages/EventDetails';
import OrganiserHomePage from './Pages/OrganiserHomePage'
import EventCreation from './Pages/EventCreation'
import EventCreateSuccess from './Pages/EventCreateSuccess'
import OrganiserEventDetail from './Pages/OrganiserEventDetail'
import TicketView from './Pages/TicketView'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Splash />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/additionalinfo" element={<AdditionalInfo/>} />
        <Route path="/HomePage" element={<HomePage/>} />
        <Route path="/HomePage/TicketView" element={<TicketView/>} />
        
       


        <Route path="/EventDetails" element={<EventDetails/>} />
        <Route path="/OrganiserHomePage" element={<OrganiserHomePage/>} />
        <Route path="/OrganiserHomePage/EventCreation" element={<EventCreation/>} />
        <Route path="/OrganiserHomePage/EventCreateSuccess" element={<EventCreateSuccess/>} />
        <Route path="/OrganiserHomePage/OrganiserEventDetail" element={<OrganiserEventDetail/>} />
        

        <Route path="/event/:id" element={<EventDetails />} />

 main
      </Routes>
    </Router>
  );
}

export default App;