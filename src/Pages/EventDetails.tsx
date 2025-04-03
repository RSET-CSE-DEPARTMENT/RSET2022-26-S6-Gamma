import React, { useState, useEffect } from "react";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { useParams } from 'react-router-dom';
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getFirestore, doc, getDoc, updateDoc, arrayUnion } from "firebase/firestore";
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
  const [isEventClosed, setIsEventClosed] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile>({
    name: "",
    email: "",
    uid: "",
    batch: "",
    branch: "",
    division: "",
    year: 0
  });
  const [rating, setRating] = useState<number | null>(null);
  const [comment, setComment] = useState<string>("");
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [userFeedback, setUserFeedback] = useState<any>(null);

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
            setIsEventClosed(data.status === 'closed');

            if (data.organiser) {
              fetchOrganizerData(data.organiser);
            }

            if (userEmail && data.Participants?.includes(userEmail)) {
              setIsRegistered(true);
            }
            
            // Only check attendance if event is closed
            if (userEmail && data.attendees && data.status === 'closed') {
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

  const submitFeedback = async () => {
    if (!userEmail || !id || rating === null || isSubmittingFeedback) return;
  
    setIsSubmittingFeedback(true);
    try {
      const feedbackData = {
        email: userEmail,
        rating,
        comment,
        timestamp: new Date(),
        userName: userProfile.name
      };
  
      const eventRef = doc(db, 'event', id);
      await updateDoc(eventRef, {
        feedback: arrayUnion(feedbackData)
      });
  
      setFeedbackSubmitted(true);
      setUserFeedback(feedbackData);
    } catch (error) {
      console.error('Error submitting feedback:', error);
      setRegisterMessage('Failed to submit feedback. Please try again.');
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

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
    if (!paymentScreenshot || !userEmail || !id || isEventClosed) return;

    setIsUploadingPayment(true);
    try {
      const fileName = `payment_proofs/${id}_${userEmail}_${Date.now()}.${paymentScreenshot.name.split('.').pop()}`;
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
    if (!userEmail || isEventClosed) {
      setRegisterMessage('Registration is closed for this event.');
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


  const generateCertificate = async () => {
    if (!isPresent || !isEventClosed) return;
    
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

  useEffect(() => {
    if (id) {
      const fetchEventDetails = async () => {
        try {
          const docRef = doc(db, 'event', id);
          const docSnap = await getDoc(docRef);
  
          if (docSnap.exists()) {
            const data = docSnap.data();
            setEventData(data);
            setIsEventClosed(data.status === 'closed');
  
            if (data.organiser) {
              fetchOrganizerData(data.organiser);
            }
  
            if (userEmail && data.Participants?.includes(userEmail)) {
              setIsRegistered(true);
            }
            
            // Check for existing feedback
            if (userEmail && data.feedback) {
              const userFeedback = data.feedback.find((f: any) => f.email === userEmail);
              if (userFeedback) {
                setFeedbackSubmitted(true);
                setUserFeedback(userFeedback);
                setRating(userFeedback.rating);
                setComment(userFeedback.comment);
              }
            }
            
            // Only check attendance if event is closed
            if (userEmail && data.attendees && data.status === 'closed') {
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

  const organizerName = organizerData?.name || (eventData?.organiser ? eventData.organiser.split('@')[0] : "Unknown Organizer");

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

            {isEventClosed && (
              <div className="bg-red-100 text-red-800 p-2 rounded-md mb-4 text-center">
                This event has been closed
              </div>
            )}

            <p className="text-[#246d8c] font-medium mb-4"><strong>Date:</strong> {eventData.event_date}</p>
            <p className="text-[#246d8c] font-medium mb-4"><strong>Venue:</strong> {eventData.venue}</p>
            <p className="text-[#246d8c] font-medium mb-4"><strong>Time:</strong> {eventData.event_time}</p>
            <p className="text-[#246d8c] font-medium mb-4"><strong>Participants:</strong> {eventData.num_of_participants}</p>
            {eventData.paymentEnabled && (
              <p className="text-[#246d8c] font-medium mb-4">
                <strong>Price:</strong> ₹{eventData.price}
              </p>
            )}

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

            {/* Registration Status Section */}
            <div className="mb-6 border-t pt-4">
              {isRegistered ? (
                <div className="p-4 bg-green-50 border border-green-200 rounded-md text-center">
                  <p className="text-green-600 font-medium">
                    You are registered for this event!
                  </p>
                 
                  {eventData.paymentEnabled && !paymentScreenshotPreview && (
                    <p className="text-sm text-gray-600 mt-2">
                      As you have already paid for the event, talk the event coordinators to unregister.
                    </p>
                  )}
                </div>
              ) : !isEventClosed ? (
                eventData.paymentEnabled ? (
                  <>
                    <h3 className="text-lg font-medium mb-3">Payment Information</h3>
                    <p className="text-gray-700 mb-3">
                      This event requires payment of ₹{eventData.price}
                    </p>
                    
                    <div className="mb-3">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Upload Payment Screenshot
                      </label>
                      {paymentScreenshotPreview ? (
                        <div className="relative mb-2">
                          <img 
                            src={paymentScreenshotPreview} 
                            alt="Payment screenshot preview" 
                            className="w-full h-auto max-h-48 object-contain border border-gray-200 rounded"
                          />
                          <button
                            onClick={() => {
                              setPaymentScreenshot(null);
                              setPaymentScreenshotPreview(null);
                            }}
                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center"
                          >
                            ×
                          </button>
                        </div>
                      ) : (
                        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                          <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <svg className="w-8 h-8 mb-4 text-gray-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
                              <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"/>
                            </svg>
                            <p className="mb-2 text-sm text-gray-500"><span className="font-semibold">Click to upload</span> or drag and drop</p>
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
                      className={`w-full py-3 rounded-md text-lg font-medium mb-4 ${
                        !paymentScreenshot || isUploadingPayment
                          ? 'bg-gray-400 cursor-not-allowed'
                          : 'bg-green-600 hover:bg-green-700 text-white'
                      }`}
                    >
                      {isUploadingPayment ? 'Processing...' : 'Submit Payment & Register'}
                    </button>
                  </>
                ) : (
                  <button
                    className="w-full bg-[#246d8c] text-white py-3 rounded-md text-lg font-medium mb-4"
                    onClick={handleRegister}
                  >
                    Register
                  </button>
                )
              ) : (
                <div className="w-full bg-gray-400 text-white py-3 rounded-md text-lg font-medium mb-4 text-center cursor-not-allowed">
                  Registration Closed
                </div>
              )}
            </div>

            {registerMessage && <p className="text-center text-green-600 mb-4">{registerMessage}</p>}

    
 

{isEventClosed && isPresent && (
  <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-md">
    <h3 className="text-lg font-medium text-gray-700 mb-3 text-center">
      {feedbackSubmitted ? 'Thank you for your feedback!' : 'How was the event?'}
    </h3>
    
    {feedbackSubmitted ? (
      <div className="text-center">
        <div className="flex justify-center mb-2">
          {[...Array(5)].map((_, i) => (
            <svg
              key={i}
              className={`w-6 h-6 ${i < userFeedback.rating ? 'text-yellow-400' : 'text-gray-300'}`}
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          ))}
        </div>
        {userFeedback.comment && (
          <p className="text-gray-600 italic">"{userFeedback.comment}"</p>
        )}
      </div>
    ) : (
      <>
        <div className="flex justify-center mb-4">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onClick={() => setRating(star)}
              className="focus:outline-none"
            >
              <svg
                className={`w-8 h-8 mx-1 ${rating && star <= rating ? 'text-yellow-400' : 'text-gray-300'}`}
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            </button>
          ))}
        </div>
        
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Share your experience (optional)"
          className="w-full border border-gray-300 rounded-md p-2 text-sm mb-3 min-h-[80px]"
        />
        
        <button
          onClick={submitFeedback}
          disabled={rating === null || isSubmittingFeedback}
          className={`w-full py-2 rounded-md text-sm font-medium ${
            rating === null || isSubmittingFeedback
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          {isSubmittingFeedback ? 'Submitting...' : 'Submit Feedback'}
        </button>
      </>
    )}
  </div>
)}

            {/* Certificate Section - Only show if event is closed */}
            {isEventClosed && (
              <div className="mt-4 border-t pt-4 w-full">
                <h3 className="text-xl font-medium mb-4">Certificate</h3>
                
                {isPresent ? (
                  <>
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
                  </>
                ) : isRegistered ? (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md text-center">
                    <p className="text-amber-600 font-medium">
                      Your attendance was not marked for this event.
                    </p>
                    <p className="text-gray-600 mt-2 text-sm">
                      Please contact the event organizers to verify your participation.
                    </p>
                  </div>
                ) : (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-md text-center">
                    <p className="text-blue-600 font-medium">
                      Certificates are only available for attended participants.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Certificate Preview - Only show if event is closed and user is present */}
          {isEventClosed && isPresent && (
            <div className="w-full max-w-5xl mx-auto mt-6">
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
                  
                  <div className="mb-1 md:mb-2 text-gray-500 uppercase tracking-wider text-xs md:text-sm font-semibold">Official Certificate</div>
                  <h1 className="text-2xl md:text-4xl font-bold text-indigo-800 mb-2 md:mb-4 font-serif tracking-wide">Certificate of Participation</h1>
                  
                  <div className="w-20 md:w-40 h-0.5 md:h-1 bg-gradient-to-r from-indigo-300 to-blue-300 rounded-full mb-3 md:mb-6"></div>
                  
                  <p className="text-sm md:text-lg text-gray-600 mb-1 md:mb-2">This is to certify that</p>
                  <h2 className="text-xl md:text-3xl text-indigo-600 font-bold my-1 md:my-2 font-serif">
                    {certificateName.trim() ? certificateName : userProfile.name}
                  </h2>
                  
                  <p className="text-xs md:text-lg text-gray-600 max-w-lg my-2 md:my-4">
                    of {userProfile.batch} batch, {userProfile.branch} branch, has successfully
                    participated in {eventData.name} organized by {organizerName}.
                  </p>
                  
                  <div className="w-16 md:w-32 h-0.5 bg-gray-200 my-2 md:my-4"></div>
                  
                  <p className="text-xs md:text-base text-gray-600 mb-2 md:mb-4">Issued on: {currentDate}</p>
                  
                  <div className="mt-2 md:mt-4 flex flex-col items-center">
                    <img src={signatureImage} alt="Signature" className="w-20 md:w-40 mb-1 md:mb-2" />
                    <p className="text-xs md:text-sm text-gray-600 font-semibold">Authorized Signature</p>
                  </div>
                  
                  <p className="text-xxs md:text-xs text-gray-400 mt-2 absolute bottom-2 md:bottom-4 left-0 right-0">
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
              
              <div className="text-center text-gray-500 text-sm mt-4 mb-8">
                <p>Certificate will display correctly on all devices when downloaded.</p>
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