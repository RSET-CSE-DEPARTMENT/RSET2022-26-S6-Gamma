// Run this script after deployment: node update-contract-address.js
// This script should be placed in the IncidentProject folder

const fs = require('fs');
const path = require('path');

// Read the deployed contract address from Truffle's build artifacts
const contractJsonPath = path.join(__dirname, 'build', 'contracts', 'IncidentReporting.json');

if (!fs.existsSync(contractJsonPath)) {
    console.error('Contract artifact not found. Please run "truffle migrate" first.');
    process.exit(1);
}

const contractJson = JSON.parse(fs.readFileSync(contractJsonPath, 'utf8'));
const networks = contractJson.networks;

// Get the latest deployment (highest network ID)
const networkIds = Object.keys(networks);
if (networkIds.length === 0) {
    console.error('No deployed contract found in artifacts.');
    process.exit(1);
}

const latestNetworkId = networkIds[networkIds.length - 1];
const contractAddress = networks[latestNetworkId].address;

console.log(`Found contract address: ${contractAddress}`);
console.log(`Network ID: ${latestNetworkId}`);

// HTML files are in the parent directory
const parentDir = path.join(__dirname, '..');

// Update report.html
const reportHtmlPath = path.join(parentDir, 'report.html');
if (fs.existsSync(reportHtmlPath)) {
    let reportHtml = fs.readFileSync(reportHtmlPath, 'utf8');
    
    // Replace the contract address
    const addressRegex = /const contractAddress = ["']0x[a-fA-F0-9]{40}["']/;
    reportHtml = reportHtml.replace(addressRegex, `const contractAddress = "${contractAddress}"`);
    
    fs.writeFileSync(reportHtmlPath, reportHtml);
    console.log('✓ Updated report.html');
} else {
    console.log('⚠ report.html not found in parent directory');
}

// Update user.html if it exists
const userHtmlPath = path.join(parentDir, 'user.html');
if (fs.existsSync(userHtmlPath)) {
    let userHtml = fs.readFileSync(userHtmlPath, 'utf8');
    
    const addressRegex = /const contractAddress = ["']0x[a-fA-F0-9]{40}["']/;
    if (addressRegex.test(userHtml)) {
        userHtml = userHtml.replace(addressRegex, `const contractAddress = "${contractAddress}"`);
        fs.writeFileSync(userHtmlPath, userHtml);
        console.log('✓ Updated user.html');
    }
} else {
    console.log('⚠ user.html not found or no contract address in it');
}

// Update verifier.html if it exists
const verifierHtmlPath = path.join(parentDir, 'verifier.html');
if (fs.existsSync(verifierHtmlPath)) {
    let verifierHtml = fs.readFileSync(verifierHtmlPath, 'utf8');
    
    const addressRegex = /const contractAddress = ["']0x[a-fA-F0-9]{40}["']/;
    if (addressRegex.test(verifierHtml)) {
        verifierHtml = verifierHtml.replace(addressRegex, `const contractAddress = "${contractAddress}"`);
        fs.writeFileSync(verifierHtmlPath, verifierHtml);
        console.log('✓ Updated verifier.html');
    }
} else {
    console.log('⚠ verifier.html not found or no contract address in it');
}

console.log('\n===========================================');
console.log('All files updated successfully!');
console.log('===========================================');
console.log(`Contract Address: ${contractAddress}`);
console.log('You can now use your application.');