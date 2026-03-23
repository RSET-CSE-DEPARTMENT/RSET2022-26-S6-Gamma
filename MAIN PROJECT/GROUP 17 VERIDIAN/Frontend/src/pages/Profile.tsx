import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Bell, Moon, DollarSign, FileText, HelpCircle, LogOut, ChevronRight } from 'lucide-react';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import type { User as FirebaseUser } from 'firebase/auth';
// @ts-ignore
import { auth } from '../firebase';

const Profile: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [imgError, setImgError] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      await signOut(auth);
      navigate("/", { replace: true });
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      setLoggingOut(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-white"><div className="w-[50px] h-[50px] border-[3px] border-slate-200 border-t-blue-500 rounded-full mx-auto mb-4 animate-spin"></div></div>;
  }

  return (

    <>
      <div className="mb-6">
        <div className="text-slate-500 text-sm mb-1">My Account</div>
        <h1 className="text-slate-900 text-2xl sm:text-3xl font-bold mb-2">Profile</h1>
      </div>

      <div className="flex flex-col gap-6 mb-8">
        {/* User Identity Section */}
        <div className="bg-white rounded-2xl p-6 shadow-[0_4px_12px_rgba(0,0,0,0.05)] border border-slate-200 flex flex-col items-center text-center">
          <div className="mb-4">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-[0_4px_12px_rgba(37,99,235,0.2)] overflow-hidden">
              {user?.photoURL && !imgError ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || "User"}
                  className="w-full h-full object-cover"
                  onError={() => setImgError(true)}
                />
              ) : (
                <User size={40} color="white" />
              )}
            </div>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-1">{user?.displayName || "Investor"}</h2>
          <p className="text-sm text-slate-500 mb-1">{user?.email}</p>
          <p className="text-xs text-slate-400">ID: INV-{user?.uid ? user.uid.substring(0, 8).toUpperCase() : 'GUEST'}</p>
        </div>

        {/* Financial Context Section */}
        <div className="bg-white rounded-2xl p-6 shadow-[0_4px_12px_rgba(0,0,0,0.05)] border border-slate-200">
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Investment Profile</h3>
          <div className="flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-500">Risk Profile</span>
              <span className="bg-blue-50 text-blue-800 px-3 py-1 rounded-full font-semibold text-xs">Moderate</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-500">Experience Level</span>
              <span className="text-sm font-medium text-slate-900">Intermediate</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-500">Preferred Markets</span>
              <span className="text-sm font-medium text-slate-900">Stocks, ETFs</span>
            </div>
          </div>
        </div>

        {/* Preferences & Settings */}
        <div className="bg-white rounded-2xl p-6 shadow-[0_4px_12px_rgba(0,0,0,0.05)] border border-slate-200">
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Preferences</h3>
          <div className="flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <Bell size={20} className="text-slate-400" />
                <span className="text-sm text-slate-900">Notifications</span>
              </div>
              <button
                onClick={() => setNotificationsEnabled(!notificationsEnabled)}
                className={`w-11 h-6 rounded-full relative cursor-pointer border-none transition-colors duration-200 p-0 ${notificationsEnabled ? 'bg-blue-600' : 'bg-slate-300'}`}
              >
                <div className={`w-5 h-5 bg-white rounded-full absolute top-[2px] left-[2px] transition-transform duration-200 shadow-[0_1px_3px_rgba(0,0,0,0.1)] ${notificationsEnabled ? 'translate-x-5' : ''}`} />
              </button>
            </div>

            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <Moon size={20} className="text-slate-400" />
                <span className="text-sm text-slate-900">Theme</span>
              </div>
              <span className="text-sm font-medium text-slate-900">Light</span>
            </div>

            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <DollarSign size={20} className="text-slate-400" />
                <span className="text-sm text-slate-900">Currency</span>
              </div>
              <span className="text-sm font-medium text-slate-900">INR (₹)</span>
            </div>
          </div>
        </div>

        {/* App & Account Actions */}
        <div className="bg-white rounded-2xl shadow-[0_4px_12px_rgba(0,0,0,0.05)] border border-slate-200 overflow-hidden">
          <button className="w-full flex justify-between items-center px-6 py-5 bg-transparent border-none cursor-pointer transition-colors duration-200 hover:bg-slate-50 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <FileText size={20} className="text-slate-400" />
              <span className="text-sm text-slate-900">Terms & Privacy</span>
            </div>
            <ChevronRight size={20} className="text-slate-300" />
          </button>

          <button className="w-full flex justify-between items-center px-6 py-5 bg-transparent border-none cursor-pointer transition-colors duration-200 hover:bg-slate-50">
            <div className="flex items-center gap-3">
              <HelpCircle size={20} className="text-slate-400" />
              <span className="text-sm text-slate-900">Help & Support</span>
            </div>
            <ChevronRight size={20} className="text-slate-300" />
          </button>
        </div>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="w-full bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-center gap-2 text-red-500 font-semibold text-sm cursor-pointer transition-all duration-200 shadow-[0_2px_4px_rgba(0,0,0,0.02)] hover:bg-red-50 hover:border-red-200 hover:-translate-y-[1px] hover:shadow-[0_4px_6px_rgba(0,0,0,0.05)] active:translate-y-0 disabled:opacity-50"
        >
          <LogOut size={20} />
          <span>{loggingOut ? "Logging out..." : "Logout"}</span>
        </button>

        {/* App Version */}
        <div className="text-center text-xs text-slate-400 mt-4">
          Version 1.2.0
        </div>
      </div>
    </>
  );

};

export default Profile;
