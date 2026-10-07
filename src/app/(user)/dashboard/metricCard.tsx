type Props = {
  value: number | null;
  label: string;
  unit?: string;
};

const MetricCard = (props: Props) => {
  const { value, label, unit = "" } = props;
  return (
    <div className="p-6 border rounded-md">
      <p className="text-[#6c7381]">{label}</p>
      <p className="text-3xl font-bold mt-2">{value === null ? "–" : `${value}${unit}`}</p>
    </div>
  );
};
export default MetricCard;
