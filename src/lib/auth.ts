import { cookies } from 'next/headers';

const CRM_SECRET = process.env.CRM_SECRET_KEY || "DO_PANAMA_DEFAULT_SECRET";

/**
 * Generates the current password based on a 15-day rotation period.
 * The password changes every 15 days (Epoch / 15 days).
 */
export function getCurrentPassword(): string {
  // 15 days in milliseconds
  const PERIOD_MS = 15 * 24 * 60 * 60 * 1000;
  const currentPeriod = Math.floor(Date.now() / PERIOD_MS);

  // Simple deterministic generation:
  // e.g. "CRM-8392-Sec" (just an example, let's make it readable)
  // We can base it on the period index to ensure it changes.

  // To make it easy to communicate, maybe just "CRM-[Code]"
  // This is a simple hash of the period + secret
  const hash = simpleHash(`${CRM_SECRET}-${currentPeriod}`);
  const shortCode = Math.abs(hash).toString().slice(0, 4); // 4 digit code

  return `CRM-${shortCode}`;
}

/**
 * Returns the password for the NEXT period, so admins can prepare.
 */
export function getNextPassword(): string {
  const PERIOD_MS = 15 * 24 * 60 * 60 * 1000;
  const nextPeriod = Math.floor((Date.now() + PERIOD_MS) / PERIOD_MS);
  const hash = simpleHash(`${CRM_SECRET}-${nextPeriod}`);
  const shortCode = Math.abs(hash).toString().slice(0, 4);
  return `CRM-${shortCode}`;
}

function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash;
}

export async function isAuthenticated() {
  // const cookieStore = await cookies();
  // const token = cookieStore.get('crm_access_token');
  // return token?.value === 'authenticated'; // In a real app backend, verify JWT
  return true; // Password protection disabled requested by user
}
