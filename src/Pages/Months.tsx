import React from "react";
import { useNavigate } from "react-router-dom";

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Helper to get the number of days in each month and starting day
const getMonthData = (year: number, month: number): { days: number[], startDay: number } => {
  const days = new Date(year, month + 1, 0).getDate();
  const startDay = new Date(year, month, 1).getDay();
  return { days: Array.from({ length: days }, (_, i) => i + 1), startDay };
};

const CalendarYearOverview: React.FC = () => {
  const navigate = useNavigate();
  const currentYear = 2025;

  return (
    <div className="flex flex-col items-center bg-gray-50 min-h-screen p-4">
      {/* Year Header */}
      <div className="text-4xl font-bold mb-4">{currentYear}</div>

      {/* Months Grid */}
      <div className="grid grid-cols-3 gap-4 w-full max-w-md">
        {months.map((month, monthIndex) => {
          const { days, startDay } = getMonthData(currentYear, monthIndex);

          return (
            <div 
              key={month} 
              className="border-b-2 pb-2 cursor-pointer hover:bg-gray-200 p-2" 
              onClick={() => navigate("/HomePage/Calendar")}
            >
              <h3 className="text-center text-xl font-semibold mb-2">{month}</h3>
              <div className="grid grid-cols-7 text-sm text-gray-800 gap-1 justify-center">
                {Array.from({ length: startDay }).map((_, i) => (
                  <span key={"empty-" + i} className="w-4 text-center"></span>
                ))}
                {days.map((day) => (
                  <span key={day} className="w-4 text-center">{day}</span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CalendarYearOverview;
