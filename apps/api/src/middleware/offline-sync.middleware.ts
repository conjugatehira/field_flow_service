import { Request, Response, NextFunction } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface SyncPayload {
  scans: Array<{
    batchId: string;
    farmerId: string;
    result: string;
    scannedAt: string;
  }>;
  complaints: Array<{
    batchId: string;
    farmerId: string;
    description?: string;
    createdAt: string;
  }>;
}

export async function syncHandler(req: Request, res: Response, next: NextFunction) {
  if (req.path !== "/sync" || req.method !== "POST") return next();

  try {
    const payload: SyncPayload = req.body;
    const results = { scansSynced: 0, complaintsSynced: 0, errors: [] as string[] };

    if (payload.scans) {
      for (const scan of payload.scans) {
        try {
          await prisma.scanEvent.create({
            data: {
              batchId: scan.batchId,
              farmerId: scan.farmerId,
              result: scan.result,
              scannedAt: new Date(scan.scannedAt),
              synced: true,
              syncedAt: new Date(),
            },
          });
          results.scansSynced++;
        } catch (err: any) {
          results.errors.push(`Scan ${scan.batchId}: ${err.message}`);
        }
      }
    }

    if (payload.complaints) {
      for (const complaint of payload.complaints) {
        try {
          await prisma.complaint.create({
            data: {
              batchId: complaint.batchId,
              farmerId: complaint.farmerId,
              description: complaint.description,
              routedTo: "Supplier",
              createdAt: new Date(complaint.createdAt),
            },
          });
          results.complaintsSynced++;
        } catch (err: any) {
          results.errors.push(`Complaint ${complaint.batchId}: ${err.message}`);
        }
      }
    }

    res.json(results);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
}
