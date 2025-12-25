import { cn } from "@/lib/utils";
import React from "react";
import { useChatStore } from "@/lib/stores/chatStore";
import dynamic from "next/dynamic";

const ChatComponent = dynamic(() => import("./chatComponent"), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
    </div>
  ),
});

type ChatSidebarProps = {
  sendChatMessage: (message: string) => boolean;
  requestFileDownload: (fileId: string, ownerId: string) => boolean;
};

const ChatSidebar = ({
  sendChatMessage,
  requestFileDownload,
}: ChatSidebarProps) => {
  const { showChat } = useChatStore();

  return (
    <div
      className={cn(
        !showChat && "hidden",
        "bg-white/90 dark:bg-stone-900/90 backdrop-blur-xl border border-stone-200/50 dark:border-stone-700/50 transition-all duration-300 sm:border-l sm:border-t-0 sm:border-b-0 sm:border-r-0",
        "rounded-3xl sm:rounded-none shadow-xl sm:shadow-none mt-4 sm:mt-0 w-full max-h-full sm:max-h-none overflow-hidden sm:overflow-auto sm:w-80 opacity-100 pointer-events-auto"
      )}
    >
      <ChatComponent
        onSendMessage={sendChatMessage}
        onRequestFile={requestFileDownload}
      />
    </div>
  );
};

export default ChatSidebar;
