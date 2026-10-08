"use client";
import React from "react";
import Tooltip from "@uiw/react-tooltip";
import HeatMap from "@uiw/react-heat-map";

type Props = {
  data: { date: string; count: number }[];
};

const panelColors = {
  0: "#4b515c",
  1: "#c6e48b",
  2: "#7bc96f",
  3: "#239a3b",
  4: "#196127",
};

const SubmissionHeatMap = (props: Props) => {
  const startDate = new Date();
  startDate.setFullYear(startDate.getFullYear() - 1);

  return (
    <HeatMap
      value={props.data}
      width="100%"
      style={{ color: "var(--muted-foreground)" }}
      startDate={startDate}
      panelColors={panelColors}
      rectRender={(props, data) => {
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
