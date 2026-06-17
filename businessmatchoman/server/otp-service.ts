import { db } from "./db";
import { otpCodes, users } from "@shared/schema";
import { eq, and, gt, lt, sql } from "drizzle-orm";
import crypto from "crypto";

/**
 * Generate a 6-digit OTP code
 */
function generateOtpCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Create and store OTP code in database
 */
export async function createOtpCode(
  userId: number,
  type: "email" | "phone" | "login",
): Promise<string> {
  const code = generateOtpCode();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

  // Delete any existing unverified OTP codes for this user and type
  await db
    .delete(otpCodes)
    .where(
      and(
        eq(otpCodes.userId, userId),
        eq(otpCodes.type, type),
        eq(otpCodes.verified, false),
      ),
    );

  // Insert new OTP code
  await db.insert(otpCodes).values({
    userId,
    code,
    type,
    expiresAt,
  });

  return code;
}

/**
 * Verify OTP code
 */
export async function verifyOtpCode(
  userId: number,
  code: string,
  type: "email" | "phone" | "login",
): Promise<boolean> {
  const now = new Date();

  const otpRecord = await db.query.otpCodes.findFirst({
    where: and(
      eq(otpCodes.userId, userId),
      eq(otpCodes.code, code),
      eq(otpCodes.type, type),
      eq(otpCodes.verified, false),
      gt(otpCodes.expiresAt, now),
    ),
  });

  if (!otpRecord) {
    return false;
  }

  // Mark OTP as verified
  await db
    .update(otpCodes)
    .set({ verified: true })
    .where(eq(otpCodes.id, otpRecord.id));

  return true;
}

/**
 * Send OTP via email
 */
export async function sendEmailOtp(
  email: string,
  code: string,
): Promise<boolean> {
  console.log(
    `Email OTP to ${email}: Your BusinessMatch verification code is: ${code}. Valid for 5 minutes.`,
  );
  return true;
}

/**
 * Send OTP via SMS (placeholder - requires SMS service integration)
 */
export async function sendPhoneOtp(
  phone: string,
  code: string,
): Promise<boolean> {
  // For now, we'll log the SMS content
  // In production, integrate with SMS service like Twilio
  console.log(
    `SMS OTP to ${phone}: Your BusinessMatch verification code is: ${code}. Valid for 5 minutes.`,
  );

  // Return true for now - in production, return actual SMS sending result
  return true;
}

/**
 * Send OTP for 2FA during login
 */
export async function sendLoginOtp(
  userId: number,
): Promise<{ emailSent: boolean; phoneSent: boolean }> {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!user) {
    throw new Error("User not found");
  }

  const code = await createOtpCode(userId, "login");

  const emailSent = await sendEmailOtp(user.email, code);
  const phoneSent = user.phone ? await sendPhoneOtp(user.phone, code) : false;

  return { emailSent, phoneSent };
}

