import { Request, Response, NextFunction } from "express";
import { getAuditLogsService } from "~/services/auditLog.service";

export const getAuditLogsController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const filter = {
      action: req.query.action as any,
      actor_id: req.query.actor_id as string | undefined,
      resource_type: req.query.resource_type as string | undefined,
      resource_id: req.query.resource_id as string | undefined,
      from_date: req.query.from_date as string | undefined,
      to_date: req.query.to_date as string | undefined,
      limit: req.query.limit ? Number(req.query.limit) : 50,
      offset: req.query.offset ? Number(req.query.offset) : 0,
    };
    const result = await getAuditLogsService(filter);
    res.json({ success: true, ...result });
  } catch (err: any) {
    next(err);
  }
};
