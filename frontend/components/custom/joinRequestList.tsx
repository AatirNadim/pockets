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
          className="rounded-2xl border border-slate-200/70 bg-white/95 p-4 shadow-xl backdrop-blur dark:border-white/10 dark:bg-gray-900/90"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                {request.guestName}
              </p>
              <p className="text-xs text-slate-500 dark:text-gray-400">
                wants to join this room
              </p>
            </div>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:bg-white/10 dark:text-gray-300">
              Guest
            </span>
          </div>

          <div className="mt-4 flex gap-2">
            <Button
              size="sm"
              className="flex-1 bg-[#635bff] text-white hover:bg-[#4f48ca]"
              onClick={() => respondToJoinRequest(request.guestId, "accept")}
            >
              Accept
            </Button>
            <Button
              size="sm"
              variant="secondary"
              className="flex-1 bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-white/10 dark:text-gray-200 dark:hover:bg-white/20"
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
