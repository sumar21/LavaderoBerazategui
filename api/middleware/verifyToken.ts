import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Extend Express Request interface to include `user`
export interface AuthRequest extends Request {
    user?: any; // Define a more specific type if known
}

const verifyToken = (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Remove "Bearer "

    if (!token) return res.status(401).json({ error: "No token provided" });

    jwt.verify(token, process.env.JWT_SECRET || '', (err, user) => {
        if (err) return res.status(403).json({ error: "Token invalid or expired" });
        req.user = user; // Attach user info to the request
        next();
    });
};

export default verifyToken;
