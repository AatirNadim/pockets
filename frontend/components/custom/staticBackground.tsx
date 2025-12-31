import React from "react";

const StaticBackground = () => {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 -z-10"
    >
      <div className="absolute inset-0 bg-linear-to-br from-amber-100/60 via-orange-100/40 to-rose-100/50 dark:from-amber-950/30 dark:via-orange-950/20 dark:to-rose-950/20" />
      <div className="absolute inset-0 bg-radial-[circle_at_50%_30%] from-transparent via-transparent to-black/5 dark:to-black/25" />
    </div>
  );
};

export default StaticBackground;
