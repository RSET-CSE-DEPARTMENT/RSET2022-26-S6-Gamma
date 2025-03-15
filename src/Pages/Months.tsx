
import React, { useState } from "react";
//import { useNavigate } from "react-router-dom";

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Helper to get the number of days in each month and starting day
const getMonthData = (year: number, month: number): { days: number[], startDay: number } => {
  const days = new Date(year, month + 1, 0).getDate();
  const startDay = new Date(year, month, 1).getDay();
  return { days: Array.from({ length: days }, (_, i) => i + 1), startDay };
};

// Generate array of years
const generateYears = () => {
  const years = [];
  for (let year = 2020; year <= 2065; year++) {
    years.push(year);
  }
  return years;
};

// Sample events data - in a real app, this would come from a database or API
const sampleEvents: Record<string, string[]> = {
  "2025-03-10": ["Team meeting at 10:00 AM", "Lunch with client at 1:00 PM"],
  "2025-03-15": ["Project deadline"],
  "2025-04-05": ["Conference call at 3:00 PM"],
};

const Months: React.FC = () => {
 // const navigate = useNavigate();
  const today = new Date();
  const currentYear = today.getFullYear();
  
  // State for navigation
  const [viewMode, setViewMode] = useState<'year' | 'month' | 'years'>('year');
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState(today.getDate());
  
  // Years list
  const yearsList = generateYears();
  
  // Format date key for events lookup
  const formatDateKey = (year: number, month: number, day: number) => {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };
  
  // Get events for the selected date
  const getEventsForDate = (year: number, month: number, day: number) => {
    const dateKey = formatDateKey(year, month, day);
    return sampleEvents[dateKey] || [];
  };
  
  // Handler for date selection
  const handleDateSelect = (day: number) => {
    setSelectedDate(day);
  };
  
  // Handler for month selection
  const handleMonthSelect = (monthIndex: number) => {
    setSelectedMonth(monthIndex);
    setViewMode('month');
  };
  
  // Handler for year selection
  const handleYearSelect = (year: number) => {
    setSelectedYear(year);
    setViewMode('year');
  };
  
  // Check if a date is today
  const isToday = (day: number, month: number, year: number) => {
    return today.getDate() === day && 
           today.getMonth() === month && 
           today.getFullYear() === year;
  };
  
  // Navigate to next month
  const goToNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };
  
  // Navigate to previous month
  const goToPrevMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };
  
  // Navigate to next year
  const goToNextYear = () => {
    setSelectedYear(selectedYear + 1);
  };
  
  // Navigate to previous year
  const goToPrevYear = () => {
    setSelectedYear(selectedYear - 1);
  };

  // Main container for all views with consistent width and padding
  const containerClasses = "w-full flex-1 flex flex-col items-center bg-gray-50 pb-16 overflow-y-auto";

  // Years View
  if (viewMode === 'years') {
    return (
      <div className={containerClasses}>
        <div className="text-4xl font-bold my-4">Select Year</div>
        
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4 w-full max-w-md px-4">
          {yearsList.map(year => (
            <div 
              key={year} 
              className={`
                text-center py-2 px-4 cursor-pointer rounded-lg
                ${year === selectedYear ? 'bg-blue-200 font-bold' : 'hover:bg-gray-200'}
              `}
              onClick={() => handleYearSelect(year)}
            >
              {year}
            </div>
          ))}
        </div>
      </div>
    );
  }
  
  // Month View
  if (viewMode === 'month') {
    const { days, startDay } = getMonthData(selectedYear, selectedMonth);
    const selectedDateEvents = getEventsForDate(selectedYear, selectedMonth, selectedDate);
    
    return (
      <div className={containerClasses}>
        {/* Month Header with Navigation */}
        <div className="flex items-center justify-between mb-4 w-full max-w-md px-4">
          <button 
            onClick={goToPrevMonth}
            className="text-blue-500 hover:text-blue-700 px-2 py-1"
          >
            &lt;
          </button>
          
          <div className="flex flex-col items-center">
            <h2 
              className="text-3xl font-bold cursor-pointer hover:text-blue-600"
              onClick={() => setViewMode('year')}
            >
              {months[selectedMonth]}
            </h2>
            <div 
              className="text-xl cursor-pointer hover:text-blue-600"
              onClick={() => setViewMode('years')}
            >
              {selectedYear}
            </div>
          </div>
          
          <button 
            onClick={goToNextMonth}
            className="text-blue-500 hover:text-blue-700 px-2 py-1"
          >
            &gt;
          </button>
        </div>
        
        {/* Days of Week Header */}
        <div className="grid grid-cols-7 gap-1 w-full max-w-md mb-2 px-4">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center font-medium text-gray-600">
              {day}
            </div>
          ))}
        </div>
        
        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1 w-full max-w-md mb-6 px-4">
          {/* Empty spaces for start day alignment */}
          {Array.from({ length: startDay }).map((_, i) => (
            <div key={`empty-${i}`} className="h-12"></div>
          ))}
          
          {/* Calendar days */}
          {days.map(day => {
            const hasEvents = getEventsForDate(selectedYear, selectedMonth, day).length > 0;
            const isCurrentDay = isToday(day, selectedMonth, selectedYear);
            
            return (
              <div 
                key={`day-${day}`} 
                onClick={() => handleDateSelect(day)}
                className={`
                  h-12 flex items-center justify-center cursor-pointer
                  relative hover:bg-gray-100 transition-colors
                  ${selectedDate === day ? 'font-bold' : ''}
                `}
              >
                <div 
                  className={`
                    w-8 h-8 flex items-center justify-center rounded-full
                    ${isCurrentDay ? 'bg-blue-200' : ''}
                    ${selectedDate === day && !isCurrentDay ? 'bg-gray-200' : ''}
                  `}
                >
                  {day}
                </div>
                {hasEvents && (
                  <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-blue-500 rounded-full"></div>
                )}
              </div>
            );
          })}
        </div>
        
        {/* Events Box */}
        <div className="w-full max-w-md bg-white rounded-lg p-4 shadow-md mx-4">
          <h3 className="text-xl font-medium mb-2">
            Events for {months[selectedMonth]} {selectedDate}, {selectedYear}
          </h3>
          
          <div className="mt-2">
            {selectedDateEvents.length > 0 ? (
              <ul className="space-y-2">
                {selectedDateEvents.map((event, index) => (
                  <li key={index} className="p-2 bg-gray-50 rounded">
                    {event}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500 italic">No events today</p>
            )}
          </div>
        </div>
      </div>
    );
  }
  
  // Year Overview (default)
  return (
    <div className={containerClasses}>
      {/* Year Header with Navigation */}
      <div className="flex items-center justify-between mb-4 w-full max-w-4xl px-4">
        <button 
          onClick={goToPrevYear}
          className="text-blue-500 hover:text-blue-700 px-2 py-1"
        >
          &lt;
        </button>
        
        <div 
          className="text-4xl font-bold cursor-pointer hover:text-blue-600"
          onClick={() => setViewMode('years')}
        >
          {selectedYear}
        </div>
        
        <button 
          onClick={goToNextYear}
          className="text-blue-500 hover:text-blue-700 px-2 py-1"
        >
          &gt;
        </button>
      </div>

      {/* Months Grid - responsive grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 w-full max-w-4xl px-4">
        {months.map((month, monthIndex) => {
          const { days, startDay } = getMonthData(selectedYear, monthIndex);

          return (
            <div 
              key={month} 
              className="border rounded-lg pb-2 cursor-pointer hover:bg-gray-200 p-2 shadow-sm" 
              onClick={() => handleMonthSelect(monthIndex)}
            >
              <h3 className="text-center text-xl font-semibold mb-2">{month}</h3>
              <div className="grid grid-cols-7 text-xs text-gray-800 gap-1 justify-center">
                {Array.from({ length: startDay }).map((_, i) => (
                  <span key={"empty-" + i} className="w-3 h-3 text-center"></span>
                ))}
                {days.map((day) => {
                  const isCurrentDay = isToday(day, monthIndex, selectedYear);
                  return (
                    <span key={day} className={`w-3 h-3 text-center ${isCurrentDay ? 'bg-blue-200 rounded-full' : ''}`}>
                      {day}
                    </span>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Months;