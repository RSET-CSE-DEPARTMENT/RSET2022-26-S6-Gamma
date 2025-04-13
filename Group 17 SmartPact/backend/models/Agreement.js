// models/Agreement.js
const mongoose = require('mongoose');

const AgreementSchema = new mongoose.Schema({
  blockchainId: { type: String, required: false },

  title: {
    type: String,
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: ['Software Freelancing', 'Subscription Agreement', 'Rental Agreement']
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  counterparty: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  counterpartyAddress: {
    type: String,
    required: false
  },
  
  // Common fields
  amount: {
    type: String,
    required: true
  },
  startDate: {
    type: Date,
    required: true
  },
  dueDate: {
    type: Date,
    required: true
  },
  terms: {
    type: String
  },
  status: {
    type: String,
    required: true,
    enum: ['Created','Accepted', 'Active', 'Completed', 'Cancelled', 'Disputed'],
    default: 'Created'
  },
  
  // Software Freelancing Agreement specific fields
  deliverables: {
    type: String,
    required: function() { return this.type === 'Software Freelancing'; }
  },
  milestones: {
    type: String,
    required: function() { return this.type === 'Software Freelancing'; }
  },
  
  // Rental Agreement specific fields
  propertyAddress: {
    type: String,
    required: function() { return this.type === 'Rental Agreement'; }
  },
  securityDeposit: {
    type: String,
    required: function() { return this.type === 'Rental Agreement'; }
  },
  
  // Subscription Agreement specific fields
  subscriptionDetails: {
    type: String,
    required: function() { return this.type === 'Subscription Agreement'; }
  },
  billingInterval: {
    type: Number, // in seconds
    required: function() { return this.type === 'Subscription Agreement'; }
  },
  nextBillingDate: {
    type: Date,
    required: function() { return this.type === 'Subscription Agreement'; }
  },
  totalPaid: {
    type: String,
    default: "0",
    required: function() { return this.type === 'Subscription Agreement'; }
  },
  
  // Transaction and timing details
  txHash: {
    type: String,
    required: false
  },
  fundTxHash: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  fundedAt: {
    type: Date
  },
  completedAt: {
    type: Date
  }
});

module.exports = mongoose.model('Agreement', AgreementSchema);