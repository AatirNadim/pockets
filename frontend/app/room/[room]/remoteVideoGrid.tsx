"use client";

import RemoteVideoTile from "@/components/custom/remoteVideoTile";
import { UserType } from "@/lib/constants";
import { useMediaStore } from "@/lib/stores/mediaStore";
import { useUserStore } from "@/lib/stores/userStore";
import { useVoiceActivityStore } from "@/lib/stores/voiceActivityStore";
import { Users } from "lucide-react";

const RemoteVideoGrid = ({ status, isConnected }: { status: string; isConnected: boolean }) => {
  const { mediaStreams, remoteTrackState } = useMediaStore();
  const { levels } = useVoiceActivityStore();
  const { userType, remoteUsers } = useUserStore();
  const entries = Object.entries(mediaStreams);

  return <section aria-label="Video stage" className="relative m-2 mb-1 min-h-0 flex-1 overflow-hidden rounded-2xl border border-stone-200 bg-stone-200 dark:border-stone-800 dark:bg-stone-900 sm:m-4 sm:mb-2">
    {entries.length ? <div className="absolute inset-0 overflow-y-auto p-2 sm:p-4"><div className={`grid min-h-full gap-2 sm:gap-4 ${entries.length === 1 ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2"}`}>
      {entries.map(([remoteId, stream]) => {
        const user = remoteUsers[remoteId];
        return <RemoteVideoTile key={remoteId} stream={stream} userId={remoteId} userName={user?.name} isHost={user?.userType === UserType.HOST} videoEnabled={remoteTrackState[remoteId]?.videoEnabled !== false} audioEnabled={remoteTrackState[remoteId]?.audioEnabled !== false} voiceLevel={levels[remoteId] ?? 0} />;
      })}
    </div></div> : <div className="absolute inset-0 flex items-center justify-center p-6"><div className="max-w-sm text-center">
      <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-2xl bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"><Users size={28} /></div>
      <h2 className="text-lg font-semibold">{userType === UserType.GUEST && status.toLowerCase().includes("approv") ? "Waiting for the host" : userType === UserType.GUEST && !isConnected ? "Connecting to the room" : userType === UserType.GUEST ? "You’re in the room" : "Your room is ready"}</h2>
      <p className="mt-2 text-sm leading-6 text-stone-600 dark:text-stone-300">{userType === UserType.GUEST && status.toLowerCase().includes("approv") ? "Your request has been sent. You can join the conversation after the host admits you." : userType === UserType.GUEST ? "No one else is on the video stage yet. You can keep this room open while others join." : "Copy the invite from the room header and send it to the people you want to meet."}</p>
    </div></div>}
  </section>;
};

export default RemoteVideoGrid;
