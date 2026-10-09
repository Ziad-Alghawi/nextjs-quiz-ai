import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Link from "next/link";

const Page = () => {
  return (
    <Alert variant="default">
      <AlertTitle className="mb-3 text-xl text-success">Payment Successful!</AlertTitle>
      <AlertDescription>
        Your account has been upgraded. You can now create unlimited quizzes and access all premium
        features. <br />
        <Link href="/dashboard" className="text-sm text-primary underline">
          Go to Dashboard
        </Link>{" "}
        to generate more quizzes
      </AlertDescription>
    </Alert>
  );
};

export default Page;
