import mongoose from "mongoose";

const MongoURI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/ai-tutor-mvp";
console.log("🔗 Connecting to MongoDB...");
mongoose
  .connect(MongoURI, {
    autoIndex: true,    
  })
  .catch((error) => {
    console.log("❌ MongoDB connection error:", error);
  });
const db = mongoose.connection;

// Connection successful
db.on("connected", () => {
  console.log("✅ MongoDB connected successfully");
});

// Connection error
db.on("error", (err) => {
  console.error("❌ MongoDB connection error:", err);
});

// Disconnected
db.on("disconnected", () => {
  console.log("⚠️ MongoDB disconnected");
});

export default db;
