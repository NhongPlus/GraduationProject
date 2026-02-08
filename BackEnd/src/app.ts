import express from 'express';
import cors from 'cors';
import examRouter from './routes/exam.route';

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/exams', examRouter);

app.get('/', (req, res) => {
  res.json({ 
    message: 'Online Examination System API',
    version: '1.0.0',
    endpoints: {
      users: '/api/users',
      exams: '/api/exams',
      documentation: '/api'
    }
  });
});

app.get('/api', (req, res) => {
  res.json({
    message: 'API Documentation',
    version: '1.0.0',
    endpoints: {
      exams: {
        getAll: 'GET /api/exams',
        getById: 'GET /api/exams/:id',
        getActive: 'GET /api/exams/active',
        getUpcoming: 'GET /api/exams/upcoming',
        create: 'POST /api/exams',
        update: 'PUT /api/exams/:id',
        delete: 'DELETE /api/exams/:id'
      },
      users: {
        getAll: 'GET /api/users'
      }
    }
  });
});

export default app;