import React, { useState, useEffect } from 'react';
import { Pie, Line } from 'react-chartjs-2';
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

const HealthDashboard = () => {
  // BMI State
  const [metrics, setMetrics] = useState({
    weight: '',
    height: '',
    age: ''
  });
  const [bmiData, setBmiData] = useState(null);
  const [history, setHistory] = useState([]);
  
  // Screen Time State
  const [screenTime, setScreenTime] = useState({
    today: 0,
    workMode: false
  });
  const [screenTimeHistory, setScreenTimeHistory] = useState([]);
  const [screenTimeAlert, setScreenTimeAlert] = useState('');
  const [showDefaultScreenTime, setShowDefaultScreenTime] = useState(false);
  
  // UI State
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Generate random default screen time (20-120 minutes)
  const getDefaultScreenTime = () => Math.floor(Math.random() * 101) + 20;

  // BMI Calculations
  const calculateBmi = (weight, height) => {
    if (!weight || !height) return null;
    
    const bmi = Math.round((weight / ((height / 100) ** 2)) * 10) / 10;
    const classification = classifyBmi(bmi);
    const analysis = getBmiAnalysis(classification);
    
    return {
      bmi,
      classification,
      ...analysis,
      lastUpdated: new Date().toLocaleString()
    };
  };

  const classifyBmi = (bmi) => {
    if (bmi < 18.5) return "Underweight";
    else if (bmi < 25) return "Normal weight";
    else if (bmi < 30) return "Overweight";
    else if (bmi < 35) return "Obesity (Class 1)";
    else if (bmi < 40) return "Obesity (Class 2)";
    else return "Extreme Obesity (Class 3)";
  };

  const getBmiAnalysis = (classification) => {
    const analyses = {
      "Underweight": {
        healthRisks: [
          "Increased risk of osteoporosis and bone fractures",
          "Higher susceptibility to infections",
          "Potential fertility issues in women",
          "Nutritional deficiencies"
        ],
        recommendations: [
          "Add nutrient-dense foods like nuts and avocados",
          "Consider small, frequent meals",
          "Incorporate protein-rich foods at every meal",
          "Focus on strength training to build muscle mass"
        ],
        quickTips: [
          "Set reminders to eat regularly",
          "Keep healthy snacks available",
          "Stand up and stretch every hour"
        ]
      },
      "Normal weight": {
        healthRisks: [
          "Lower risk of chronic diseases with healthy lifestyle",
          "Potential for metabolic issues if poor body composition"
        ],
        recommendations: [
          "Maintain current balance of nutrition and activity",
          "Incorporate variety of foods",
          "Stay hydrated with water",
          "Aim for 150 minutes of activity weekly"
        ],
        quickTips: [
          "Use a standing desk periodically",
          "Take short walk breaks",
          "Keep a water bottle handy"
        ]
      },
      "Overweight": {
        healthRisks: [
          "3x higher risk of type 2 diabetes",
          "Higher likelihood of high blood pressure",
          "Increased risk of coronary heart disease",
          "Greater chance of osteoarthritis"
        ],
        recommendations: [
          "Aim for 5-10% weight reduction initially",
          "Create 500 calorie daily deficit",
          "Increase protein intake",
          "Replace refined carbs with fiber"
        ],
        quickTips: [
          "Use smaller plates for meals",
          "Swap sugary drinks for water",
          "Start meetings with stretching"
        ]
      },
      "Obesity (Class 1)": {
        healthRisks: [
          "7x higher risk of type 2 diabetes",
          "High probability of sleep apnea",
          "Increased risk of gallbladder disease",
          "Higher likelihood of fatty liver"
        ],
        recommendations: [
          "Target 10% weight reduction over 6 months",
          "Focus on whole foods",
          "Begin with low-impact exercises",
          "Gradually increase activity"
        ],
        quickTips: [
          "Use timer to stand regularly",
          "Keep food journal",
          "Find exercise accountability partner"
        ]
      },
      "Obesity (Class 2)": {
        healthRisks: [
          "Extremely high cardiovascular risk",
          "Increased likelihood of stroke",
          "Higher chance of metabolic syndrome",
          "Greater risk of kidney disease"
        ],
        recommendations: [
          "Consult healthcare provider",
          "Join structured weight loss program",
          "Start with gentle movement",
          "Focus on sustainable changes"
        ],
        quickTips: [
          "Use ergonomic supports",
          "Practice mindful eating",
          "Try seated exercises"
        ]
      },
      "Extreme Obesity (Class 3)": {
        healthRisks: [
          "Life-threatening heart failure risk",
          "Very high risk of blood clots",
          "Severe breathing difficulties",
          "10-15 years reduced life expectancy"
        ],
        recommendations: [
          "Medical professional consultation",
          "Small achievable lifestyle changes",
          "Water-based exercises",
          "Realistic short-term goals"
        ],
        quickTips: [
          "Specialized ergonomic equipment",
          "Gentle seated stretches",
          "Proper breathing techniques"
        ]
      }
    };
    
    return analyses[classification] || {
      healthRisks: ["Unknown risks - consult doctor"],
      recommendations: ["Consult healthcare provider"],
      quickTips: ["Schedule health check-up"]
    };
  };

  // Screen Time Analysis
  const getScreenTimeAnalysis = (minutes) => {
    const percentage = ((minutes / 1440) * 100).toFixed(1);
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    const timeString = `${hours > 0 ? `${hours}h ` : ''}${mins}m`;

    if (minutes <= 120) {
      return {
        title: "Healthy Screen Time",
        healthRisks: [
          "Minimal digital eye strain risk",
          "Low probability of posture issues",
          "Unlikely to impact sleep quality"
        ],
        insights: [
          `Only ${percentage}% of your day on screens`,
          "Below average screen time",
          "Good digital habits likely"
        ],
        recommendations: [
          "Maintain this balance",
          "Track specific app usage",
          "Use night mode in evenings"
        ],
        timeString
      };
    } else if (minutes <= 240) {
      return {
        title: "Moderate Screen Time",
        healthRisks: [
          "Potential eye strain and headaches",
          "Increased neck/back pain risk",
          "Possible sleep disruption",
          "Mild sedentary behavior risks"
        ],
        insights: [
          `${percentage}% of day (${timeString})`,
          "Close to average screen time",
          "Watch productive vs passive use"
        ],
        recommendations: [
          "Reduce passive scrolling",
          "Use app timers for social media",
          "Practice 20-20-20 rule (every 20 mins, look at something 20 feet away for 20 seconds)"
        ],
        timeString
      };
    } else {
      return {
        title: "Excessive Screen Time",
        healthRisks: [
          "High computer vision syndrome risk",
          "Significant sedentary behavior risks",
          "Likely sleep/circadian disruption",
          "Increased tech neck and RSI risk",
          "Potential mental health impacts"
        ],
        insights: [
          `${percentage}% of day (${timeString})`,
          "Above healthy limits",
          "Impacts sleep, posture, mental health"
        ],
        recommendations: [
          "Set no-screen times",
          "Enable grayscale mode",
          "Replace 30 mins with activity",
          "Weekly digital detox day",
          "Use blue light filters"
        ],
        timeString
      };
    }
  };

  // Screen Time Functions
  const checkScreenTimeAlerts = (minutes, workMode) => {
    const breakThreshold = workMode ? 180 : 120;
    const riskThreshold = workMode ? 360 : 240;
    
    if (minutes >= riskThreshold) {
      setScreenTimeAlert(`Warning: You've spent more than ${riskThreshold/60} hours on screen today. This can impact your health!`);
    } else if (minutes >= breakThreshold) {
      setScreenTimeAlert(`Alert: You've exceeded ${breakThreshold/60} hours of screen time. Take a break!`);
    } else {
      setScreenTimeAlert('');
    }
  };

  const logScreenTime = (minutes, workMode) => {
    const today = new Date().toISOString().split('T')[0];
    const newEntry = {
      date: today,
      minutes,
      workMode
    };
    
    const updatedHistory = [newEntry, ...screenTimeHistory.filter(entry => entry.date !== today)];
    setScreenTimeHistory(updatedHistory);
    localStorage.setItem('screenTimeHistory', JSON.stringify(updatedHistory));
    
    setScreenTime({
      today: minutes,
      workMode
    });
    localStorage.setItem('screenTime', JSON.stringify({ today: minutes, workMode }));
    
    checkScreenTimeAlerts(minutes, workMode);
    setShowDefaultScreenTime(false);
  };

  // Generate Charts
  const getScreenTimePieData = () => {
    const screenMinutes = showDefaultScreenTime ? getDefaultScreenTime() : screenTime.today;
    const otherMinutes = 1440 - screenMinutes;
    
    return {
      labels: ['Screen Time', 'Other Activities'],
      datasets: [{
        data: [screenMinutes, otherMinutes],
        backgroundColor: ['#ff9999', '#66b3ff'],
        hoverBackgroundColor: ['#ff6666', '#3399ff']
      }]
    };
  };

  const getWeeklyTrendData = () => {
    const days = [];
    const screenTimes = [];
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const entry = screenTimeHistory.find(e => e.date === dateStr);
      days.push(dateStr.slice(5));
      screenTimes.push(entry ? entry.minutes : 0);
    }
    
    return {
      labels: days,
      datasets: [{
        label: 'Screen Time (minutes)',
        data: screenTimes,
        fill: false,
        backgroundColor: 'rgb(75, 192, 192)',
        borderColor: 'rgba(75, 192, 192, 0.2)',
        tension: 0.1
      }]
    };
  };

  // Load saved data
  useEffect(() => {
    const loadData = () => {
      try {
        // Load BMI data
        const savedMetrics = localStorage.getItem('healthMetrics');
        const savedHistory = localStorage.getItem('healthHistory');
        
        if (savedMetrics) {
          const parsed = JSON.parse(savedMetrics);
          setMetrics(parsed);
          if (parsed.weight && parsed.height) {
            setBmiData(calculateBmi(parseFloat(parsed.weight), parseFloat(parsed.height)));
          }
        }
        
        if (savedHistory) {
          setHistory(JSON.parse(savedHistory));
        }
        
        // Load Screen Time data
        const savedScreenTime = localStorage.getItem('screenTime');
        const savedScreenHistory = localStorage.getItem('screenTimeHistory');
        
        if (savedScreenTime) {
          const parsed = JSON.parse(savedScreenTime);
          setScreenTime(parsed);
          checkScreenTimeAlerts(parsed.today, parsed.workMode);
        }
        
        if (savedScreenHistory) {
          setScreenTimeHistory(JSON.parse(savedScreenHistory));
        }

        // Show default screen time if no data exists
        if (!savedScreenTime && !savedScreenHistory) {
          setShowDefaultScreenTime(true);
        }
      } catch (error) {
        console.error("Error loading data:", error);
        setError("Failed to load saved data.");
      }
    };

    loadData();
  }, []);

  // BMI Form Handling
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setMetrics(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    const { weight, height, age } = metrics;
    
    if (!weight || !height || !age) {
      setError('All fields are required');
      setLoading(false);
      return;
    }
    
    if (weight <= 0 || height <= 0 || age <= 0) {
      setError('Values must be positive');
      setLoading(false);
      return;
    }
    
    if (weight > 500 || height > 300 || age > 120) {
      setError('Values exceed reasonable limits');
      setLoading(false);
      return;
    }

    try {
      const newBmiData = calculateBmi(parseFloat(weight), parseFloat(height));
      setBmiData(newBmiData);
      
      const historyEntry = {
        date: new Date().toLocaleString(),
        weight: parseFloat(weight),
        height: parseFloat(height),
        age: parseInt(age),
        bmi: newBmiData.bmi,
        classification: newBmiData.classification
      };
      
      const savedHistory = localStorage.getItem('healthHistory');
      let updatedHistory = [];
      
      if (savedHistory) {
        updatedHistory = JSON.parse(savedHistory);
      }
      
      updatedHistory = [historyEntry, ...updatedHistory].slice(0, 100);
      
      setHistory(updatedHistory);
      localStorage.setItem('healthHistory', JSON.stringify(updatedHistory));
      localStorage.setItem('healthMetrics', JSON.stringify(metrics));
      
    } catch (err) {
      setError('Failed to update metrics. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Screen Time Form Handling
  const handleScreenTimeChange = (e) => {
    const { name, value } = e.target;
    setScreenTime(prev => ({
      ...prev,
      [name]: name === 'workMode' ? e.target.checked : parseInt(value) || 0
    }));
  };

  const handleScreenTimeSubmit = (e) => {
    e.preventDefault();
    logScreenTime(screenTime.today, screenTime.workMode);
  };

  const getUnifiedHistory = () => {
    const historyMap = {};
    
    history.forEach(entry => {
      const dateKey = new Date(entry.date).toLocaleDateString();
      historyMap[dateKey] = { ...entry };
    });
    
    screenTimeHistory.forEach(entry => {
      const dateKey = new Date(entry.date).toLocaleDateString();
      if (historyMap[dateKey]) {
        historyMap[dateKey].screenTime = entry.minutes;
        historyMap[dateKey].workMode = entry.workMode;
      } else {
        historyMap[dateKey] = {
          date: dateKey,
          screenTime: entry.minutes,
          workMode: entry.workMode
        };
      }
    });
    
    return Object.values(historyMap).sort((a, b) => {
      return new Date(b.date) - new Date(a.date);
    });
  };

  // Get current screen time analysis
  const currentScreenTime = showDefaultScreenTime ? getDefaultScreenTime() : screenTime.today;
  const screenAnalysis = getScreenTimeAnalysis(currentScreenTime);

  return (
    <div className="max-w-6xl mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Health Dashboard</h1>
      
      <div className="flex mb-6 border-b">
        <button 
          className={`py-2 px-4 ${activeTab === 'dashboard' ? 'border-b-2 border-blue-500 font-bold' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          Dashboard
        </button>
        <button 
          className={`py-2 px-4 ${activeTab === 'history' ? 'border-b-2 border-blue-500 font-bold' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          History
        </button>
      </div>
      
      {activeTab === 'dashboard' ? (
        <div className="space-y-8">
          {/* BMI Section */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-4">Update Your Metrics</h2>
              <form onSubmit={handleSubmit}>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-1">Weight (kg)</label>
                  <input
                    type="number"
                    name="weight"
                    value={metrics.weight}
                    onChange={handleInputChange}
                    className="w-full p-2 border rounded"
                    step="0.1"
                    min="0"
                  />
                </div>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-1">Height (cm)</label>
                  <input
                    type="number"
                    name="height"
                    value={metrics.height}
                    onChange={handleInputChange}
                    className="w-full p-2 border rounded"
                    step="0.1"
                    min="0"
                  />
                </div>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-1">Age</label>
                  <input
                    type="number"
                    name="age"
                    value={metrics.age}
                    onChange={handleInputChange}
                    className="w-full p-2 border rounded"
                    min="0"
                  />
                </div>
                
                {error && <p className="text-red-500 mb-4">{error}</p>}
                
                <button
                  type="submit"
                  className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600"
                  disabled={loading}
                >
                  {loading ? 'Updating...' : 'Update Metrics'}
                </button>
              </form>
            </div>
            
            {bmiData ? (
              <div className="bg-white p-6 rounded-lg shadow">
                <h2 className="text-xl font-semibold mb-4">Your BMI Analysis</h2>
                <div className="mb-4">
                  <p className="text-2xl font-bold">{bmiData.bmi} - {bmiData.classification}</p>
                  <p className="text-sm text-gray-500">Last updated: {bmiData.lastUpdated}</p>
                </div>
                
                <div className="mb-4">
                  <h3 className="font-medium text-lg">Health Risks</h3>
                  <ul className="list-disc pl-5 mt-2">
                    {bmiData.healthRisks.map((risk, index) => (
                      <li key={index} className="text-sm mb-1">{risk}</li>
                    ))}
                  </ul>
                </div>
                
                <div className="mb-4">
                  <h3 className="font-medium text-lg">Recommendations</h3>
                  <ul className="list-disc pl-5 mt-2">
                    {bmiData.recommendations.map((rec, index) => (
                      <li key={index} className="text-sm mb-1">{rec}</li>
                    ))}
                  </ul>
                </div>
                
                <div>
                  <h3 className="font-medium text-lg">Quick Tips</h3>
                  <ul className="list-disc pl-5 mt-2">
                    {bmiData.quickTips.map((tip, index) => (
                      <li key={index} className="text-sm">{tip}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <div className="bg-white p-6 rounded-lg shadow flex items-center justify-center h-full">
                <p className="text-gray-500">Enter your metrics to see BMI analysis</p>
              </div>
            )}
          </div>
          
          {/* Screen Time Section */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-4">Screen Time Tracking</h2>
              <form onSubmit={handleScreenTimeSubmit}>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-1">Today's Screen Time (minutes)</label>
                  <input
                    type="number"
                    name="today"
                    value={screenTime.today}
                    onChange={handleScreenTimeChange}
                    className="w-full p-2 border rounded"
                    min="0"
                    max="1440"
                  />
                </div>
                <div className="mb-4 flex items-center">
                  <input
                    type="checkbox"
                    name="workMode"
                    checked={screenTime.workMode}
                    onChange={handleScreenTimeChange}
                    className="mr-2"
                  />
                  <label className="text-sm font-medium">Work Mode (longer thresholds)</label>
                </div>
                <button
                  type="submit"
                  className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600"
                >
                  Update Screen Time
                </button>
              </form>
              {screenTimeAlert && (
                <div className={`mt-4 p-3 rounded ${screenTimeAlert.includes('Warning') ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
                  {screenTimeAlert}
                </div>
              )}
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-4">Screen Time Analysis</h2>
              
              {showDefaultScreenTime && (
                <div className="mb-4 p-3 bg-blue-50 rounded">
                  <p className="text-sm text-blue-800">Showing sample data. Track your actual screen time for personalized insights.</p>
                </div>
              )}
              
              <div className="h-64 mb-4">
                <Pie 
                  data={getScreenTimePieData()} 
                  options={{ 
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: 'bottom'
                      },
                      title: {
                        display: true,
                        text: showDefaultScreenTime ? 'Sample Screen Time Distribution' : 'Your Screen Time Today'
                      }
                    }
                  }}
                />
              </div>
              
              <div className="mt-6">
                <h3 className="font-medium text-lg">{screenAnalysis.title}</h3>
                <div className="grid md:grid-cols-3 gap-4 mt-2">
                  <div>
                    <h4 className="font-medium mb-1">Health Risks</h4>
                    <ul className="list-disc pl-5">
                      {screenAnalysis.healthRisks.map((risk, index) => (
                        <li key={index} className="text-sm mb-1">{risk}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium mb-1">Insights</h4>
                    <ul className="list-disc pl-5">
                      {screenAnalysis.insights.map((insight, index) => (
                        <li key={index} className="text-sm mb-1">{insight}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium mb-1">Recommendations</h4>
                    <ul className="list-disc pl-5">
                      {screenAnalysis.recommendations.map((rec, index) => (
                        <li key={index} className="text-sm mb-1">{rec}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
              
              <div className="h-64 mt-6">
                <Line 
                  data={getWeeklyTrendData()} 
                  options={{ 
                    maintainAspectRatio: false,
                    scales: {
                      y: {
                        beginAtZero: true,
                        max: 600,
                        ticks: {
                          stepSize: 60
                        }
                      }
                    },
                    plugins: {
                      legend: {
                        position: 'bottom'
                      }
                    }
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">History</h2>
          {getUnifiedHistory().length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Weight (kg)</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Height (cm)</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">BMI</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Classification</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Screen Time</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Work Mode</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {getUnifiedHistory().map((entry, index) => (
                    <tr key={index}>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{entry.date}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{entry.weight || 'N/A'}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{entry.height || 'N/A'}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{entry.bmi || 'N/A'}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{entry.classification || 'N/A'}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                        {entry.screenTime ? `${entry.screenTime} mins` : 'N/A'}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                        {entry.workMode !== undefined ? (entry.workMode ? 'Yes' : 'No') : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">No history data available</p>
          )}
        </div>
      )}
    </div>
  );
};

export default HealthDashboard;