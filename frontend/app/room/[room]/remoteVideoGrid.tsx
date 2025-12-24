import RemoteVideoTile from "@/components/custom/remoteVideoTile";
import { UserType } from "@/lib/constants";
import { useMediaStore } from "@/lib/stores/mediaStore";
import { useUserStore } from "@/lib/stores/userStore";
import { useVoiceActivityStore } from "@/lib/stores/voiceActivityStore";
import { Users } from "lucide-react";
import React from "react";

const RemoteVideoGrid = () => {
  
  const { mediaStreams, remoteTrackState } = useMediaStore();

  const { levels: voiceLevels } = useVoiceActivityStore();

  const { remoteUsers } = useUserStore();

  const remoteStreamEntries = Object.entries(mediaStreams);

  return (
    <div className="flex-1 relative bg-white/60 dark:bg-stone-900/60 rounded-3xl m-4 overflow-hidden shadow-xl border border-stone-200/50 dark:border-stone-700/50 backdrop-blur-sm">
      {remoteStreamEntries.length ? (
        <div className="absolute inset-0 p-4 overflow-auto">
          <div
            className={`grid h-full gap-4 ${
              remoteStreamEntries.length === 1
                ? "grid-cols-1"
                : "grid-cols-1 md:grid-cols-2"
            }`}
          >
            {remoteStreamEntries.map(([remoteId, stream]) => {
              const remoteMeta = remoteUsers[remoteId];
              return (
                <RemoteVideoTile
                  key={remoteId}
                  stream={stream}
                  userId={remoteId}
                  userName={remoteMeta?.name}
                  isHost={remoteMeta?.userType === UserType.HOST}
                  videoEnabled={
                    remoteTrackState[remoteId]?.videoEnabled !== false
                  }
                  audioEnabled={
                    remoteTrackState[remoteId]?.audioEnabled !== false
                  }
                  voiceLevel={voiceLevels[remoteId] ?? 0}
                />
              );
            })}
          </div>
        </div>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="w-24 h-24 bg-linear-to-br from-amber-400 via-orange-500 to-rose-500 rounded-3xl flex items-center justify-center mx-auto shadow-lg">
              <Users className="w-12 h-12 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-stone-700 dark:text-stone-300">
                Waiting for others...
              </h2>
              <p className="text-sm text-stone-500 dark:text-stone-500 mt-1">
                Share the room ID to invite participants
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RemoteVideoGrid;
