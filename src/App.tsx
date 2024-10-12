import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';

import Login from './Pages/Login';
import Splash from './Pages/Splash';
import Signup from './Pages/Signup';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Splash />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
      </Routes>
    </Router>
  );
}

export default App;