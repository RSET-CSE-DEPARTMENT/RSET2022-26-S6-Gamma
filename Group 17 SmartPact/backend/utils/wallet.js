const { Web3 } = require('web3');

async function getUserWallet(req) {
  try {
    // Get the Web3Auth instance from the app
    const web3authSfa = req.app.get('web3authSfa');
    
    if (!web3authSfa) {
      throw new Error('Web3Auth not initialized');
    }
    
    // Check if there's an existing provider we can use
    if (!web3authSfa.provider) {
      // Provider not available, we need to check if we're connected
      const connected = await web3authSfa.status();
      
      // If we're not connected but have session info, try to connect
      if (!connected && req.session?.web3auth?.verifierId && req.session?.web3auth?.idToken) {
        await web3authSfa.connect({
          verifier: "google-auth-web3auth",
          verifierId: req.session.web3auth.verifierId,
          idToken: req.session.web3auth.idToken
        });
      } else if (!connected) {
        throw new Error('Web3Auth session expired. Please login again.');
      }
      // If connected but no provider, there's an inconsistency
      else if (!web3authSfa.provider) {
        throw new Error('Web3Auth provider not available');
      }
    }
    
    // Now we should have a provider
    const provider = web3authSfa.provider;
    const web3 = new Web3(provider);
    
    // Get accounts to verify connection
    const accounts = await web3.eth.getAccounts();
    if (!accounts.length) {
      throw new Error('No accounts available');
    }

    // Verify the wallet address matches session
    const sessionAddress = req.session.web3auth?.walletAddress;
    if (sessionAddress && accounts[0].toLowerCase() !== sessionAddress.toLowerCase()) {
      console.warn(`Wallet address mismatch: session has ${sessionAddress}, provider returned ${accounts[0]}`);
      // Update the session with the new address instead of throwing an error
      req.session.web3auth.walletAddress = accounts[0];
    }

    return {
      web3,
      address: accounts[0],
      signTransaction: async (txData) => {
        return web3.eth.sendTransaction({
          ...txData,
          from: accounts[0]
        });
      },
      getContract: (abi, address) => new web3.eth.Contract(abi, address)
    };

  } catch (error) {
    console.error('Wallet connection error:', error);
    throw new Error(
      error.message.includes('expired') || error.message.includes('session')
        ? 'Web3Auth session expired. Please login again.'
        : 'Wallet connection failed: ' + error.message
    );
  }
}

module.exports = { getUserWallet };