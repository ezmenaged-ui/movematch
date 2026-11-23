import Script from 'next/script';
import Clarity from '@/components/Clarity';
import DatePickerOnClick from '@/components/DatePickerOnClick';
import { LocaleProvider } from '@/components/Locale';
import { LOCALES, type Locale } from '@/lib/i18n';
import '@/app/ds.css';
import '@/app/globals.css';

const GA = process.env.NEXT_PUBLIC_GA_ID;
const GTM = process.env.NEXT_PUBLIC_GTM_ID;
const PIXEL = process.env.NEXT_PUBLIC_META_PIXEL_ID;

/**
 * Page translators (Chrome / Google Translate, Edge) swap text nodes for <font> tags behind React's back; React then
 * throws "removeChild / insertBefore: not a child of this node" on the next update (a button turning into a spinner,
 * a step changing) and the page goes blank. This keeps React working on a translated page: when the node React
 * expects is no longer where it left it, skip the move instead of crashing. Must run before hydration.
 */
const TRANSLATE_GUARD = `(function(){if(typeof Node!=='function'||!Node.prototype)return;var P=Node.prototype,r=P.removeChild,i=P.insertBefore;P.removeChild=function(c){if(c.parentNode!==this){return c}return r.apply(this,arguments)};P.insertBefore=function(n,ref){if(ref&&ref.parentNode!==this){return n}return i.apply(this,arguments)}})();`;

/**
 * The <html> document shared by both root layouts: app/(he)/layout.tsx (Hebrew, right to left, every existing URL)
 * and app/(en)/layout.tsx (English, left to right, everything under /en). Moving between the two is a full page load.
 */
export function RootShell({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  const { lang, dir } = LOCALES[locale];
  return (
    <html lang={lang} dir={dir}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: TRANSLATE_GUARD }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link href="https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;700&family=Barlow+Condensed:wght@600;700&family=Heebo:wght@400;500;600;700;800&family=Assistant:wght@400;600;700&display=swap" rel="stylesheet" />
        {/* Organization logo for Google (search result favicon comes from app/favicon.ico + app/icon.svg). */}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ '@context': 'https://schema.org', '@type': 'Organization', name: 'MoveMatch', alternateName: 'מובמאץ׳', url: 'https://movematch.co.il', logo: 'https://movematch.co.il/logo.png' }) }} />
        {/* gtag() must exist before React hydrates: the landing page fires funnel_step 0_landing on mount,
            and with an afterInteractive stub that first event was silently dropped (w.gtag undefined). */}
        {GA && <script dangerouslySetInnerHTML={{ __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${GA}');` }} />}
      </head>
      <body>
        {GTM && (<>
          <Script id="gtm" strategy="afterInteractive">{`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${GTM}');`}</Script>
          <noscript><iframe src={`https://www.googletagmanager.com/ns.html?id=${GTM}`} height="0" width="0" style={{ display: 'none', visibility: 'hidden' }} /></noscript>
        </>)}
        <LocaleProvider locale={locale}>{children}</LocaleProvider>
        {GA && (<>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA}`} strategy="afterInteractive" />
        </>)}
        {PIXEL && (
          <Script id="fb" strategy="afterInteractive">{`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${PIXEL}');fbq('track','PageView');`}</Script>
        )}
        <Clarity />
        <DatePickerOnClick />
      </body>
    </html>
  );
}
