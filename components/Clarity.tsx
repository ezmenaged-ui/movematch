'use client';
import Script from 'next/script';
import { usePathname } from 'next/navigation';

/**
 * Microsoft Clarity session recordings, on the client funnels only (homepage, /a … /e incl. follow-up pages, /f, /u video upload).
 * Not on /qa, /admin, /movers, /login or the tender / offer pages (/t /j /l /o), which show personal details.
 * strategy="lazyOnload": the script is fetched only after the page has loaded and the browser is idle, so it adds no
 * latency to the first screen. Form inputs are masked by Clarity (keep the project's masking on "Balanced" or "Strict").
 * Funnel tags (funnel, step, lead) are set from lib/client.ts → track(), queued until the script arrives.
 */
const ID = process.env.NEXT_PUBLIC_CLARITY_ID;
const FUNNEL_PATH = /^\/$|^\/[a-e](\/|$)|^\/f\/?$|^\/u\//;

export default function Clarity() {
  const path = usePathname() || '';
  if (!ID || !FUNNEL_PATH.test(path)) return null;
  return (
    <Script id="clarity" strategy="lazyOnload">{`(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","${ID}");`}</Script>
  );
}
