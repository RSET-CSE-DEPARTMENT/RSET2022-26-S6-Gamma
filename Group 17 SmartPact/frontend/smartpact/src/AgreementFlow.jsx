import React, { useState, useEffect } from "react";
import axios from "axios";

// Configure axios defaults
axios.defaults.withCredentials = true;
axios.defaults.baseURL = 'http://localhost:5001';

const AgreementFlow = ({ onCreateAgreement, onCancel, userData }) => {
  const [page, setPage] = useState("type");
  const [agreementType, setAgreementType] = useState(null);
  const [counterparty, setCounterparty] = useState(null);
  const [agreementDetails, setAgreementDetails] = useState({
    title: "",
    startDate: "",
    dueDate: "",
    amount: "",
    terms: "",
    // Software Freelancing specific fields
    deliverables: "",
    milestones: "",
    // Rental Agreement specific fields
    propertyAddress: "",
    securityDeposit: "",
    // Subscription Agreement specific fields
    subscriptionDetails: "",
    billingInterval: "30", // Default to monthly (30 days)
  });
  const [walletAddresses, setWalletAddresses] = useState({
    creator: "",
    counterparty: ""
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [agreementId, setAgreementId] = useState(null);
  const [ethToInrRate, setEthToInrRate] = useState(null);

  useEffect(() => {
    const fetchEthInrRate = async () => {
      try {
        // You can use CoinGecko or another API
        const response = await axios.get('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=inr');
        if (response.data && response.data.ethereum && response.data.ethereum.inr) {
          setEthToInrRate(response.data.ethereum.inr);
        }
      } catch (err) {
        console.error("Failed to fetch ETH to INR rate:", err);
        // Fallback to a default rate if API fails
        setEthToInrRate(250000); // Example fallback value
      }
    };
    
    fetchEthInrRate();
  }, []);

  // Add this helper function inside the AgreementFlow component
const calculateInrValue = (ethAmount) => {
  if (!ethAmount || !ethToInrRate) return '';
  const inrValue = parseFloat(ethAmount) * ethToInrRate;
  return inrValue.toLocaleString('en-IN');
};

  // Check authentication status on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await axios.get('/check-auth');
        if (!response.data.authenticated) {
          setError("Session expired. Please login again.");
        }
      } catch (err) {
        console.error("Auth check failed:", err);
        setError("Failed to verify authentication. Please refresh or login again.");
      }
    };
    checkAuth();
  }, []);

  // Fetch wallet addresses when counterparty is selected
  useEffect(() => {
    if (counterparty) {
      const fetchCounterpartyWallet = async () => {
        try {
          setIsLoading(true);
          setError(null);
          
          const creatorWallet = userData?.walletAddress;
          if (!creatorWallet) {
            throw new Error("User wallet address is not available.");
          }

          const counterpartyIdentifier = counterparty.id;
          if (!counterpartyIdentifier) {
            throw new Error("Counterparty email or ID is missing.");
          }

          const response = await axios.get(`/users/${counterpartyIdentifier}`);
          
          if (!response.data?.walletAddress) {
            throw new Error("Counterparty wallet address not found.");
          }

          setWalletAddresses({
            creator: creatorWallet,
            counterparty: response.data.walletAddress,
          });

        } catch (err) {
          setError(err.message || "Failed to fetch counterparty wallet");
          console.error("Error fetching wallet:", err);
        } finally {
          setIsLoading(false);
        }
      };
      fetchCounterpartyWallet();
    }
  }, [counterparty, userData]);

  const searchUsers = async (query) => {
    try {
      // This would need to be implemented or changed based on your user search endpoint
      const response = await axios.get(`http://localhost:5001/users/${query}`);
      if (response.data && response.data.id) {
        return [response.data]; // Wrap single user in array
      }
      return [];
    } catch (err) {
      console.error("Search failed:", err);
      return [];
    }
  };

  const handleTypeSelect = (type) => {
    setAgreementType(type);
    setPage("counterparty");
  };

  const handleCounterpartySelect = (user) => {
    setCounterparty(user);
    setPage("details");
  };

  const handleDetailsSubmit = async (details) => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Create payload based on agreement type
      const agreementPayload = {
        creatorId: userData.id,
        counterpartyid: counterparty.id,
        type: agreementType,
        title: details.title,
        startDate: details.startDate,
        dueDate: details.dueDate,
        amount: details.amount,
        terms: details.terms,
        status: "Created",
        createdAt: new Date().toISOString()
      };
      
      // Add type-specific fields
      if (agreementType === "Software Freelancing") {
        agreementPayload.deliverables = details.deliverables;
        agreementPayload.milestones = details.milestones;
      } else if (agreementType === "Rental Agreement") {
        agreementPayload.propertyAddress = details.propertyAddress;
        agreementPayload.securityDeposit = details.securityDeposit;
      } else if (agreementType === "Subscription Agreement") {
        agreementPayload.subscriptionDetails = details.subscriptionDetails;
        agreementPayload.billingInterval = parseInt(details.billingInterval) * 86400; // Convert days to seconds
      }
      
      console.log(agreementPayload);
      console.log(userData);
      
      // Save to database
      const response = await axios.post('/api/agreements/create', agreementPayload);
      
      if (!response.data?.id) {
        throw new Error("Failed to create agreement: Invalid response");
      }
      
      // Set the database ID for the agreement
      setAgreementId(response.data.id);
      
      // Create complete agreement object
      const completeAgreement = {
        id: response.data.id,
        type: agreementType,
        counterparty: counterparty,
        ...details,
        status: "Created",
        createdAt: new Date().toISOString()
      };
      
      // Pass to parent component
      onCreateAgreement(completeAgreement);
      setPage("confirmation");
    } catch (err) {
      console.error('Error:', err);
      const errorMessage = err.response?.data?.message || err.message || "Failed to create agreement";
      setError(errorMessage);
      
      // Check if error is related to authentication
      if (errorMessage.includes("authenticated") || err.response?.status === 401) {
        alert("Your session has expired. Please login again.");
        // Optionally redirect to login page
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleFundAgreement = async () => {
    if (!agreementId) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      // Update agreement status in database
      const response = await axios.put(`/api/agreements/${agreementId}`, {
        status: "Funded"
      });
      
      if (!response.data?.success) {
        throw new Error("Failed to update agreement status");
      }
      
      const updatedAgreement = {
        ...agreementDetails,
        status: "Funded"
      };
      
      onCreateAgreement(updatedAgreement);
      
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || "Failed to fund agreement";
      setError(errorMessage);
      
      // Check if error is related to authentication
      if (errorMessage.includes("authenticated") || err.response?.status === 401) {
        alert("Your session has expired. Please login again.");
        // Optionally redirect to login page
      }
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to truncate wallet addresses
  const truncateAddress = (address) => {
    if (!address) return "Not connected";
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  // Sub-components (TypeSelection, CounterpartySelection, AgreementDetails, ConfirmationPage)
  const TypeSelection = ({ onSelect, onCancel }) => (
    <div style={styles.content}>
      <h2 style={styles.heading}>Select Agreement Type</h2>
      <div style={styles.buttonContainer}>
        <button 
          style={styles.agreementButton} 
          onClick={() => onSelect("Software Freelancing")}
        >
          <div style={styles.agreementType}>
            <h3>Software Freelancing</h3>
            <p>For hiring developers or technical consultants</p>
          </div>
        </button>
        <button 
          style={styles.agreementButton} 
          onClick={() => onSelect("Subscription Agreement")}
        >
          <div style={styles.agreementType}>
            <h3>Subscription Agreement</h3>
            <p>For recurring service contracts</p>
          </div>
        </button>
        <button 
          style={styles.agreementButton} 
          onClick={() => onSelect("Rental Agreement")}
        >
          <div style={styles.agreementType}>
            <h3>Rental Agreement</h3>
            <p>For property or equipment rentals</p>
          </div>
        </button>
      </div>
      <button style={styles.cancelButton} onClick={onCancel}>
        Cancel
      </button>
    </div>
  );

  const CounterpartySelection = ({ onSelect, onBack, searchUsers, isLoading }) => {
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [searchError, setSearchError] = useState(null);
  
    const handleSearch = async (e) => {
      e.preventDefault();
      if (!searchQuery.trim()) {
        setSearchError("Please enter a search term");
        return;
      }
  
      setIsSearching(true);
      setSearchError(null);
      
      try {
        const results = await searchUsers(searchQuery);
        if (!results?.length) {
          setSearchError("No users found");
        }
        setSearchResults(results || []);
      } catch (err) {
        setSearchError("Search failed. Please try again.");
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    };
  
    return (
      <div style={styles.content}>
        <h2 style={styles.heading}>Select Counterparty</h2>
        <form onSubmit={handleSearch} style={styles.searchForm}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setSearchError(null);
            }}
            placeholder="Search by ID, name or email"
            style={{
              ...styles.searchInput,
              borderColor: searchError ? '#ff4444' : '#ddd'
            }}
            required
          />
          <button 
            type="submit" 
            style={styles.searchButton} 
            disabled={isSearching || !searchQuery.trim()}
          >
            {isSearching ? "Searching..." : "Search"}
          </button>
        </form>
  
        {searchError && <p style={styles.error}>{searchError}</p>}
  
        {!searchError && searchResults.length > 0 ? (
          <div style={styles.resultsContainer}>
            {searchResults.map(user => (
              <div 
                key={user.id} 
                style={styles.userCard}
                onClick={() => onSelect(user)}
              >
                <h3>{user.name}</h3>
                <p>{user.email}</p>
                <small>ID: {user.id}</small>
              </div>
            ))}
          </div>
        ) : (
          !searchError && (
            <p style={styles.noResults}>
              {isSearching ? "Searching..." : "No users found. Try a different search."}
            </p>
          )
        )}
  
        <div style={styles.buttonGroup}>
          <button style={styles.backButton} onClick={onBack}>
            Back
          </button>
        </div>
      </div>
    );
  };

  const AgreementDetails = ({ agreementType, counterparty, onSubmit, onBack, isLoading, error, walletAddresses }) => {
    const [details, setDetails] = useState({
      title: `${agreementType} with ${counterparty?.name || ''}`,
      startDate: "",
      dueDate: "",
      amount: "",
      terms: "",
      // Type-specific fields
      deliverables: "",
      milestones: "",
      propertyAddress: "",
      securityDeposit: "",
      subscriptionDetails: "",
      billingInterval: "30", // Default 30 days
    });
  
    useEffect(() => {
      if (counterparty && agreementType) {
        setDetails(prev => ({
          ...prev,
          title: `${agreementType} with ${counterparty.name}`
        }));
      }
    }, [counterparty, agreementType]);
  
    const handleChange = (e) => {
      const { name, value } = e.target;
      setDetails({ ...details, [name]: value });
    };
  
    const handleSubmit = (e) => {
      e.preventDefault();
      onSubmit(details);
    };
  
    // Render different fields based on agreement type
    const renderTypeSpecificFields = () => {
      switch(agreementType) {
        case "Software Freelancing":
          return (
            <>
              <label style={styles.label}>Deliverables</label>
              <textarea
                name="deliverables"
                value={details.deliverables}
                onChange={handleChange}
                style={styles.textarea}
                placeholder="Specify the deliverables expected from the freelancer..."
                rows="3"
                required
              />
              
              <label style={styles.label}>Milestones</label>
              <textarea
                name="milestones"
                value={details.milestones}
                onChange={handleChange}
                style={styles.textarea}
                placeholder="Define project milestones and timeline expectations..."
                rows="3"
              />
            </>
          );
          
        case "Rental Agreement":
          return (
            <>
              <label style={styles.label}>Property Address</label>
              <textarea
                name="propertyAddress"
                value={details.propertyAddress}
                onChange={handleChange}
                style={styles.textarea}
                placeholder="Enter the full address of the rental property..."
                rows="2"
                required
              />
              
              <label style={styles.label}>Security Deposit (ETH)</label>
            <div style={styles.amountContainer}>
              <input
                type="number"
                name="securityDeposit"
                value={details.securityDeposit}
                onChange={handleChange}
                style={styles.input}
                step="0.0001"
                min="0"
                required
              />
              {details.securityDeposit && ethToInrRate && (
                <div style={styles.inrValue}>
                  ≈ ₹{calculateInrValue(details.securityDeposit)} INR
                </div>
              )}
            </div>
            </>
          );
          
        case "Subscription Agreement":
          return (
            <>
              <label style={styles.label}>Subscription Details</label>
              <textarea
                name="subscriptionDetails"
                value={details.subscriptionDetails}
                onChange={handleChange}
                style={styles.textarea}
                placeholder="Describe what services or products are included in this subscription..."
                rows="3"
                required
              />
              
              <label style={styles.label}>Billing Interval (Days)</label>
              <select
                name="billingInterval"
                value={details.billingInterval}
                onChange={handleChange}
                style={styles.input}
                required
              >
                <option value="7">Weekly (7 days)</option>
                <option value="30">Monthly (30 days)</option>
                <option value="90">Quarterly (90 days)</option>
                <option value="365">Yearly (365 days)</option>
              </select>
            </>
          );
          
        default:
          return null;
      }
    };
  
    return (
      <div style={styles.formContainer}>
        <h2 style={styles.heading}>Agreement Details</h2>
        <p style={styles.subHeading}>
          Creating <strong>{agreementType}</strong> with <strong>{counterparty?.name}</strong>
        </p>
        
        <div style={styles.walletInfo}>
          <p>Counterparty Wallet: <span style={styles.walletAddress}>{truncateAddress(walletAddresses.counterparty)}</span></p>
          <p>Your Wallet: <span style={styles.walletAddress}>{truncateAddress(walletAddresses.creator)}</span></p>
        </div>
        
        {error && <p style={styles.errorMessage}>{error}</p>}
        
        <form onSubmit={handleSubmit} style={styles.form}>
          <label style={styles.label}>Agreement Title</label>
          <input
            type="text"
            name="title"
            value={details.title}
            onChange={handleChange}
            style={styles.input}
            required
          />
  
          <div style={styles.dateRow}>
            <div style={styles.dateInput}>
              <label style={styles.label}>Start Date</label>
              <input
                type="date"
                name="startDate"
                value={details.startDate}
                onChange={handleChange}
                style={styles.input}
                required
              />
            </div>
            <div style={styles.dateSpacer}></div>
            <div style={styles.dateInput}>
              <label style={styles.label}>Due Date</label>
              <input
                type="date"
                name="dueDate"
                value={details.dueDate}
                onChange={handleChange}
                style={styles.input}
                required
              />
            </div>
          </div>
  
          <label style={styles.label}>Amount (ETH)</label>
          <div style={styles.amountContainer}>
            <input
              type="number"
              name="amount"
              value={details.amount}
              onChange={handleChange}
              style={styles.input}
              step="0.0001"
              min="0"
              required
            />
            {details.amount && ethToInrRate && (
              <div style={styles.inrValue}>
                ≈ ₹{calculateInrValue(details.amount)} INR
              </div>
            )}
          </div>
          
          {/* Render type-specific fields */}
          {renderTypeSpecificFields()}
  
          <label style={styles.label}>Terms & Conditions</label>
          <textarea
            name="terms"
            value={details.terms}
            onChange={handleChange}
            style={styles.textarea}
            placeholder="Describe the agreement terms..."
            rows="5"
          />
  
          <div style={styles.buttonGroup}>
            <button type="button" style={styles.backButton} onClick={onBack} disabled={isLoading}>
              Back
            </button>
            <button type="submit" style={styles.submitButton} disabled={isLoading}>
              {isLoading ? "Creating Agreement..." : "Create Agreement"}
            </button>
          </div>
        </form>
      </div>
    );
  };

  const ConfirmationPage = ({ onFinish, agreementId, onFund, isLoading, error }) => (
    <div style={styles.content}>
      <h2 style={styles.heading}>Agreement Created! ✅</h2>
      <p style={styles.templateText}>Your agreement has been successfully created and stored in the database.</p>
      
      {error && <p style={styles.errorMessage}>{error}</p>}
      
      {agreementId && (
        <>
          <p style={styles.templateText}>Agreement ID: #{agreementId}</p>
          <p style={styles.templateText}>You need to fund this agreement for it to become active.</p>
          <button 
            style={styles.fundButton} 
            onClick={onFund}
            disabled={isLoading}
          >
            {isLoading ? "Processing..." : "Fund Agreement"}
          </button>
        </>
      )}
      <button style={styles.returnButton} onClick={onFinish}>
        Return to Dashboard
      </button>
    </div>
  );

  return (
    <div style={styles.flowContainer}>
      {page === "type" && (
        <TypeSelection 
          onSelect={handleTypeSelect} 
          onCancel={onCancel}
        />
      )}
      {page === "counterparty" && (
        <CounterpartySelection
          onSelect={handleCounterpartySelect}
          onBack={() => setPage("type")}
          searchUsers={searchUsers}
          isLoading={isLoading}
        />
      )}
      {page === "details" && (
        <AgreementDetails
          agreementType={agreementType}
          counterparty={counterparty}
          onSubmit={handleDetailsSubmit}
          onBack={() => setPage("counterparty")}
          isLoading={isLoading}
          error={error}
          walletAddresses={walletAddresses}
        />
      )}
      {page === "confirmation" && (
        <ConfirmationPage 
          onFinish={onCancel} 
          agreementId={agreementId}
          onFund={handleFundAgreement}
          isLoading={isLoading}
          error={error}
        />
      )}
    </div>
  );
};

// Updated Styles
const styles = {
  // Add these to your styles object
amountContainer: {
  position: 'relative',
  width: '100%',
},
inrValue: {
  position: 'absolute',
  right: '10px',
  top: '50%',
  transform: 'translateY(-50%)',
  color: '#666',
  fontSize: '14px',
  pointerEvents: 'none',
},
  flowContainer: {
    marginTop: "30px",
    width: "80%",
    background: "white",
    borderRadius: "12px",
    padding: "20px",
    boxShadow: "0px 10px 30px rgba(0,0,0,0.1)",
    marginBottom: "40px",
  },
  formContainer: {
    width: "95%",
    paddingBottom: "30px",
  },
  heading: {
    fontSize: "22px",
    fontWeight: "bold",
    marginBottom: "15px",
    color: "#333",
  },
  dateSpacer: {
    width: "20px",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  label: {
    textAlign: "left",
    fontSize: "14px",
    fontWeight: "600",
    color: "#555",
  },
  input: {
    padding: "10px",
    fontSize: "14px",
    border: "1px solid #ddd",
    borderRadius: "8px",
    width: "100%",
  },
  buttonGroup: {
    display: "flex",
    gap: "10px",
    marginTop: "20px",
  },
  submitButton: {
    padding: "12px",
    fontSize: "16px",
    fontWeight: "600",
    color: "white",
    backgroundColor: "#A65DE9",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    flex: 1,
  },
  fundButton: {
    padding: "12px",
    fontSize: "16px",
    fontWeight: "600",
    color: "white",
    backgroundColor: "#28A745",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    width: "100%",
    marginBottom: "15px"
  },
  returnButton: {
    padding: "12px",
    fontSize: "16px",
    fontWeight: "600",
    color: "white",
    backgroundColor: "#A65DE9",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    width: "100%",
  },
  cancelButton: {
    padding: "12px",
    marginTop: "20px",
    fontSize: "16px",
    fontWeight: "600",
    color: "#A65DE9",
    backgroundColor: "white",
    border: "2px solid #A65DE9",
    borderRadius: "8px",
    cursor: "pointer",
    flex: 1,
  },
  content: {
    width: "100%",
  },
  buttonContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "15px",
    marginTop: "10px",
  },
  agreementButton: {
    padding: "12px",
    fontSize: "16px",
    fontWeight: "600",
    color: "white",
    backgroundColor: "#913DDB",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    width: "100%",
  },
  templateText: {
    fontSize: "16px",
    margin: "20px 0",
    color: "#555",
  },
  backButton: {
    padding: "12px",
    fontSize: "16px",
    fontWeight: "600",
    color: "#A65DE9",
    backgroundColor: "transparent",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    marginTop: "20px",
    width: "100%",
  },
  agreementType: {
    textAlign: "left",
    padding: "10px",
  },
  searchForm: {
    display: "flex",
    marginBottom: "20px",
  },
  searchInput: {
    flex: 1,
    padding: "12px",
    border: "1px solid #ddd",
    borderRadius: "8px 0 0 8px",
    fontSize: "16px",
  },
  searchButton: {
    padding: "12px 20px",
    backgroundColor: "#A65DE9",
    color: "white",
    border: "none",
    borderRadius: "0 8px 8px 0",
    cursor: "pointer",
    fontWeight: "600",
    fontSize: "15px"
  },
  resultsContainer: {
    margin: "20px 0",
    maxHeight: "300px",
    overflowY: "auto",
  },
  userCard: {
    padding: "15px",
    border: "1px solid #eee",
    borderRadius: "8px",
    marginBottom: "10px",
    cursor: "pointer",
    transition: "all 0.2s",
    ":hover": {
      backgroundColor: "#f9f9f9",
    },
  },
  noResults: {
    color: "#666",
    textAlign: "center",
    margin: "20px 0",
  },
  dateRow: {
    display: "flex",
    gap: "15px",
  },
  dateInput: {
    flex: 1,
  },
  textarea: {
    padding: "12px",
    fontSize: "14px",
    border: "1px solid #ddd",
    borderRadius: "8px",
    width: "100%",
    fontFamily: "inherit",
  },
  subHeading: {
    color: "#666",
    marginBottom: "20px",
  },
  errorMessage: {
    color: "#d32f2f",
    backgroundColor: "#ffebee",
    padding: "10px",
    borderRadius: "4px",
    marginBottom: "15px",
  },
  walletInfo: {
    backgroundColor: "#f9f9f9",
    padding: "12px",
    borderRadius: "8px",
    marginBottom: "20px",
  },
  walletAddress: {
    fontFamily: "monospace",
    fontWeight: "bold",
  },
  error: {
    color: "#d32f2f", 
    marginBottom: "10px"
  }
};

export default AgreementFlow;