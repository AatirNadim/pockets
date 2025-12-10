import { cn } from "@/lib/utils";
import React from "react";
import ChatComponent from "./chatComponent";
import { useChatStore } from "@/lib/stores/chatStore";

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
        "bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border border-slate-200 dark:border-white/10 transition-all duration-300 sm:border-l sm:border-t-0 sm:border-b-0 sm:border-r-0",
        "rounded-2xl sm:rounded-none shadow-xl sm:shadow-none mt-4 sm:mt-0 w-full max-h-full sm:max-h-none overflow-hidden sm:overflow-auto sm:w-80 opacity-100 pointer-events-auto"
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
