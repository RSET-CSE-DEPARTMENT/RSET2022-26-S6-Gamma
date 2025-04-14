const Agreement = require('../models/Agreement');
const { encrypt, decrypt } = require('../utils/encryption');

exports.createAgreement = async (req, res) => {
  try {
    const { templateType, agreementData,user1id,user2id } = req.body;

    // Validate input
    if (!templateType || !agreementData || !user1id || !user2id) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Create new agreement
    const agreement = new Agreement({
      templateType,
      agreementData: encrypt(JSON.stringify(agreementData)),
      user1id,
      user2id,
      status:'draft'
    });

    // Save to database
    await agreement.save();

    res.status(201).json({ 
      message: 'Agreement created successfully', 
      agreementId: agreement._id, 
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Error creating agreement', 
      error: error.message 
    });
  }
};

exports.getAgreement = async (req, res) => {
  try {
    const { id } = req.params;

    // Find agreement
    const agreement = await Agreement.findById(id);
    if (!agreement) {
      return res.status(404).json({ message: 'Agreement not found' });
    }

    // Decrypt agreement data
    const decryptedData = JSON.parse(decrypt(agreement.agreementData));

    res.status(200).json({
      templateType: agreement.templateType,
      agreementData: decryptedData,
      status: agreement.status
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Error retrieving agreement', 
      error: error.message 
    });
  }
};

exports.updateAgreementStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['draft', 'active', 'completed', 'terminated'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const agreement = await Agreement.findByIdAndUpdate(
      id, 
      { status }, 
      { new: true }
    );

    if (!agreement) {
      return res.status(404).json({ message: 'Agreement not found' });
    }

    res.status(200).json({ 
      message: 'Agreement status updated', 
      status: agreement.status 
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Error updating agreement status', 
      error: error.message 
    });
  }
};

exports.getAgreementsByUser = async (req, res) => {
  try {
    const { id } = req.params;
    const trimmedUserId = id.trim();
    // Find agreements where the user is either user1 or user2
    const agreements = await Agreement.find({
      $or: [{ user1id: trimmedUserId }, { user2id: trimmedUserId }]
    });

    res.status(200).json(agreements);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving agreements', error: error.message });
  }
};
