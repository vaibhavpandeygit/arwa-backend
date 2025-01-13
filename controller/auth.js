const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/userModel');
require('dotenv').config(); 


// Login Controller
const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Compare passwords (if hashed)
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user._id, isAdmin: user.isAdmin }, // Payload
      process.env.JWT_SECRET, // Secret key
      { expiresIn: '7d' } // Token expiration
    );

    // Respond with token
    res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        isAdmin: user.isAdmin,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};


// Register Controller
const register = async (req, res) => {
    const { name, email, password, isAdmin } = req.body;
  
    try {
      // Check if the user already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ message: 'User already exists' });
      }
  
      // Hash the password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
  
      // Create a new user
      const user = new User({
        name,
        email,
        password: hashedPassword,
        isAdmin: isAdmin || false, // Default to false if not provided
      });
  
      // Save the user to the database
      await user.save();
  
      // Generate JWT
      const token = jwt.sign(
        { id: user._id, isAdmin: user.isAdmin }, // Payload
        process.env.JWT_SECRET, // Secret key
        { expiresIn: '7d' } // Token expiration
      );
  
      // Respond with success and token
      res.status(201).json({
        message: 'User registered successfully',
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          isAdmin: user.isAdmin,
        },
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error' });
    }
  };


  const updatePassword = async (req, res) => {
    const { currentPassword, newPassword } = req.body;
  
    try {
      // Validate the input
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: 'Both current and new passwords are required.' });
      }
  
      // The user's ID is available in req.user from the authentication middleware
      const user = req.user;
  
      // Verify the current password
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return res.status(400).json({ message: 'Current password is incorrect.' });
      }
  
      // Hash the new password
      const salt = await bcrypt.genSalt(10);
      const hashedNewPassword = await bcrypt.hash(newPassword, salt);
  
      // Update the password in the database
      user.password = hashedNewPassword;
      await user.save();
  
      // Respond with success
      res.status(200).json({ message: 'Password updated successfully.' });
    } catch (error) {
      console.error('Error updating password:', error);
      res.status(500).json({ message: 'Server error.' });
    }
  };

module.exports = { login, register, updatePassword };