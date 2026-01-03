// server.ts
import app from './app';

const PORT = 3000;

app.listen(PORT, () => {
  console.log(`Server chạy tại http://localhost:${PORT}`);
});