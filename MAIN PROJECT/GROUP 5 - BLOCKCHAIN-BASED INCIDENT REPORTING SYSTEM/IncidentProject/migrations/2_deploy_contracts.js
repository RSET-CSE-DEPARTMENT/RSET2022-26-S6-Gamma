const IncidentReporting = artifacts.require("IncidentReporting");

module.exports = async function (deployer) {
  await deployer.deploy(IncidentReporting);
  
  const instance = await IncidentReporting.deployed();
  console.log("\n===========================================");
  console.log("Contract deployed successfully!");
  console.log("Contract Address:", instance.address);
  console.log("===========================================");
  console.log("\nNow run: node update-contract-address.js");
  console.log("===========================================\n");
};