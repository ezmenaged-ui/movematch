import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import './ds.css';
import './globals.css';

export const metadata: Metadata = {
  title: 'MoveMatch · 5 הצעות מחיר ממובילים מדורגים',
  description: 'עוברים דירה? משאירים פרטים ואנחנו מתמקחים בשבילכם ומביאים 5 הצעות מחיר מחברות הובלה בדירוג גבוה. חינם ובלי התחייבות.',
  openGraph: { title: 'MoveMatch · 5 הצעות ממובילים מדורגים', description: 'אנחנו נתמקח בשבילכם. חינם ובלי התחייבות.', locale: 'he_IL', type: 'website' },
  robots: { index: true, follow: true },
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#f2f2f3' };

const GA = process.env.NEXT_PUBLIC_GA_ID;
const GTM = process.env.NEXT_PUBLIC_GTM_ID;
const PIXEL = process.env.NEXT_PUBLIC_META_PIXEL_ID;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link href="https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;700&family=Barlow+Condensed:wght@600;700&family=Heebo:wght@400;500;600;700;800&family=Assistant:wght@400;600;700&display=swap" rel="stylesheet" />
        {/* gtag() must exist before React hydrates: the landing page fires funnel_step 0_landing on mount,
            and with an afterInteractive stub that first event was silently dropped (w.gtag undefined). */}
        {GA && <script dangerouslySetInnerHTML={{ __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${GA}');` }} />}
      </head>
      <body>
        {GTM && (<>
          <Script id="gtm" strategy="afterInteractive">{`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${GTM}');`}</Script>
          <noscript><iframe src={`https://www.googletagmanager.com/ns.html?id=${GTM}`} height="0" width="0" style={{ display: 'none', visibility: 'hidden' }} /></noscript>
        </>)}
        {children}
        {GA && (<>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA}`} strategy="afterInteractive" />
        </>)}
        {PIXEL && (
          <Script id="fb" strategy="afterInteractive">{`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${PIXEL}');fbq('track','PageView');`}</Script>
        )}
      </body>
    </html>
  );
}
