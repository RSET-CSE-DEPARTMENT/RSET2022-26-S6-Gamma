import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
// @ts-ignore
import { db, collection, addDoc, auth, storage } from "../firebaseConfig";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getDoc, doc, Timestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

const CreateEvent: React.FC = () => {
  const navigate = useNavigate();
  const auth = getAuth();
  const [organizerName, setOrganizerName] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [file, setFile] = useState<File | null>(null);
  const [logoFiles, setLogoFiles] = useState<File[]>([]);
  const [logoPreviews, setLogoPreviews] = useState<string[]>([]);
  const [posterPreview, setPosterPreview] = useState<string | null>(null);
  const [enablePayment, setEnablePayment] = useState<boolean>(false);

  const [eventData, setEventData] = useState({
    category: "",
    coordinator1: { name: "", phone: "" },
    coordinator2: { name: "", phone: "" },
    date: "",
    description: "",
    duration: "",
    event_date: "",
    event_time: "",
    name: "",
    num_of_participants: "",
    organiser: "",
    participants: [""],
    poster: null,
    logos: [],
    venue: "",
    paymentEnabled: false,
    price: "",
  });

  useEffect(() => {
    const fetchOrganizerName = async () => {
      const user = auth.currentUser;

      if (user) {
        // @ts-ignore
        const docRef = doc(db, "organizers", user.email);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setOrganizerName(data.name || "Default Organizer Name");
        } else {
          setOrganizerName("Default Organizer Name");
        }
      } else {
        setOrganizerName("Guest");
      }
      setLoading(false);
    };

    fetchOrganizerName();
  }, [auth]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setEventData((prevData) => ({
          ...prevData,
          organiser: user.displayName || user.email || "Unknown Organizer",
        }));
      }
    });

    return () => unsubscribe();
  }, [auth]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setEventData({ ...eventData, [name]: value });
  };

  const handleCoordinatorChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    index: number
  ) => {
    const { name, value } = e.target;
    const key = `coordinator${index + 1}`;
    setEventData({
      ...eventData,
      // @ts-ignore
      [key]: { ...eventData[key as keyof typeof eventData], [name]: value },
    });
  };

  const handlePosterChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const selectedFile = event.target.files[0];
      setFile(selectedFile);
      
      const reader = new FileReader();
      reader.onload = (e) => {
        setPosterPreview(e.target?.result as string);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleLogoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const selectedFile = event.target.files[0];
      const newLogoFiles = [...logoFiles, selectedFile];
      setLogoFiles(newLogoFiles);
      
      const reader = new FileReader();
      reader.onload = (e) => {
        setLogoPreviews(prevPreviews => [...prevPreviews, e.target?.result as string]);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const removeLogoAt = (index: number) => {
    const newLogoFiles = [...logoFiles];
    const newLogoPreviews = [...logoPreviews];
    
    newLogoFiles.splice(index, 1);
    newLogoPreviews.splice(index, 1);
    
    setLogoFiles(newLogoFiles);
    setLogoPreviews(newLogoPreviews);
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value) || 0;
    // @ts-ignore
    setEventData({ ...eventData, price: value });
  };

  const togglePaymentOption = () => {
    const newPaymentState = !enablePayment;
    setEnablePayment(newPaymentState);
    setEventData({
      ...eventData,
      paymentEnabled: newPaymentState,
      // @ts-ignore
      price: newPaymentState ? eventData.price : 0,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let posterURL = null;
      let logoURLs: string[] = [];
      
      if (file) {
        // @ts-ignore
        const posterRef = ref(storage, `eventPosters/${file.name}`);
        // @ts-ignore
        const posterSnapshot = await uploadBytes(posterRef, file);
        posterURL = await getDownloadURL(posterSnapshot.ref);
      }
      
      for (let i = 0; i < logoFiles.length; i++) {
        const logoFile = logoFiles[i];
        // @ts-ignore
        const logoRef = ref(storage, `eventLogos/${Date.now()}_${logoFile.name}`);
        // @ts-ignore
        const logoSnapshot = await uploadBytes(logoRef, logoFile);
        const logoURL = await getDownloadURL(logoSnapshot.ref);
        logoURLs.push(logoURL);
      }

      await addDoc(collection(db, "event"), {
        ...eventData,
        date: Timestamp.fromDate(
          new Date(eventData.event_date + "T" + eventData.event_time)
        ),
        poster: posterURL,
        logos: logoURLs,
        paymentEnabled: enablePayment,
        price: enablePayment ? eventData.price : 0,
      });

      alert("Event created successfully!");
      navigate("/OrganiserHomePage/EventCreateSuccess");
    } catch (error) {
      console.error("Error adding event: ", error);
      alert("An error occurred while creating the event.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-[#f6fcf7] flex flex-col items-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-between mb-8">
          <div className="text-xl font-medium text-black">Create Event</div>
          <div className="w-8 h-8 bg-gray-300 rounded-full"></div>
        </div>

        <div className="mb-8">
          <div className="text-lg font-medium text-black mb-2">Event Media</div>
          
          <div className="w-full h-36 mb-4 bg-[#d9d9d9] rounded-md overflow-hidden relative">
            {posterPreview ? (
              <div className="relative w-full h-full">
                <img 
                  src={posterPreview} 
                  alt="Event poster preview" 
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center">
                  <label 
                    htmlFor="event-poster" 
                    className="bg-white text-black px-3 py-1 rounded-md text-sm cursor-pointer hover:bg-gray-100"
                  >
                    Change Poster
                  </label>
                </div>
              </div>
            ) : (
              <label
                htmlFor="event-poster"
                className="flex flex-col items-center justify-center cursor-pointer w-full h-full"
              >
                <div className="text-2xl text-black">+</div>
                <div className="text-base text-black">Add event poster</div>
              </label>
            )}
            <input
              id="event-poster"
              type="file"
              accept="image/*"
              onChange={handlePosterChange}
              className="hidden"
              title="Upload event poster"
              aria-label="Upload event poster"
            />
          </div>
          
          <div className="w-full mb-4">
            <div className="text-base text-black mb-2">Organization Logos (Add up to 3)</div>
            
            {logoPreviews.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {logoPreviews.map((preview, index) => (
                  <div key={index} className="relative w-20 h-20 bg-white rounded-md overflow-hidden border border-gray-200">
                    <img src={preview} alt={`Logo ${index + 1}`} className="w-full h-full object-contain p-1" />
                    <button
                      type="button"
                      onClick={() => removeLogoAt(index)}
                      className="absolute top-0 right-0 bg-red-500 text-white w-5 h-5 rounded-full flex items-center justify-center text-xs"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            {logoFiles.length < 3 && (
              <div className="w-full h-20 bg-[#d9d9d9] rounded-md overflow-hidden relative">
                <label
                  htmlFor="event-logo"
                  className="flex flex-col items-center justify-center cursor-pointer w-full h-full"
                >
                  <div className="text-2xl text-black">+</div>
                  <div className="text-base text-black">Add organization logo</div>
                </label>
                <input
                  id="event-logo"
                  type="file"
                  accept="image/*"
                  onChange={handleLogoChange}
                  className="hidden"
                  title="Upload organization logo"
                  aria-label="Upload organization logo"
                />
              </div>
            )}
            <div className="text-xs text-gray-500 mt-1">These logos will appear on certificates</div>
          </div>
        </div>

        <div className="text-xl font-medium text-black mb-2">Event Details</div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            name="category"
            placeholder="Category"
            value={eventData.category}
            onChange={handleInputChange}
            className="w-full h-12 px-4 bg-white border border-gray-200 rounded-md placeholder-gray-500"
          />
          <input
            type="text"
            name="name"
            placeholder="Event Name"
            value={eventData.name}
            onChange={handleInputChange}
            className="w-full h-12 px-4 bg-white border border-gray-200 rounded-md placeholder-gray-500"
          />
          <input
            type="text"
            name="organiser"
            placeholder="Organizer"
            value={loading ? "Loading..." : organizerName}
            className="w-full h-12 px-4 bg-white border border-gray-200 rounded-md placeholder-gray-500"
            disabled
          />
          <input
            type="text"
            name="venue"
            placeholder="Venue"
            value={eventData.venue}
            onChange={handleInputChange}
            className="w-full h-12 px-4 bg-white border border-gray-200 rounded-md placeholder-gray-500"
          />
          <textarea
            name="description"
            placeholder="Description"
            value={eventData.description}
            onChange={handleInputChange}
            className="w-full h-24 px-4 py-2 bg-white border border-gray-200 rounded-md placeholder-gray-500"
          />
          <input
            type="date"
            name="event_date"
            placeholder="Event Date"
            value={eventData.event_date}
            onChange={handleInputChange}
            className="w-full h-12 px-4 bg-white border border-gray-200 rounded-md placeholder-gray-500"
          />
          <input
            type="time"
            name="event_time"
            placeholder="Event Time"
            value={eventData.event_time}
            onChange={handleInputChange}
            className="w-full h-12 px-4 bg-white border border-gray-200 rounded-md placeholder-gray-500"
          />
          <input
            type="text"
            name="duration"
            placeholder="Duration"
            value={eventData.duration}
            onChange={handleInputChange}
            className="w-full h-12 px-4 bg-white border border-gray-200 rounded-md placeholder-gray-500"
          />
          <input
            type="number"
            name="num_of_participants"
            placeholder="Number of Participants"
            value={eventData.num_of_participants}
            onChange={handleInputChange}
            className="w-full h-12 px-4 bg-white border border-gray-200 rounded-md placeholder-gray-500"
          />

          <div>
            <div className="text-lg font-medium text-black">Coordinator 1</div>
            <input
              type="text"
              name="name"
              placeholder="Coordinator 1 Name"
              value={eventData.coordinator1.name}
              onChange={(e) => handleCoordinatorChange(e, 0)}
              className="w-full h-12 px-4 bg-white border border-gray-200 rounded-md placeholder-gray-500"
            />
            <input
              type="tel"
              name="phone"
              placeholder="Coordinator 1 Phone"
              value={eventData.coordinator1.phone}
              onChange={(e) => handleCoordinatorChange(e, 0)}
              className="w-full h-12 px-4 bg-white border border-gray-200 rounded-md placeholder-gray-500"
            />
          </div>

          <div>
            <div className="text-lg font-medium text-black">Coordinator 2</div>
            <input
              type="text"
              name="name"
              placeholder="Coordinator 2 Name"
              value={eventData.coordinator2.name}
              onChange={(e) => handleCoordinatorChange(e, 1)}
              className="w-full h-12 px-4 bg-white border border-gray-200 rounded-md placeholder-gray-500"
            />
            <input
              type="tel"
              name="phone"
              placeholder="Coordinator 2 Phone"
              value={eventData.coordinator2.phone}
              onChange={(e) => handleCoordinatorChange(e, 1)}
              className="w-full h-12 px-4 bg-white border border-gray-200 rounded-md placeholder-gray-500"
            />
          </div>

          {/* Payment Toggle Section */}
          <div className="flex items-center justify-between mb-2">
            <div className="text-lg font-medium text-black">Enable Payment</div>
            <button
              type="button"
              onClick={togglePaymentOption}
              className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
                enablePayment ? 'bg-[#246D8C]' : 'bg-gray-200'
              }`}
            >
              <span
                className={`${
                  enablePayment ? 'translate-x-6' : 'translate-x-1'
                } inline-block w-4 h-4 transform bg-white rounded-full transition-transform`}
              />
            </button>
          </div>

          {enablePayment && (
            <div className="mb-4">
              <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-1">
                Event Price (₹)
              </label>
              <input
                type="number"
                id="price"
                name="price"
                min="0"
                step="0.01"
                placeholder="Enter event price"
                value={eventData.price}
                onChange={handlePriceChange}
                className="w-full h-12 px-4 bg-white border border-gray-200 rounded-md placeholder-gray-500"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
          >
            {loading ? "Submitting..." : "Create Event"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateEvent;