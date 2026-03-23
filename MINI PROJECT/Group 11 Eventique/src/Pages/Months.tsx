import { useState, useEffect } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  add,
  sub,
  isSameMonth,
  eachDayOfInterval,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getFirestore, collection, getDocs, query, where } from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";

const db = getFirestore();
const auth = getAuth();

const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const Calendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showMonths, setShowMonths] = useState(false);
  const [showYearView, setShowYearView] = useState(false);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [userEmail, setUserEmail] = useState<string | null>(null);
  type EventType = Record<string, { name: string; details: string }>;
  const [events, setEvents] = useState<EventType>({});

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user && user.email) {
        setUserEmail(user.email);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchEvents = async () => {
      if (!userEmail) return;
      try {
        const eventsQuery = query(collection(db, "event"), where("Participants", "array-contains", userEmail));
        const querySnapshot = await getDocs(eventsQuery);

        const eventsData = {} as Record<string, { name: string; details: string }>;
        querySnapshot.docs.forEach(doc => {
          const event = doc.data();
          eventsData[event.event_date] = {
            name: event.name,
            details: event.details || ""
          };
        });

        setEvents(eventsData);
      } catch (error) {
        console.error("Error fetching events:", error);
      }
    };
    fetchEvents();
  }, [userEmail]);

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

  const handleMonthChange = (increment: boolean) => {
    const newDate = increment ? add(currentDate, { months: 1 }) : sub(currentDate, { months: 1 });
    setCurrentDate(newDate);
    setSelectedDate(''); // Reset selected date when month changes
  };

  return (
    <div className="p-6 w-full max-w-md mx-auto bg-white shadow-lg rounded-xl">
      {showYearView || showMonths ? (
        <div>
          <div className="flex justify-between items-center mb-4">
            <button 
              onClick={() => setCurrentDate(sub(currentDate, { years: 1 }))}
              aria-label="Previous year"
              title="Previous year"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold text-center cursor-pointer" onClick={() => { setShowYearView(false); setShowMonths(false); }}>
              {format(currentDate, "yyyy")}
            </h2>
            <button 
              onClick={() => setCurrentDate(add(currentDate, { years: 1 }))}
              aria-label="Next year"
              title="Next year"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {months.map((month, index) => {
              const monthStart = new Date(currentDate.getFullYear(), index, 1);
              const monthEnd = endOfMonth(monthStart);
              const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

              return (
                <div key={month} className="p-3 text-center rounded-lg bg-gray-100 cursor-pointer hover:bg-gray-200"
                  onClick={() => {
                    setCurrentDate(monthStart);
                    setShowYearView(false);
                    setShowMonths(false);
                  }}
                  role="button"
                  aria-label={`Select ${month}`}
                  tabIndex={0}
                >
                  <div className="font-semibold">{month}</div>
                  <div className="grid grid-cols-7 text-xs gap-1 mt-1">
                    {monthDays.map((day) => (
                      <span key={day.toString()} className="text-gray-600">{format(day, "d")}</span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <>
          <div className="flex justify-between items-center mb-4">
            <button 
              onClick={() => handleMonthChange(false)}
              aria-label="Previous month"
              title="Previous month"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h2 
              className="text-lg font-semibold cursor-pointer"
              onClick={() => { setShowMonths(true); setShowYearView(true); }}
              role="button"
              aria-label="Select month and year"
              tabIndex={0}
            >
              {format(currentDate, "MMMM yyyy")}
            </h2>
            <button 
              onClick={() => handleMonthChange(true)}
              aria-label="Next month"
              title="Next month"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center font-medium">
            {weekdays.map((day, index) => (
              <div key={index} className="p-2">{day}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {days.map((day, index) => {
              const formattedDate = format(day, "yyyy-MM-dd");
              return (
                <div 
                  key={index} 
                  className={`p-2 text-center rounded-full text-sm cursor-pointer
                    ${isSameMonth(day, currentDate) ? "text-gray-800" : "text-gray-400"}
                    ${selectedDate === formattedDate ? "bg-[#2B8D9C] text-white rounded-full" : ""}`}
                  onClick={() => {
                    setSelectedDate(formattedDate);
                  }}
                  role="button"
                  aria-label={`Select date ${format(day, "MMMM d, yyyy")}`}
                  tabIndex={0}
                >
                  {format(day, "d")}
                  {events[formattedDate] && <div className="w-1.5 h-1.5 bg-[#FFB94B] rounded-full mx-auto mt-1"></div>}
                </div>
              );
            })}
          </div>

          <div className="mt-4 p-2 bg-gray-100 rounded-lg text-center">
            <h3 className="text-xl font-bold">Events</h3>
            <p className="text-lg text-gray-700">
              {selectedDate && events[selectedDate] 
                ? `${events[selectedDate].name}${events[selectedDate].details ? `: ${events[selectedDate].details}` : ''}`
                : "No events today"}
            </p>
          </div>
        </>
      )}
    </div>
  );
};

export default Calendar;