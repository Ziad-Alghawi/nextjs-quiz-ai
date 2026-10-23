import type { Metadata } from "next";
import { ContactLink, LegalPage } from "../legal-page";

export const metadata: Metadata = { title: "Impressum" };

export default function ImpressumPage() {
  return (
    <LegalPage title="Impressum">
      <h2>Provider</h2>
      <p>
        Ziad Alghawi
        <br />
        Germany
        <br />
        <ContactLink />
      </p>

      <h2>About this website</h2>
      <p>
        Quiz AI is a private, non-commercial portfolio project. Payments run in Stripe test mode, so
        no real payments are taken.
      </p>
    </LegalPage>
  );
}
