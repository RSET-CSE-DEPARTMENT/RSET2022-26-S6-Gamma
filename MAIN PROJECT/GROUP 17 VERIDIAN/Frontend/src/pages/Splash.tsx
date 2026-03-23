import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
// @ts-ignore
import { auth, googleProvider } from "../firebase";
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  onAuthStateChanged
} from "firebase/auth";

const SplashScreen = () => {
  const navigate = useNavigate();
  const [isAnimating, setIsAnimating] = useState(true);
  const [showLogin, setShowLogin] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        navigate("/home", { replace: true });
      } else {
        // Play animation first
        setTimeout(() => {
          setIsAnimating(false);
          setTimeout(() => {
            setShowLogin(true);
          }, 1000);
        }, 2000);
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  if (showLogin) {
    return <LoginPage />;
  }

  return (
    <div className="relative w-full h-screen overflow-hidden bg-black">
      <div
        className={`absolute inset-0 transition-transform duration-[1500ms] ease-in-out`}
        style={{ transform: isAnimating ? 'scale(1)' : 'scale(20)' }}
      >
        <div
          className="absolute inset-0 animate-[spin_8s_linear_infinite]"
          style={{ background: 'linear-gradient(135deg, #115ceb 0%, #000 50%, #115ceb 100%)' }}
        ></div>
        <div
          className="absolute inset-0 opacity-70 animate-[spin_10s_linear_infinite_reverse]"
          style={{ background: 'linear-gradient(225deg, #000 0%, #115ceb 50%, #000 100%)' }}
        ></div>
      </div>

      <div className={`absolute inset-0 flex items-center justify-center z-10 transition-opacity duration-500 ease-in-out ${isAnimating ? "opacity-100" : "opacity-0"}`}>
        <div className="text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-white tracking-widest m-0">Veridian</h1>
          <div className="flex justify-center mt-6 gap-2">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            <div className="w-2 h-2 bg-white rounded-full animate-pulse" style={{ animationDelay: "0.2s" }}></div>
            <div className="w-2 h-2 bg-white rounded-full animate-pulse" style={{ animationDelay: "0.4s" }}></div>
          </div>
        </div>
      </div>
    </div>
  );
};

const LoginPage = () => {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleEmailLogin = async () => {
    try {
      setError("");
      setLoading(true);

      await setPersistence(
        auth,
        rememberMe ? browserLocalPersistence : browserSessionPersistence
      );

      await signInWithEmailAndPassword(auth, email, password);

      navigate("/home", { replace: true });

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setError("");
      setLoading(true);

      await setPersistence(
        auth,
        rememberMe ? browserLocalPersistence : browserSessionPersistence
      );

      await signInWithPopup(auth, googleProvider);

      navigate("/home", { replace: true });

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Google sign-in failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 animate-[fadeIn_0.5s_ease-in]">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-2xl md:text-3xl font-bold text-center mb-8 text-[#0a3d7a] mt-0">Welcome to Veridian</h1>

          <button
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-3 border border-gray-300 rounded-md py-3 px-4 mb-3 bg-white cursor-pointer text-sm font-medium transition-colors hover:bg-gray-50 disabled:opacity-50"
            disabled={loading}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            <span>Sign in with Google</span>
          </button>

          <div className="relative flex items-center my-6">
            <span className="flex-1 border-t border-gray-300"></span>
            <span className="px-2 bg-white text-gray-500 text-sm">or</span>
            <span className="flex-1 border-t border-gray-300"></span>
          </div>

          <div className="mb-4">
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full py-3 px-4 border border-gray-300 rounded-md text-base box-border focus:outline-none focus:border-[#115ceb] focus:ring-4 focus:ring-[#115ceb]/10"
            />
          </div>

          <div className="mb-4 relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full py-3 px-4 border border-gray-300 rounded-md text-base box-border focus:outline-none focus:border-[#115ceb] focus:ring-4 focus:ring-[#115ceb]/10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 bg-transparent border-none text-gray-500 cursor-pointer p-1 hover:text-gray-700"
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>

          <div className="flex items-center justify-between mb-6">
            <label className="flex items-center cursor-pointer text-sm text-gray-600">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 mr-2 accent-[#115ceb] cursor-pointer"
              />
              Remember me
            </label>
          </div>

          {error && (
            <p style={{ color: "red", marginBottom: "10px" }}>{error}</p>
          )}

          <button
            onClick={handleEmailLogin}
            className="w-full bg-[#0a3d7a] hover:bg-[#083158] text-white py-3 px-4 rounded-md font-medium border-none cursor-pointer flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            disabled={loading}
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>

          <p className="mt-6 text-center text-sm text-gray-600">
            Not a member?{" "}
            <span
              style={{ cursor: "pointer", color: "#115ceb", fontWeight: 500 }}
              onClick={() => navigate("/signup")}
              className="hover:underline"
            >
              Create an account
            </span>
          </p>

        </div>
      </div>
    </div>
  );
};

export default SplashScreen;
