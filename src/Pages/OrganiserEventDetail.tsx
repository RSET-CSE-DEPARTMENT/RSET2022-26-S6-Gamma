import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { 
  QrCodeIcon, 
  PencilIcon, 
  TrashIcon, 
  LockClosedIcon, 
  DocumentTextIcon,
  ClipboardDocumentIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline';
import { doc, getDoc, deleteDoc, updateDoc } from 'firebase/firestore';
// @ts-ignore
import { db } from '../firebaseConfig';
import { jsPDF } from 'jspdf';

interface EventData {
  id: string;
  name: string;
  organiser: string;
  category: string;
  venue: string;
  event_date: string;
  event_time: string;
  poster: string;
  status?: string;
  registrationOpen?: boolean;
  num_of_participants?: number;
  attendees?: any[];
  coordinators?: { name: string; phone: string }[];
  description?: string;
}

const OrganiserEventDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [eventData, setEventData] = useState<EventData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [showReportForm, setShowReportForm] = useState(false);
  const [reportDetails, setReportDetails] = useState({
    speakers: '',
    advisors: '',
    photo: null as File | null,
    photoPreview: '',
    sessionDetails: '',
    keyTakeaways: ''
  });
  const [generatedReport, setGeneratedReport] = useState('');
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (id) {
      const fetchEventDetails = async () => {
        try {
          const docRef = doc(db, 'event', id);
          const docSnap = await getDoc(docRef);

          if (docSnap.exists()) {
            const data = docSnap.data();
            setEventData({ 
              id: docSnap.id, 
              ...data,
              registrationOpen: data.registrationOpen !== false,
              event_date: data.event_date || data.event_Date,
              event_time: data.event_time || data.eventTime
            } as EventData);
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
  }, [id]);

  const handleDelete = async () => {
    if (!id) return;
    
    const confirmDelete = window.confirm("Are you sure you want to delete this event?");
    if (!confirmDelete) return;

    try {
      await deleteDoc(doc(db, 'event', id));
      alert("Event deleted successfully!");
      navigate('/OrganiserHomePage');
    } catch (error) {
      console.error('Error deleting event:', error);
      alert("Failed to delete event.");
    }
  };

  const handleCloseEvent = async () => {
    if (!id || !eventData) return;
    
    const confirmClose = window.confirm("Are you sure you want to close this event? This will:\n1. Move it to past events\n2. Close registration\n3. Remove it from current events");
    if (!confirmClose) return;

    try {
      const eventRef = doc(db, 'event', id);
      await updateDoc(eventRef, {
        status: 'closed',
        registrationOpen: false
      });
      
      setEventData({
        ...eventData,
        status: 'closed',
        registrationOpen: false
      });
      
      alert("Event closed successfully! Registration is now closed.");
    } catch (error) {
      console.error('Error closing event:', error);
      alert("Failed to close event.");
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setReportDetails({
        ...reportDetails,
        photo: file,
        photoPreview: URL.createObjectURL(file)
      });
    }
  };

  const generateReportWithAI = async () => {
    if (!eventData) return;
    
    setIsGeneratingReport(true);
    
    try {
      const GEMINI_API_KEY = "AIzaSyA5bwSxdTa5HwNgKhpULdbn8mfjuMZ-pkU"; 
      const API_URL = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
  
      const prompt = `Generate a professional event report for "${eventData.name}" with the following format:

**Event Overview**
[Provide a comprehensive overview including date, venue, organizers, and purpose]

**Event Details**
* Speakers
● ${reportDetails.speakers || 'Not specified'}
* Advisors
● ${reportDetails.advisors || 'Not specified'}
* Participants
● ${eventData.num_of_participants || 'Several'} attendees

**Session Highlights**
${reportDetails.sessionDetails || 'No session details provided'}

**Key Takeaways**
${reportDetails.keyTakeaways || 'None recorded'}

**Conclusion**
[Provide a concluding statement about the event's success]

Additional instructions:
- Use **double asterisks** for section headings
- Use *single asterisk* for subheadings
- Use ● bullet points for lists
- Keep paragraphs concise and professional
- Include all provided information in the appropriate sections`;
  
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          safetySettings: [
            {
              category: "HARM_CATEGORY_DANGEROUS_CONTENT",
              threshold: "BLOCK_NONE"
            }
          ],
          generationConfig: {
            temperature: 0.5,
            topP: 0.95,
            topK: 40
          }
        }),
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        console.error('API Error Details:', errorData);
        throw new Error(errorData.error?.message || 'Failed to generate report');
      }
  
      const data = await response.json();
      const reportContent = data.candidates?.[0]?.content?.parts?.[0]?.text 
        || "Could not generate report content";
      
      setGeneratedReport(reportContent);
      setShowReportForm(false);
      
    } catch (error) {
      console.error('API Call Failed:', error);
      generateFallbackReport();
      // @ts-ignore
      alert(`Report generation failed. Showing basic version. Error: ${error.message}`);
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const generateFallbackReport = () => {
    if (!eventData) return;
    
    const fallbackReport = `
**Event Overview**
${eventData.name} was held on ${eventData.event_date} at ${eventData.venue}. 
The event was organized by ${eventData.organiser}.

**Event Details**
* Speakers
● ${reportDetails.speakers || 'Not specified'}
* Advisors
● ${reportDetails.advisors || 'Not specified'}
* Participants
● ${eventData.num_of_participants || 'Several'} attendees

**Session Highlights**
${reportDetails.sessionDetails || 'No session details provided'}

**Key Takeaways**
${reportDetails.keyTakeaways || 'None recorded'}

**Conclusion**
The event concluded successfully with participation from attendees.
    `;
    
    setGeneratedReport(fallbackReport);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedReport);
    alert('Report copied to clipboard!');
  };
  const downloadPDF = async () => {
    if (!eventData) return;
  
    const pdf = new jsPDF();
    
    // Set document properties
    pdf.setProperties({
      title: `${eventData.name} Event Report`,
      subject: 'Event Report',
      author: eventData.organiser,
      keywords: 'event, report, ' + eventData.name,
      creator: 'Event Management System'
    });
    
    // Add title
    pdf.setFontSize(22);
    pdf.setTextColor(0, 51, 102);
    pdf.setFont('helvetica', 'bold');
    pdf.text(eventData.name.toUpperCase(), 105, 20, { align: 'center' });
    
    // Add subtitle
    pdf.setFontSize(14);
    pdf.setTextColor(0, 0, 0);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Event Report - ${eventData.event_date}`, 105, 30, { align: 'center' });
    
    // Add horizontal line
    pdf.setDrawColor(0, 51, 102);
    pdf.setLineWidth(0.5);
    pdf.line(20, 35, 190, 35);
    
    let yPosition = 45;
  
    // Add geotagged photo if available
    if (reportDetails.photoPreview) {
      try {
        // Convert image URL to data URL
        const dataUrl = await getBase64ImageFromUrl(reportDetails.photoPreview);
        
        // Add image to PDF
        const imgProps = pdf.getImageProperties(dataUrl);
        const pdfWidth = pdf.internal.pageSize.getWidth() - 40;
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
        
        pdf.addImage(dataUrl, 'JPEG', 20, yPosition, pdfWidth, pdfHeight);
        yPosition += pdfHeight + 10;
        
        // Add photo caption
        pdf.setFontSize(10);
        pdf.setTextColor(100, 100, 100);
        pdf.text('Geotagged Event Photo', 105, yPosition, { align: 'center' });
        yPosition += 8;
      } catch (error) {
        console.error('Error adding image to PDF:', error);
        pdf.text('[Geotagged Event Photo]', 20, yPosition);
        yPosition += 10;
      }
    }
  
    // Clean and format the generated report
    const formattedReport = generatedReport
      .replace(/\* \*Speakers\*\s*\n%Ï/g, '• Speakers: ')
      .replace(/\* \*Advisors\*\s*\n%Ï/g, '• Advisors: ')
      .replace(/\* \*Participants\*\s*\n%Ï/g, '• Participants: ')
      .replace(/\*\*/g, ''); // Remove any remaining double asterisks
  
    // Process each line
    const lines = formattedReport.split('\n');
  
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) {
        yPosition += 5;
        continue;
      }
  
      // Handle section headings (lines that look like headings)
      if (trimmedLine.match(/^[A-Z][a-z]+( [A-Z][a-z]+)*$/)) {
        if (yPosition > 270) {
          pdf.addPage();
          yPosition = 20;
        }
        pdf.setFontSize(16);
        pdf.setTextColor(0, 51, 102);
        pdf.setFont('helvetica', 'bold');
        pdf.text(trimmedLine, 14, yPosition);
        yPosition += 10;
        continue;
      }
      
      // Handle bullet points (lines starting with •)
      if (trimmedLine.startsWith('•')) {
        if (yPosition > 270) {
          pdf.addPage();
          yPosition = 20;
        }
        pdf.setFontSize(12);
        pdf.setTextColor(0, 0, 0);
        pdf.setFont('helvetica', 'normal');
        
        // Split bullet text if it's too long
        const bulletText = trimmedLine;
        const splitLines = pdf.splitTextToSize(bulletText, 170);
        
        pdf.text(splitLines, 20, yPosition);
        yPosition += 7 * splitLines.length;
        continue;
      }
      
      // Normal text
      if (yPosition > 270) {
        pdf.addPage();
        yPosition = 20;
      }
      pdf.setFontSize(12);
      pdf.setTextColor(0, 0, 0);
      pdf.setFont('helvetica', 'normal');
      
      const splitLines = pdf.splitTextToSize(trimmedLine, 180);
      pdf.text(splitLines, 14, yPosition);
      yPosition += 7 * splitLines.length;
    }
  
    // Add footer
    pdf.setFontSize(10);
    pdf.setTextColor(100, 100, 100);
    pdf.text(`Generated on ${new Date().toLocaleDateString()}`, 105, 285, { align: 'center' });
    
    pdf.save(`${eventData.name.replace(/[^a-z0-9]/gi, '_')}_report.pdf`);
  };
  // Helper function to convert image URL to base64
  const getBase64ImageFromUrl = async (url: string): Promise<string> => {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  if (loading) return (
    <div className="flex justify-center items-center h-40">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>
  );
  
  if (error) return (
    <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
      <p className="text-red-700">{error}</p>
    </div>
  );

  return (
    <div className="w-full max-w-4xl mx-auto p-4">
      {eventData ? (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {/* Event Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 text-white">
            <h1 className="text-2xl font-bold">{eventData.name}</h1>
            <p className="opacity-90">Organized by {eventData.organiser}</p>
          </div>

          {/* Event Content */}
          <div className="p-6">
            <div className="flex flex-col md:flex-row gap-6">
              {/* Event Poster */}
              <div className="w-full md:w-1/3">
                <img 
                  src={eventData.poster} 
                  alt={eventData.name} 
                  className="w-full h-auto rounded-lg shadow-md"
                />
              </div>

              {/* Event Details */}
              <div className="w-full md:w-2/3 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-semibold text-gray-700">Date</h3>
                    <p>{eventData.event_date}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-700">Time</h3>
                    <p>{eventData.event_time || 'Not specified'}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-700">Venue</h3>
                    <p>{eventData.venue}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-700">Category</h3>
                    <p>{eventData.category}</p>
                  </div>
                </div>

                {eventData.description && (
                  <div>
                    <h3 className="font-semibold text-gray-700">Description</h3>
                    <p className="text-gray-600">{eventData.description}</p>
                  </div>
                )}

                {/* Status Badges */}
                <div className="flex flex-wrap gap-2">
                  {eventData.status === 'closed' && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                      Event Closed
                    </span>
                  )}
                  {eventData.registrationOpen === false && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                      Registration Closed
                    </span>
                  )}
                </div>

                {/* Coordinators */}
                {eventData.coordinators && eventData.coordinators.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-gray-700">Coordinators</h3>
                    <ul className="list-disc list-inside">
                      {eventData.coordinators.map((coordinator, index) => (
                        <li key={index}>
                          {coordinator.name} - {coordinator.phone}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-8 flex flex-wrap gap-4 justify-center">
              {eventData.status !== 'closed' && (
                <Link 
                  to={`/OrganiserHomePage/EditEvent/${id}`}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  <PencilIcon className="h-5 w-5" />
                  Edit Event
                </Link>
              )}

              <button 
                onClick={handleDelete}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                <TrashIcon className="h-5 w-5" />
                Delete Event
              </button>

              {eventData.status !== 'closed' && (
                <button 
                  onClick={handleCloseEvent}
                  className="flex items-center gap-2 bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  <LockClosedIcon className="h-5 w-5" />
                  Close Event
                </button>
              )}

              {eventData.status === 'closed' && (
                <button 
                  onClick={() => setShowReportForm(true)}
                  className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  <DocumentTextIcon className="h-5 w-5" />
                  Generate Report
                </button>
              )}

              {eventData.status === 'closed' && (
                <Link
                  to={`/OrganiserFeedbackDetails/${id}`}
                  className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  <DocumentTextIcon className="h-5 w-5" />
                  View Feedback
                </Link>
              )}

              <button 
                onClick={() => navigate(`/OrganiserHomePage/OrganiserEventDetail/Scan${id}`)}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                <QrCodeIcon className="h-5 w-5" />
                Scan Tickets
              </button>

              {/* New Event Details Button */}
              <button 
                onClick={() => navigate(`/OrganiserExtraDetails/${id}`)}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                <DocumentTextIcon className="h-5 w-5" />
                Event Details
              </button>
            </div>

            {/* Report Generation Form */}
            {showReportForm && (
              <div className="mt-8 bg-gray-50 p-6 rounded-lg border border-gray-200">
                <h2 className="text-xl font-bold mb-4 text-gray-800">Generate Event Report</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div className="space-y-2">
                    <h3 className="font-medium text-gray-700">Event Details</h3>
                    <div className="bg-white p-4 rounded-md border border-gray-200">
                      <p><span className="font-medium">Name:</span> {eventData.name}</p>
                      <p><span className="font-medium">Date:</span> {eventData.event_date}</p>
                      <p><span className="font-medium">Time:</span> {eventData.event_time || 'Not specified'}</p>
                      <p><span className="font-medium">Venue:</span> {eventData.venue}</p>
                      <p><span className="font-medium">Organizer:</span> {eventData.organiser}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h3 className="font-medium text-gray-700">Attendance</h3>
                    <div className="bg-white p-4 rounded-md border border-gray-200">
                      <p><span className="font-medium">Participants:</span> {eventData.num_of_participants || 'Not specified'}</p>
                      {eventData.coordinators && (
                        <p><span className="font-medium">Coordinators:</span> {eventData.coordinators.map(c => c.name).join(', ')}</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Speakers (comma separated)</label>
                    <input
                      type="text"
                      value={reportDetails.speakers}
                      onChange={(e) => setReportDetails({...reportDetails, speakers: e.target.value})}
                      className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Dr. Bindu Krishnan, Ms Sangeetha Tony"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Advisors In Charge (comma separated)</label>
                    <input
                      type="text"
                      value={reportDetails.advisors}
                      onChange={(e) => setReportDetails({...reportDetails, advisors: e.target.value})}
                      className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Dr. Preetha K.G, Mrs. Jisha Mary Jose"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Event Photo (Geotagged)</label>
                    {reportDetails.photoPreview ? (
                      <div className="relative mb-2">
                        <img 
                          src={reportDetails.photoPreview} 
                          alt="Event photo preview" 
                          className="w-full h-auto max-h-48 object-contain border border-gray-200 rounded"
                        />
                        <button
                          onClick={() => setReportDetails({...reportDetails, photo: null, photoPreview: ''})}
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
                          type="file" 
                          className="hidden" 
                          accept="image/*"
                          onChange={handlePhotoChange}
                        />
                      </label>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Session Details</label>
                    <textarea
                      value={reportDetails.sessionDetails}
                      onChange={(e) => setReportDetails({...reportDetails, sessionDetails: e.target.value})}
                      className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      rows={4}
                      placeholder="● Session 1: Supervised Learning & Decision Trees..."
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Key Takeaways</label>
                    <textarea
                      value={reportDetails.keyTakeaways}
                      onChange={(e) => setReportDetails({...reportDetails, keyTakeaways: e.target.value})}
                      className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      rows={4}
                      placeholder="Fundamentals of Supervised Learning..."
                    />
                  </div>
                  
                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      onClick={() => setShowReportForm(false)}
                      className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={generateReportWithAI}
                      disabled={isGeneratingReport}
                      className={`px-4 py-2 rounded-md text-white flex items-center gap-2 ${
                        isGeneratingReport ? 'bg-purple-500' : 'bg-purple-600 hover:bg-purple-700'
                      } transition-colors`}
                    >
                      {isGeneratingReport ? (
                        <>
                          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Generating...
                        </>
                      ) : (
                        <>
                          <DocumentTextIcon className="h-5 w-5" />
                          Generate Report
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Generated Report Display */}
            {generatedReport && (
              <div className="mt-8 bg-white p-6 rounded-lg border border-gray-200">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold text-gray-800">Event Report</h2>
                  <div className="flex gap-2">
                    <button
                      onClick={copyToClipboard}
                      className="flex items-center gap-1 text-blue-600 hover:text-blue-800"
                    >
                      <ClipboardDocumentIcon className="h-5 w-5" />
                      Copy
                    </button>
                    <button
                      onClick={downloadPDF}
                      className="flex items-center gap-1 text-green-600 hover:text-green-800"
                    >
                      <ArrowDownTrayIcon className="h-5 w-5" />
                      PDF
                    </button>
                  </div>
                </div>
                <div className="bg-gray-50 p-4 rounded-md overflow-auto max-h-96">
                  {reportDetails.photoPreview && (
                    <div className="mb-4 flex justify-center">
                      <img 
                        src={reportDetails.photoPreview} 
                        alt="Event photo" 
                        className="max-h-60 rounded-lg border border-gray-200"
                      />
                    </div>
                  )}
                  <pre className="whitespace-pre-wrap font-sans text-gray-800">
                    {generatedReport}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <p className="text-gray-600">No event found for this ID.</p>
        </div>
      )}
    </div>
  );
};

export default OrganiserEventDetail;