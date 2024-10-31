// auth.controller.js
const User = require('./user.model');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

exports.login = async (req, res) => {
    const { phoneNumber, password } = req.body;

    try {
        const user = await User.findOne({ phoneNumber });
        if (!user) return res.status(404).json({ message: 'Numéro de téléphone non trouvé' });

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) return res.status(401).json({ message: 'Mot de passe incorrect' });

        const token = jwt.sign({ userId: user._id }, 'SECRET_KEY', { expiresIn: '1h' });
        res.status(200).json({ token });
    } catch (error) {
        res.status(500).json({ message: 'Erreur serveur' });
    }
};
