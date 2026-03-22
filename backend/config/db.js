const mongoose = require("mongoose");

let hasActiveConnection = false;

async function connectToDatabase() {
  if (hasActiveConnection) {
    return mongoose.connection;
  }

  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    throw new Error("MONGODB_URI is required.");
  }

  await mongoose.connect(mongoUri);
  hasActiveConnection = true;

  return mongoose.connection;
}

module.exports = {
  connectToDatabase,
};