/** Admin session: a cookie holding a hash of the admin password + server secret.
 *  Changing ADMIN_PASSWORD (or MM_ADMIN_SECRET) logs every device out. Works in edge + node. */
export const ADMIN_COOKIE = 'mm_admin';
export const ADMIN_COOKIE_MAX_AGE = 60 * 60 * 24 * 180; // 180 days

export async function adminToken(): Promise<string> {
  const data = new TextEncoder().encode(`${process.env.ADMIN_PASSWORD || ''}|${process.env.MM_ADMIN_SECRET || ''}|movematch-admin`);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}
