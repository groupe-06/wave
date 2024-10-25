import jwt from 'jsonwebtoken';

export const generateToken = async (user) => {
    const token = jwt.sign({userId: user._id}, process.env.JWT_SECRET || '9f86d081884c7d659a2feaa0c55ad023', {expiresIn: '24h'});
    return token;
};