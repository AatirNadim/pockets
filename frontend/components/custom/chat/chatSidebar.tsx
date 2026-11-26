import { cn } from "@/lib/utils";
import { useEffect } from "react";
import { useChatStore } from "@/lib/stores/chatStore";
import dynamic from "next/dynamic";

const ChatComponent = dynamic(() => import("./chatComponent"), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-amber-600 dark:border-amber-400 border-t-transparent rounded-full animate-spin" />
    </div>
  ),
});

type ChatSidebarProps = {
  sendChatMessage: (message: string, recipientIds?: string[]) => boolean;
  requestFileDownload: (fileIds: string[], ownerId: string) => boolean;
  requestFileAvailability: (fileIds: string[], ownerId: string) => Promise<{ availableFileIds: string[]; unavailableFileIds: string[] } | null>;
  requestFileReupload: (fileIds: string[], ownerId: string, names: string[]) => boolean;
};

const ChatSidebar = ({
  sendChatMessage,
  requestFileDownload,
  requestFileAvailability,
  requestFileReupload,
}: ChatSidebarProps) => {
  const { showChat, toggleShowChat } = useChatStore();

  useEffect(() => {
    if (!showChat) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") toggleShowChat();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [showChat, toggleShowChat]);

  return (
    <div
      className={cn(
        !showChat && "hidden",
        "fixed inset-x-2 bottom-[calc(env(safe-area-inset-bottom)+5rem)] z-50 h-[min(68dvh,38rem)] max-h-[calc(100dvh-9.5rem-env(safe-area-inset-top)-env(safe-area-inset-bottom))] rounded-3xl sm:left-auto sm:right-4 sm:bottom-[calc(env(safe-area-inset-bottom)+5.75rem)] sm:w-[min(24rem,calc(100vw-2rem))] lg:static lg:inset-auto lg:z-auto lg:h-full lg:max-h-none lg:w-[22rem] xl:w-[24rem] lg:shrink-0 lg:rounded-none",
        "border border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900 transition-transform duration-200 lg:border-y-0 lg:border-r-0 lg:shadow-none",
        "shadow-2xl overflow-hidden opacity-100 pointer-events-auto"
      )}
    >
      <ChatComponent
        onSendMessage={sendChatMessage}
        onRequestFile={requestFileDownload}
        onCheckAvailability={requestFileAvailability}
        onRequestReupload={requestFileReupload}
        onClose={toggleShowChat}
      />
    </div>
  );
};

export default ChatSidebar;
