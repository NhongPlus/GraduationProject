import express from 'express';
import cors from 'cors';
import userRouter from './routes/user.route'; // Import route mới

const app = express();

app.use(cors());
app.use(express.json());

// Gắn nhánh User vào đường dẫn /api/users
app.use('/api/users', userRouter);

app.get('/', (req, res) => {
  res.json({ message: 'Hello' });
});

export default app;