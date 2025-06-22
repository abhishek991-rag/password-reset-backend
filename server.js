// server/server.js
// This is the main server file for the Node.js backend with MongoDB Atlas integration.

const express = require("express");
const cors = require("cors"); // Correctly import cors
const bcrypt = require("bcryptjs"); // For hashing passwords
const crypto = require("crypto"); // For generating secure reset tokens
const nodemailer = require("nodemailer"); // For sending emails
const mongoose = require("mongoose"); // Mongoose for interacting with MongoDB

const app = express();
const PORT = process.env.PORT || 5000; // Render जैसे प्लेटफॉर्म पोर्ट को एक एनवायरनमेंट वेरिएबल के रूप में प्रदान करेंगे

// Enable CORS and parse JSON request bodies
app.use(cors());
app.use(express.json());

// --- MongoDB Atlas Connection ---
// IMPORTANT: This DB_URI has been updated with your provided connection string.
// Ensure <username> and <password> were replaced with your actual database user credentials.
const DB_URI =
  "mongodb+srv://Abhi:E1nEf3OrVKqCp01k@password.peorbut.mongodb.net/passwordResetDB?retryWrites=true&w=majority&appName=password"; // Updated with your provided DB_URI

mongoose
  .connect(DB_URI)
  .then(() => console.log("Successfully connected to MongoDB Atlas"))
  .catch((err) => console.error("MongoDB Atlas connection error:", err));

// --- User Schema and Model ---
// This defines how user documents will look in MongoDB.
const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true, // Ensure each email is unique
    lowercase: true, // Store emails in lowercase
    trim: true, // Remove whitespace
  },
  passwordHash: {
    type: String,
    required: true,
  },
  resetToken: {
    type: String,
    default: null,
  },
  resetTokenExpiry: {
    type: Date,
    default: null,
  },
});

const User = mongoose.model("User", userSchema); // Create the 'User' model

// --- Nodemailer Transporter Setup ---
// IMPORTANT: Replaced with your provided Ethereal Email credentials!
const transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email', 
    port: 587,                  
    secure: false,               
    auth: {
        user: 'friedrich97@ethereal.email', // Updated with new email from Ethereal
        pass: 'P23eDC7tCaks8bZEpf', // Updated with new password from Ethereal (removed leading space)
    },
    tls: {
        rejectUnauthorized: false
    }
});

// Verify email configuration (optional, run once to verify)
transporter.verify(function (error, success) {
  if (error) {
    console.error("Nodemailer configuration error:", error);
  } else {
    console.log("Nodemailer server is ready to take our messages!");
  }
});

// --- API Endpoints ---

/**
 * POST /api/register
 * Endpoint for registering new users.
 * This allows you to create initial users for testing.
 */
app.post("/api/register", async (req, res) => {
  const { email, password } = req.body;
  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res
        .status(409)
        .json({ message: "User with this email already exists." });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const newUser = new User({ email, passwordHash });
    await newUser.save();
    res.status(201).json({ message: "User registered successfully!" });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ message: "Error registering user." });
  }
});

/**
 * POST /api/forgot-password
 * Handles the request to initiate a password reset.
 * Generates a reset token, stores it in the user's record, and sends a reset email.
 */
app.post("/api/forgot-password", async (req, res) => {
  const { email } = req.body;

  try {
    // 1. Find the user in the DB by email
    const user = await User.findOne({ email });

    if (!user) {
      // If user not found, send a generic success message to prevent email enumeration attacks.
      console.log(`Password reset attempt for non-existent email: ${email}`);
      return res
        .status(200)
        .json({
          message:
            "If a user with that email exists, a password reset link has been sent.",
        });
    }

    // 2. Generate a random string (token)
    const resetToken = crypto.randomBytes(32).toString("hex");
    // Set token expiry (e.g., 1 hour from now)
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour in milliseconds

    // 3. Store the random string and expiry in the DB
    user.resetToken = resetToken;
    user.resetTokenExpiry = resetTokenExpiry;
    await user.save(); // Update the user document

    console.log(`Generated token for ${user.email}: ${resetToken}`);
    console.log(`Token expiry for ${user.email}: ${resetTokenExpiry}`);

    // 4. Send a link with that random string in the email
    // IMPORTANT: Replace 'http://localhost:3000' with your actual frontend URL.
    const resetLink = `http://localhost:3000/reset-password?token=${resetToken}`;

    const mailOptions = {
      from: '"Password Reset Service" <no-reply@yourdomain.com>',
      to: user.email,
      subject: "Password Reset Request",
      html: `
                <p>You requested a password reset. Please click the link below to reset your password:</p>
                <p><a href="${resetLink}">Reset your password</a></p>
                <p>This link will expire in 1 hour.</p>
                <p>If you did not request this, please ignore this email.</p>
            `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Password reset email sent to ${user.email}.`);
    res
      .status(200)
      .json({
        message:
          "If a user with that email exists, a password reset link has been sent to your email.",
      });
  } catch (error) {
    console.error("Error initiating password reset:", error);
    res
      .status(500)
      .json({ message: "Error initiating password reset process." });
  }
});

/**
 * POST /api/reset-password
 * Handles the password reset itself.
 * Verifies the token, updates the password, and clears the token.
 */
app.post("/api/reset-password", async (req, res) => {
  const { token, newPassword } = req.body;

  try {
    // 1. Find the user by the reset token
    const user = await User.findOne({ resetToken: token });

    if (!user) {
      return res
        .status(400)
        .json({ message: "Invalid or expired password reset token." });
    }

    // 2. Check if the token has expired
    if (new Date() > user.resetTokenExpiry) {
      // Clear the token immediately if expired and send an error
      user.resetToken = null;
      user.resetTokenExpiry = null;
      await user.save();
      return res
        .status(400)
        .json({
          message: "Password reset link has expired. Please request a new one.",
        });
    }

    // 3. Hash the new password
    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    // 4. Update the new password and clear the random string (token) in the DB
    user.passwordHash = newPasswordHash;
    user.resetToken = null; // Clear the token
    user.resetTokenExpiry = null; // Clear the expiry
    await user.save(); // Update the user document

    console.log(`Password for ${user.email} has been reset.`);
    res
      .status(200)
      .json({ message: "Your password has been successfully reset!" });
  } catch (error) {
    console.error("Error resetting password:", error);
    res.status(500).json({ message: "Error resetting password." });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log("--- Important Instructions ---");
  console.log(
    "1. The `DB_URI` has been updated with your MongoDB Atlas connection string."
  );
  console.log(
    "2. Make sure to replace Nodemailer credentials (user and pass) with your actual email setup."
  );
  console.log(
    "3. Replace `http://localhost:3000` in `resetLink` with your React app's URL."
  );
  console.log(
    "4. Remember to run `npm install express cors bcryptjs crypto nodemailer mongoose` before running this server."
  );
  console.log(
    "5. Use the `/api/register` endpoint to create users for testing."
  );
});
