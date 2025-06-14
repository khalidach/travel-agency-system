const mongoose = require('mongoose');
const User = require('./models/userModel');
require('dotenv').config({ path: './.env' });

// --- DEFINE USER INFORMATION HERE ---
const userToCreate = {
  username: "ahlaelkheir",
  agencyName: "voyage ahla elkheir",
  password: "Khalidach2003@" // <-- Enter the plain password here
};
// ------------------------------------

const addUser = async () => {
  if (!userToCreate.username || !userToCreate.agencyName || !userToCreate.password) {
    console.error('Please define the user\'s username, agencyName, and password inside the script.');
    process.exit(1);
  }

  try {
    // Connect to the database
    if (!process.env.MONGODB_URI) {
      console.error('MONGODB_URI is not defined in .env file');
      process.exit(1);
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB...');

    // Check if user already exists
    const existingUser = await User.findOne({ username: userToCreate.username });
    if (existingUser) {
      console.log(`User "${userToCreate.username}" already exists. No action taken.`);
      return; // Exit if user exists
    }

    // Create a new user instance
    const newUser = new User(userToCreate);

    // Save the user. The pre-save hook in userModel.js will now run and hash the password.
    await newUser.save();

    console.log(`User "${userToCreate.username}" created successfully!`);

  } catch (error) {
    console.error('Error creating user:', error.message);
  } finally {
    // Disconnect from the database
    await mongoose.connection.close();
    console.log('Disconnected from MongoDB.');
    process.exit(0);
  }
};

addUser();
