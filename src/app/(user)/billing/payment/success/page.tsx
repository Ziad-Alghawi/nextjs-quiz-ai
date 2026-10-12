import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeading } from "@/components/ui/page-heading";
import { PLANS } from "@/lib/plans";
import { isSubscribed } from "@/server/services/billing";
import { requireUser } from "@/server/session";
import { ActivationPending } from "./activation-pending";

export default async function PaymentSuccessPage() {
  const user = await requireUser("/billing/payment/success");
  const active = await isSubscribed(user.id);

  return (
    <div className="flex flex-col gap-6 p-4">
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
    </div>
  );
}
