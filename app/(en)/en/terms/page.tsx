import { LegalContactEn, LegalShellEn } from '@/components/LegalShellEn';
import { LEGAL } from '@/lib/legal';
import { alternates } from '@/lib/i18n/alternates';

export const metadata = { title: 'Terms of use · MoveMatch', alternates: alternates('/terms', '/en/terms') };

/** English translation of /terms. Keep in step with app/(he)/terms/page.tsx; the Hebrew version prevails. */
export default function Terms() {
  return (
    <LegalShellEn title="Terms of use">
      <p>The MoveMatch website and service (the &quot;Service&quot;) are operated by Adtech Martech Consulting Ltd., company no. {LEGAL.companyId}, 10 HaPortzim St., Jerusalem (the &quot;Operator&quot;, &quot;we&quot;). Use of the website and the Service is subject to these terms, and using them means you accept the terms.</p>
      <p>Movers: your engagement with MoveMatch is also subject to the <a href="/movers/terms" hrefLang="he">movers agreement</a> (Hebrew). If these terms and the movers agreement conflict on a matter that concerns movers, the movers agreement prevails.</p>

      <h2>1. What the Service does</h2>
      <p>MoveMatch is a platform that connects customers looking for a moving service with independent moving companies. The customer enters the move details once, a &quot;tender&quot; is opened for them, and movers who serve the area the move starts from submit price quotes that are shown to the customer. <b>MoveMatch is not a moving company, is not a party to the agreement between the customer and the mover, and does not carry out the move.</b></p>

      <h2>2. Age and capacity</h2>
      <p>The Service may be used by anyone aged 18 or over who has the legal capacity to enter into an agreement. A minor may use the Service only with the approval of a parent or guardian, and anyone using the Service declares that they meet these conditions.</p>

      <h2>3. For customers</h2>
      <ul>
        <li>The Service is free for customers, with no obligation to choose a quote.</li>
        <li>Prices are set by the movers based on the details and videos provided, and may change if the actual scope of the move is different.</li>
        <li>The engagement, payment, insurance and terms of the move are agreed directly between you and the mover you choose. We recommend getting a written quote from the mover and making sure there is insurance cover before the move.</li>
        <li>By sending your details you agree to receive updates about the tender and the quotes by SMS and WhatsApp, and that your details are passed to movers as described in the <a href="/en/privacy">privacy policy</a>. You can stop at any time by replying &quot;STOP&quot; (or &quot;הסר&quot;).</li>
      </ul>

      <h2>4. Accurate details and no impersonation</h2>
      <ul>
        <li>You must give your real name, your own phone number and correct, complete move details. You must not impersonate another person or give another person&apos;s details without their consent.</li>
        <li>One tender can be opened per phone number every 30 days. This rule makes sure movers receive genuine requests, so it must not be bypassed, for example by using different phone numbers or names for the same move.</li>
        <li>We may close a tender, not pass it to movers, or block use if there is a reasonable concern that the details are not true.</li>
      </ul>

      <h2>5. Prohibited conduct</h2>
      <p>You must not use the Service in a way that is unlawful or harms others, including:</p>
      <ul>
        <li>Automated collection of information from the website (scraping, robots, crawlers), or systematic copying of content and data.</li>
        <li>Reverse engineering, taking apart or trying to bypass the website&apos;s security mechanisms, or accessing areas you are not authorised to access.</li>
        <li>Uploading viruses, malicious code or anything that may harm the website, users or our providers.</li>
        <li>Sending spam, repeated or harassing messages, and harassing, threatening or harming movers, customers or staff.</li>
        <li>Publishing offensive or false content, or content that is defamatory.</li>
        <li>Using the contact details of customers or movers received through the Service for any purpose other than the move for which they were given, including advertising and marketing.</li>
      </ul>

      <h2>6. Content uploaded by users</h2>
      <ul>
        <li>A customer who uploads videos, photos or details about the home grants the Operator a limited, non-exclusive, royalty-free licence, for the retention period set out in the privacy policy, to store, process (for example compress or split into files) and share the content with movers, solely for obtaining price quotes and carrying out the move.</li>
        <li>A mover grants the Operator a non-exclusive, royalty-free licence to display the logo, company name, contact details, links and ratings they provided, on the website and on tender pages, for as long as they take part in the Service.</li>
        <li>Anyone who uploads content declares that they are entitled to do so and that the content does not infringe the rights of others. We recommend not filming people, documents or identifying details that are not needed to assess the move.</li>
      </ul>

      <h2>7. Intellectual property</h2>
      <p>All rights in the website and the Service, including the content, texts, design, graphics, software, and the MoveMatch name and mark, belong to the Operator or to whoever permitted it to use them. No part of them may be copied, reproduced, distributed, published or used commercially without the Operator&apos;s prior written consent. If you believe content on the website infringes your rights, please contact us using the details below; we may remove content alleged to infringe rights.</p>

      <h2>8. The movers on the website: what we check and what we don&apos;t</h2>
      <ul>
        <li>Showing a mover or their quote on the website <b>is not a recommendation</b> or guarantee by MoveMatch of the mover, the quality of their service or the price.</li>
        <li>Before a mover starts receiving tenders, we approve the details they provided and check that the links to their Google and Midrag pages exist and that the ratings and review counts shown match what appears there at the time of the check.</li>
        <li>A mover&apos;s licences, insurance and permits are <b>the mover&apos;s own declaration</b>. We do not check them, and we recommend asking the mover to see them before the move.</li>
      </ul>

      <h2>9. After you choose a mover</h2>
      <p>Once a customer chooses a mover, the engagement to carry out the move is between the customer and the mover only, and MoveMatch is not a party to it. Any claim or demand regarding the move itself, including price, delay, damage to property or injury, loss and insurance, must be directed to the mover.</p>

      <h2>10. Cancellations, refunds and closing a tender</h2>
      <ul>
        <li>Cancelling a move booking and refunds are handled directly with the mover, according to the terms agreed with them and the provisions of the Israeli Consumer Protection Law, 5741-1981, where they apply.</li>
        <li>An open tender closes automatically when the time shown on the tender page ends. You can close it earlier, for example if you have already found a mover or no longer need the move, by contacting us on WhatsApp or by email (details below). After it closes, the tender is not sent to further movers. To stop messages you can also reply &quot;STOP&quot;.</li>
      </ul>

      <h2>11. Offer: ₪50 off the move</h2>
      <ul>
        <li>A customer is entitled to ₪50 off the price agreed with the mover if <b>both conditions</b> are met: (a) the customer booked a mover through the Service; and (b) within the tender, the customer provided <b>both a video of the home and a full list of the items being moved</b>, which make it possible to assess the scope of the move.</li>
        <li>The discount is given by the mover and deducted from the price the customer pays them.</li>
        <li>The benefit is personal, given once per move, is not transferable and cannot be exchanged for money or money&apos;s worth.</li>
        <li>The Operator may change the terms of the offer or end it by notice on the website. A change will not apply to a customer who already booked a mover before the notice and met the conditions.</li>
      </ul>

      <h2>12. Ratings and content</h2>
      <p>Ratings and review counts are shown as they appear in public sources (such as Google and Midrag) at the time of the update, and are for general impression only. MoveMatch is not responsible for content provided by movers or customers.</p>

      <h2>13. Links to external websites</h2>
      <p>The website contains links to third-party websites, such as movers&apos; Google and Midrag pages and the movers&apos; own websites. These websites are not under our control, and we are not responsible for their content, availability or privacy policies.</p>

      <h2>14. Liability</h2>
      <p>MoveMatch is not a party to the move and is therefore not responsible for the quality of the move, damage caused during it, delays or disputes between a customer and a mover. The website is provided as is, and in any other matter MoveMatch&apos;s liability is limited to the maximum extent permitted by law, except for damage caused by MoveMatch&apos;s gross negligence or wilful misconduct.</p>

      <h2>15. Indemnity</h2>
      <p>A user will indemnify the Operator for any damage, loss, payment or expense (including reasonable legal fees) caused to it by the user&apos;s breach of these terms, or by the user&apos;s unlawful use of the Service. The Operator will notify the user of any such claim and allow them to defend against it.</p>

      <h2>16. Privacy</h2>
      <p>The use of personal information is described in the <a href="/en/privacy">privacy policy</a>.</p>

      <h2>17. Changes to the terms</h2>
      <p>We may update the terms from time to time. The updated version will be published on the website with the date of the update, and applies from the day it is published. We will give reasonable advance notice of a material change, on the website or by a message to anyone who gave us contact details. A change will not apply to a tender or booking already opened before it was published, unless it is in the user&apos;s favour.</p>

      <h2>18. Governing law and jurisdiction</h2>
      <p>These terms and the use of the Service are governed exclusively by Israeli law. The competent courts in Jerusalem have exclusive jurisdiction in any matter relating to them.</p>

      <h2>19. Contact</h2>
      <LegalContactEn />
    </LegalShellEn>
  );
}
