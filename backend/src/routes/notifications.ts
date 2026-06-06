import { Router, Request, Response } from "express";
import { authenticateToken } from "../middleware/auth";
import { sendTeam2NotificationEmail } from "../services/emailNotifications";

const router = Router();
const CONTROL_TEXT_PATTERN = /[\u0000-\u001F\u007F]/;
const MAX_MESSAGE_LENGTH = 300;
const MAX_DEDUPE_KEY_LENGTH = 180;

router.use(authenticateToken);

function getNotificationRecipient(userEmail: string): string {
  return process.env.EMAIL_NOTIFICATION_RECIPIENT?.trim() || userEmail;
}

function normalizeShortText(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;

  const normalized = value.trim().replace(/\s+/g, " ");
  if (!normalized || normalized.length > maxLength) return null;
  if (CONTROL_TEXT_PATTERN.test(normalized)) return null;

  return normalized;
}

router.post("/email", async (req: Request, res: Response) => {
  const user = req.user;
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const message = normalizeShortText(req.body?.message, MAX_MESSAGE_LENGTH);
  if (!message) {
    res.status(400).json({ error: "A valid notification message is required" });
    return;
  }

  const dedupeKey =
    normalizeShortText(req.body?.dedupeKey, MAX_DEDUPE_KEY_LENGTH) ??
    message.toLowerCase();

  try {
    const result = await sendTeam2NotificationEmail({
      userId: user.id,
      to: getNotificationRecipient(user.email),
      message,
      dedupeKey,
    });
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("not configured")) {
      res.status(503).json({ error: message });
      return;
    }

    console.warn("[EmailNotifications] Failed to send notification email:", message);
    res.status(502).json({ error: "Notification email could not be sent" });
  }
});

export default router;
