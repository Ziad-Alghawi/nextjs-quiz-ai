import { db } from "@/db";
import { eq } from "drizzle-orm";
import { quizzes } from "@/db/schema";
import { auth } from "@/auth";
import QuizzesTable, { Quizz } from "./quizzesTable";
import { getSubmissionActivity, getUserMetrics } from "@/server/services/stats";
import MetricCard from "./metricCard";
import SubmissionHeatMap from "./heatMap";

const page = async () => {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return <p>User not found</p>;
  }

  // Fetch quizzes created by the user
  const userQuizzes: Quizz[] = await db.query.quizzes.findMany({
    where: eq(quizzes.userId, userId),
  });
  const userData = await getUserMetrics(userId);
  const heatMapData = await getSubmissionActivity();

  return (
    <div className="mt-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {userData && userData.length > 0 ? (
          <>
            {userData.map((metric) => (
              <MetricCard key={metric.label} label={metric.label} value={metric.value} />
            ))}
          </>
        ) : null}
      </div>
      <div>
        {heatMapData ? <SubmissionHeatMap data={heatMapData.data} /> : <p>No data available</p>}
      </div>

      <QuizzesTable quizzes={userQuizzes} />
    </div>
  );
};

export default page;
