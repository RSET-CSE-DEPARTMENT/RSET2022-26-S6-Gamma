import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import search from "../assets/Calendar/search.svg";
import arrow from "../assets/Calendar/arrow.svg";

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
//@ts-ignore
const daysInMonth = (month, year) => new Date(year, month + 1, 0).getDate();

const Calendar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { state } = location;
  const currentYear = 2025;
  
  const [selectedMonth, setSelectedMonth] = useState(2); // Default to March
  const [selectedDay, setSelectedDay] = useState(null);
  const [eventDetails, setEventDetails] = useState("");

  useEffect(() => {
    if (state?.monthIndex !== undefined) {
      setSelectedMonth(state.monthIndex);
    }
  }, [state]);
//@ts-ignore
  const handleDateClick = (day) => {
    if (day <= daysInMonth(selectedMonth, currentYear)) {
      setSelectedDay(day);
      setEventDetails(`Placeholder event details for ${day}`); // Replace with backend data
    }
  };

  return (
    <div className="flex flex-col items-center bg-[#F6F6F6]">
      {/* Header Section */}
      <div className="w-full bg-[#f6f6f6]">
        <div className="flex items-center gap-2 px-4 py-3">
          <img
            src={arrow}
            alt="Back"
            className="h-5 cursor-pointer"
            onClick={() => navigate("/HomePage/Months")}
          />
          <div className="text-[#246d8c] text-[17px] leading-none">{months[selectedMonth]} {currentYear}</div>
          <div className="flex-grow" />
          <img src={search} alt="Search icon" className="mb-1" />
        </div>
      </div>

      {/* Weekday Headers */}
      <div className="w-full grid grid-cols-7 border-b border-[#aeaeb2]">
        {["S", "M", "T", "W", "T", "F", "S"].map((day) => (
          <div key={day} className="flex justify-center items-center py-2 text-black text-[17px] font-semibold">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Section */}
      <div className="w-full bg-[#f6f6f6] border-b border-[#aeaeb2] grid grid-cols-7">
        {[...Array(35)].map((_, index) => {
          const day = index + 1;
          const isDisabled = day > daysInMonth(selectedMonth, currentYear);
          const isSelected = day === selectedDay;

          return (
            <div
              key={index}
              className="flex justify-center items-center h-[70px] border-t border-[#aeaeb2]"
              onClick={() => !isDisabled && handleDateClick(day)}
            >
              <div
                className={`flex items-center justify-center w-10 h-10 cursor-pointer ${
                  isDisabled
                    ? "text-[#8e8e93]"
                    : isSelected
                    ? "bg-[#246d8c] text-white rounded-full"
                    : "text-black"
                } text-lg font-normal`}
              >
                {day <= daysInMonth(selectedMonth, currentYear) ? day : ""}
              </div>
            </div>
          );
        })}
      </div>

      {/* Event Details Section */}
      {selectedDay && (
        <div className="mt-4 p-4 bg-white shadow-md rounded-lg w-[90%] text-center">
          <p className="text-[#246d8c] font-semibold">Event Details</p>
          <p className="text-gray-700 text-sm mt-2">{eventDetails}</p>
        </div>
      )}
    </div>
  );
};

export default Calendar;
