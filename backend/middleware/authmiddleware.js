import jwt from "jsonwebtoken";

const authenticateToken = (req, res, next) => {
    const token = req.headers["authorization"]?.split(" ")[1]; // Extract token from header
    if (!token) return res.sendStatus(401); // No token provided

    try {
        const decoded = jwt.verify(token, "secret"); // Verify token
        req.user = decoded; // Attach user info to request
        next(); // Proceed to the next middleware or route handler
    } catch (err) {
        console.error("Token verification error:", err);
        res.sendStatus(403); // Invalid token
    }
};

export default authenticateToken;
// This middleware function checks for a valid JWT token in the request headers.