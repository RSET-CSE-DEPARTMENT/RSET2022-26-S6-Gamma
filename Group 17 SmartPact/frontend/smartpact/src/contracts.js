export const contractAddress="0x579eCfbb8C00259783beA1699cd8eD08D4313Fb6"
export const contractABI= [
        {
          "anonymous": false,
          "inputs": [
            {
              "indexed": false,
              "internalType": "uint256",
              "name": "agreementId",
              "type": "uint256"
            }
          ],
          "name": "AgreementCompleted",
          "type": "event"
        },
        {
          "anonymous": false,
          "inputs": [
            {
              "indexed": false,
              "internalType": "uint256",
              "name": "agreementId",
              "type": "uint256"
            },
            {
              "indexed": false,
              "internalType": "address",
              "name": "client",
              "type": "address"
            },
            {
              "indexed": false,
              "internalType": "address",
              "name": "freelancer",
              "type": "address"
            },
            {
              "indexed": false,
              "internalType": "uint256",
              "name": "amount",
              "type": "uint256"
            },
            {
              "indexed": false,
              "internalType": "uint256",
              "name": "startDate",
              "type": "uint256"
            },
            {
              "indexed": false,
              "internalType": "uint256",
              "name": "deadline",
              "type": "uint256"
            }
          ],
          "name": "AgreementCreated",
          "type": "event"
        },
        {
          "anonymous": false,
          "inputs": [
            {
              "indexed": false,
              "internalType": "uint256",
              "name": "agreementId",
              "type": "uint256"
            }
          ],
          "name": "AgreementDisputed",
          "type": "event"
        },
        {
          "anonymous": false,
          "inputs": [
            {
              "indexed": false,
              "internalType": "uint256",
              "name": "agreementId",
              "type": "uint256"
            }
          ],
          "name": "AgreementFunded",
          "type": "event"
        },
        {
          "inputs": [],
          "name": "agreementCount",
          "outputs": [
            {
              "internalType": "uint256",
              "name": "",
              "type": "uint256"
            }
          ],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [
            {
              "internalType": "uint256",
              "name": "",
              "type": "uint256"
            }
          ],
          "name": "agreements",
          "outputs": [
            {
              "internalType": "address payable",
              "name": "freelancer",
              "type": "address"
            },
            {
              "internalType": "address payable",
              "name": "client",
              "type": "address"
            },
            {
              "internalType": "uint256",
              "name": "amount",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "startDate",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "deadline",
              "type": "uint256"
            },
            {
              "internalType": "enum FreelancerClientAgreement.AgreementStatus",
              "name": "status",
              "type": "uint8"
            }
          ],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [
            {
              "internalType": "uint256",
              "name": "_agreementId",
              "type": "uint256"
            }
          ],
          "name": "completeAgreement",
          "outputs": [],
          "stateMutability": "nonpayable",
          "type": "function"
        },
        {
          "inputs": [
            {
              "internalType": "address payable",
              "name": "_freelancer",
              "type": "address"
            },
            {
              "internalType": "uint256",
              "name": "_amount",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "_deadline",
              "type": "uint256"
            }
          ],
          "name": "createAgreement",
          "outputs": [],
          "stateMutability": "nonpayable",
          "type": "function"
        },
        {
          "inputs": [
            {
              "internalType": "uint256",
              "name": "_agreementId",
              "type": "uint256"
            }
          ],
          "name": "disputeAgreement",
          "outputs": [],
          "stateMutability": "nonpayable",
          "type": "function"
        },
        {
          "inputs": [
            {
              "internalType": "uint256",
              "name": "_agreementId",
              "type": "uint256"
            }
          ],
          "name": "fundAgreement",
          "outputs": [],
          "stateMutability": "payable",
          "type": "function"
        }
      ]