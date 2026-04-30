import { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { env } from "~/config/enviroment";
import { getExamById } from "~/models/exam.model";
import { forceSubmitActiveSessionsByExamService } from "~/services/exam.service";

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

type ExamRuntimeState = {
  examId: string;
  startedAtMs: number;
  endsAtMs: number;
  durationMin: number;
  final15Timer?: NodeJS.Timeout;
  endTimer?: NodeJS.Timeout;
};

const examStateStore = new Map<string, ExamRuntimeState>();
let ioInstance: Server | null = null;

function sanitizeDuration(raw: unknown): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return 30;
  return Math.min(300, Math.max(1, Math.floor(n)));
}

function clearExamTimers(state?: ExamRuntimeState): void {
  if (!state) return;
  if (state.final15Timer) clearTimeout(state.final15Timer);
  if (state.endTimer) clearTimeout(state.endTimer);
}

function emitExamState(io: Server, examId: string): void {
  const state = examStateStore.get(examId);
  if (!state) {
    io.to(roomForExam(examId)).emit("exam:state", {
      examId,
      status: "not_started",
    });
    return;
  }

  const now = Date.now();
  io.to(roomForExam(examId)).emit("exam:state", {
    examId,
    status: now >= state.endsAtMs ? "ended" : "started",
    startedAt: new Date(state.startedAtMs).toISOString(),
    endsAt: new Date(state.endsAtMs).toISOString(),
    durationMin: state.durationMin,
    serverNowMs: now,
  });
}

async function finalizeExamRuntime(io: Server, state: ExamRuntimeState): Promise<void> {
  const examId = state.examId;
  try {
    const summary = await forceSubmitActiveSessionsByExamService(examId);
    io.to(roomForExam(examId)).emit("exam:force_submit", {
      examId,
      message: "Het gio lam bai. He thong da tu dong nop bai tren server.",
      at: new Date().toISOString(),
      summary,
    });
  } catch (error) {
    console.error(`[socket] force-submit runtime failed exam=${examId}`, error);
    io.to(roomForExam(examId)).emit("exam:force_submit", {
      examId,
      message: "Het gio lam bai. He thong yeu cau nop bai ngay.",
      at: new Date().toISOString(),
    });
  } finally {
    clearExamTimers(state);
    examStateStore.delete(examId);
  }
}

function startExamRuntime(io: Server, examId: string, durationMin: number): ExamRuntimeState {
  const old = examStateStore.get(examId);
  clearExamTimers(old);

  const startedAtMs = Date.now();
  const endsAtMs = startedAtMs + durationMin * 60_000;
  const state: ExamRuntimeState = {
    examId,
    startedAtMs,
    endsAtMs,
    durationMin,
  };

  const msUntilFinal15 = Math.max(0, (durationMin - 15) * 60_000);
  state.final15Timer = setTimeout(() => {
    io.to(roomForExam(examId)).emit("exam:final_15m", {
      examId,
      message: "Con 15 phut de hoan tat bai thi.",
      at: new Date().toISOString(),
    });
  }, msUntilFinal15);

  const msUntilEnd = Math.max(0, endsAtMs - Date.now());
  state.endTimer = setTimeout(() => {
    void finalizeExamRuntime(io, state);
  }, msUntilEnd);

  examStateStore.set(examId, state);
  emitExamState(io, examId);
  return state;
}

/**
 * POC Socket.IO cho thi online: JWT handshake, join room theo đề, ping thời gian server,
 * giám thị broadcast cảnh báo vào room (chỉ admin/teacher).
 */
export function registerExamSocket(io: Server): void {
  ioInstance = io;
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
      emitExamState(io, examId);
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

    socket.on(
      "exam:start",
      async (payload: { examId?: string }) => {
        if (role !== "admin" && role !== "teacher") {
          socket.emit("exam:error", { code: "FORBIDDEN", message: "Chi admin hoac teacher" });
          return;
        }
        const examId = payload?.examId;
        if (!examId || typeof examId !== "string") {
          socket.emit("exam:error", { code: "BAD_EXAM_ID", message: "examId (string) bat buoc" });
          return;
        }
        const exam = await getExamById(examId);
        if (!exam) {
          socket.emit("exam:error", { code: "NOT_FOUND", message: "Khong tim thay bai thi" });
          return;
        }
        const durationMin = sanitizeDuration(exam.duration_min);
        const state = startExamRuntime(io, examId, durationMin);
        io.to(roomForExam(examId)).emit("exam:started", {
          examId,
          startedAt: new Date(state.startedAtMs).toISOString(),
          endsAt: new Date(state.endsAtMs).toISOString(),
          durationMin: state.durationMin,
          byRole: role,
        });
      }
    );

    socket.on("disconnect", (reason) => {
      console.log(`[socket] disconnect id=${socket.id} reason=${reason}`);
    });
  });
}

export function emitForceSubmitNotification(examId: string, summary: {
  exam_id: string;
  active_sessions: number;
  submitted_sessions: number;
  failed_sessions: number;
}): void {
  if (!ioInstance) return;
  ioInstance.to(roomForExam(examId)).emit("exam:force_submit", {
    examId,
    message: "Giang vien da force-submit. He thong da nop bai tren server.",
    at: new Date().toISOString(),
    summary,
  });
}

export async function startExamRuntimeFromServer(examId: string): Promise<{
  examId: string;
  startedAt: string;
  endsAt: string;
  durationMin: number;
}> {
  if (!ioInstance) {
    throw new Error("Socket.IO server is not ready");
  }

  const exam = await getExamById(examId);
  if (!exam) {
    throw new Error("Khong tim thay bai thi");
  }

  const durationMin = sanitizeDuration(exam.duration_min);
  const state = startExamRuntime(ioInstance, examId, durationMin);
  console.log(
    `[exam-runtime] started exam=${examId} duration=${durationMin}m endsAt=${new Date(state.endsAtMs).toISOString()}`
  );
  const payload = {
    examId,
    startedAt: new Date(state.startedAtMs).toISOString(),
    endsAt: new Date(state.endsAtMs).toISOString(),
    durationMin: state.durationMin,
  };

  ioInstance.to(roomForExam(examId)).emit("exam:started", {
    ...payload,
    byRole: "server",
  });

  return payload;
}
