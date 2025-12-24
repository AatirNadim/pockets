import { useJoinRequestStore } from "@/lib/stores/joinRequestStore";
import React from "react";
import { Button } from "../ui/button";


type JoinRequestListProps = {
  respondToJoinRequest: (guestId: string, decision: "accept" | "reject") => void;

};

const JoinRequestList = ({ respondToJoinRequest }: JoinRequestListProps) => {
  const { requests } = useJoinRequestStore();

  return (
    <>
      {requests.map((request) => (
        <div
          key={request.guestId}
          className="rounded-2xl border border-stone-200/50 bg-white/95 p-4 shadow-lg backdrop-blur-xl dark:border-stone-700/50 dark:bg-stone-900/90"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                {request.guestName}
              </p>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                wants to join this room
              </p>
            </div>
            <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-stone-500 dark:bg-stone-800 dark:text-stone-300">
              Guest
            </span>
          </div>

          <div className="mt-4 flex gap-2">
            <Button
              size="sm"
              className="flex-1 bg-amber-500 text-white hover:bg-amber-600 rounded-xl"
              onClick={() => respondToJoinRequest(request.guestId, "accept")}
            >
              Accept
            </Button>
            <Button
              size="sm"
              variant="secondary"
              className="flex-1 bg-stone-100 text-stone-700 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-200 dark:hover:bg-stone-700 rounded-xl"
              onClick={() => respondToJoinRequest(request.guestId, "reject")}
            >
              Reject
            </Button>
          </div>
        </div>
      ))}
    </>
  );
};

export default JoinRequestList;
