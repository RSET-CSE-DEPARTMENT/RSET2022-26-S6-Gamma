const User = require("../models/User");
const { decrypt } = require("../utils/encryption");

exports.getUserById = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findById(id);

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const decryptedName = user.name ? decrypt(user.name) : null;
        const decryptedWallet = user.walletAddress ? decrypt(user.walletAddress) : null;

        res.status(200).json({
            id:user.id,
            email: user.email,
            walletAddress: decryptedWallet,
            name: decryptedName, // Send decrypted name
        });
    } catch (error) {
        res.status(500).json({ message: "Error retrieving user", error: error.message });
    }
};
