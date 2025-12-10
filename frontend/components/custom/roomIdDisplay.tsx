import React from "react";

type RoomIdDisplayProps = {
  roomId: string;
};

const RoomIdDisplay = ({ roomId }: RoomIdDisplayProps) => {
  return (
    <div className="absolute top-24 left-4 bg-white/90 text-slate-800 backdrop-blur-sm rounded-lg px-4 py-2 border border-slate-200 shadow dark:bg-black/50 dark:text-white dark:border-white/10">
      <div className="text-xs text-slate-500 dark:text-gray-300 mb-1">
        Room ID
      </div>
      <div className="font-mono text-sm">{roomId}</div>
    </div>
  );
};

export default RoomIdDisplay;
