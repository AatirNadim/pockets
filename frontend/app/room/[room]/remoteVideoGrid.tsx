"use client";

import RemoteVideoTile from "@/components/custom/remoteVideoTile";
import { UserType } from "@/lib/constants";
import { useConnectionStore } from "@/lib/stores/connectionStore";
import { useMediaStore } from "@/lib/stores/mediaStore";
import { useUserStore } from "@/lib/stores/userStore";
import { useVoiceActivityStore } from "@/lib/stores/voiceActivityStore";
import { LoaderCircle, Users, WifiOff } from "lucide-react";

const phaseLabels = {
  waiting: "Waiting for the other participant",
  signaling: "Sending a call request",
  connecting: "Establishing the connection",
  connected: "Connected · waiting for media",
  reconnecting: "Connection interrupted · retrying",
  failed: "Connection unavailable",
} as const;

const RemoteVideoGrid = ({ status, isConnected }: { status: string; isConnected: boolean }) => {
  const { mediaStreams, remoteTrackState } = useMediaStore();
  const { levels } = useVoiceActivityStore();
  const peers = useConnectionStore((state) => state.peers);
  const { userType, remoteUsers } = useUserStore();
  const entries = Object.entries(mediaStreams);
  const waitingPeers = Object.entries(peers).filter(([id]) => !mediaStreams[id]);
  const tileCount = entries.length + waitingPeers.length;

  return (
    <section aria-label="Video stage" className="relative m-2 mb-1 min-h-0 flex-1 overflow-hidden rounded-2xl border border-stone-200 bg-stone-200 dark:border-stone-800 dark:bg-stone-900 sm:m-4 sm:mb-2">
      {tileCount > 0 ? (
        <div className="absolute inset-0 overflow-y-auto p-2 sm:p-4">
          <div className={`grid min-h-full gap-2 sm:gap-4 ${tileCount === 1 ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2"}`}>
            {entries.map(([remoteId, stream]) => {
              const peer = peers[remoteId];
              const user = remoteUsers[remoteId];
              return (
                <RemoteVideoTile
                  key={remoteId}
                  stream={stream}
                  userId={remoteId}
                  userName={peer?.userName ?? user?.name}
                  isHost={(peer?.userType ?? user?.userType) === UserType.HOST}
                  videoEnabled={remoteTrackState[remoteId]?.videoEnabled !== false}
                  audioEnabled={remoteTrackState[remoteId]?.audioEnabled !== false}
                  voiceLevel={levels[remoteId] ?? 0}
                  connectionPhase={peer?.phase}
                  connectionIssue={peer?.issue}
                />
              );
            })}
            {waitingPeers.map(([remoteId, peer]) => {
              const failed = peer.phase === "failed";
              const reconnecting = peer.phase === "reconnecting";
              return (
                <article
                  key={remoteId}
                  aria-label={`${peer.userName}, ${phaseLabels[peer.phase]}`}
                  className={`flex min-h-52 flex-col items-center justify-center rounded-2xl border p-6 text-center shadow-sm ${failed
                    ? "border-rose-300 bg-rose-50 dark:border-rose-900 dark:bg-rose-950/40"
                    : "border-stone-300 bg-stone-100 dark:border-stone-700 dark:bg-stone-950"}`}
                >
                  <div className={`mb-3 grid h-11 w-11 place-items-center rounded-full ${failed
                    ? "bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-200"
                    : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200"}`}>
                    {failed ? <WifiOff aria-hidden="true" /> : <LoaderCircle aria-hidden="true" className="animate-spin motion-reduce:animate-none" />}
                  </div>
                  <h2 className="font-semibold">{peer.userName}</h2>
                  <p role="status" aria-live="polite" className={`mt-2 text-sm font-medium ${failed ? "text-rose-800 dark:text-rose-200" : "text-stone-700 dark:text-stone-200"}`}>
                    {phaseLabels[peer.phase]}
                  </p>
                  <p className="mt-1 max-w-sm text-sm leading-5 text-stone-600 dark:text-stone-300">
                    {peer.issue ?? (failed
                      ? "This person is in the room, but the call could not be established."
                      : reconnecting
                        ? "We’ll keep their participant visible while trying to restore the network path."
                        : "Their participant tile is ready while the call is being set up.")}
                  </p>
                </article>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center p-6">
          <div className="max-w-sm text-center">
            <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-2xl bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"><Users size={28} /></div>
            <h2 className="text-lg font-semibold">{userType === UserType.GUEST && status.toLowerCase().includes("approv") ? "Waiting for the host" : userType === UserType.GUEST && !isConnected ? "Connecting to the room" : userType === UserType.GUEST ? "You’re in the room" : "Your room is ready"}</h2>
            <p className="mt-2 text-sm leading-6 text-stone-600 dark:text-stone-300">{userType === UserType.GUEST && status.toLowerCase().includes("approv") ? "Your request has been sent. You can join the conversation after the host admits you." : userType === UserType.GUEST ? "No other participants are connected yet. Their tiles will appear as soon as they are announced, even while a call is still connecting." : "Copy the invite from the room header and send it to the people you want to meet."}</p>
          </div>
        </div>
      )}
    </section>
  );
};

export default RemoteVideoGrid;
