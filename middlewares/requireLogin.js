const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
require('dotenv').config();


// Middleware for authentication and optional admin role-based authorization
function requireLogin(isAdminRequired = false) {
  return async (req, res, next) => {
    console.log(req.headers)
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ success: false, message: 'Authorization header missing' });
    }

    const token = authHeader.split(' ')[1];

    try {
      // Verify the JWT token
      console.log("jwt", process.env.JWT_SECRET)
      console.log('token', token)
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded; // Attach decoded payload to the request

      // Fetch user from the database to verify and enrich data
      const user = await User.findById(decoded.id);

      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      req.user = user; // Attach full user data to the request object

      // Check if admin privileges are required
      if (isAdminRequired && !user.isAdmin) {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: Admin privileges required',
        });
      }

      // If token is valid and the user meets requirements, proceed
      next();
    } catch (error) {
      console.error('Authentication error:', error.message);
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Invalid or expired token',
      });
    }
  };
}

module.exports = requireLogin;
