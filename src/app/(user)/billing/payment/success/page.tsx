import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageColumn } from "@/components/ui/page-column";
import { PageHeading } from "@/components/ui/page-heading";
import { PLANS } from "@/lib/plans";
import { isSubscribed } from "@/server/services/billing";
import { requireUser } from "@/server/session";
import { ActivationPending } from "./activation-pending";

export const metadata: Metadata = { title: "Payment successful" };

export default async function PaymentSuccessPage() {
  const user = await requireUser("/billing/payment/success");
  const active = await isSubscribed(user.id);

  return (
    <PageColumn>
      <PageHeading>Payment successful</PageHeading>
      <Card>
        {active ? (
          <>
            <p className="text-sm text-success">
              You&apos;re on Pro now: {PLANS.pro.monthlyQuizzes} quizzes a month.
            </p>
            <Button className="self-start" asChild>
              <Link href="/quizzes/new">Create a quiz</Link>
            </Button>
          </>
        ) : (
          <ActivationPending />
        )}
      </Card>
    </PageColumn>
  );
}
