import React, { useState, useEffect } from "react";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { useParams } from 'react-router-dom';
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getFirestore, doc, getDoc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";

interface UserProfile {
  name: string;
  email: string;
  uid: string;
  batch: string;
  branch: string;
  division: string;
  year: number;
}

type CertificateStyle = "classic" | "modern" | "elegant" | "minimal";

const EventDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [certificateStyle, setCertificateStyle] = useState<CertificateStyle>("elegant");
  const [certificateName, setCertificateName] = useState<string>("");
  const [eventData, setEventData] = useState<any>(null);
  const [organizerData, setOrganizerData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [registerMessage, setRegisterMessage] = useState<string | null>(null);
  const [isRegistered, setIsRegistered] = useState<boolean>(false);
  const [isPresent, setIsPresent] = useState<boolean>(false);
  const [userProfile, setUserProfile] = useState<UserProfile>({
    name: "",
    email: "",
    uid: "",
    batch: "",
    branch: "",
    division: "",
    year: 0
  });

  // Signature image placeholder  
  const signatureImage = "/images/signature.png";

  const db = getFirestore();
  const auth = getAuth();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user && user.email) {
        setUserEmail(user.email);
        fetchUserProfile(user.uid);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // Initialize certificate name with user profile name when available
    if (userProfile.name) {
      setCertificateName(userProfile.name);
    }
  }, [userProfile.name]);

  const fetchUserProfile = async (uid: string) => {
    try {
      const userDocRef = doc(db, "users", uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const userData = userDoc.data();
        setUserProfile({
          name: userData.name || "",
          email: userEmail || "",
          uid: uid,
          batch: userData.batch || "",
          branch: userData.branch || "",
          division: userData.division || "",
          year: userData.year || 0
        });
      }
    } catch (error) {
      console.error("Error fetching user profile: ", error);
    }
  };

  const fetchOrganizerData = async (organizerEmail: string) => {
    try {
      // Access the document directly using the email as the document ID
      const organizerDocRef = doc(db, "organizers", organizerEmail);
      const organizerDoc = await getDoc(organizerDocRef);

      if (organizerDoc.exists()) {
        setOrganizerData(organizerDoc.data());
        console.log("Organizer data fetched:", organizerDoc.data());
      } else {
        console.log("Organizer document not found for email:", organizerEmail);
      }
    } catch (error) {
      console.error("Error fetching organizer data: ", error);
    }
  };

  useEffect(() => {
    if (id) {
      console.log('Fetching event details for ID:', id);

      const fetchEventDetails = async () => {
        try {
          const docRef = doc(db, 'event', id);
          const docSnap = await getDoc(docRef);

          if (docSnap.exists()) {
            const data = docSnap.data();
            setEventData(data);

            // Fetch organizer data using the organiser email
            if (data.organiser) {
              fetchOrganizerData(data.organiser);
            }

            // Check if user is already registered
            if (userEmail && data.Participants?.includes(userEmail)) {
              setIsRegistered(true);
            }
            
            // Check if user is present for the event - Looking at the attendees array
            if (userEmail && data.attendees) {
              // Check if the user's email exists in the attendees array
              const userAttendance = data.attendees.find((attendee: any) => 
                attendee.email === userEmail || attendee.email === `"${userEmail}"`
              );
              
              if (userAttendance) {
                setIsPresent(true);
                console.log("User attendance found:", userAttendance);
              }
            }
          } else {
            setError('Event not found.');
          }
        } catch (error) {
          console.error('Error fetching event details:', error);
          setError('Failed to load event details.');
        } finally {
          setLoading(false);
        }
      };

      fetchEventDetails();
    } else {
      setError('Event ID is missing.');
      setLoading(false);
    }
  }, [id, userEmail]);

  const handleRegister = async () => {
    if (!userEmail) {
      setRegisterMessage('You must be logged in to register.');
      return;
    }

    try {
      const docRef = doc(db, 'event', id!);
      await updateDoc(docRef, {
        Participants: arrayUnion(userEmail),
      });
      setRegisterMessage('Successfully registered!');
      setIsRegistered(true);
    } catch (error) {
      console.error('Error registering for event:', error);
      setRegisterMessage('Failed to register. Please try again later.');
    }
  };

  const handleUnregister = async () => {
    if (!userEmail) return;

    try {
      const docRef = doc(db, 'event', id!);
      await updateDoc(docRef, {
        Participants: arrayRemove(userEmail),
      });
      setRegisterMessage('Successfully unregistered.');
      setIsRegistered(false);
    } catch (error) {
      console.error('Error unregistering:', error);
      setRegisterMessage('Failed to unregister. Please try again later.');
    }
  };

  const generateCertificate = async () => {
    if (!isPresent) return; // Don't allow certificate generation if not present
    
    const certificate = document.getElementById("certificate");
    if (certificate) {
      const canvas = await html2canvas(certificate);
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      
      // Use certificate name for the filename
      const displayName = certificateName.trim() ? certificateName : userProfile.name;
      pdf.save(`certificate_${displayName}_${eventData.name}.pdf`);
    }
  };

  const getBackgroundStyle = () => {
    switch (certificateStyle) {
      case "classic":
        return "bg-gradient-to-r from-amber-50 to-yellow-50";
      case "modern":
        return "bg-gradient-to-r from-indigo-50 to-purple-50";
      case "elegant":
        return "bg-gradient-to-r from-blue-50 to-indigo-50";
      case "minimal":
        return "bg-white";
      default:
        return "bg-gradient-to-r from-blue-50 to-indigo-50";
    }
  };

  const getBorderStyle = () => {
    switch (certificateStyle) {
      case "classic":
        return "border-8 border-double border-amber-200";
      case "modern":
        return "border-4 border-solid border-indigo-300";
      case "elegant":
        return "border-8 border-double border-blue-200";
      case "minimal":
        return "border-2 border-solid border-gray-300";
      default:
        return "border-8 border-double border-blue-200";
    }
  };

  if (loading) {
    return <p className="text-center text-gray-600">Loading event details...</p>;
  }

  if (error) {
    return <p className="text-center text-red-600">{error}</p>;
  }

  const currentDate = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  // Get the organizer name from organizer data or fallback to default
  const organizerName = organizerData?.name || (eventData.organiser ? eventData.organiser.split('@')[0] : "Unknown Organizer");

  return (
    <div className="p-4 flex flex-col items-center bg-white">
      {eventData ? (
        <>
          <div className="bg-white max-w-md w-full p-6 rounded-lg mb-8">
            <h1 className="text-3xl font-semibold text-black mb-2 text-center">{organizerName}</h1>

            <div className="w-full h-70 rounded-lg overflow-hidden mb-4">
              <img 
                src={eventData.poster} 
                alt={eventData.name} 
                className="object-cover w-full h-full" 
              />
            </div>

            <h2 className="text-2xl font-semibold">{eventData.name}</h2>

            <p className="text-[#246d8c] font-medium mb-4"><strong>Date:</strong> {eventData.event_date}</p>
            <p className="text-[#246d8c] font-medium mb-4"><strong>Venue:</strong> {eventData.venue}</p>
            <p className="text-[#246d8c] font-medium mb-4"><strong>Time:</strong> {eventData.event_time}</p>
            <p className="text-[#246d8c] font-medium mb-4"><strong>Participants:</strong> {eventData.num_of_participants}</p>

            <p className="text-[#246d8c] font-medium mb-4"><strong>Description:</strong> </p>
            <p className="text-gray-700 leading-relaxed mb-4">{eventData.description}</p>

            <h3 className="text-xl font-medium mb-2">Coordinators</h3>
            <div className="flex flex-col gap-2 mb-6">
              <p className="text-gray-700">
                <strong>Coordinator 1:</strong> {eventData.coordinator1 ? `${eventData.coordinator1.name} - ${eventData.coordinator1.phone}` : 'N/A'}
              </p>
              <p className="text-gray-700">
                <strong>Coordinator 2:</strong> {eventData.coordinator2 ? `${eventData.coordinator2.name} - ${eventData.coordinator2.phone}` : 'N/A'}
              </p>
            </div>

            {/* Register/Unregister Buttons */}
            {!isRegistered ? (
              <button
                className="w-full bg-[#246d8c] text-white py-3 rounded-md text-lg font-medium mb-4"
                onClick={handleRegister}
              >
                Register
              </button>
            ) : (
              <button
                className="w-full bg-red-500 text-white py-3 rounded-md text-lg font-medium mb-4"
                onClick={handleUnregister}
              >
                Unregister
              </button>
            )}

            {/* Display registration message */}
            {registerMessage && <p className="text-center text-green-600 mb-4">{registerMessage}</p>}

            {/* Certificate Section - Only shown if user is present */}
            {isPresent && (
              <div className="mt-4 border-t pt-4">
                <h3 className="text-xl font-medium mb-4">Certificate</h3>
                
                {/* Certificate Name Input */}
                <div className="mb-4">
                  <label htmlFor="certificate-name" className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name for Certificate
                  </label>
                  <input
                    id="certificate-name"
                    type="text"
                    value={certificateName}
                    onChange={(e) => setCertificateName(e.target.value)}
                    placeholder="Enter full name as it should appear on certificate"
                    className="w-full border border-gray-300 rounded-md p-2 text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Leave blank to use your profile name: {userProfile.name}
                  </p>
                </div>
                
                <div className="mb-4">
                  <label htmlFor="certificate-style" className="block text-sm font-medium text-gray-700 mb-2">
                    Certificate Style
                  </label>
                  <select
                    id="certificate-style"
                    value={certificateStyle}
                    onChange={(e) => setCertificateStyle(e.target.value as CertificateStyle)}
                    className="w-full border border-gray-300 rounded-md p-2 text-sm"
                  >
                    <option value="elegant">Elegant</option>
                    <option value="modern">Modern</option>
                    <option value="classic">Classic</option>
                    <option value="minimal">Minimal</option>
                  </select>
                </div>
                
                <button 
                  onClick={generateCertificate} 
                  className="w-full py-3 px-4 rounded-lg transition-all font-medium shadow-md bg-green-600 text-white hover:bg-green-700"
                >
                  Download Certificate
                </button>
              </div>
            )}
            
            {/* Message for registered but not present users */}
            {!isPresent && isRegistered && (
              <div className="mt-4 border-t pt-4">
                <h3 className="text-xl font-medium mb-4">Certificate</h3>
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md text-center">
                  <p className="text-amber-600 font-medium">
                    Your attendance has not been marked for this event.
                  </p>
                  <p className="text-gray-600 mt-2 text-sm">
                    Certificate will be available once your attendance is confirmed.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Certificate Preview - Only shown if user is present */}
          {isPresent && (
            <div className="w-full max-w-5xl mx-auto">
              <h3 className="text-lg font-medium text-gray-700 mb-4 text-center">Certificate Preview</h3>
              
              {/* Certificate Container */}
              <div 
                id="certificate" 
                className={`w-full max-w-full h-auto aspect-[842/595] mx-auto relative ${getBackgroundStyle()} p-8 shadow-2xl rounded-lg overflow-hidden font-serif`}
              >
                {/* Certificate Border */}
                <div className={`absolute inset-2 ${getBorderStyle()} rounded-lg`}></div>
                
                {/* Ornamental Corner Elements */}
                <div className="absolute top-6 left-6 w-16 h-16 border-t-4 border-l-4 border-indigo-400 rounded-tl-lg"></div>
                <div className="absolute top-6 right-6 w-16 h-16 border-t-4 border-r-4 border-indigo-400 rounded-tr-lg"></div>
                <div className="absolute bottom-6 left-6 w-16 h-16 border-b-4 border-l-4 border-indigo-400 rounded-bl-lg"></div>
                <div className="absolute bottom-6 right-6 w-16 h-16 border-b-4 border-r-4 border-indigo-400 rounded-br-lg"></div>
                
                {/* Logo Section - Using logos from event data */}
                {eventData && eventData.logos && eventData.logos.length > 0 ? (
                  <div className="absolute top-10 left-0 right-0 flex justify-center gap-8">
                    {eventData.logos.map((logo: string, index: number) => (
                      <img 
                        key={index} 
                        src={logo} 
                        alt={`Organization logo ${index + 1}`} 
                        className="h-16 w-auto object-contain" 
                      />
                    ))}
                  </div>
                ) : (
                  <div className="absolute top-10 left-0 right-0 flex justify-center">
                    <div className="h-16 w-16 bg-gray-200 rounded-full flex items-center justify-center text-gray-500">
                      LOGO
                    </div>
                  </div>
                )}
                
                {/* Certificate Content */}
                <div className="flex flex-col items-center justify-center h-full text-center px-16">
                  <div className="mb-2 text-gray-500 uppercase tracking-wider text-sm font-semibold">Official Certificate</div>
                  <h1 className="text-4xl font-bold text-indigo-800 mb-4 font-serif tracking-wide">Certificate of Participation</h1>
                  
                  <div className="w-40 h-1 bg-gradient-to-r from-indigo-300 to-blue-300 rounded-full mb-6"></div>
                  
                  <p className="text-lg text-gray-600 mb-2">This is to certify that</p>
                  <h2 className="text-3xl text-indigo-600 font-bold my-2 font-serif">
                    {certificateName.trim() ? certificateName : userProfile.name}
                  </h2>
                  
                  <p className="text-lg text-gray-600 max-w-lg my-4">
                    of {userProfile.batch} batch, {userProfile.branch} branch, has successfully
                    participated in {eventData.name} organized by {organizerName}.
                  </p>
                  
                  <div className="w-32 h-0.5 bg-gray-200 my-4"></div>
                  
                  <p className="text-gray-600 mb-4">Issued on: {currentDate}</p>
                  
                  {/* Certificate Number & Verification */}
                  <p className="text-xs text-gray-400 mt-2">Certificate ID: {Math.random().toString(36).substring(2, 12).toUpperCase()}</p>
                </div>
                
                {/* Signature Section */}
                <div className="absolute bottom-16 right-20 flex flex-col items-center">
                  <img src={signatureImage} alt="Signature" className="w-40 mb-2" />
                  <p className="text-sm text-gray-600 font-semibold">Authorized Signature</p>
                </div>
                
                {/* Watermark */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 opacity-5">
                  <div className="w-96 h-96 border-8 border-indigo-800 rounded-full flex items-center justify-center">
                    <div className="w-80 h-80 border-4 border-indigo-700 rounded-full flex items-center justify-center">
                      <div className="text-8xl font-bold text-indigo-900">
                        {eventData.name ? eventData.name.substring(0, 3).toUpperCase() : "CERT"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="text-center text-gray-500 text-sm mt-4 mb-8">
                <p>Preview scales automatically. Download for correct proportions.</p>
              </div>
            </div>
          )}
        </>
      ) : (
        <p>No event details available</p>
      )}
    </div>
  );
};

export default EventDetails;