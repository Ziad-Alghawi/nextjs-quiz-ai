import type { Metadata } from "next";
import { ContactLink, LegalPage } from "../legal-page";

export const metadata: Metadata = { title: "Privacy policy" };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy policy">
      <p>Last updated: October 23, 2026</p>

      <h2>Who is responsible</h2>
      <p>
        Ziad Alghawi, Germany
        <br />
        <ContactLink />
      </p>

      <h2>What Quiz AI stores</h2>
      <ul>
        <li>
          Your account: name, email address, password hash, and your profile picture if you sign in
          with Google.
        </li>
        <li>
          Your study content: courses, the text read from the PDFs you upload, quizzes and your
          attempts with the answers you chose.
        </li>
        <li>For each sign-in session: your IP address and browser (user agent).</li>
        <li>Rate limits on sign-in, sign-up and password reset count requests per IP address.</li>
      </ul>

      <h2>Services that process your data</h2>
      <ul>
        <li>Vercel: hosts the website (region Frankfurt, Germany).</li>
        <li>Supabase: hosts the database (region Frankfurt, Germany).</li>
        <li>Google Gemini API: receives the text of the chapters you generate a quiz from.</li>
        <li>Google sign-in: only if you choose to sign in with Google.</li>
        <li>
          Stripe: handles payments. Card details are entered on Stripe&apos;s page and never reach
          Quiz AI.
        </li>
        <li>Gmail: sends the codes for password reset and email change.</li>
      </ul>

      <h2>Legal basis</h2>
      <p>
        Art. 6(1)(b) GDPR to provide your account and the quiz service; Art. 6(1)(f) GDPR for
        security (sign-in sessions, rate limits) and keeping the service running. Google sign-in is
        only used if you choose it.
      </p>

      <h2>Transfers outside the EU</h2>
      <p>
        Google, Stripe and Vercel are US companies. Transfers are based on the EU-US Data Privacy
        Framework or the EU Standard Contractual Clauses.
      </p>

      <h2>Cookies</h2>
      <p>
        Quiz AI only sets the cookies needed to keep you signed in. There is no analytics or
        advertising tracking.
      </p>

      <h2>How long data is kept</h2>
      <p>
        Deleting your account in Settings deletes your data and cancels your subscription. Copies in
        the hosting providers&apos; backups and server logs are deleted automatically after a short
        period.
      </p>

      <h2>Your rights</h2>
      <p>
        You can ask for access to, correction, deletion or export of your data, restrict or object
        to its processing, and complain to a data protection authority, for example the Bavarian
        State Office for Data Protection Supervision (BayLDA).
      </p>
    </LegalPage>
  );
}
