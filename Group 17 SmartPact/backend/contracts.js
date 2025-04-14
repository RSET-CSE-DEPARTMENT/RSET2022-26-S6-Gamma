// contracts.js
const freelancerContractAddress = "0xBEb0431ee4A665CE0deDB612F953C867dfAF0c50";

const freelancerContractABI = [
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
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
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


const rentalContractAddress="0xb533a1cfE98E0B6Cb148Bfd2DD0d202F901D0d07"
const rentalContractABI= [
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
        "name": "landlord",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "tenant",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "rentAmount",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "securityDeposit",
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
        "name": "endDate",
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
        "name": "totalRentPaid",
        "type": "uint256"
      }
    ],
    "name": "RentPaid",
    "type": "event"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_agreementId",
        "type": "uint256"
      }
    ],
    "name": "activateAgreement",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
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
        "name": "landlord",
        "type": "address"
      },
      {
        "internalType": "address payable",
        "name": "tenant",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "rentAmount",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "securityDeposit",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "startDate",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "endDate",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "totalRentPaid",
        "type": "uint256"
      },
      {
        "internalType": "enum RentalAgreement.AgreementStatus",
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
        "name": "_landlord",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "_rentAmount",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "_securityDeposit",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "_startDate",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "_endDate",
        "type": "uint256"
      }
    ],
    "name": "createAgreement",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
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
    "name": "payRent",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  }
]

const subscriptionContractAddress="0xb7D8F3aCcF61BA9407E1cd3f67fc531C18eeffBE"
const subscriptionContractABI= [
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "subscriptionId",
        "type": "uint256"
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
        "name": "totalPaid",
        "type": "uint256"
      }
    ],
    "name": "PaymentMade",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "subscriptionId",
        "type": "uint256"
      }
    ],
    "name": "SubscriptionCancelled",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "subscriptionId",
        "type": "uint256"
      }
    ],
    "name": "SubscriptionCompleted",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "subscriptionId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "serviceProvider",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "subscriber",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "feeAmount",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "billingInterval",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "startDate",
        "type": "uint256"
      }
    ],
    "name": "SubscriptionCreated",
    "type": "event"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_subscriptionId",
        "type": "uint256"
      }
    ],
    "name": "activateSubscription",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_subscriptionId",
        "type": "uint256"
      }
    ],
    "name": "cancelSubscription",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_subscriptionId",
        "type": "uint256"
      }
    ],
    "name": "completeSubscription",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address payable",
        "name": "_serviceProvider",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "_feeAmount",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "_billingInterval",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "_startDate",
        "type": "uint256"
      }
    ],
    "name": "createSubscription",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_subscriptionId",
        "type": "uint256"
      }
    ],
    "name": "paySubscriptionFee",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "subscriptionCount",
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
    "name": "subscriptions",
    "outputs": [
      {
        "internalType": "address payable",
        "name": "serviceProvider",
        "type": "address"
      },
      {
        "internalType": "address payable",
        "name": "subscriber",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "feeAmount",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "billingInterval",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "startDate",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "nextBillingDate",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "totalPaid",
        "type": "uint256"
      },
      {
        "internalType": "enum SubscriptionAgreement.SubscriptionStatus",
        "name": "status",
        "type": "uint8"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
]

module.exports = {
  freelancerContractABI,
  freelancerContractAddress,
  rentalContractABI,
  rentalContractAddress,
  subscriptionContractABI,
  subscriptionContractAddress
};