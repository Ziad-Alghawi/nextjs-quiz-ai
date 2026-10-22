import type { Metadata } from "next";
import { LegalPage } from "../legal-page";

export const metadata: Metadata = { title: "Privacy policy" };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy policy">
      <p>Last updated: [date]</p>

      <h2>Who is responsible</h2>
      <p>
        [Full name]
        <br />
        [Street and house number, postcode and city, country]
        <br />
        Email: [email address]
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
      <p>[Legal basis for each, e.g. Art. 6(1)(b) GDPR, and transfers outside the EU]</p>

      <h2>Cookies</h2>
      <p>
        Quiz AI only sets the cookies needed to keep you signed in. There is no analytics or
        advertising tracking.
      </p>

      <h2>How long data is kept</h2>
      <p>
        Deleting your account in Settings deletes your data and cancels your subscription.
        [Retention of backups and server logs]
      </p>

      <h2>Your rights</h2>
      <p>
        You can ask for access to, correction, deletion or export of your data, restrict or object
        to its processing, and complain to a data protection authority. [Name of the responsible
        authority]
      </p>
    </LegalPage>
  );
}
