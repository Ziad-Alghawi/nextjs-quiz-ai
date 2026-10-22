import type { Metadata } from "next";
import { LegalPage } from "../legal-page";

export const metadata: Metadata = { title: "Impressum" };

export default function ImpressumPage() {
  return (
    <LegalPage title="Impressum">
      <h2>Information according to § 5 DDG</h2>
      <p>
        [Full name]
        <br />
        [Street and house number]
        <br />
        [Postcode and city]
        <br />
        [Country]
      </p>

      <h2>Contact</h2>
      <p>Email: [email address]</p>

      <h2>Responsible for the content according to § 18 (2) MStV</h2>
      <p>[Full name, address as above]</p>

      <h2>About this website</h2>
      <p>
        Quiz AI is a portfolio project. Payments run in Stripe test mode, so no real payments are
        taken.
      </p>
    </LegalPage>
  );
}
