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
  requestFileDownload: (fileIds: string[], ownerId: string) => boolean;
};

const ChatSidebar = ({
  sendChatMessage,
  requestFileDownload,
}: ChatSidebarProps) => {
  const { showChat, toggleShowChat } = useChatStore();

  return (
    <div
      className={cn(
        !showChat && "hidden",
        "fixed inset-0 z-50 h-dvh w-screen sm:static sm:z-auto sm:h-full sm:w-80",
        "bg-white/90 dark:bg-stone-900/90 backdrop-blur-xl border border-stone-200/50 dark:border-stone-700/50 transition-all duration-300 sm:border-l sm:border-t-0 sm:border-b-0 sm:border-r-0",
        "rounded-none sm:rounded-none shadow-xl sm:shadow-none sm:mt-0 overflow-hidden opacity-100 pointer-events-auto"
      )}
    >
      <ChatComponent
        onSendMessage={sendChatMessage}
        onRequestFile={requestFileDownload}
        onClose={toggleShowChat}
      />
    </div>
  );
};

export default ChatSidebar;
