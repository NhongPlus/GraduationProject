import { Router } from 'express';
import { getUsers } from '../controllers/user.controller';

const router = Router();

router.get('/', getUsers); // Đường dẫn thực tế sẽ là /api/users/

export default router;