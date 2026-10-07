import { requireUser } from "@/server/session";
import QuizzesTable from "./quizzesTable";
import { listQuizzes } from "@/server/services/quizzes";
import { getSubmissionActivity, getUserMetrics } from "@/server/services/stats";
import MetricCard from "./metricCard";
import SubmissionHeatMap from "./heatMap";

const page = async () => {
  const { id: userId } = await requireUser("/dashboard");

  const [userQuizzes, userData, activity] = await Promise.all([
    listQuizzes(userId),
    getUserMetrics(userId),
    getSubmissionActivity(userId),
  ]);

  return (
    <div className="mt-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {userData && userData.length > 0 ? (
          <>
            {userData.map((metric) => (
              <MetricCard
                key={metric.label}
                label={metric.label}
                value={metric.value}
                unit={metric.unit}
              />
            ))}
          </>
        ) : null}
      </div>
      <div>
        <SubmissionHeatMap data={activity} />
      </div>

      <QuizzesTable quizzes={userQuizzes} />
    </div>
  );
};

export default page;
