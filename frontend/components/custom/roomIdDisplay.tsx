import React from "react";

type RoomIdDisplayProps = {
  roomId: string;
};

const RoomIdDisplay = ({ roomId }: RoomIdDisplayProps) => {
  return (
    <div className="absolute top-24 left-4 glass rounded-2xl px-4 py-2 border border-stone-200/50 dark:border-stone-700/50">
      <div className="text-xs text-stone-500 dark:text-stone-400 mb-1">
        Room ID
      </div>
      <div className="font-mono text-sm text-stone-800 dark:text-stone-200">{roomId}</div>
    </div>
  );
};

export default RoomIdDisplay;
