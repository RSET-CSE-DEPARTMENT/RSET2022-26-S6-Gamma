import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../contexts/authContext";

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [localError, setLocalError] = useState(null);
  const { resetPassword, error: authError } = useAuth();

  // Update the handleSubmit function in ForgotPasswordPage.jsx
const handleSubmit = async (e) => {
  e.preventDefault();
  
  // Basic validation
  if (!email.includes('@') || !email.includes('.')) {
    setLocalError("Please enter a valid email address");
    return;
  }

  setIsLoading(true);
  try {
    await resetPassword(email);
    setIsSubmitted(true);
    setLocalError(null);
  } catch (err) {
    // Error is handled by AuthContext
  } finally {
    setIsLoading(false);
  }
};

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 p-6">
      {/* Background Animation */}
      <motion.div 
        className="absolute inset-0 opacity-20"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.2 }}
        transition={{ duration: 1 }}
      >
        <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-yellow-400 blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-blue-400 blur-3xl"></div>
      </motion.div>

      <motion.div 
        className="bg-white bg-opacity-10 backdrop-blur-md p-8 rounded-3xl shadow-2xl w-full max-w-md border border-white border-opacity-20"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <motion.div 
          className="text-center mb-8"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <h2 className="text-3xl font-bold text-black mb-2">Reset Password</h2>
          <p className="text-black">Enter your email to receive reset instructions</p>
        </motion.div>

        {(localError || authError) && (
          <motion.div 
            className="bg-red-500 bg-opacity-20 border border-red-500 border-opacity-40 text-black px-4 py-3 rounded-xl mb-6"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <p className="text-center">{localError || authError}</p>
          </motion.div>
        )}

        {isSubmitted ? (
          <motion.div
            className="text-center space-y-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
          >
            <div className="bg-green-500 bg-opacity-20 border border-green-500 border-opacity-40 text-black px-4 py-6 rounded-xl">
              <h3 className="text-xl font-medium mb-2">Email Sent!</h3>
              <p>
                We've sent password reset instructions to:<br />
                <span className="font-medium">{email}</span>
              </p>
            </div>
            
            <p className="text-black">
              Didn't receive an email? Check your spam folder or 
              <button 
                onClick={() => setIsSubmitted(false)}
                className="text-yellow-500 font-medium hover:text-yellow-400 transition ml-1"
              >
                try again
              </button>
            </p>
            
            <div className="pt-4">
              <Link to="/login">
                <motion.button
                  className="bg-white bg-opacity-20 border border-white border-opacity-30 text-black font-medium py-3 px-6 rounded-xl hover:bg-opacity-30 transition"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Back to Login
                </motion.button>
              </Link>
            </div>
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <motion.div 
              className="space-y-2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <label className="block text-black font-medium">Email</label>
              <input
                type="email"
                className="w-full p-3 bg-white bg-opacity-10 border border-white border-opacity-20 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent text-black"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your account email"
                required
              />
            </motion.div>

            <motion.div 
              className="pt-2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <motion.button
                type="submit"
                className="w-full bg-gradient-to-r from-yellow-400 to-pink-500 text-white font-bold py-3 px-4 rounded-xl hover:shadow-lg transition duration-300 ease-in-out"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Sending...
                  </span>
                ) : (
                  "Send Reset Link"
                )}
              </motion.button>
            </motion.div>
          </form>
        )}

        <motion.div 
          className="mt-8 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
        >
          <p className="text-black">
            Remember your password? <Link to="/login" className="text-yellow-500 font-medium hover:text-yellow-400 transition">Back to Login</Link>
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default ForgotPasswordPage;