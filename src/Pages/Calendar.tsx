import React, { useState, useEffect } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  add,
  sub,
  isSameMonth,
  isToday,
  parseISO,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";

const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const Calendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showMonths, setShowMonths] = useState(false);
  const [showYearView, setShowYearView] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [events, setEvents] = useState({});

  // Set initial selected date to today when component mounts
  useEffect(() => {
    setSelectedDate(format(new Date(), "yyyy-MM-dd"));
  }, []);

  const startMonth = startOfMonth(currentDate);
  const endMonth = endOfMonth(currentDate);
  const startWeek = startOfWeek(startMonth);
  const endWeek = endOfWeek(endMonth);
  
  const days = [];
  let day = startWeek;
  
  while (day <= endWeek) {
    days.push(day);
    day = add(day, { days: 1 });
  }

  return (
    <div className="p-6 w-full max-w-md mx-auto bg-white shadow-lg rounded-xl">
      {showYearView || showMonths ? (
        <div>
          <h2 className="text-3xl font-bold text-center mb-4 cursor-pointer" onClick={() => { setShowYearView(false); setShowMonths(false); }}>
            {format(currentDate, "yyyy")}
          </h2>
          <div className="grid grid-cols-3 gap-2">
            {months.map((month, index) => (
              <div key={month} className="p-3 text-center rounded-lg bg-gray-100 cursor-pointer hover:bg-gray-200"
                onClick={() => {
                  setCurrentDate(new Date(currentDate.getFullYear(), index, 1));
                  setShowYearView(false);
                  setShowMonths(false);
                }}>
                <div className="font-semibold">{month}</div>
                <div className="grid grid-cols-7 text-xs gap-1 mt-1">
                  {[...Array(31)].map((_, i) => (
                    <span key={i} className="text-gray-600">{i + 1}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="flex justify-between items-center mb-4">
            <button onClick={() => setCurrentDate(sub(currentDate, { months: 1 }))}>
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h2 
              className="text-lg font-semibold cursor-pointer"
              onClick={() => { setShowMonths(true); setShowYearView(true); }}
            >
              {format(currentDate, "MMMM yyyy")}
            </h2>
            <button onClick={() => setCurrentDate(add(currentDate, { months: 1 }))}>
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          
          <div className="grid grid-cols-7 text-center text-gray-600 text-sm mb-2">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
              <div key={day} className="font-medium">{day}</div>
            ))}
          </div>
          
          <div className="grid grid-cols-7 gap-1">
            {days.map((day, index) => {
              const formattedDate = format(day, "yyyy-MM-dd");
              const isSelected = selectedDate === formattedDate;
              return (
                <div
                  key={index}
                  className={`p-2 text-center rounded-full text-sm cursor-pointer
                    ${isSameMonth(day, currentDate) ? "text-gray-800" : "text-gray-400"}
                    ${selectedDate === format(day, "yyyy-MM-dd") ? "bg-[#2B8D9C] text-white rounded-full" : ""}`}
                  onClick={() => setSelectedDate(formattedDate)}
                >
                  {format(day, "d")}
                </div>
              );
            })}
          </div>
          
          <div className="mt-4 p-2 bg-gray-100 rounded-lg text-center">
            <h3 className="text-sm font-medium">Events</h3>
            <p className="text-xs text-gray-600">
              {selectedDate && events[selectedDate] ? events[selectedDate] : "No events today"}
            </p>
          </div>
        </>
      )}
    </div>
  );
};

export default Calendar;
