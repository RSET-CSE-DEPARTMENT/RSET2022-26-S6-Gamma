import { useState } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';

const API_BASE_URL = 'http://localhost:5001'; // Update if your Flask server is hosted elsewhere

function Ergonomics() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
      
      // Create a preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };
  
  const resetForm = () => {
    setSelectedFile(null);
    setImagePreview(null);
    setAnalysisResult(null);
    setError(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    
    if (!selectedFile) {
      setError('Please select an image to analyze');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setAnalysisResult(null);
    
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      // Step 1: Upload and process the image
      const response = await axios.post(`${API_BASE_URL}/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        timeout: 30000
      });

      if (response.data.error) {
        throw new Error(response.data.error);
      }

      // Step 2: Verify the result image exists
      const resultUrl = `${API_BASE_URL}${response.data.result_path}`;
      const imgCheck = await fetch(resultUrl);
      
      if (!imgCheck.ok) {
        throw new Error('Result image not found on server');
      }

      // Step 3: Set the result with full URL
      setAnalysisResult({
        ...response.data,
        image_data: resultUrl
      });

    } catch (err) {
      let errorMessage = 'Error analyzing image. Please try again.';
      
      if (err.response) {
        // Server responded with error status
        errorMessage = err.response.data?.error || errorMessage;
        console.error('Server error:', err.response.data);
      } else if (err.request) {
        // Request was made but no response
        errorMessage = 'Server is not responding. Please check:';
        console.error('No response:', err.request);
      } else if (err.message.includes('timeout')) {
        errorMessage = 'Request timed out. The analysis is taking too long.';
      } else if (err.message.includes('Failed to download model')) {
        errorMessage = 'Server is setting up. Please try again in a few minutes.';
      } else {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-sm overflow-hidden p-4">
        <h1 className="text-xl font-semibold text-gray-800 mb-1">Workspace Analysis</h1>
        <p className="text-sm text-gray-600 mb-4">Upload photo for ergonomic assessment</p>

        {!analysisResult ? (
          <motion.form 
            onSubmit={handleSubmit} 
            className="space-y-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Workspace Image
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="block w-full text-xs file:text-xs file:py-1 file:px-3 file:rounded file:border-0 file:bg-blue-50 file:text-blue-700"
              />
            </div>

            {imagePreview && (
              <motion.div 
                className="relative max-h-48 overflow-hidden rounded border border-gray-200"
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.2 }}
              >
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-full h-auto object-contain"
                />
              </motion.div>
            )}

            <div className="flex space-x-2">
              <motion.button
                type="submit"
                disabled={isLoading || !selectedFile}
                className={`flex-1 py-1 px-3 text-sm rounded bg-blue-600 text-white ${isLoading || !selectedFile ? 'opacity-50' : 'hover:bg-blue-700'}`}
                whileHover={!isLoading && selectedFile ? { scale: 1.02 } : {}}
                whileTap={!isLoading && selectedFile ? { scale: 0.98 } : {}}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Analyzing...
                  </span>
                ) : 'Analyze'}
              </motion.button>
              
              {selectedFile && (
                <motion.button
                  type="button"
                  onClick={() => {
                    setSelectedFile(null);
                    setImagePreview(null);
                  }}
                  className="py-1 px-3 text-sm rounded border border-gray-300"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Clear
                </motion.button>
              )}
            </div>
          </motion.form>
        ) : (
          <motion.div 
            className="space-y-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-medium text-gray-800">Results</h2>
              <button
                onClick={resetForm}
                className="text-xs text-blue-600 hover:text-blue-800"
              >
                New Analysis
              </button>
            </div>

            {/* Result image with loading state */}
            <div className="border rounded overflow-hidden max-h-64 bg-gray-100 flex items-center justify-center">
              {analysisResult.image_data ? (
                <img
                  src={analysisResult.image_data}
                  alt="Analysis Result"
                  className="w-full h-auto object-contain"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = '';
                    setError('Failed to load result image');
                  }}
                />
              ) : (
                <div className="p-4 text-gray-500">No result image available</div>
              )}
            </div>

            {/* Recommendations */}
            {analysisResult.recommendations && (
              <motion.div 
                className="bg-blue-50 p-3 rounded text-sm"
                initial={{ y: 10 }}
                animate={{ y: 0 }}
              >
                <h3 className="font-medium text-blue-800 mb-2">Recommendations</h3>
                <ul className="space-y-1 pl-4">
                  {analysisResult.recommendations.map((rec, i) => (
                    <motion.li 
                      key={i} 
                      className="text-gray-700 list-disc"
                      initial={{ x: -10 }}
                      animate={{ x: 0 }}
                      transition={{ delay: i * 0.1 }}
                    >
                      {rec}
                    </motion.li>
                  ))}
                </ul>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* Error display */}
        {error && (
          <motion.div 
            className="mt-2 p-2 bg-red-50 text-red-700 rounded text-xs"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {error}
            {error.includes('Please check:') && (
              <ul className="mt-1 pl-4 list-disc">
                <li>Is your Flask server running?</li>
                <li>Is the correct API_BASE_URL set? (Current: {API_BASE_URL})</li>
                <li>Check browser console for network errors</li>
              </ul>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}



export default Ergonomics;