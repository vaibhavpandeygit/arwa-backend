const getDetails = async (req, res) => {
    try {
      const user = req.user; // Populated by the middleware
  
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }
  
      // Exclude sensitive fields
      const { password, token, ...userDetails } = user.toObject();
  
      res.status(200).json({
        success: true,
        data: userDetails,
      });
    } catch (error) {
      console.error('Error retrieving user:', error);
      res.status(500).json({
        success: false,
        message: 'Server error. Please try again later.',
      });
    }
  };

  module.exports = { getDetails };
  