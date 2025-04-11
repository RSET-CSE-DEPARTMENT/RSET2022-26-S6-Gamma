import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import introImage from "../assets/ergonomics-intro.png";
import logo from "../assets/logoimg.png";

const IntroPage = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 text-white p-6 overflow-hidden">
      {/* Background Animation */}
      <motion.div 
        className="absolute inset-0 opacity-20"
        initial={{ opacity: 0 }}
        animate={{ 
          opacity: [0.1, 0.2, 0.1],
          scale: [1, 1.1, 1],
        }}
        transition={{ duration: 8, repeat: Infinity, repeatType: "reverse" }}
      >
        <div className="absolute top-1/4 left-1/3 w-64 h-64 rounded-full bg-yellow-400 blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/3 w-80 h-80 rounded-full bg-blue-400 blur-3xl"></div>
      </motion.div>
      
      {/* Content Container */}
      <div className="relative z-10 flex flex-col md:flex-row items-center justify-between max-w-6xl w-full mx-auto">
        {/* Left Side: Logo & Text Content */}
        <div className="flex flex-col items-center md:items-start text-center md:text-left max-w-xl space-y-8 md:mr-8">
          {/* Logo & Title */}
          <motion.div
            className="flex items-center"
            initial={{ opacity: 0,x:500, y: -30 }}
            animate={{ opacity: 1,x:500, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <img src={logo} alt="Logo" className="h-16" />
            <div className="ml-4">
              <h1 className="text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 to-pink-500">
              ‎ ‎ ‎ ‎ ‎ ‎ ‎ ‎ ‎ ‎ ‎ ‎ ‎P.E.R.C.H
              </h1>
              <div className="h-1 w-24 bg-gradient-to-r from-yellow-400 to-pink-500 rounded-full mt-2"></div>
            </div>
          </motion.div>

          <motion.p
            className="text-lg opacity-90"
            initial={{ opacity: 0,x:120, y: 20 }}
            animate={{ opacity: 1,x:120, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
          >
            ‎ ‎ ‎ ‎ ‎ Improve your posture, prevent strain, and boost productivity with our AI-driven 
            ergonomic assessments and personalized recommendations.
          </motion.p>

          {/* Feature List */}
          <motion.div 
            className="flex flex-wrap md:justify-start justify-center gap-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.7 }}
          >
           
          
          </motion.div>
        </div>

        {/* Right Side: Image & Login Button */}
        <motion.div
          className="mt-12 md:mt-0 flex flex-col items-center"
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
        >
          </motion.div>
   {/* Image */}
   <motion.div
            className="relative w-full max-w-md"
            initial={{ opacity: 0,x:500,y:0, scale: 0.8 }}
            animate={{ opacity: 1,x:500,y:0, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.5 }}
          >
          {/* Login Button */}
          <motion.div
            className="mt-12"
            initial={{ opacity: 0 ,x:200}}
            animate={{ opacity: 1 ,x:200}}
            transition={{ duration: 1.5, delay: 1 }}
          >
            <Link to="/login">
              <motion.button 
                className="bg-white bg-opacity-20 backdrop-blur-md text-white font-bold px-8 py-4 rounded-full text-lg shadow-lg border border-white border-opacity-30 hover:bg-opacity-30 transition"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Login
              </motion.button>
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default IntroPage;