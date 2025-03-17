import React, { useState, useEffect } from "react";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { getAuth } from "firebase/auth";
import { getFirestore, doc, getDoc } from "firebase/firestore";

const CertificateGenerator: React.FC = () => {
  const [logos, setLogos] = useState<string[]>([]);
  const [signature, setSignature] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState({
    name: "",
    email: "",
    uid: "",
    batch: "",
    branch: "",
    division: "",
    year: 0
  });

  const firestore = getFirestore();

  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        const auth = getAuth();
        const user = auth.currentUser;

        if (user) {
          const uid = user.uid;
          const userDocRef = doc(firestore, "users", uid);
          const userDoc = await getDoc(userDocRef);

          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUserProfile({
              name: userData.name || "",
              email: user.email || "",
              uid: userData.uid || "",
              batch: userData.batch || "",
              branch: userData.branch || "",
              division: userData.division || "",
              year: userData.year || 0
            });
          }
        }
      } catch (error) {
        console.error("Error fetching profile data: ", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfileData();
  }, []);

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const uploadedLogos: string[] = [];
      Array.from(files).forEach((file) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          if (e.target?.result) {
            uploadedLogos.push(e.target.result.toString());
            setLogos([...logos, ...uploadedLogos]);
          }
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const handleSignatureUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          setSignature(e.target.result.toString());
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const generateCertificate = async () => {
    const certificate = document.getElementById("certificate");
    if (certificate) {
      const canvas = await html2canvas(certificate);
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`certificate_${userProfile.name}.pdf`);
    }
  };

  if (loading) {
    return <p className="text-center text-gray-600">Loading certificate data...</p>;
  }

  return (
    <div className="max-w-5xl mx-auto p-6 text-center">
      <div className="bg-gray-50 p-6 mb-6 rounded-lg shadow-md">
        <h2 className="text-2xl font-bold mb-6 text-gray-800">Certificate Generator</h2>
        
        <div className="mb-4">
          <label htmlFor="logo-upload" className="block text-sm font-medium text-gray-700 mb-2">
            Upload Organization Logo(s)
          </label>
          <input id="logo-upload" type="file" multiple accept="image/*" onChange={handleLogoUpload} className="w-full border border-gray-300 rounded-md p-2" />
        </div>
        
        <div className="mb-4">
          <label htmlFor="signature-upload" className="block text-sm font-medium text-gray-700 mb-2">
            Upload Signature
          </label>
          <input id="signature-upload" type="file" accept="image/*" onChange={handleSignatureUpload} className="w-full border border-gray-300 rounded-md p-2" />
        </div>
        
        <div className="mt-6">
          <button onClick={generateCertificate} className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-all font-medium">
            Download Certificate PDF
          </button>
        </div>
      </div>

      <div className="mb-12">
        <h3 className="text-lg font-medium text-gray-700 mb-4">Certificate Preview</h3>
        <div id="certificate" className="w-[800px] h-[600px] mx-auto relative border-2 border-black p-5 bg-white shadow-lg overflow-hidden">
          <div className="absolute inset-2 border-4 border-yellow-500 rounded-md pointer-events-none"></div>
          
          <div className="absolute top-8 left-8 flex gap-4">
            {logos.map((logo, index) => (
              <img key={index} src={logo} alt={`Organization logo ${index + 1}`} className="w-20 h-auto" />
            ))}
          </div>
          
          <div className="flex flex-col items-center mt-20">
            <h1 className="text-4xl font-bold text-gray-800 mb-6 font-serif">Certificate of Achievement</h1>
            <p className="text-lg text-gray-600">This is to certify that</p>
            <h2 className="text-3xl text-red-600 font-bold my-4 italic">{userProfile.name}</h2>
            <p className="text-lg text-gray-600 text-center">
              of {userProfile.batch} batch, {userProfile.branch} branch <br />
              has successfully completed all requirements with distinction.
            </p>
            <p className="mt-6 text-gray-600">Issued on: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
          
          <div className="absolute bottom-12 right-12 flex flex-col items-center">
            {signature && <img src={signature} alt="Signature" className="w-36 mb-2" />}
            <p className="text-sm text-gray-600">Authorized Signature</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CertificateGenerator;
