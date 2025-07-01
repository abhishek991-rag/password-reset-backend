const express = require("express");
const cors = require("cors"); // Correctly import cors
const bcrypt = require("bcryptjs"); // For hashing passwords
const crypto = require("crypto"); // For generating secure reset tokens
const nodemailer = require("nodemailer"); // For sending emails
const mongoose = require("mongoose"); // Mongoose for interacting with MongoDB

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// --- MongoDB Atlas Connection ---

const DB_URI =
  process.env.DB_URI ||
  "mongodb+srv://Abhi:E1nEf3OrVKqCp01k@password.peorbut.mongodb.net/passwordResetDB?retryWrites=true&w=majority&appName=password";

if (!DB_URI) {
  console.error(
    "Error: DB_URI environment variable is not set and no default provided."
  );
  process.exit(1);
}

mongoose
  .connect(DB_URI)
  .then(() => console.log("Successfully connected to MongoDB Atlas"))
  .catch((err) => console.error("MongoDB Atlas connection error:", err));

// --- User Schema and Model ---
const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
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

const NODEMAILER_USER =
  process.env.NODEMAILER_USER || "friedrich97@ethereal.email";
const NODEMAILER_PASS = process.env.NODEMAILER_PASS || "P23eDC7tCaks8bZEpf";
const NODEMAILER_HOST = process.env.NODEMAILER_HOST || "smtp.ethereal.email";
const NODEMAILER_PORT = process.env.NODEMAILER_PORT || 587;
const NODEMAILER_SECURE = process.env.NODEMAILER_SECURE === "true" || false;

if (!NODEMAILER_USER || !NODEMAILER_PASS) {
  console.warn("Nodemailer credentials not set. Email sending might not work.");
}

const transporter = nodemailer.createTransport({
  host: NODEMAILER_HOST,
  port: NODEMAILER_PORT,
  secure: NODEMAILER_SECURE,
  auth: {
    user: NODEMAILER_USER,
    pass: NODEMAILER_PASS,
  },
  tls: {
    rejectUnauthorized: false,
  },
});

transporter.verify(function (error, success) {
  if (error) {
    console.error("Nodemailer configuration error:", error);
  } else {
    console.log("Nodemailer server is ready to take our messages!");
  }
});

// --- API Endpoints ---

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
  POST /api/login

 */
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    res.status(200).json({ message: "Login successful!" });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Error logging in." });
  }
});

/**
 * POST /api/forgot-password
 *
 */
app.post("/api/forgot-password", async (req, res) => {
  const { email } = req.body;

  try {
    // 1. Find the user in the DB by email
    const user = await User.findOne({ email });

    if (!user) {
      // If user not found, send a generic success message to prevent email enumeration attacks.
      console.log(`Password reset attempt for non-existent email: ${email}`);
      return res.status(200).json({
        message:
          "If a user with that email exists, a password reset link has been sent.",
      });
    }

    // 2. Generate a random string (token)
    const resetToken = crypto.randomBytes(32).toString("hex");
    // Set token expiry (e.g., 5 hour from now)
    const resetTokenExpiry = new Date(Date.now() + 18000000); // 5 hour in milliseconds

    // 3. Store the random string and expiry in the DB
    user.resetToken = resetToken;
    user.resetTokenExpiry = resetTokenExpiry;
    await user.save();

    console.log(`Generated token for ${user.email}: ${resetToken}`);
    console.log(`Token expiry for ${user.email}: ${resetTokenExpiry}`);

    // 4. Send a link with that random string in the email
    // Use environment variable for frontend URL
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    const resetLink = `${frontendUrl}/reset-password?token=${resetToken}`;

    if (!NODEMAILER_USER || !NODEMAILER_PASS) {
      console.warn("Nodemailer credentials not set. Skipping email sending.");
      return res
        .status(500)
        .json({
          message: "Email service not configured. Please contact support.",
        });
    }

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
    res.status(200).json({
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
  POST /api/reset-password

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
      return res.status(400).json({
        message: "Password reset link has expired. Please request a new one.",
      });
    }

    // 3. Hash the new password
    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    // 4. Update the new password and clear the random string (token) in the DB
    user.passwordHash = newPasswordHash;
    user.resetToken = null;
    user.resetTokenExpiry = null;
    await user.save();

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
    "1. Ensure DB_URI, NODEMAILER_USER, NODEMAILER_PASS, NODEMAILER_HOST, NODEMAILER_PORT, NODEMAILER_SECURE, and FRONTEND_URL environment variables are set on your deployment platform (e.g., Render)."
  );
  console.log(
    "2. FRONTEND_URL should be the full URL of your deployed React application (e.g., https://your-frontend-app.onrender.com)."
  );
  console.log(
    "3. Remember to update your MongoDB Atlas Network Access with the IP address range of your deployed backend server (or 'Allow Access from Anywhere' for testing, if needed)."
  );
});
