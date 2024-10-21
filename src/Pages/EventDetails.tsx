const ResumeWorkshop = () => {
  return (
    <div className="w-screen h-screen bg-[#f6fcf7] flex items-center justify-center relative">
      <div className="w-full max-w-md p-4 bg-white shadow-lg rounded-lg relative">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-xl font-semibold text-[#246d8c]">RSET IEDC</h1>
          <span className="text-sm text-gray-500">9:41</span>
        </div>

        {/* Event Image */}
        <div className="w-full h-44 rounded-md overflow-hidden mb-4">
          <img
            className="object-cover w-full h-full"
            src="https://via.placeholder.com/286x149"
            alt="Event"
          />
        </div>

        {/* Event Details */}
        <h2 className="text-2xl font-semibold mb-2">Resume Building</h2>
        <p className="text-[#246d8c] font-medium mb-4">
          Friday, 4th October • 11:35am-12:00pm
        </p>

        {/* Description */}
        <p className="text-gray-600 text-base leading-relaxed mb-4">
          Want to create a standout resume? Join our workshop to craft a professional resume that highlights your strengths, skills, and achievements. Whether you're applying for internships, jobs, or academic opportunities, this session will cover key elements of structuring and refining your resume.
        </p>

        <ul className="list-disc pl-5 text-gray-600 mb-4">
          <li>Essential components of an impactful resume</li>
          <li>How to showcase your unique skills and experiences</li>
          <li>Tailoring your resume for different industries or roles</li>
          <li>Common mistakes and best formatting practices</li>
        </ul>

        {/* Coordinators */}
        <h3 className="text-xl font-medium mb-2">Coordinators</h3>
        <div className="flex gap-4 mb-6">
          <img
            className="w-16 h-16 rounded-full"
            src="https://via.placeholder.com/65x65"
            alt="Ryan"
          />
          <img
            className="w-16 h-16 rounded-full"
            src="https://via.placeholder.com/65x65"
            alt="Evelin"
          />
        </div>

        {/* Register Button */}
        <button className="w-full bg-[#246d8c] text-white py-3 rounded-md text-lg font-medium">
          Register Now
        </button>
      </div>
    </div>
  );
};

export default ResumeWorkshop;
