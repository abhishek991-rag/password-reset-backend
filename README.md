Password Reset Flow Application
This is a full-stack web application that provides a secure and efficient way for users to reset their passwords. It comprises a React-based frontend and a Node.js/Express-based backend that interacts with a MongoDB Atlas database and sends emails using Nodemailer.

Features
Secure User Registration: Allows users to register to test the password reset flow.

Password Reset Request: Users can request a password reset link using their registered email address.

Secure Token-Based Reset: Generated reset tokens are secure and time-limited.

Email Delivery: Password reset links are sent to users' email inboxes using Nodemailer.

Password Update: Users can reset their password using the received link.

MongoDB Atlas Integration: All user and reset token data is securely stored in MongoDB Atlas in the cloud.

Full-Stack Solution: Independent React frontend and Node.js backend.

Technologies Used
Frontend
React: JavaScript library for building user interfaces.

React Router DOM: For handling navigation in a single-page application.

Axios / Fetch API: For communication with the backend API.

Bootstrap: CSS framework for responsive and stylish UI components.

Font Awesome: For icons.

Google Fonts (Inter): For font styling.

Backend
Node.js: Server-side JavaScript runtime environment.

Express.js: Web application framework for Node.js.

Mongoose: Object Data Modeling (ODM) library for MongoDB.

MongoDB Atlas: Cloud-hosted MongoDB database.

Bcrypt.js: For password hashing.

Crypto: Node.js built-in module for generating secure reset tokens.

Nodemailer: Node.js module for sending emails.

CORS: To handle Cross-Origin Resource Sharing.

Folder Structure
password-reset-app/
├── server/               # Node.js Backend Code
│   ├── server.js         # Main server file
│   └── package.json      # Backend dependencies
├── client/               # React Frontend Code
│   ├── public/           # Public assets (e.g., index.html)
│   ├── src/              # Source code
│   │   ├── components/   # Reusable React components
│   │   │   └── MessageBox.js
│   │   ├── pages/        # Main application pages
│   │   │   ├── ForgotPassword.js
│   │   │   └── ResetPassword.js
│   │   ├── App.js        # Main App component and routing
│   │   └── index.js      # Entry point for the React application
│   └── package.json      # Frontend dependencies
└── README.md             # Project README file

Setup and Run Locally
Before you begin, ensure that Node.js and npm/yarn are installed on your system.

1. MongoDB Atlas Setup
Log in to your MongoDB Atlas account and ensure that:

You have a cluster deployed.

You have a database user created (e.g., Abhi), and you have its password.

Your current public IP address is allowed in the Network Access settings. For development, you can temporarily add "Allow Access from Anywhere" (0.0.0.0/0), but this is not recommended for production.

Copy the connection string from your cluster's "Connect" section (it starts with mongodb+srv://...).

2. Nodemailer Credentials
For Testing (Recommended): Go to Ethereal Email, create a new account, and copy the provided user (email) and pass (password).

For Real Emails: If you are using Gmail, ensure you have 2-Step Verification enabled and have generated a Google App Password.

3. Backend Setup
Navigate to the server folder:

cd password-reset-app/server

Install dependencies:

npm install

Edit the server.js file and update environment variables with your actual values:

DB_URI: Paste your MongoDB Atlas connection string.
Example: 'mongodb+srv://Abhi:E1nEf3OrVKqCp01k@password.peorbut.mongodb.net/passwordResetDB?retryWrites=true&w=majority&appName=password'

auth credentials in transporter object: Update with your Nodemailer user and pass.
Example: user: 'friedrich97@ethereal.email', pass: 'P23eDC7tCaks8bZEpf'

Leave http://localhost:3000 in resetLink as it's the frontend URL for local development.

Start the backend server:

node server.js

The server should be running on http://localhost:5000. You should see console logs confirming MongoDB and Nodemailer connections.

4. Frontend Setup
In a new terminal, navigate to the client folder:

cd password-reset-app/client

Install dependencies:

npm install

Run the frontend app:

npm start

Your React app will open in your browser at http://localhost:3000.

Deployment
The recommended deployment platform is Render.com as it provides ease of hosting both web services (backend) and static sites (frontend).

Deployment Flow:

Push Code to GitHub: Ensure the entire content of your password-reset-app folder (which includes both server and client) is in a GitHub repository.

Deploy Backend (Render Web Service):

Create a new "Web Service" on Render.

Root Directory: Set to server.

Build Command: npm install

Start Command: node server.js

Environment Variables: Set your MongoDB Atlas DB_URI, Nodemailer NODEMAILER_USER, NODEMAILER_PASS, and optionally NODEMAILER_HOST/NODEMAILER_PORT/NODEMAILER_SECURE.

Set FRONTEND_URL to http://localhost:3000 for now; it will be updated later.

Render will provide the URL of your deployed backend (e.g., https://your-backend.onrender.com/). Copy this.

Deploy Frontend (Render Static Site):

Create a new "Static Site" on Render.

Root Directory: Set to client.

Build Command: npm install && npm run build

Publish Directory: build

Environment Variable: Set REACT_APP_BACKEND_URL to your deployed backend URL (e.g., https://your-backend.onrender.com/) that you copied in the previous step.

Render will provide the URL of your deployed frontend (e.g., https://your-frontend.onrender.com/). Copy this.

Update Backend FRONTEND_URL:

Go back to your deployed backend service's settings on Render.

Update the FRONTEND_URL environment variable to your actual deployed frontend URL (e.g., https://your-frontend.onrender.com/). This ensures the backend sends correct reset links in emails.

Update MongoDB Atlas Network Access: Ensure your MongoDB Atlas Dashboard's 'Network Access' settings include the IP addresses of Render's servers (or have 'Allow Access from Anywhere' set).

Testing
Local Testing
Ensure both the backend (http://localhost:5000) and frontend (http://localhost:3000) are running.

Register a user:

You can create a new user by sending a POST request to http://localhost:5000/api/register using Postman/Thunder Client (e.g., {"email": "test@example.com", "password": "Password123!"}).

Test the password reset flow:

Go to the frontend app (http://localhost:3000).

Enter the registered email and click "Send Reset Link".

Check your email inbox (or Ethereal Email inbox) and click the reset link.

Proceed on the reset page with a new password.

Deployed Testing
Go to your deployed frontend URL (https://localhost:3000).

Register a user: If you haven't registered a user yet, you can create a new one by sending a POST request to the deployed backend URL (e.g., http://localhost:5000/api/register) using Postman/Thunder Client.

Test the password reset flow: Follow the same steps as local testing, but now using the deployed application.
