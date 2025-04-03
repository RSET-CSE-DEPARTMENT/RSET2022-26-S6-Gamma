import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeftIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
// @ts-ignore
import { db } from '../firebaseConfig';

interface Participant {
  email: string;
  name: string;
  phoneNumber: string;
  uid: string;
  batch: string;
  branch: string;
  division: string;
  gender: string;
  year: number;
}

const OrganiserExtraDetails = () => {
  const { id } = useParams<{ id: string }>();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [eventName, setEventName] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchParticipants = async () => {
      if (!id) return;
      
      try {
        const eventRef = doc(db, 'event', id);
        const eventSnap = await getDoc(eventRef);
        
        if (eventSnap.exists()) {
          const eventData = eventSnap.data();
          setEventName(eventData.name || 'Event');
          
          const participantEmails = eventData.Participants || [];
          
          if (participantEmails.length > 0) {
            const usersCollection = collection(db, 'users');
            const participantPromises = participantEmails.map(async (email: string) => {
              const q = query(usersCollection, where("email", "==", email));
              const querySnapshot = await getDocs(q);
              
              if (!querySnapshot.empty) {
                const userDoc = querySnapshot.docs[0];
                const userData = userDoc.data();
                return {
                  email,
                  name: userData.name || 'N/A',
                  phoneNumber: userData.phoneNumber || 'N/A',
                  uid: userData.uid || 'N/A',
                  batch: userData.batch || 'N/A',
                  branch: userData.branch || 'N/A',
                  division: userData.division || 'N/A',
                  gender: userData.gender || 'N/A',
                  year: userData.year || 0,
                };
              } else {
                return {
                  email,
                  name: 'User not found',
                  phoneNumber: 'N/A',
                  uid: 'N/A',
                  batch: 'N/A',
                  branch: 'N/A',
                  division: 'N/A',
                  gender: 'N/A',
                  year: 0,
                };
              }
            });
            
            const participantData = await Promise.all(participantPromises);
            setParticipants(participantData);
          }
        }
      } catch (error) {
        console.error('Error fetching participants:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchParticipants();
  }, [id]);

  const downloadPDF = () => {
    const doc = new jsPDF();
    
    // Add event title
    doc.setFontSize(18);
    doc.setTextColor(40);
    doc.text(`${eventName} - Participant List`, 14, 20);
    
    // Add date
    doc.setFontSize(11);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 28);
    
    // Add participant count
    doc.text(`Total Participants: ${participants.length}`, 14, 35);
    
    // Prepare data for the table
    const headers = [
      ['Name', 'Email', 'Phone', 'UID', 'Batch', 'Branch', 'Division', 'Gender', 'Year']
    ];
    
    const tableData = participants.map(participant => [
      participant.name,
      participant.email,
      participant.phoneNumber,
      participant.uid,
      participant.batch,
      participant.branch,
      participant.division,
      participant.gender,
      participant.year.toString()
    ]);
    
    // Add table using autoTable plugin
    autoTable(doc, {
      head: headers,
      body: tableData,
      startY: 40,
      styles: {
        fontSize: 8,
        cellPadding: 2,
        overflow: 'linebreak'
      },
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: 255,
        fontStyle: 'bold'
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245]
      },
      columnStyles: {
        0: { cellWidth: 25 }, // Name
        1: { cellWidth: 30 }, // Email
        2: { cellWidth: 20 }, // Phone
        3: { cellWidth: 15 }, // UID
        4: { cellWidth: 15 }, // Batch
        5: { cellWidth: 15 }, // Branch
        6: { cellWidth: 15 }, // Division
        7: { cellWidth: 15 }, // Gender
        8: { cellWidth: 10 }  // Year
      },
      margin: { top: 40 }
    });
    
    // Save the PDF
    doc.save(`${eventName.replace(/[^a-z0-9]/gi, '_')}_participants.pdf`);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-40">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <button 
            onClick={() => navigate(-1)}
            className="mr-4 p-2 rounded-full hover:bg-gray-100"
          >
            <ArrowLeftIcon className="h-5 w-5 text-gray-600" />
          </button>
          <h1 className="text-2xl font-bold text-gray-800">
            {eventName} - Participant Details ({participants.length})
          </h1>
        </div>
        <button
          onClick={downloadPDF}
          disabled={participants.length === 0}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg ${participants.length === 0 ? 'bg-gray-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
        >
          <ArrowDownTrayIcon className="h-5 w-5" />
          Export PDF
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">UID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Batch</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Branch</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Division</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gender</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Year</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {participants.length > 0 ? (
                participants.map((participant, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{participant.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{participant.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{participant.phoneNumber}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{participant.uid}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{participant.batch}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{participant.branch}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{participant.division}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{participant.gender}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{participant.year}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="px-6 py-4 text-center text-sm text-gray-500">
                    No participants registered for this event yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default OrganiserExtraDetails;