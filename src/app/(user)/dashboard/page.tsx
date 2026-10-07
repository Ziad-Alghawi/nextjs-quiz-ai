import { getCurrentUser } from "@/server/session";
import QuizzesTable, { Quizz } from "./quizzesTable";
import { listQuizzes } from "@/server/services/quizzes";
import { getSubmissionActivity, getUserMetrics } from "@/server/services/stats";
import MetricCard from "./metricCard";
import SubmissionHeatMap from "./heatMap";

const page = async () => {
  const userId = (await getCurrentUser())?.id;

  if (!userId) {
    return <p>User not found</p>;
  }

  const userQuizzes: Quizz[] = await listQuizzes(userId);
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
