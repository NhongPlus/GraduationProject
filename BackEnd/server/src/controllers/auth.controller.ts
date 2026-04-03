import { Request, Response, NextFunction } from "express";
import { registerUser, loginUser } from "~/services/auth.service";

export const registerController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, username, password, role, full_name } = req.body;
    if (!email || !username || !password || !role) {
      return res.status(400).json({ success: false, message: "email/username/password/role là bắt buộc" });
    }
    const user = await registerUser(email, username, password, role, full_name);
    return res.status(201).json({ success: true, data: user });
  } catch (err: any) {
    next(err);
  }
};

export const loginController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: "email/password là bắt buộc" });
    }
    const result = await loginUser(email, password);
    return res.status(200).json({ success: true, data: result });
  } catch (err: any) {
    next(err);
  }
};