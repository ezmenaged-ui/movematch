/**
 * Messaging kill switch ("pull the plug"). With MESSAGES_PAUSED=1 in the environment, the site sends no WhatsApp,
 * no SMS and no lead/operator email to anyone (clients, movers or the operator). Leads, offers and everything else
 * are still saved and visible in /admin; only the outgoing messages are skipped (and logged as "[paused]").
 * Messages skipped while paused are not queued, so resuming does not send a backlog burst.
 * Still allowed while paused: account emails a person asks for (mover password reset / admin access link).
 * To resume: remove MESSAGES_PAUSED (or set it to 0) in Vercel and redeploy.
 */
export const messagesPaused = () => ['1', 'true', 'yes', 'on'].includes((process.env.MESSAGES_PAUSED || '').trim().toLowerCase());

export function logPaused(what: string) {
  console.warn(`[paused] MESSAGES_PAUSED is on: skipped ${what}`);
}
