import jwt from 'jsonwebtoken';

export const getToken = (req, res, next) =>{
    const authHeader = req.header('Authorization');
    if(!authHeader){
        return res.status(401).json({ message: 'Authorization header missing' });
    }

    if (!authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Authorization header malformed because your are missing the Bearer prefix' });
    }


    const token = authHeader.replace('Bearer ', '');    

    if(!token){
        return res.status(401).json({message: 'No token provided'});
    }

    try {
        const decodedToken = jwt.verify(token, process.env.JWT_SECRET || '9f86d081884c7d659a2feaa0c55ad023');
        req.userId = decodedToken.userId;
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Invalid tokens' });
    }
    
  
}
// middlewares/roleMiddleware.js
export const isAdmin = (req, res, next) => {
    if (req.user && (req.user.role === 'ADMIN' || req.user.role === 'AGENT')) {
        next();
    } else {
        res.status(403).json({
            success: false,
            message: "Accès non autorisé"
        });
    }
};