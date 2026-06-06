import nodemailer from "nodemailer";

const DEFAULT_COOLDOWN_MS = 30 * 60 * 1000;
const recentEmailNotifications = new Map<string, number>();

export interface EmailNotificationResult {
  sent: boolean;
  skipped?: "cooldown";
  configured: boolean;
}

interface SendTeam2NotificationEmailOptions {
  userId: string;
  to: string;
  message: string;
  dedupeKey: string;
}

interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user?: string;
  pass?: string;
  from: string;
}

function readBooleanEnv(name: string, defaultValue: boolean): boolean {
  const rawValue = process.env[name];
  if (rawValue === undefined) return defaultValue;
  return !["0", "false", "no", "off"].includes(rawValue.trim().toLowerCase());
}

function readNumberEnv(name: string, defaultValue: number): number {
  const rawValue = process.env[name];
  if (rawValue === undefined) return defaultValue;
  const parsed = Number(rawValue);
  return Number.isFinite(parsed) ? parsed : defaultValue;
}

function getNotificationCooldownMs(): number {
  return Math.max(60_000, readNumberEnv("EMAIL_NOTIFICATION_COOLDOWN_MS", DEFAULT_COOLDOWN_MS));
}

function getSmtpConfig(): SmtpConfig | null {
  const host = process.env.SMTP_HOST?.trim();
  const from = process.env.SMTP_FROM?.trim();
  if (!host || !from) return null;

  const port = readNumberEnv("SMTP_PORT", 587);
  const secure = process.env.SMTP_SECURE !== undefined
    ? readBooleanEnv("SMTP_SECURE", false)
    : port === 465;
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS;

  return {
    host,
    port,
    secure,
    ...(user && pass ? { user, pass } : {}),
    from,
  };
}

function createTransport(config: SmtpConfig) {
  const timeoutMs = Math.max(5_000, readNumberEnv("SMTP_TIMEOUT_MS", 15_000));

  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    connectionTimeout: timeoutMs,
    greetingTimeout: timeoutMs,
    socketTimeout: timeoutMs,
    ...(config.user && config.pass
      ? {
          auth: {
            user: config.user,
            pass: config.pass,
          },
        }
      : {}),
  });
}

function getCooldownKey(userId: string, dedupeKey: string): string {
  return `${userId}:${dedupeKey}`;
}

function pruneOldCooldownEntries(now: number): void {
  const cooldownMs = getNotificationCooldownMs();
  for (const [key, timestamp] of recentEmailNotifications.entries()) {
    if (now - timestamp > cooldownMs * 2) {
      recentEmailNotifications.delete(key);
    }
  }
}

export function isEmailNotificationConfigured(): boolean {
  return getSmtpConfig() !== null;
}

export async function sendTeam2NotificationEmail(
  options: SendTeam2NotificationEmailOptions
): Promise<EmailNotificationResult> {
  const config = getSmtpConfig();
  if (!config) {
    throw new Error("Email notifications are not configured. Set SMTP_HOST, SMTP_PORT, SMTP_FROM, SMTP_USER, and SMTP_PASS.");
  }

  const now = Date.now();
  pruneOldCooldownEntries(now);

  const cooldownKey = getCooldownKey(options.userId, options.dedupeKey);
  const lastSentAt = recentEmailNotifications.get(cooldownKey);
  if (lastSentAt !== undefined && now - lastSentAt < getNotificationCooldownMs()) {
    return { sent: false, skipped: "cooldown", configured: true };
  }

  const transport = createTransport(config);
  await transport.sendMail({
    from: config.from,
    to: options.to,
    subject: "Notifikace Team2App",
    text: options.message,
  });

  recentEmailNotifications.set(cooldownKey, now);
  return { sent: true, configured: true };
}
