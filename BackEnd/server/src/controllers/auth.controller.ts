import { Request, Response, NextFunction } from "express";
import { loginUser, registerUser, logoutUser } from "~/services/auth.service";

const OK = 200;
const CREATED = 201;

export const registerController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, role } = req.body;
    if (!email || !password || !role) {
      return res.status(400).json({ success: false, message: "email/password/role is required" });
    }

    const user = await registerUser(email, password, role);
    return res.status(CREATED).json({ success: true, data: { id: user.id, email: user.email, role: user.role } });
  } catch (error: any) {
    next(error);
  }
};

export const loginController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;
    const requestDeviceId = String(req.headers["x-device-id"] || "").trim();

    if (!email || !password) {
      return res.status(400).json({ success: false, message: "email/password is required" });
    }

    if (!requestDeviceId) {
      return res.status(400).json({ success: false, message: "x-device-id header is required" });
    }

    const { token, user } = await loginUser(email, password, requestDeviceId);

    return res.status(OK).json({
      success: true,
      data: {
        token,
        user: { id: user.id, email: user.email, role: user.role },
      },
    });
  } catch (error: any) {
    next(error);
  }
};

export const logoutController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ success: false, message: "Không có người dùng" });
    }

    await logoutUser(user.userId);
    return res.status(OK).json({ success: true, data: "Logged out" });
  } catch (error: any) {
    next(error);
  }
};
