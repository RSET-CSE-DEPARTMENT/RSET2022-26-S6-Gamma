// src/contexts/authContext.jsx
import { createContext, useContext, useState, useEffect } from 'react';
import { 
  doCreateUserWithEmailAndPassword,
  doSignInWithEmailAndPassword,
  doPasswordReset,
  doSignOut
} from '../auth';
import { auth } from '../firebase';
import { onAuthStateChanged, updateProfile } from 'firebase/auth';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // authContext.js
// In your login function:
const login = async (email, password) => {
  try {
    const response = await axios.post('/api/login', { email, password });
    localStorage.setItem('token', response.data.token);
    setCurrentUser({
      id: response.data.user.id,  // Make sure your API returns user ID
      email: response.data.user.email
    });
  } catch (err) {
    // error handling
  }
};

 // Make sure your auth context has proper state management
const loginWithEmail = async (email, password) => {
  setError(null);
  setLoading(true);
  try {
    const userCredential = await doSignInWithEmailAndPassword(email, password);
    // Force state update before proceeding
    await new Promise(resolve => setTimeout(resolve, 100));
    return userCredential.user;
  } catch (err) {
    // error handling
  } finally {
    setLoading(false);
  }
};
  const signUpWithEmail = async (email, password, fullName) => {
    setError(null);
    try {
      const userCredential = await doCreateUserWithEmailAndPassword(email, password);
      // Update profile to include the full name
      await updateProfile(userCredential.user, {
        displayName: fullName
      });
      return userCredential.user;
    } catch (err) {
      const errorMessage = err.code === 'auth/email-already-in-use' ? 'Email already in use' :
                          err.code === 'auth/invalid-email' ? 'Invalid email address' :
                          err.code === 'auth/weak-password' ? 'Password is too weak' :
                          'Registration failed';
      setError(errorMessage);
      throw err;
    }
  };

  const resetPassword = async (email) => {
    setError(null);
    try {
      await doPasswordReset(email);
      return true;
    } catch (err) {
      const errorMessage = err.code === 'auth/user-not-found' ? 'User not found' :
                          err.code === 'auth/invalid-email' ? 'Invalid email address' :
                          'Password reset failed';
      setError(errorMessage);
      throw err;
    }
  };

  const logout = async () => {
    setError(null);
    try {
      await doSignOut();
    } catch (err) {
      setError('Logout failed');
      throw err;
    }
  };

  const value = {
    currentUser,
    loginWithEmail,
    signUpWithEmail,
    resetPassword,
    logout,
    error
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}