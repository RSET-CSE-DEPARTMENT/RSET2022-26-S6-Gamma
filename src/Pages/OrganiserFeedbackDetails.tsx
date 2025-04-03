import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
// @ts-ignore
import { db } from '../firebaseConfig';
import { ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { jsPDF } from 'jspdf';

interface Feedback {
  email: string;
  rating: number;
  comment: string;
  timestamp: any;
  userName: string;
}

const OrganiserFeedbackDetails = () => {
  const { id } = useParams<{ id: string }>();
  const [eventData, setEventData] = useState<any>(null);
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // @ts-ignore
  const navigate = useNavigate();

  useEffect(() => {
    const fetchEventDetails = async () => {
      try {
        const docRef = doc(db, 'event', id!);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setEventData(data);
          if (data.feedback) {
            setFeedback(data.feedback);
          }
        } else {
          setError('Event not found');
        }
      } catch (err) {
        console.error('Error fetching event:', err);
        setError('Failed to load event details');
      } finally {
        setLoading(false);
      }
    };

    fetchEventDetails();
  }, [id]);

  const downloadFeedbackCSV = () => {
    if (feedback.length === 0) {
      alert('No feedback available to download');
      return;
    }

    const headers = ['Name', 'Email', 'Rating', 'Comment', 'Date'];
    const csvRows = [];

    // Add headers
    csvRows.push(headers.join(','));

    // Add data rows
    for (const item of feedback) {
      const row = [
        `"${item.userName || 'Anonymous'}"`,
        item.email,
        item.rating,
        `"${item.comment?.replace(/"/g, '""') || ''}"`,
        item.timestamp?.toDate().toLocaleDateString() || 'Unknown date'
      ];
      csvRows.push(row.join(','));
    }

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${eventData?.name.replace(/[^a-z0-9]/gi, '_')}_feedback.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadFeedbackPDF = () => {
    if (feedback.length === 0) {
      alert('No feedback available to download');
      return;
    }

    const pdf = new jsPDF();
    
    // Set document properties
    pdf.setProperties({
      title: `${eventData?.name} Feedback Report`,
      subject: 'Event Feedback',
      author: 'Event Management System',
      keywords: 'feedback, event, ' + eventData?.name
    });

    // Add title
    pdf.setFontSize(18);
    pdf.setTextColor(0, 51, 102);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`${eventData?.name} - Feedback Report`, 105, 20, { align: 'center' });

    // Add subtitle
    pdf.setFontSize(12);
    pdf.setTextColor(0, 0, 0);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Generated on ${new Date().toLocaleDateString()}`, 105, 28, { align: 'center' });

    let yPosition = 40;

    // Add feedback items
    pdf.setFontSize(10);
    feedback.forEach((item, index) => {
      if (yPosition > 270) {
        pdf.addPage();
        yPosition = 20;
      }

      // Add divider if not first item
      if (index > 0) {
        pdf.setDrawColor(200, 200, 200);
        pdf.line(20, yPosition, 190, yPosition);
        yPosition += 5;
      }

      // Add feedback header
      pdf.setFontSize(12);
      pdf.setTextColor(0, 0, 0);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`Feedback #${index + 1}`, 20, yPosition);
      yPosition += 7;

      // Add user info
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`From: ${item.userName || 'Anonymous'} (${item.email})`, 20, yPosition);
      yPosition += 6;

      // Add rating
      pdf.text(`Rating: ${'★'.repeat(item.rating)}${'☆'.repeat(5 - item.rating)}`, 20, yPosition);
      yPosition += 6;

      // Add comment if exists
      if (item.comment) {
        const commentLines = pdf.splitTextToSize(`Comment: ${item.comment}`, 170);
        pdf.text(commentLines, 20, yPosition);
        yPosition += 6 * commentLines.length;
      }

      // Add timestamp
      pdf.text(`Submitted: ${item.timestamp?.toDate().toLocaleString() || 'Unknown date'}`, 20, yPosition);
      yPosition += 10;
    });

    pdf.save(`${eventData?.name.replace(/[^a-z0-9]/gi, '_')}_feedback.pdf`);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-40">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
        <p className="text-red-700">{error}</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto p-4">
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">{eventData?.name || 'Event Feedback'}</h1>
              <p className="opacity-90">Participant Feedback</p>
            </div>
           
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">
              {feedback.length} Feedback Entries
            </h2>
            <div className="flex gap-2">
              <button
                onClick={downloadFeedbackCSV}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                <ArrowDownTrayIcon className="h-5 w-5" />
                Download CSV
              </button>
              <button
                onClick={downloadFeedbackPDF}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                <ArrowDownTrayIcon className="h-5 w-5" />
                Download PDF
              </button>
            </div>
          </div>

          {feedback.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No feedback has been submitted for this event yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {feedback.map((item, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium">
                        {item.userName || 'Anonymous'} ({item.email})
                      </h3>
                      <div className="flex items-center mt-1">
                        {[...Array(5)].map((_, i) => (
                          <svg
                            key={i}
                            className={`w-5 h-5 ${i < item.rating ? 'text-yellow-400' : 'text-gray-300'}`}
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        ))}
                        <span className="ml-2 text-sm text-gray-500">
                          {item.timestamp?.toDate().toLocaleString() || 'Unknown date'}
                        </span>
                      </div>
                    </div>
                  </div>
                  {item.comment && (
                    <div className="mt-3 bg-gray-50 p-3 rounded">
                      <p className="text-gray-700">{item.comment}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrganiserFeedbackDetails;