require("dotenv").config();
console.log("Client ID:", process.env.WEB3AUTH_CLIENT_ID);
global.crypto = require("crypto");
const session = require('express-session');
const express = require("express");
const cors = require("cors");
const { Web3Auth } = require("@web3auth/single-factor-auth");
const { CHAIN_NAMESPACES } = require("@web3auth/base");
const { EthereumPrivateKeyProvider } = require("@web3auth/ethereum-provider");
const connectDB = require("./config/db"); // Import Mongoose connection
const User = require("./models/User");
const agreementRoutes = require('./routes/agreementRoutes');
const {encrypt, decrypt} = require("./utils/encryption");
const app = express();
app.use(express.json());
const cookieParser = require('cookie-parser');
const userRoutes =require("./routes/userRoutes");
app.use(cors({
    origin: 'http://localhost:3000', // Your frontend URL
    credentials: true // Required for cookies/sessions
}));

app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: true,  // Ensure session is saved
    saveUninitialized: true, // Ensure session is initialized
    cookie: { 
        secure: false, // Set to true only in production with HTTPS
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000
    }
}));

// Add these middleware BEFORE your routes
app.use(cookieParser());

// Authentication middleware
const requireAuth = async (req, res, next) => {
    if (!req.session.userId) {
        return res.status(401).json({ 
            success: false,
            message: 'Not authenticated - please login first' 
        });
    }
    
    try {
        // Get user from database
        const user = await User.findById(req.session.userId);
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'User not found'
            });
        }
        
        // Add user info to req object
        req.user = {
            userId: user._id,
            email: user.email,
            walletAddress: decrypt(user.walletAddress)
        };
        
        next();
    } catch (error) {
        console.error("Auth middleware error:", error);
        res.status(500).json({
            success: false,
            message: 'Authentication error'
        });
    }
};

// Check authentication status endpoint
app.get("/check-auth", (req, res) => {
    if (req.session.userId) {
        res.json({ authenticated: true });
    } else {
        res.json({ authenticated: false });
    }
});

app.get("/debug-session", (req, res) => {
    res.json({ session: req.session });
});

app.get("/", (req, res) => {
    res.send("Web3Auth backend is running");
});

// Apply authentication middleware to protected routes
app.use('/api/agreements', requireAuth, agreementRoutes);

// Ensure this is correct in your index.js
app.use("/users", userRoutes);
// Add this to your server's index.js or userRoutes.js file
app.get('/api/user/wallet-balance', requireAuth, async (req, res) => {
    try {
      // Get the stored wallet address from the user
      const user = await User.findById(req.session.userId);
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }
      
      const walletAddress = decrypt(user.walletAddress);
      
      // Initialize Web3 with the RPC endpoint
      const { Web3 } = require('web3');
      const web3 = new Web3(chainConfig.rpcTarget);
      
      // Get the balance
      const balanceWei = await web3.eth.getBalance(walletAddress);
      const balanceEth = web3.utils.fromWei(balanceWei, 'ether');
      
      return res.json({
        success: true,
        balance: parseFloat(balanceEth).toFixed(4)
      });
    } catch (error) {
      console.error("Error fetching wallet balance:", error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch wallet balance'
      });
    }
  });
        


// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

const clientId = process.env.WEB3AUTH_CLIENT_ID;

// Chain configuration for zkSync Era Testnet
const chainConfig = {
    chainId: "0x12c", // zkSync Era Testnet Chain ID
    displayName: "ZKSync Era sepolia",
    chainNamespace: CHAIN_NAMESPACES.EIP155,
    tickerName: "Ethereum",
    ticker: "ETH",
    decimals: 18,
    rpcTarget: "https://zksync-sepolia.core.chainstack.com/d9aac8dbec2c4eca4805e00092c4680c", // zkSync Era Testnet RPC
    blockExplorerUrl: "https://goerli.explorer.zksync.io", // zkSync Era Testnet Explorer
};

// Initialize Ethereum private key provider
const privateKeyProvider = new EthereumPrivateKeyProvider({
    config: { chainConfig },
});

// Initialize Web3Auth
const web3authSfa = new Web3Auth({
    clientId,
    web3AuthNetwork: "testnet", // Use "mainnet" for production
    privateKeyProvider,
    chainConfig: chainConfig,
});

// Initialize Web3Auth with the private key provider
web3authSfa.init(privateKeyProvider);
app.set('web3authSfa', web3authSfa);
const jwt = require("jsonwebtoken");

function parseToken(token) {
    try {
        const decoded = jwt.decode(token);
        return {
            email: decoded.email,
            name: decoded.name // Extract name from the token
        };
    } catch (error) {
        console.error("Error parsing token:", error);
        return {};
    }
}

// Handle user login
app.post("/login", async (req, res) => {
    try {
        const { idToken } = req.body;
        if (!idToken) {
            return res.status(400).json({ error: "ID token is required" });
        }

        // Parse token to get user details
        const { email, name } = parseToken(idToken);
        if (!email || !name) {
            return res.status(400).json({ error: "Invalid ID token" });
        }

        // Web3Auth authentication
        const sessionId = await web3authSfa.connect({
            verifier: "google-auth-web3auth",
            verifierId: email,
            idToken: idToken,
        });

        const provider = await web3authSfa.provider;
        if (!provider) {
            throw new Error("Provider not initialized");
        }

        // Get wallet info
        const { Web3 } = require('web3');
        const web3 = new Web3(provider);
        const accounts = await web3.eth.getAccounts();
        if (accounts.length === 0) {
            return res.status(400).json({ error: "No accounts found" });
        }

        const walletAddress = accounts[0];
        
        // Store session info instead of the provider object
        // In the login endpoint, update the session storage:
    req.session.web3auth = {
    verifierId: email,
    idToken: idToken, // Store the original idToken for reconnection
    walletAddress: walletAddress,
    rpcEndpoint: chainConfig.rpcTarget,
    chainId: chainConfig.chainId

    
};
    
app.set('web3provider', web3authSfa.provider);
        const encryptedName = encrypt(name);
        const encryptedWallet = encrypt(walletAddress);

        const balance = await web3.eth.getBalance(accounts[0]);
        console.log(balance);

        let user = await User.findOne({ email });
        if (!user) {
            // Create new user
            user = new User({ email, walletAddress: encryptedWallet, name: encryptedName });
            await user.save();
            console.log("New user created:", user);
        } else {
            // Update wallet address in case it changed
            user.walletAddress = encryptedWallet;
            await user.save();
        }
        
        // Store user ID in session for authentication
        req.session.userId = user._id;
        
        return res.status(200).json({ 
            message: user ? "Login successful" : "Successfully created account", 
            email, 
            walletAddress,
            userId: user._id
        });
    } catch (err) {
        console.error("Error during login:", err);
        res.status(500).json({ error: err.message || "Internal server error" });
    }
});

// Add a middleware to reconnect the Web3Auth session
// Update the middleware


// Logout endpoint
app.post('/logout', async (req, res) => {
    try {
      // Get the web3auth session from app's storage
      const web3authProvider = app.get('web3provider');
      
      // If there's an active web3auth session, disconnect it
      if (web3authProvider) {
        try {
          await web3authSfa.logout();
          app.set('web3provider', null); // Clear the provider
        } catch (web3Error) {
          console.log("Error during Web3Auth logout:", web3Error);
          // Continue with session destruction even if Web3Auth logout fails
        }
      }
      
      // Destroy the session
      req.session.destroy((err) => {
        if (err) {
          return res.status(500).json({ success: false, message: 'Logout failed' });
        }
        res.json({ success: true, message: 'Logged out successfully' });
      });
    } catch (error) {
      console.error("Error during logout:", error);
      res.status(500).json({ success: false, message: 'Logout failed: ' + error.message });
    }
  });

const PORT = process.env.PORT || 5001;
connectDB().then(() => {
    app.listen(PORT, () => {
        console.log("Server running on port 5001");
    });
});

module.exports = app;