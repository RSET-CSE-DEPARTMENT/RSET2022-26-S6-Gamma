import { Buffer } from "buffer";
import React, { useState, useEffect, useRef } from "react";
import { GoogleLogin } from "@react-oauth/google";
import { ethers } from "ethers";
import { Web3Auth } from "@web3auth/single-factor-auth";
import { CHAIN_NAMESPACES } from "@web3auth/base";
import { EthereumPrivateKeyProvider } from "@web3auth/ethereum-provider";
import axios from "axios"; // Make sure axios is installed

window.Buffer = Buffer;

// Use the same configuration as your backend
const clientId = process.env.REACT_APP_WEB3AUTH_CLIENT_ID || "BPi5PB_UiIZ-cPz1GtV5i1I2iOSOHuimiXBI0e-Oe_u6X3oVAbCiAZOTEBtTXw4tsluTITPqA8zMsfxIKMjiqNQ";

// Same chain config as your backend
const chainConfig = {
  chainId: "0x12c", // zkSync Era Sepolia Testnet
  displayName: "ZKSync Era sepolia",
  chainNamespace: CHAIN_NAMESPACES.EIP155,
  tickerName: "Ethereum",
  ticker: "ETH",
  decimals: 18,
  rpcTarget: "https://zksync-sepolia.core.chainstack.com/d9aac8dbec2c4eca4805e00092c4680c",
  blockExplorerUrl: "https://sepolia.explorer.zksync.io",
};

const Login = ({ onLoginSuccess }) => {
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [status, setStatus] = useState("initializing");
  const [errorMessage, setErrorMessage] = useState("");

  // Use the same API base URL as your backend
  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5001";

  const onSuccess = async (googleResponse) => {
    try {
      setIsLoggingIn(true);
      setStatus("processing");
      
      // Get the ID token from Google response
      const idToken = googleResponse.credential;
      if (!idToken) {
        throw new Error("No ID token received from Google");
      }
      
      console.log("Google authentication successful, sending ID token to backend...");
      
      // Send the ID token to your backend
      const response = await axios.post(`${API_URL}/login`, { idToken });
      
      if (!response.data || !response.data.walletAddress) {
        throw new Error("Invalid response from server");
      }
      
      console.log("Login successful:", response.data);
      
      // Extract user data from response
      const { email, walletAddress,userId } = response.data;
      
      // Since your backend handles the Web3Auth connection,
      // we just need to create a signer for the frontend usage
      const provider = new ethers.JsonRpcProvider(chainConfig.rpcTarget);
      
      // Pass the wallet address and other data to the parent component
      onLoginSuccess({
        email: response.data.email,
        walletAddress: response.data.walletAddress, // ✅ Ensure this is set
        provider: new ethers.JsonRpcProvider(chainConfig.rpcTarget), // ✅ Add provider
        id:userId
      });
      
      setStatus("success");
    } catch (error) {
      console.error("Login error:", error);
      setStatus("error");
      setErrorMessage(error.message || "Login failed. Please try again.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const onError = (error) => {
    console.error("Google login failed:", error);
    setStatus("error");
    setErrorMessage("Google login failed. Please try again.");
  };

  useEffect(() => {
    // Check if the backend server is running
    const checkServer = async () => {
      try {
        const response = await axios.get(`${API_URL}/`);
        if (response.status === 200) {
          setStatus("ready");
        }
      } catch (error) {
        console.error("Server connection error:", error);
        setStatus("serverError");
        setErrorMessage("Cannot connect to the server. Please try again later.");
      }
    };
    
    checkServer();
  }, [API_URL]);

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        fontFamily: "'Poppins', sans-serif",
        background: "linear-gradient(135deg, #FF8C00, #A65DE9)",
        color: "#fff",
      }}
    >
      {/* Left Section */}
      <div
        style={{
          width: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px",
        }}
      >
        <div
          style={{
            textAlign: "center",
            maxWidth: "500px",
          }}
        >
          <img
            src="/LogoDash.png"
            alt="Illustration"
            style={{ width: "30%", borderRadius: "20px", boxShadow: "0 4px 15px rgba(0, 0, 0, 0.2)" }}
          />
          <h1
            style={{
              fontSize: "3rem",
              fontWeight: "bold",
              marginBottom: "20px",
              color: "#fff",
            }}
          >
            Welcome to SmartPact!
          </h1>
          <p
            style={{
              fontSize: "1.2rem",
              color: "#e0e0e0",
              marginBottom: "40px",
            }}
          >
            Securely log in with Google to access your account.
          </p>
        </div>
      </div>

      {/* Right Section */}
      <div
        style={{
          width: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "rgba(255, 255, 255, 0.9)",
          borderRadius: "20px 0 0 20px",
          boxShadow: "-10px 0 30px rgba(0, 0, 0, 0.1)",
        }}
      >
        <div
          style={{
            width: "80%",
            maxWidth: "400px",
            textAlign: "center",
          }}
        >
          <h2
            style={{
              fontSize: "2rem",
              fontWeight: "bold",
              marginBottom: "30px",
              color: "#333",
            }}
          >
            Log in
          </h2>
          <div style={{ display: "flex", justifyContent: "center", flexDirection: "column", alignItems: "center", color: "black", fontFamily: "monospace", fontSize: "16px" }}>
            {status === "initializing" && (
              <p style={{ marginBottom: "15px" }}>Initializing, please wait...</p>
            )}
            
            {status === "serverError" && (
              <p style={{ color: "red", marginBottom: "15px" }}>
                {errorMessage}
              </p>
            )}
            
            {status === "error" && (
              <p style={{ color: "red", marginBottom: "15px" }}>
                {errorMessage}
              </p>
            )}
            
            {isLoggingIn ? (
              <p>Logging in, please wait...</p>
            ) : (
              <>
                {(status === "ready" || status === "error") && (
                  <div style={{ width: "100%" }}>
                    <GoogleLogin
                      onSuccess={onSuccess}
                      onError={onError}
                      shape="rectangular"
                      size="large"
                      text="signin_with"
                      theme="outline"
                      width="100%"
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;