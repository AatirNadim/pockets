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
    <div className="flex-1 relative bg-white rounded-lg m-4 overflow-hidden shadow-2xl border border-slate-200 dark:bg-gradient-to-br dark:from-gray-800 dark:to-gray-900 dark:border-white/10">
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
            <div className="w-24 h-24 bg-gradient-to-r from-[#635bff] to-[#00d4ff] rounded-full flex items-center justify-center mx-auto">
              <Users className="w-12 h-12 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-slate-700 dark:text-gray-300">
                Waiting for others...
              </h2>
              <p className="text-sm text-slate-500 dark:text-gray-500 mt-1">
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
