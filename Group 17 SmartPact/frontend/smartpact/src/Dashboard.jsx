import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import Logo from "./assets/LogoDash.png";
import Icon from "./assets/person-circle-icon.png";
import AgreementFlow from "./AgreementFlow";

// Configure axios defaults if not already configured elsewhere
axios.defaults.withCredentials = true;
axios.defaults.baseURL = 'http://localhost:5001';

// ETH to INR conversion rate (this would ideally come from an API)
const ETH_TO_INR_RATE = 243000; // Example rate (1 ETH = ₹243,000)

const Dashboard = ({ userData, onLogout, onUpdateUserData }) => {
  const [showAgreementFlow, setShowAgreementFlow] = useState(false);
  const [agreements, setAgreements] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("all"); // "all" or "requests"
  const [activationStatus, setActivationStatus] = useState({});
  const [walletBalance, setWalletBalance] = useState(userData?.walletBalance || null);
  // New state for activation confirmation modal
  const [activationModal, setActivationModal] = useState({
    isOpen: false,
    agreementId: null,
    agreementType: null,
    amount: null,
    title: null
  });
  // New state for payment modal
  const [paymentModal, setPaymentModal] = useState({
    isOpen: false,
    agreementId: null,
    agreementType: null,
    amount: null,
    title: null,
    action: null, // "pay" or "complete" or "cancel"
  });
  // New state for operation status
  const [operationStatus, setOperationStatus] = useState({});

  // Fetch agreements on component mount and when new ones are created
  useEffect(() => {
    fetchAgreements();
    if (userData?.id) {
      fetchWalletBalance();
    }
  }, [userData?.id]); // Only re-fetch when the ID changes// Re-fetch when userData changes

  const fetchWalletBalance = async () => {
    try {
      const response = await axios.get('/api/user/wallet-balance');
      if (response.data && response.data.success) {
        // Set local state for immediate UI update
        setWalletBalance(response.data.balance);
        
        // Update parent component state if the callback is provided
        if (onUpdateUserData) {
          onUpdateUserData({
            ...userData,
            walletBalance: response.data.balance
          });
        }
      }
    } catch (err) {
      console.error("Failed to fetch wallet balance:", err);
      // Don't set error state to avoid disrupting the UI
    }
  };

  const fetchAgreements = async () => {
    if (!userData?.id) return;
    
    try {
      setIsLoading(true);
      setError(null);
      const response = await axios.get(`/api/agreements/user/${userData.id}`);
      // Fetch agreements associated with this user
      if (response.data && response.data.success && Array.isArray(response.data.agreements)) {
        const sortedAgreements = response.data.agreements.sort((a, b) => 
          new Date(b.createdAt) - new Date(a.createdAt)
        );
        setAgreements(sortedAgreements);
      } else {
        setAgreements([]);
      }
    } catch (err) {
      console.error("Failed to fetch agreements:", err);
      setError("Failed to load your agreements. Please refresh the page.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateAgreement = (newAgreement) => {
    // Add the new agreement to the state
    fetchAgreements();
    setShowAgreementFlow(false);
  };

  const handleAcceptAgreement = async (agreementId) => {
    try {
      const response = await axios.post(`/api/agreements/${agreementId}/accept`);
      
      if (response.data.success) {
        setAgreements(prev => 
          prev.map(a => 
            a._id === agreementId 
              ? { ...a, status: "Accepted" } 
              : a
          )
        );
      } else {
        alert(`Failed to accept: ${response.data.message}`);
      }
    } catch (err) {
      console.error("Accept error details:", err.response?.data);
      alert(`Failed to accept agreement: ${err.response?.data?.message || err.message}`);
    }
  };
  
  // Function to determine if user can accept the agreement
  const canAcceptAgreement = (agreement) => {
    return agreement.counterparty._id === userData.id && agreement.status === "Created";
  };

  // Open activation confirmation modal
  const showActivationConfirmation = (agreement) => {
    let amountToDeduct = "0";
    let message = "";

    if (agreement.type === "Software Freelancing") {
      amountToDeduct = agreement.amount;
      message = "full payment amount";
    } else if (agreement.type === "Rental Agreement") {
      amountToDeduct = agreement.securityDeposit;
      message = "security deposit";
    } else if (agreement.type === "Subscription Agreement") {
      amountToDeduct = agreement.amount;
      message = "first subscription fee";
    }

    setActivationModal({
      isOpen: true,
      agreementId: agreement._id,
      agreementType: agreement.type,
      amount: amountToDeduct,
      title: agreement.title,
      message: message
    });
  };

  // Close activation modal
  const closeActivationModal = () => {
    setActivationModal({
      isOpen: false,
      agreementId: null,
      agreementType: null,
      amount: null,
      title: null,
      message: null
    });
  };

  // Handle actual activation after confirmation
  const handleActivateAgreement = async () => {
    const agreementId = activationModal.agreementId;
    try {
      setActivationStatus(prev => ({ ...prev, [agreementId]: 'loading' }));
      const response = await axios.post(`/api/agreements/${agreementId}/fund`);
      
      if (response.data && response.data.success) {
        // Update agreement status locally to "Active"
        setAgreements(agreements.map(agreement => 
          agreement._id === agreementId 
            ? { ...agreement, status: "Active", fundTxHash: response.data.txHash }
            : agreement
        ));
        setActivationStatus(prev => ({ ...prev, [agreementId]: 'success' }));
        
        // Close modal first
        closeActivationModal();
        
        // Then update wallet balance
        fetchWalletBalance();
      } else {
        setActivationStatus(prev => ({ ...prev, [agreementId]: 'error' }));
        alert(`Activation failed: ${response.data?.message || 'Unknown error'}`);
        closeActivationModal();
      }
    } catch (err) {
      console.error("Failed to activate agreement:", err);
      setActivationStatus(prev => ({ ...prev, [agreementId]: 'error' }));
      const errorMessage = err.response?.data?.message || err.message || 'Unknown error occurred';
      alert(`Failed to activate agreement: ${errorMessage}`);
      closeActivationModal();
    }
  };
  
  // Only the creator can activate, regardless of agreement type
  const canActivateAgreement = (agreement) => {
    // Check if creator is populated (object with _id) or just an ID string
    const isCreatorPopulated = agreement.creator && typeof agreement.creator === 'object';
    const creatorId = isCreatorPopulated ? agreement.creator._id : agreement.creator;
    
    // Only show if:
    // 1. Current user is creator
    // 2. Status is "Accepted"
    return creatorId === userData.id && agreement.status === "Accepted";
  };

  // NEW FUNCTIONALITY: Show payment modal for completing agreement or paying fees
  const showPaymentConfirmation = (agreement, action) => {
    let amountToPay = "0";
    let message = "";
  
    if (action === "complete" && agreement.type === "Software Freelancing") {
      amountToPay = "0";
      message = "mark the project as completed";
    } else if (action === "pay" && agreement.type === "Rental Agreement") {
      amountToPay = agreement.amount;
      message = "monthly rent payment";
    } else if (action === "pay" && agreement.type === "Subscription Agreement") {
      amountToPay = agreement.amount;
      message = "subscription fee";
    } else if (action === "cancel" && agreement.type === "Subscription Agreement") {
      amountToPay = "0";
      message = "cancel your subscription";
    } else if (action === "complete" && (agreement.type === "Rental Agreement" || agreement.type === "Subscription Agreement")) {
      amountToPay = "0";
      message = `mark the ${agreement.type.toLowerCase()} as completed`;
    }
  
    setPaymentModal({
      isOpen: true,
      agreementId: agreement._id,
      agreementType: agreement.type,
      amount: amountToPay,
      title: agreement.title,
      message: message,
      action: action
    });
  };
  
  const handlePaymentAction = async () => {
    const agreementId = paymentModal.agreementId;
    const action = paymentModal.action;
    const agreementType = paymentModal.agreementType;
    
    try {
      setOperationStatus(prev => ({ ...prev, [agreementId]: 'loading' }));
      let endpoint = '';
      let successStatus = '';
      
      if (action === "complete") {
        endpoint = `/api/agreements/${agreementId}/complete`;
        successStatus = "Completed";
      } else if (action === "pay") {
        // Different endpoints for rentals vs subscriptions
        endpoint = agreementType === "Rental Agreement" 
          ? `/api/agreements/${agreementId}/pay-rent`
          : `/api/agreements/${agreementId}/pay-subscription`;
        successStatus = "Active";
      } else if (action === "cancel") {
        endpoint = `/api/agreements/${agreementId}/cancel-subscription`;
        successStatus = "Cancelled";
      }
      
      const response = await axios.post(endpoint);
      
      if (response.data?.success) {
        // Update agreement status locally
        setAgreements(agreements.map(agreement => 
          agreement._id === agreementId 
            ? { 
                ...agreement, 
                status: successStatus,
                // For payments, update payment history
                ...(action === "pay" && { 
                  paymentHistory: [
                    ...(agreement.paymentHistory || []),
                    {
                      amount: paymentModal.amount,
                      date: new Date().toISOString(),
                      txHash: response.data.txHash
                    }
                  ],
                  // For subscriptions, update next billing date
                  ...(agreementType === "Subscription Agreement" && response.data.nextBillingDate && {
                    nextBillingDate: response.data.nextBillingDate
                  })
                })
              }
            : agreement
        ));
        
        setOperationStatus(prev => ({ ...prev, [agreementId]: 'success' }));
        closePaymentModal();
        fetchWalletBalance();
        
      } else {
        throw new Error(response.data?.message || 'Operation failed');
      }
    } catch (err) {
      console.error(`${action} failed:`, err);
      setOperationStatus(prev => ({ ...prev, [agreementId]: 'error' }));
      alert(`Failed to ${action}: ${err.response?.data?.message || err.message}`);
      closePaymentModal();
    }
  };
  
  // Close payment modal (unchanged)
  const closePaymentModal = () => {
    setPaymentModal({
      isOpen: false,
      agreementId: null,
      agreementType: null,
      amount: null,
      title: null,
      message: null,
      action: null
    });
  };
  
  // Check if user can complete a freelancing agreement (client only)
  const canCompleteFreelancingAgreement = (agreement) => {
    if (agreement.type !== "Software Freelancing") return false;
    
    // Check if creator is populated (object with _id) or just an ID string
    const isCreatorPopulated = agreement.creator && typeof agreement.creator === 'object';
    const creatorId = isCreatorPopulated ? agreement.creator._id : agreement.creator;
    
    return creatorId === userData.id && agreement.status === "Active";
  };
  
  // Check if user can pay rent (tenant only)
  const canPayRent = (agreement) => {
    if (agreement.type !== "Rental Agreement") return false;
    
    const isCreatorPopulated = agreement.creator && typeof agreement.creator === 'object';
    const creatorId = isCreatorPopulated ? agreement.creator._id : agreement.creator;
    
    return creatorId === userData.id && agreement.status === "Active";
  };
  
  // Check if user can pay subscription (subscriber only)
  const canPaySubscription = (agreement) => {
    if (agreement.type !== "Subscription Agreement") return false;
    
    const isCreatorPopulated = agreement.creator && typeof agreement.creator === 'object';
    const creatorId = isCreatorPopulated ? agreement.creator._id : agreement.creator;
    
    return creatorId === userData.id && agreement.status === "Active";
  };
  
  // Check if user can cancel subscription (subscriber only)
  const canCancelSubscription = (agreement) => {
    if (agreement.type !== "Subscription Agreement") return false;
    
    const isCreatorPopulated = agreement.creator && typeof agreement.creator === 'object';
    const creatorId = isCreatorPopulated ? agreement.creator._id : agreement.creator;
    
    return creatorId === userData.id && agreement.status === "Active";
  };
  
  // Check if landlord can mark rental agreement as completed
  const canLandlordCompleteRental = (agreement) => {
    if (agreement.type !== "Rental Agreement") return false;
    
    const isCounterpartyPopulated = agreement.counterparty && typeof agreement.counterparty === 'object';
    const counterpartyId = isCounterpartyPopulated ? agreement.counterparty._id : agreement.counterparty;
    
    return counterpartyId === userData.id && agreement.status === "Active";
  };
  
  // Check if service provider can mark subscription as completed
  const canProviderCompleteSubscription = (agreement) => {
    if (agreement.type !== "Subscription Agreement") return false;
    
    const isCounterpartyPopulated = agreement.counterparty && typeof agreement.counterparty === 'object';
    const counterpartyId = isCounterpartyPopulated ? agreement.counterparty._id : agreement.counterparty;
    
    return counterpartyId === userData.id && agreement.status === "Active";
  };

  const getOtherPartyName = (agreement) => {
    // Safeguard against undefined agreement
    if (!agreement) return "Unknown";
    
    // Safely get creator and counterparty info
    const creator = agreement.creator || {};
    const counterparty = agreement.counterparty || {};
    
    // Check if creator is populated (object with _id) or just an ID string
    const isCreatorPopulated = creator && typeof creator === 'object' && creator._id;
    const creatorId = isCreatorPopulated ? creator._id : agreement.creator;
    
    // Check if current user is the creator
    if (creatorId === userData?.id) {
      // Return counterparty info - handle both populated and unpopulated cases
      if (counterparty.email) {
        return counterparty.email;
      }
      return "Counterparty";
    } else {
      // Return creator info
      if (creator.email) {
        return creator.email;
      }
      return "Creator";
    }
  };

  // Convert ETH to INR
  const convertToINR = (ethAmount) => {
    if (!ethAmount) return "0";
    const inrAmount = parseFloat(ethAmount) * ETH_TO_INR_RATE;
    return inrAmount.toLocaleString('en-IN');
  };

  // Calculate next payment date for rental or subscription
  const getNextPaymentDate = (agreement) => {
    if (!agreement.lastPaymentDate) {
      // If no payments have been made yet, use start date
      return new Date(agreement.startDate);
    }
    
    const lastPayment = new Date(agreement.lastPaymentDate);
    const nextPayment = new Date(lastPayment);
    nextPayment.setMonth(nextPayment.getMonth() + 1); // Add one month
    
    return nextPayment;
  };

  // Format date for display
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  // Properly handle logout
  const handleLogoutClick = async () => {
    try {
      const response = await axios.post('/logout', {}, {
        withCredentials: true,
        baseURL: 'http://localhost:5001'
      });
      
      if (response.data.success) {
        if (onLogout) {
          onLogout();
        }
      } else {
        console.error("Logout failed:", response.data.message);
      }
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  // Filter agreements for the requests tab to only show "Created" status
  const filteredAgreements = activeTab === "all" 
    ? agreements
    : agreements.filter(agreement => 
        agreement.status === "Created" && agreement.counterparty._id === userData.id
      );

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <img src={Logo} alt="Logo" style={styles.logo} />
        </div>
        
        <div style={styles.headerMiddle}>
          {walletBalance && (
            <div style={styles.balanceContainer}>
              <div style={styles.ethBalance}>{walletBalance} ETH</div>
              <div style={styles.inrBalance}>≈ ₹{convertToINR(walletBalance)}</div>
            </div>
          )}
        </div>
        
        <div style={styles.headerRight}>
          <button style={styles.logoutButton} onClick={handleLogoutClick}>
            Logout
          </button>
          {userData?.profilePicture ? (
            <img src={userData.profilePicture} alt="Profile" style={styles.profileCircle} />
          ) : (
            <img src={Icon} alt="Icon" style={styles.profileCircle} />
          )}
        </div>
      </div>

      {showAgreementFlow ? (
        <AgreementFlow 
          userData={userData}
          onCreateAgreement={handleCreateAgreement} 
          onCancel={() => setShowAgreementFlow(false)}
        />
      ) : (
        <>
          {/* Welcome Message */}
          <h1 style={styles.welcomeText}>
            Welcome {userData?.name || userData?.email || ""}!
          </h1>
          <button 
            style={styles.createButton} 
            onClick={() => setShowAgreementFlow(true)}
          >
            Create new agreement
          </button>

          {/* Agreements Section */}
          <div style={styles.agreementsContainer}>
            <div style={styles.tabContainer}>
              <button 
                style={{
                  ...styles.tabButton,
                  backgroundColor: activeTab === "all" ? "#A65DE9" : "white",
                  color: activeTab === "all" ? "white" : "#A65DE9"
                }} 
                onClick={() => setActiveTab("all")}
              >
                View all agreements
              </button>
              <button 
                style={{
                  ...styles.tabButton,
                  backgroundColor: activeTab === "requests" ? "#A65DE9" : "white",
                  color: activeTab === "requests" ? "white" : "#A65DE9"
                }}
                onClick={() => setActiveTab("requests")}
              >
                Agreement requests
              </button>
            </div>
            
            {isLoading ? (
              <div style={styles.loadingMessage}>Loading your agreements...</div>
            ) : error ? (
              <div style={styles.errorMessage}>{error}</div>
            ) : filteredAgreements.length > 0 ? (
              // Render existing agreements
              filteredAgreements.map(agreement => (
                <div key={agreement._id} style={styles.agreementCard}>
                  <div style={styles.agreementHeader}>
                    <span style={styles.agreementTypeBadge}>{agreement.type}</span>
                    <span style={{
                      ...styles.agreementStatus,
                      backgroundColor: getStatusColor(agreement.status)
                    }}>
                      {agreement.status}
                    </span>
                  </div>
                  {/* Replace <a> with <Link> to avoid page refresh */}
                  <Link to={`/agreements/${agreement._id}`} style={styles.agreementTitle}>
                    {agreement.title}
                  </Link>
                  <p style={styles.parties}>
                    With: {getOtherPartyName(agreement)}
                  </p>
                  <div style={styles.dates}>
                    <span>Start: {formatDate(agreement.startDate)}</span>
                    <span>Due: {formatDate(agreement.dueDate)}</span>
                  </div>
                  {agreement.amount && (
                    <div style={styles.amount}>
                      Amount: {agreement.amount} ETH <span style={styles.inrAmount}>(≈ ₹{convertToINR(agreement.amount)})</span>
                    </div>
                  )}
              
                  
                  {/* Accept Button */}
                  {canAcceptAgreement(agreement) && (
                    <button 
                      style={styles.acceptButton}
                      onClick={() => handleAcceptAgreement(agreement._id)}
                    >
                      Accept Agreement
                    </button>
                  )}
                  
                  {/* Activate Button */}
                  {canActivateAgreement(agreement) && (
                    <button 
                      style={styles.activateButton}
                      onClick={() => showActivationConfirmation(agreement)}
                      disabled={activationStatus[agreement._id] === 'loading'}
                    >
                      {activationStatus[agreement._id] === 'loading' ? 'Processing...' : 'Activate Agreement'}
                    </button>
                  )}
                  
                  {/* Complete Freelancing Button (Client) */}
                  {canCompleteFreelancingAgreement(agreement) && (
                    <button 
                      style={styles.completeButton}
                      onClick={() => showPaymentConfirmation(agreement, "complete")}
                      disabled={operationStatus[agreement._id] === 'loading'}
                    >
                      {operationStatus[agreement._id] === 'loading' ? 'Processing...' : 'Mark Project Complete'}
                    </button>
                  )}
                  
                  {/* Pay Rent Button (Tenant) */}
                  {canPayRent(agreement) && (
                    <button 
                      style={styles.payButton}
                      onClick={() => showPaymentConfirmation(agreement, "pay")}
                      disabled={operationStatus[agreement._id] === 'loading'}
                    >
                      {operationStatus[agreement._id] === 'loading' ? 'Processing...' : 'Pay Monthly Rent'}
                    </button>
                  )}
                  
                  {/* Pay Subscription Button (Subscriber) */}
                  {canPaySubscription(agreement) && (
                    <button 
                      style={styles.payButton}
                      onClick={() => showPaymentConfirmation(agreement, "pay")}
                      disabled={operationStatus[agreement._id] === 'loading'}
                    >
                      {operationStatus[agreement._id] === 'loading' ? 'Processing...' : 'Pay Subscription Fee'}
                    </button>
                  )}
                  
                  {/* Cancel Subscription Button (Subscriber) */}
                  {canCancelSubscription(agreement) && (
                    <button 
                      style={styles.cancelButton}
                      onClick={() => showPaymentConfirmation(agreement, "cancel")}
                      disabled={operationStatus[agreement._id] === 'loading'}
                    >
                      {operationStatus[agreement._id] === 'loading' ? 'Processing...' : 'Cancel Subscription'}
                    </button>
                  )}
                  
                  {/* Mark Rental Complete Button (Landlord) */}
                  {canLandlordCompleteRental(agreement) && (
                    <button 
                      style={styles.completeButton}
                      onClick={() => showPaymentConfirmation(agreement, "complete")}
                      disabled={operationStatus[agreement._id] === 'loading'}
                    >
                      {operationStatus[agreement._id] === 'loading' ? 'Processing...' : 'Mark Rental Complete'}
                    </button>
                  )}
                  
                  {/* Mark Subscription Complete Button (Service Provider) */}
                  {canProviderCompleteSubscription(agreement) && (
                    <button 
                      style={styles.completeButton}
                      onClick={() => showPaymentConfirmation(agreement, "complete")}
                      disabled={operationStatus[agreement._id] === 'loading'}
                    >
                      {operationStatus[agreement._id] === 'loading' ? 'Processing...' : 'Mark Subscription Complete'}
                    </button>
                  )}
                  
                  {activationStatus[agreement._id] === 'error' && (
                    <div style={styles.errorMessage}>Activation failed. Please try again.</div>
                  )}
                  
                  {operationStatus[agreement._id] === 'error' && (
                    <div style={styles.errorMessage}>Operation failed. Please try again.</div>
                  )}
                </div>
              ))
            ) : (
              // Empty state
              <div style={styles.emptyState}>
                <p>You don't have any {activeTab === "requests" ? "agreement requests" : "agreements"} yet.</p>
                {activeTab === "all" && <p>Create a new agreement to get started!</p>}
              </div>
            )}
          </div>
        </>
      )}

      {/* Activation Confirmation Modal */}
      {activationModal.isOpen && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <h3 style={styles.modalTitle}>Activate Agreement</h3>
            <p>You are about to activate: <strong>{activationModal.title}</strong></p>
            <p>This will deduct <strong>{activationModal.amount} ETH</strong> from your wallet as the {activationModal.message}.</p>
            <p style={styles.inrConversion}>≈ ₹{convertToINR(activationModal.amount)}</p>
            <div style={styles.modalButtons}>
              <button 
                style={styles.modalCancelButton} 
                onClick={closeActivationModal}
              >
                Cancel
              </button>
              <button 
                style={styles.modalConfirmButton} 
                onClick={handleActivateAgreement}
              >
                Confirm Activation
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Payment/Completion/Cancellation Modal */}
      {paymentModal.isOpen && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <h3 style={styles.modalTitle}>
              {paymentModal.action === "pay" ? "Payment" : 
               paymentModal.action === "complete" ? "Complete Agreement" : 
               "Cancel Subscription"}
            </h3>
            <p>You are about to {paymentModal.message} for: <strong>{paymentModal.title}</strong></p>
            {paymentModal.action === "pay" && (
              <>
                <p>This will deduct <strong>{paymentModal.amount} ETH</strong> from your wallet.</p>
                <p style={styles.inrConversion}>≈ ₹{convertToINR(paymentModal.amount)}</p>
              </>
            )}
            <div style={styles.modalButtons}>
              <button 
                style={styles.modalCancelButton} 
                onClick={closePaymentModal}
              >
                Cancel
              </button>
              <button 
                style={{
                  ...styles.modalConfirmButton,
                  backgroundColor: paymentModal.action === "cancel" ? "#dc3545" : "#A65DE9"
                }} 
                onClick={handlePaymentAction}
              >
                {paymentModal.action === "pay" ? "Confirm Payment" : 
                 paymentModal.action === "complete" ? "Confirm Completion" : 
                 "Confirm Cancellation"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper function to get status color
const getStatusColor = (status) => {
  switch (status) {
    case "Active":
      return "#28A745"; // Green
    case "Accepted":
      return "#17A2B8"; // Blue
    case "Created":
      return "#FFC107"; // Yellow
    case "Completed":
      return "#6610f2"; // Purple
    case "Cancelled":
      return "#dc3545"; // Red
    default:
      return "#6C757D"; // Gray
  }
};

// Inline Styles
const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "flex-start",
    fontFamily: "'Poppins', sans-serif",
    background: "linear-gradient(135deg, #FF8C00, #A65DE9)", // Orange → Purple gradient
    color: "#333",
    paddingTop: "40px",
    minHeight: "100vh", // Changed from height to minHeight
    padding: "20px 0 60px 0", // Added bottom padding
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    width: "90%",
    padding: "15px 20px",
    backgroundColor: "white",
    borderRadius: "12px",
    boxShadow: "0px 5px 15px rgba(0,0,0,0.1)",
    marginBottom: "20px",
  },
  headerLeft: {
    flex: "1",
  },
  headerMiddle: {
    flex: "2",
    display: "flex",
    justifyContent: "center",
  },
  headerRight: {
    flex: "1",
    display: "flex",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: "15px",
  },
  balanceContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  logo: {
    width: "40px",
  },
  ethBalance: {
    fontSize: "16px",
    fontWeight: "bold",
  },
  inrBalance: {
    fontSize: "12px",
    color: "#666",
  },
  inrAmount: {
    fontSize: "12px",
    color: "#666",
    marginLeft: "5px",
  },
  inrConversion: {
    fontSize: "14px",
    color: "#666",
    marginTop: "5px",
    textAlign: "center",
  },
  profileCircle: {
    width: "35px",
    height: "35px",
    borderRadius: "50%",
    backgroundColor: "#A65DE9",
    color: "white",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "bold",
  },
  logoutButton: {
    padding: "8px 16px",
    fontSize: "14px",
    fontWeight: "600",
    color: "white",
    background: "#A65DE9",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    transition: "all 0.3s ease",
  },
  acceptButton: {
    marginTop: "15px",
    padding: "8px 16px",
    backgroundColor: "#28A745", // Green color
    color: "white",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontWeight: "600",
    width: "100%",
    transition: "background-color 0.3s ease",
  },
  welcomeText: {
    fontSize: "28px",
    fontWeight: "bold",
    marginBottom: "50px",
    marginTop:"50px",
    color:"#FFFFFF",
  },
  createButton: {
    padding: "12px 24px",
    fontSize: "16px",
    fontWeight: "600",
    color: "#A65DE9",
    border: "2px solid #A65DE9",
    borderRadius: "8px",
    background: "white",
    cursor: "pointer",
    transition: "all 0.3s ease",
    marginBottom: "80px",
  },
  agreementsContainer: {
    width: "80%",
    background: "white",
    borderRadius: "12px",
    padding: "20px",
    boxShadow: "0px 10px 30px rgba(0,0,0,0.1)",
  },
  tabButton: {
    padding: "10px 20px",
    fontSize: "14px",
    fontWeight: "600",
    border: "2px solid #A65DE9",
    borderRadius: "8px",
    background: "white",
    color: "#A65DE9",
    cursor: "pointer",
    margin: "5px",
  },
  agreementCard: {
    marginTop: "20px",
    padding: "15px",
    background: "#f8f8f8",
    borderRadius: "8px",
    boxShadow: "0px 5px 10px rgba(0,0,0,0.1)",
  },
  agreementHeader: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "10px",
  },
  agreementTypeBadge: {
    padding: "3px 8px",
    backgroundColor: "#6A5ACD",
    color: "white",
    borderRadius: "4px",
    fontSize: "12px",
  },
  agreementStatus: {
    padding: "3px 8px",
    color: "white",
    borderRadius: "4px",
    fontSize: "12px",
  },
  agreementTitle: {
    fontSize: "16px",
    fontWeight: "600",
    color: "#6A5ACD",
    textDecoration: "none",
    display: "block",
    marginBottom: "8px",
  },
  parties: {
    fontSize: "14px",
    marginTop: "5px",
    color: "#555",
  },
  dates: {
    display: "flex",
    justifyContent: "space-between",
    marginTop: "8px",
    fontSize: "14px",
    fontWeight: "500",
  },
  amount: {
    marginTop: "8px",
    fontSize: "14px",
    fontWeight: "600",
  },
  emptyState: {
    padding: "30px",
    textAlign: "center",
    color: "#6c757d",
  },
  loadingMessage: {
    padding: "20px",
    textAlign: "center",
    color: "#6c757d",
  },
  errorMessage: {
    padding: "20px",
    textAlign: "center",
    color: "#dc3545",
  },
  tabContainer: {
    display: "flex",
    marginBottom: "20px",
  },
  activateButton: {
    marginTop: "15px",
    padding: "8px 16px",
    backgroundColor: "#A65DE9",
    color: "white",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontWeight: "600",
    width: "100%",
    transition: "background-color 0.3s ease",
  },
  // Modal styles
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: "white",
    padding: "25px",
    borderRadius: "10px",
    width: "400px",
    maxWidth: "90%",
    boxShadow: "0 5px 15px rgba(0, 0, 0, 0.3)",
  },
  modalTitle: {
    fontSize: "20px",
    fontWeight: "bold",
    marginBottom: "15px",
    color: "#333",
  },
  modalButtons: {
    display: "flex",
    justifyContent: "flex-end",
    marginTop: "20px",
    gap: "10px",
  },
  modalCancelButton: {
    padding: "8px 16px",
    backgroundColor: "#6c757d",
    color: "white",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontWeight: "500",
  },
  modalConfirmButton: {
    padding: "8px 16px",
    backgroundColor: "#A65DE9",
    color: "white",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontWeight: "500",
  },
  payButton: {
    marginTop: "10px",
    padding: "8px 16px",
    backgroundColor: "#4CAF50", // Green
    color: "white",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontWeight: "600",
    width: "100%",
    transition: "background-color 0.3s ease",
  },
  completeButton: {
    marginTop: "10px",
    padding: "8px 16px",
    backgroundColor: "#007BFF", // Blue
    color: "white",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontWeight: "600",
    width: "100%",
    transition: "background-color 0.3s ease",
  },
  cancelButton: {
    marginTop: "10px",
    padding: "8px 16px",
    backgroundColor: "#dc3545", // Red
    color: "white",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontWeight: "600",
    width: "100%",
    transition: "background-color 0.3s ease",
  },
  disabledButton: {
    backgroundColor: "#cccccc",
    cursor: "not-allowed",
  },
  nextBillingInfo: {
    fontSize: "12px",
    color: "#666",
    marginTop: "5px",
  },
};

// Load Google Font
const link = document.createElement("link");
link.href = "https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600&display=swap";
link.rel = "stylesheet";
document.head.appendChild(link);

export default Dashboard;