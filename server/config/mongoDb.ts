import mongoose from "mongoose";

const MongoURI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/ai-tutor-mvp";

// Only log in development
if (process.env.NODE_ENV === 'development') {
  console.log("🔗 Connecting to MongoDB...");
}

mongoose
  .connect(MongoURI, {
    autoIndex: true, 
       serverSelectionTimeoutMS: 30000
  })
  .catch((error) => {
    if (process.env.NODE_ENV === 'development') {
      console.log("❌ MongoDB connection error:", error);
    } else {
      console.error("MongoDB connection error:", error.message);
    }
  });
const db = mongoose.connection;

// Connection successful
db.on("connected", () => {
  if (process.env.NODE_ENV === 'development') {
    console.log("✅ MongoDB connected successfully");
  }
});

// Connection error
db.on("error", (err) => {
  console.error("MongoDB connection error:", err.message);
});

// Disconnected
db.on("disconnected", () => {
  if (process.env.NODE_ENV === 'development') {
    console.log("⚠️ MongoDB disconnected");
  }
});

export default db;
