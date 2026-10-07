"use client";
import React from "react";
import Tooltip from "@uiw/react-tooltip";
import HeatMap from "@uiw/react-heat-map";
import { convertDateToString } from "@/lib/utils";

type Props = {
  data: {
    createdAt: Date;
    count: number;
  }[];
};

const panelColors = {
  0: "#4b515c",
  1: "#c6e48b",
  2: "#7bc96f",
  3: "#239a3b",
  4: "#196127",
};

const SubmissionHeatMap = (props: Props) => {
  const formattedDates = props.data.map((item) => ({
    date: convertDateToString(item.createdAt),
    count: item.count,
  }));

  return (
    <HeatMap
      value={formattedDates}
      width="100%"
      style={{ color: "#888" }}
      startDate={new Date("2026/01/01")}
      panelColors={panelColors}
      rectRender={(props, data) => {
        // if (!data.count) return <rect {...props} />;
        return (
          <Tooltip placement="top" content={`count: ${data.count || 0}`}>
            <rect {...props} />
          </Tooltip>
        );
      }}
    />
  );
};
export default SubmissionHeatMap;
