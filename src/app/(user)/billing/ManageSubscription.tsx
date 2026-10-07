"use client";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { openBillingPortal } from "@/app/actions/billing";

// useFormStatus only works in a component rendered inside the form.
const SubmitButton = () => {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          please wait...
        </>
      ) : (
        "Change your subscription"
      )}
    </Button>
  );
};

const ManageSubscription = () => (
  <form action={openBillingPortal}>
    <SubmitButton />
  </form>
);

export default ManageSubscription;
