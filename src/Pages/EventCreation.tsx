import React, { useState, useEffect } from "react";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { useParams } from 'react-router-dom';
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getFirestore, doc, getDoc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
// @ts-ignore
import { storage } from "../firebaseConfig";

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
  const [paymentScreenshot, setPaymentScreenshot] = useState<File | null>(null);
  const [paymentScreenshotPreview, setPaymentScreenshotPreview] = useState<string | null>(null);
  const [isUploadingPayment, setIsUploadingPayment] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile>({
    name: "",
    email: "",
    uid: "",
    batch: "",
    branch: "",
    division: "",
    year: 0
  });

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
      const organizerDocRef = doc(db, "organizers", organizerEmail);
      const organizerDoc = await getDoc(organizerDocRef);

      if (organizerDoc.exists()) {
        setOrganizerData(organizerDoc.data());
      }
    } catch (error) {
      console.error("Error fetching organizer data: ", error);
    }
  };

  useEffect(() => {
    if (id) {
      const fetchEventDetails = async () => {
        try {
          const docRef = doc(db, 'event', id);
          const docSnap = await getDoc(docRef);

          if (docSnap.exists()) {
            const data = docSnap.data();
            setEventData(data);

            if (data.organiser) {
              fetchOrganizerData(data.organiser);
            }

            if (userEmail && data.Participants?.includes(userEmail)) {
              setIsRegistered(true);
            }
            
            if (userEmail && data.attendees) {
              const userAttendance = data.attendees.find((attendee: any) => 
                attendee.email === userEmail || attendee.email === `"${userEmail}"`
              );
              
              if (userAttendance) {
                setIsPresent(true);
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

  const handlePaymentScreenshotChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const selectedFile = event.target.files[0];
      setPaymentScreenshot(selectedFile);
      
      const reader = new FileReader();
      reader.onload = (e) => {
        setPaymentScreenshotPreview(e.target?.result as string);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const uploadPaymentProof = async () => {
    if (!paymentScreenshot || !userEmail || !id) return;

    setIsUploadingPayment(true);
    try {
      const fileName = `eventPosters/payment_${id}_${userEmail.replace(/[@.]/g, '_')}_${Date.now()}.${paymentScreenshot.name.split('.').pop()}`;
      const storageRef = ref(storage, fileName);
      
      await uploadBytes(storageRef, paymentScreenshot);
      const downloadURL = await getDownloadURL(storageRef);
      
      const eventRef = doc(db, 'event', id);
      await updateDoc(eventRef, {
        paymentProofs: arrayUnion({
          userEmail,
          proofURL: downloadURL,
          timestamp: new Date()
        }),
        Participants: arrayUnion(userEmail),
      });
      
      setRegisterMessage('Payment proof uploaded and registration successful!');
      setIsRegistered(true);
    } catch (error) {
      console.error('Error uploading payment proof:', error);
      setRegisterMessage('Failed to upload payment proof. Please try again.');
    } finally {
      setIsUploadingPayment(false);
    }
  };

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
    if (!isPresent) return;
    
    const hiddenContainer = document.createElement('div');
    hiddenContainer.style.position = 'absolute';
    hiddenContainer.style.left = '-9999px';
    hiddenContainer.style.width = '842px';
    hiddenContainer.style.height = '595px';
    
    const certificateElement = document.getElementById("certificate");
    if (!certificateElement) return;
    
    const certificateClone = certificateElement.cloneNode(true) as HTMLElement;
    certificateClone.className = `${getBackgroundStyle()} p-8 rounded-lg overflow-hidden font-serif`;
    certificateClone.style.width = '842px';
    certificateClone.style.height = '595px';
    
    hiddenContainer.appendChild(certificateClone);
    document.body.appendChild(hiddenContainer);
    
    try {
      const canvas = await html2canvas(certificateClone, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: null
      });
      
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      
      const displayName = certificateName.trim() ? certificateName : userProfile.name;
      pdf.save(`certificate_${displayName}_${eventData.name}.pdf`);
    } finally {
      document.body.removeChild(hiddenContainer);
    }
  };

  const getBackgroundStyle = () => {
    switch (certificateStyle) {
      case "classic": return "bg-gradient-to-r from-amber-50 to-yellow-50";
      case "modern": return "bg-gradient-to-r from-indigo-50 to-purple-50";
      case "elegant": return "bg-gradient-to-r from-blue-50 to-indigo-50";
      case "minimal": return "bg-white";
      default: return "bg-gradient-to-r from-blue-50 to-indigo-50";
    }
  };

  const getBorderStyle = () => {
    switch (certificateStyle) {
      case "classic": return "border-8 border-double border-amber-200";
      case "modern": return "border-4 border-solid border-indigo-300";
      case "elegant": return "border-8 border-double border-blue-200";
      case "minimal": return "border-2 border-solid border-gray-300";
      default: return "border-8 border-double border-blue-200";
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#246d8c]"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center">
        <div className="bg-red-50 border-l-4 border-red-500 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const currentDate = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  const organizerName = organizerData?.name || (eventData.organiser ? eventData.organiser.split('@')[0] : "Unknown Organizer");

  return (
    <div className="p-4 flex flex-col items-center bg-white">
      {eventData ? (
        <>
          <div className="bg-white max-w-4xl w-full p-6 rounded-lg mb-8 shadow-md">
            <div className="flex flex-col md:flex-row gap-6">
              {/* Event Details Column */}
              <div className="md:w-1/2">
                <div className="flex items-center justify-between mb-4">
                  <h1 className="text-2xl font-bold text-gray-800">{organizerName}</h1>
                  {isRegistered && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                      Registered
                    </span>
                  )}
                </div>

                <div className="w-full h-64 rounded-lg overflow-hidden mb-4">
                  <img 
                    src={eventData.poster} 
                    alt={eventData.name} 
                    className="object-cover w-full h-full" 
                  />
                </div>

                <h2 className="text-xl font-bold text-gray-800 mb-3">{eventData.name}</h2>

                <div className="space-y-3 mb-6">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-[#246d8c] mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                    </svg>
                    <span className="text-gray-700">{eventData.event_date} at {eventData.event_time}</span>
                  </div>
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-[#246d8c] mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                    </svg>
                    <span className="text-gray-700">{eventData.venue}</span>
                  </div>
                  {eventData.paymentEnabled && (
                    <div className="flex items-center">
                      <svg className="w-5 h-5 text-[#246d8c] mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                      </svg>
                      <span className="text-gray-700">₹{eventData.price} (Payment Required)</span>
                    </div>
                  )}
                </div>

                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">Description</h3>
                  <p className="text-gray-600 leading-relaxed">{eventData.description}</p>
                </div>

                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">Coordinators</h3>
                  <div className="space-y-3">
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="font-medium text-gray-800">{eventData.coordinator1?.name || 'N/A'}</p>
                      <p className="text-gray-600">{eventData.coordinator1?.phone || ''}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="font-medium text-gray-800">{eventData.coordinator2?.name || 'N/A'}</p>
                      <p className="text-gray-600">{eventData.coordinator2?.phone || ''}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Registration and Certificate Column */}
              <div className="md:w-1/2">
                {/* Registration Status Section */}
                {isRegistered ? (
                  <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-3 mb-3">
                      <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                      </svg>
                      <h3 className="text-lg font-medium text-green-800">Registration Confirmed</h3>
                    </div>
                    
                    {eventData.paymentEnabled ? (
                      <>
                        <p className="text-gray-700 mb-3">
                          Thank you for registering for this paid event. Your payment proof has been received.
                        </p>
                        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3">
                          <p className="text-yellow-700 text-sm">
                            <strong>Note:</strong> To request an unregistration, please contact the event coordinator.
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <p className="text-gray-700 mb-4">
                          You're all set for the event! If your plans have changed, you can unregister below.
                        </p>
                        <button
                          onClick={handleUnregister}
                          className="w-full bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded-md transition-colors flex items-center justify-center gap-2"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                          </svg>
                          Unregister
                        </button>
                      </>
                    )}
                  </div>
                ) : eventData.paymentEnabled ? (
                  <div className="mb-6">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                      <h3 className="text-lg font-medium text-blue-800 mb-2">Complete Your Registration</h3>
                      <p className="text-blue-700">
                        This event requires payment of <span className="font-bold">₹{eventData.price}</span>
                      </p>
                    </div>
                    
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Upload Payment Screenshot
                      </label>
                      {paymentScreenshotPreview ? (
                        <div className="relative mb-3">
                          <img 
                            src={paymentScreenshotPreview} 
                            alt="Payment screenshot preview" 
                            className="w-full h-auto max-h-48 object-contain border border-gray-200 rounded-lg"
                          />
                          <button
                            onClick={() => {
                              setPaymentScreenshot(null);
                              setPaymentScreenshotPreview(null);
                            }}
                            className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center"
                          >
                            ×
                          </button>
                        </div>
                      ) : (
                        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                          <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <svg className="w-10 h-10 mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                            </svg>
                            <p className="mb-2 text-sm text-gray-500">
                              <span className="font-semibold">Click to upload</span> your payment receipt
                            </p>
                            <p className="text-xs text-gray-500">PNG, JPG (MAX. 5MB)</p>
                          </div>
                          <input 
                            id="payment-screenshot" 
                            type="file" 
                            className="hidden" 
                            accept="image/*"
                            onChange={handlePaymentScreenshotChange}
                          />
                        </label>
                      )}
                    </div>

                    <button
                      onClick={uploadPaymentProof}
                      disabled={!paymentScreenshot || isUploadingPayment}
                      className={`w-full py-3 rounded-md text-lg font-medium mb-4 flex items-center justify-center gap-2 ${
                        !paymentScreenshot || isUploadingPayment
                          ? 'bg-gray-400 cursor-not-allowed'
                          : 'bg-green-600 hover:bg-green-700 text-white'
                      }`}
                    >
                      {isUploadingPayment ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Processing...
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                          </svg>
                          Complete Registration
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="mb-6">
                    <button
                      onClick={handleRegister}
                      className="w-full bg-[#246d8c] hover:bg-[#1e5a77] text-white py-3 rounded-md text-lg font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"></path>
                      </svg>
                      Register Now
                    </button>
                  </div>
                )}

                {registerMessage && (
                  <div className={`p-3 rounded-lg mb-6 ${
                    registerMessage.includes('successful') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                  }`}>
                    {registerMessage}
                  </div>
                )}

                {/* Certificate Section */}
                {isPresent ? (
                  <div className="border-t pt-6">
                    <h3 className="text-xl font-semibold text-gray-800 mb-4">Your Certificate</h3>
                    
                    <div className="mb-4">
                      <label htmlFor="certificate-name" className="block text-sm font-medium text-gray-700 mb-2">
                        Certificate Name
                      </label>
                      <input
                        id="certificate-name"
                        type="text"
                        value={certificateName}
                        onChange={(e) => setCertificateName(e.target.value)}
                        placeholder="Enter name for certificate"
                        className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-[#246d8c] focus:border-[#246d8c]"
                      />
                    </div>
                    
                    <div className="mb-4">
                      <label htmlFor="certificate-style" className="block text-sm font-medium text-gray-700 mb-2">
                        Certificate Design
                      </label>
                      <select
                        id="certificate-style"
                        value={certificateStyle}
                        onChange={(e) => setCertificateStyle(e.target.value as CertificateStyle)}
                        className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-[#246d8c] focus:border-[#246d8c]"
                      >
                        <option value="elegant">Elegant</option>
                        <option value="modern">Modern</option>
                        <option value="classic">Classic</option>
                        <option value="minimal">Minimal</option>
                      </select>
                    </div>
                    
                    <button 
                      onClick={generateCertificate} 
                      className="w-full py-3 px-4 rounded-lg font-medium shadow-md bg-[#246d8c] text-white hover:bg-[#1e5a77] transition-colors flex items-center justify-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                      </svg>
                      Download Certificate
                    </button>
                  </div>
                ) : isRegistered && (
                  <div className="border-t pt-6">
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                        </svg>
                        <h3 className="text-lg font-medium text-yellow-800">Certificate Not Available Yet</h3>
                      </div>
                      <p className="text-yellow-700 text-sm">
                        Your certificate will be available after your attendance is confirmed by the organizers.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Certificate Preview */}
          {isPresent && (
            <div className="w-full max-w-4xl mx-auto mb-12">
              <h3 className="text-lg font-medium text-gray-700 mb-4 text-center">Certificate Preview</h3>
              
              <div 
                id="certificate" 
                className={`w-full aspect-[842/595] mx-auto relative ${getBackgroundStyle()} p-4 md:p-8 shadow-2xl rounded-lg overflow-hidden font-serif`}
              >
                <div className={`absolute inset-2 ${getBorderStyle()} rounded-lg`}></div>
                
                <div className="flex flex-col items-center justify-center h-full w-full text-center px-2 sm:px-4 md:px-16 relative">
                  <div className="mt-2 md:mt-4 mb-2 md:mb-4 flex justify-center gap-4 md:gap-8">
                    {eventData && eventData.logos && eventData.logos.length > 0 ? (
                      <>
                        {eventData.logos.map((logo: string, index: number) => (
                          <img 
                            key={index} 
                            src={logo} 
                            alt={`Organization logo ${index + 1}`} 
                            className="h-8 md:h-16 w-auto object-contain" 
                          />
                        ))}
                      </>
                    ) : (
                      <div className="h-8 md:h-16 w-8 md:w-16 bg-gray-200 rounded-full flex items-center justify-center text-gray-500 text-xs md:text-base">
                        LOGO
                      </div>
                    )}
                  </div>
                  
                  <div className="mb-1 md:mb-2 text-gray-500 uppercase tracking-wider text-xs md:text-sm font-semibold">Certificate of Participation</div>
                  <h1 className="text-2xl md:text-4xl font-bold text-indigo-800 mb-2 md:mb-4 font-serif tracking-wide">Certificate of Achievement</h1>
                  
                  <div className="w-20 md:w-40 h-0.5 md:h-1 bg-gradient-to-r from-indigo-300 to-blue-300 rounded-full mb-3 md:mb-6"></div>
                  
                  <p className="text-sm md:text-lg text-gray-600 mb-1 md:mb-2">This is to certify that</p>
                  <h2 className="text-xl md:text-3xl text-indigo-600 font-bold my-1 md:my-2 font-serif">
                    {certificateName.trim() ? certificateName : userProfile.name}
                  </h2>
                  
                  <p className="text-xs md:text-lg text-gray-600 max-w-lg my-2 md:my-4">
                    has successfully participated in <strong>{eventData.name}</strong> organized by <strong>{organizerName}</strong>.
                  </p>
                  
                  <div className="w-16 md:w-32 h-0.5 bg-gray-200 my-2 md:my-4"></div>
                  
                  <p className="text-xs md:text-base text-gray-600 mb-2 md:mb-4">Issued on: {currentDate}</p>
                  
                  <div className="mt-2 md:mt-4 flex flex-col items-center">
                    <img src={signatureImage} alt="Signature" className="w-20 md:w-40 mb-1 md:mb-2" />
                    <p className="text-xs md:text-sm text-gray-600 font-semibold">Authorized Signature</p>
                  </div>
                  
                  <p className="text-xxs md:text-xs text-gray-400 mt-2 absolute bottom-2 md:bottom-4 left-0 right-0 text-center">
                    Certificate ID: {Math.random().toString(36).substring(2, 12).toUpperCase()}
                  </p>
                  
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 opacity-5 pointer-events-none">
                    <div className="w-48 h-48 md:w-96 md:h-96 border-4 md:border-8 border-indigo-800 rounded-full flex items-center justify-center">
                      <div className="w-40 h-40 md:w-80 md:h-80 border-2 md:border-4 border-indigo-700 rounded-full flex items-center justify-center">
                        <div className="text-4xl md:text-8xl font-bold text-indigo-900">
                          {eventData.name ? eventData.name.substring(0, 3).toUpperCase() : "CERT"}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="text-center text-gray-500 text-sm mt-4">
                <p>Certificate will be generated in high quality when downloaded.</p>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="p-4 text-center">
          <div className="bg-gray-50 border-l-4 border-gray-500 p-4 max-w-md mx-auto">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-gray-700">No event details available</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventDetails;