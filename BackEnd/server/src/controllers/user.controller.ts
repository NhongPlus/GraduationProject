import { Request, Response, NextFunction } from "express";
import { createUser, getUsers } from "~/services/user.service";

export const getUsersController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const users = await getUsers();
    res.json({ success: true, data: users });
  } catch (err) {
    next(err);
  }
};

export const createUserController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, role } = req.body;
    if (!email || !password || !role) {
      return res.status(400).json({ success: false, message: "email/password/role required" });
    }

    const user = await createUser(email, password, role);
    res.status(201).json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
};
