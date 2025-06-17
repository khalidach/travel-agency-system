// backend/controllers/authController.js

const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const loginUser = async (req, res) => {
  const { username, password } = req.body;
  try {
    const { rows } = await req.db.query(
      "SELECT * FROM users WHERE username = $1",
      [username]
    );
    const user = rows[0];

    if (user && (await bcrypt.compare(password, user.password))) {
      res.json({
        id: user.id,
        username: user.username,
        agencyName: user.agencyName,
        token: generateToken(user.id),
      });
    } else {
      res.status(401).json({ message: "Invalid username or password" });
    }
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: "1h",
  });
};

// New function to refresh the token
const refreshToken = async (req, res) => {
  // The `protect` middleware has already verified the token and attached the user to the request
  const user = req.user;
  res.json({
    id: user.id,
    username: user.username,
    agencyName: user.agencyName,
    token: generateToken(user.id), // Issue a new token
  });
};

module.exports = { loginUser, refreshToken };
