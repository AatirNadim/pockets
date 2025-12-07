import { useFileStore } from "@/lib/stores/fileStore";
import { Download } from "lucide-react";
import React, { useEffect, useRef } from "react";

type DownloadIndicatorProps = {
  radius: number;
  dashOffset: number;
};

const DownloadIndicator = ({ radius, dashOffset }: DownloadIndicatorProps) => {
  return (
    <svg
      viewBox="0 0 18 18"
      className="h-4 w-4 text-inherit"
      role="img"
      aria-label="Download in progress"
    >
      <circle
        cx="9"
        cy="9"
        r={radius}
        stroke="currentColor"
        strokeWidth={2}
        opacity={0.25}
        fill="none"
      />
      <circle
        cx="9"
        cy="9"
        r={radius}
        stroke="currentColor"
        strokeWidth={2}
        strokeDasharray={2 * Math.PI * radius}
        strokeDashoffset={dashOffset}
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
};

export default DownloadIndicator;
