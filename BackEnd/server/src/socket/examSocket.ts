import { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { env } from "~/config/enviroment";

interface JwtPayloadShape {
  userId: string;
  role: string;
}

function readToken(socket: Socket): string | null {
  const auth = socket.handshake.auth as Record<string, unknown> | undefined;
  if (auth && typeof auth.token === "string") return auth.token;
  const q = socket.handshake.query.token;
  if (typeof q === "string") return q;
  if (Array.isArray(q) && typeof q[0] === "string") return q[0];
  return null;
}

export function roomForExam(examId: string): string {
  return `exam:${examId}`;
}

/**
 * POC Socket.IO cho thi online: JWT handshake, join room theo đề, ping thời gian server,
 * giám thị broadcast cảnh báo vào room (chỉ admin/teacher).
 */
export function registerExamSocket(io: Server): void {
  io.use((socket, next) => {
    const token = readToken(socket);
    if (!token) {
      return next(new Error("Unauthorized: thiếu token (handshake.auth.token hoặc query.token)"));
    }
    try {
      const payload = jwt.verify(token, env.JWT_SECRET as string) as JwtPayloadShape;
      if (!payload.userId || !payload.role) {
        return next(new Error("Unauthorized: payload không hợp lệ"));
      }
      socket.data.userId = payload.userId;
      socket.data.role = payload.role;
      next();
    } catch {
      next(new Error("Unauthorized: token không hợp lệ"));
    }
  });

  io.on("connection", (socket) => {
    const { userId, role } = socket.data;
    console.log(`[socket] connect id=${socket.id} user=${userId} role=${role}`);

    socket.emit("exam:welcome", {
      socketId: socket.id,
      hint:
        "POC: emit exam:join { examId }, exam:ping | GV: exam:proctor_alert { examId, message }",
    });

    socket.on("exam:join", (payload: { examId?: string }) => {
      const examId = payload?.examId;
      if (!examId || typeof examId !== "string") {
        socket.emit("exam:error", { code: "BAD_EXAM_ID", message: "examId (string) bắt buộc" });
        return;
      }
      const room = roomForExam(examId);
      void socket.join(room);
      socket.emit("exam:joined", { examId, room });
      console.log(`[socket] ${socket.id} -> ${room}`);
    });

    socket.on("exam:leave", (payload: { examId?: string }) => {
      const examId = payload?.examId;
      if (!examId) return;
      void socket.leave(roomForExam(examId));
      socket.emit("exam:left", { examId });
    });

    socket.on("exam:ping", () => {
      const serverNowMs = Date.now();
      socket.emit("exam:server_time", {
        serverNowMs,
        iso: new Date(serverNowMs).toISOString(),
      });
    });

    socket.on(
      "exam:proctor_alert",
      (payload: { examId?: string; message?: string }) => {
        if (role !== "admin" && role !== "teacher") {
          socket.emit("exam:error", { code: "FORBIDDEN", message: "Chỉ admin hoặc teacher" });
          return;
        }
        const examId = payload?.examId;
        const message = payload?.message;
        if (!examId || typeof message !== "string" || !message.trim()) {
          socket.emit("exam:error", {
            code: "BAD_PAYLOAD",
            message: "examId và message (string) bắt buộc",
          });
          return;
        }
        const room = roomForExam(examId);
        io.to(room).emit("exam:alert", {
          examId,
          message: message.trim(),
          fromRole: role,
          at: new Date().toISOString(),
        });
        socket.emit("exam:alert_sent", { examId, room });
      }
    );

    socket.on("disconnect", (reason) => {
      console.log(`[socket] disconnect id=${socket.id} reason=${reason}`);
    });
  });
}
