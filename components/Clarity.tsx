'use client';
import Script from 'next/script';
import { usePathname } from 'next/navigation';

/**
 * Microsoft Clarity session recordings, on the client funnels only (homepage, /a … /e incl. follow-up pages, /f, /u video upload),
 * plus the /qa test area for now (owner's request, 21 Nov 2026; those recordings are tagged env=qa, see lib/client.ts).
 * Only on movematch.co.il itself: Vercel deployment URLs (*.vercel.app) are visited by headless bots after each deploy,
 * which filled the recordings list with empty HeadlessChrome sessions.
 * Not on /admin, /movers, /login or the tender / offer pages (/t /j /l /o), which show personal details.
 * strategy="lazyOnload": the script is fetched only after the page has loaded and the browser is idle, so it adds no
 * latency to the first screen. Form inputs are masked by Clarity (keep the project's masking on "Balanced" or "Strict").
 * Funnel tags (funnel, step, lead) are set from lib/client.ts → track(), queued until the script arrives.
 * The <script> id must NOT be "clarity": browsers expose elements with an id as window globals, so window.clarity would be
 * the <script> element instead of a function, and the funnel steps pages crashed (21 Nov 2026).
 */
const ID = process.env.NEXT_PUBLIC_CLARITY_ID;
const FUNNEL_PATH = /^\/$|^\/[a-e](\/|$)|^\/f\/?$|^\/u\/|^\/qa\/[^/]+\/[^/]+/;
const LIVE_HOST = /(^|\.)movematch\.co\.il$/;

export default function Clarity() {
  const path = usePathname() || '';
  if (!ID || !FUNNEL_PATH.test(path)) return null;
  return (
    <Script id="ms-clarity-loader" strategy="lazyOnload">{`(function(c,l,a,r,i,t,y){if(!${LIVE_HOST}.test(c.location.hostname))return;if(typeof c[a]!=="function"){c[a]=function(){(c[a].q=c[a].q||[]).push(arguments)}}t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","${ID}");`}</Script>
  );
}
