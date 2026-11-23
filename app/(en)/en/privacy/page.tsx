import { LegalContactEn, LegalShellEn } from '@/components/LegalShellEn';
import { LEGAL } from '@/lib/legal';
import { alternates } from '@/lib/i18n/alternates';

export const metadata = { title: 'Privacy policy · MoveMatch', alternates: alternates('/privacy', '/en/privacy') };

const ext = { target: '_blank', rel: 'noreferrer' } as const;

/** English translation of /privacy. Keep in step with app/(he)/privacy/page.tsx; the Hebrew version prevails. */
export default function Privacy() {
  return (
    <LegalShellEn title="Privacy policy">
      <p>MoveMatch (the &quot;Service&quot;, &quot;we&quot;) connects people who are moving home with moving companies. This policy explains what information we collect, why, who it is shared with, how it is secured and what your rights are, in line with the Israeli Protection of Privacy Law, 5741-1981, and its regulations.</p>
      <p>The controller of the information (the database owner) is Adtech Martech Consulting Ltd., company no. {LEGAL.companyId}, 10 HaPortzim St., Jerusalem. Contact details for privacy matters are at the end of this policy.</p>

      <h2>1. What information we collect</h2>
      <ul>
        <li><b>Contact details:</b> name and phone number.</li>
        <li><b>Move details:</b> city and address you are moving from and to, floor, elevator, requested date, item list, and your preference between service and price. We also note that you used the English site, so movers know to speak English with you.</li>
        <li><b>Videos and photos</b> of the home, if you choose to add them.</li>
        <li><b>Technical information:</b> browser and device type, how you reached the website (for example an ad or campaign) and website usage data, as set out in section 5.</li>
        <li><b>Requesting a mover&apos;s number:</b> if you asked to see a mover&apos;s phone number on the &quot;Our movers&quot; page, we keep the name and mobile number you gave, the mover and how you reached the website, so we know the contact with the mover came through us (for settling accounts with them). We will not send you messages because of this request.</li>
        <li><b>Movers:</b> company name, contact person, phone, email, logo, the <b>service areas</b> the mover chose, links to public profiles (Google, Midrag) and ratings, the price quotes submitted, and details of moves carried out, for calculating the commission.</li>
      </ul>
      <p>You are not required by law to provide the information. Without a name, phone number and move details we cannot get price quotes for you, and without service areas we cannot send tenders to a mover.</p>

      <h2>2. Why we use the information</h2>
      <ul>
        <li>Opening a moving tender, getting price quotes from movers and showing them to you on the tender page.</li>
        <li><b>Matching customers and movers:</b> each tender is sent only to approved movers whose service areas include the area the move starts from. That is why we collect movers&apos; service areas and use them to route tenders.</li>
        <li>Sending updates about the tender and the quotes by SMS and WhatsApp, and phoning you when needed.</li>
        <li>Improving the Service, preventing misuse (for example the limit of one tender per phone number every 30 days), and measuring the performance of the website and advertising.</li>
        <li>Settling the commission with movers, and meeting our legal obligations.</li>
      </ul>

      <h2>3. Who the information is shared with</h2>
      <ul>
        <li><b>Moving companies</b> that serve the area the move starts from: they receive the move details and videos, <b>together with your name and phone number</b>, so they can submit a price quote and contact you about it. Movers are required to keep the information confidential, use it only for your move, not send you advertising, and delete it when they are done.</li>
        <li><b>Customers (regarding movers):</b> a price quote is shown to the customer together with the mover&apos;s company name, logo, contact person, phone and ratings.</li>
        <li><b>Service providers</b> that run the website for us, and only as far as needed for that: website hosting (Vercel), database and video storage (Supabase), sending SMS and WhatsApp (Twilio, Meta), email (Google), and analytics and advertising (Google, Meta, Microsoft).</li>
        <li>Authorities, when the law requires it.</li>
      </ul>
      <p>We do not sell personal information.</p>

      <h2>4. Transfer of information outside Israel</h2>
      <p>Some of our service providers store and process information on servers outside Israel:</p>
      <ul>
        <li><b>Vercel</b> (website hosting and request processing): USA (Washington).</li>
        <li><b>Supabase</b> (database and video storage): Germany (Frankfurt, European Union).</li>
        <li><b>Twilio</b> (SMS and WhatsApp): USA.</li>
        <li><b>Meta</b> (WhatsApp, Pixel): USA and other countries where Meta runs servers.</li>
        <li><b>Google</b> (email, Google Analytics, Google Ads): USA and other countries where Google runs servers.</li>
        <li><b>Microsoft</b> (Microsoft Clarity): USA and other countries where Microsoft runs servers.</li>
      </ul>
      <p>The transfer is made in accordance with the Israeli Protection of Privacy Regulations (Transfer of Information to Databases Outside the State&apos;s Borders), 5761-2001. These providers undertake in data processing agreements to protect the information and use it only to provide the service to us, and, as they publish, encrypt the information in transit and at rest, restrict access to it, meet recognised security standards (such as SOC 2 or ISO 27001), and use the European Union&apos;s Standard Contractual Clauses (SCC) or an equivalent mechanism for transfers between countries.</p>

      <h2>5. Cookies, pixels and tracking technologies</h2>
      <p>The website uses cookies, pixels, local browser storage and similar technologies. Some are needed to run the website (for example saving your progress in the form, and signing in to a mover or site-admin account), and some are used for measurement and advertising. Examples:</p>
      <ul>
        <li><b>Google Analytics 4 and the Google tag</b> (including Google Tag Manager): measuring website use, for example which form steps were completed.</li>
        <li><b>Google Ads:</b> measuring ad conversions, for example leaving your details.</li>
        <li><b>Meta Pixel</b> (Facebook and Instagram): measuring ad conversions and tailoring advertising.</li>
        <li><b>Microsoft Clarity:</b> recording how the form pages are used (mouse movements, scrolling and button taps) and heatmaps, to improve the website. What you type in form fields is masked and not saved in the recording.</li>
        <li><b>Campaign parameters</b> (utm) saved with your request, so we know which channel you came from.</li>
      </ul>
      <p>These technologies may collect a device or browser identifier, IP address, the pages you visited and the actions you took on the website. We do not pass your name or phone number to them.</p>
      <p><b>How to opt out:</b> you can block or delete cookies in your browser settings (the website will keep working, but your form progress may not be saved); install the <a href="https://tools.google.com/dlpage/gaoptout" {...ext}>Google Analytics opt-out browser add-on</a>; manage ad personalisation in <a href="https://adssettings.google.com" {...ext}>Google&apos;s ad settings</a> and <a href="https://www.facebook.com/adpreferences" {...ext}>Meta&apos;s ad preferences</a>; or use private browsing.</p>

      <h2>6. Messages</h2>
      <p>SMS and WhatsApp messages are sent as part of the service you asked for (updates about the tender and the quotes), and to movers: messages about new tenders in the service areas they chose. We will not send you advertising without your explicit consent. You can stop receiving messages at any time by replying &quot;STOP&quot; (or &quot;הסר&quot;) to a message.</p>

      <h2>7. Information security and security incidents</h2>
      <p>We take reasonable measures to secure the information, in line with the Israeli Protection of Privacy Regulations (Information Security), 5777-2017, including:</p>
      <ul>
        <li><b>Encryption:</b> all communication with the website is encrypted (HTTPS). The hosting and database providers also encrypt the information at rest.</li>
        <li><b>Access control:</b> access to the admin interface is password-protected and limited to the Operator&apos;s staff. Each mover signs in with a personal account and sees only the tenders and data that concern them. Row-level permissions are enabled in the database, and access to information goes through functions that check permissions.</li>
        <li><b>Private video storage:</b> videos are kept in private storage that is not open to the public, and are exposed only through secure links to those authorised to see them.</li>
        <li><b>Data minimisation:</b> movers receive only the information needed for a price quote, and information is deleted automatically at the end of the retention periods (section 8).</li>
      </ul>
      <p><b>Security incident:</b> if a security incident is discovered, we will act immediately to stop it and limit the damage, document it, and report it to the Privacy Protection Authority when the law requires. If the law or the Authority requires it, including under the law as amended by Amendment No. 13 to the Protection of Privacy Law, we will also notify the people whose information was affected, and explain what happened and what can be done.</p>

      <h2>8. Retention</h2>
      <p>We keep information only for as long as it is needed:</p>
      <ul>
        <li><b>Videos and photos of the home:</b> up to 30 days after the move date (and if no date was set, up to 90 days from opening the tender), and then deleted.</li>
        <li><b>Tender details, price quotes and contact details:</b> up to 24 months from the date the tender was opened, for handling enquiries, disputes and settling accounts with movers, and then deleted.</li>
        <li><b>Mover details:</b> for as long as the mover is registered with the Service, and afterwards as needed for settling accounts and as required by law.</li>
        <li>Information we must keep by law (for example accounting records) is kept for the period the law sets.</li>
      </ul>
      <p>You can ask for earlier deletion at any time, using the details below.</p>

      <h2>9. Your rights</h2>
      <p>Under the Protection of Privacy Law, you can ask to see the information about you, correct it or delete it. You can also ask us not to contact you with direct mail. Contact us using the details below and we will respond within 30 days.</p>

      <h2>10. Privacy enquiries</h2>
      <p>Privacy enquiries, requests to see, correct or delete information, and reports of a suspected security incident: <a href={`mailto:${LEGAL.email}`} dir="ltr">{LEGAL.email}</a>.</p>
      <LegalContactEn />
    </LegalShellEn>
  );
}
