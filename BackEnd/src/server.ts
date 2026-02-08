import app from './app';
import connectDB from './config/db';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 3000;

// Connect to MongoDB
connectDB();

app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
  console.log(`📚 API documentation available at http://localhost:${PORT}/api`);
});