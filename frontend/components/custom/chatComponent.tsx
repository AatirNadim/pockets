"use client";

import { MessageSquare, Send } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { useChatStore } from "../../lib/stores/chatStore";
import { Input } from "../ui/input";
import { Button } from "../ui/button";

const ChatComponent = () => {
  const { chatMessages, sendMessage } = useChatStore();
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [chatMessage, setChatMessage] = useState("");

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(chatMessage);
    }
  };

  return (
    <div className="h-full flex flex-col text-slate-800 dark:text-white">
      <div className="p-4 border-b border-slate-200 dark:border-white/10">
        <h3 className="font-semibold flex items-center text-slate-700 dark:text-white">
          <MessageSquare className="w-4 h-4 mr-2" />
          Chat
        </h3>
      </div>

      <div
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-3 bg-white/60 dark:bg-transparent"
      >
        {chatMessages.map((msg) => (
          <div
            key={msg.id}
            className={`${
              msg.user === "You" ? "ml-4" : msg.user === "System" ? "" : "mr-4"
            }`}
          >
            <div
              className={`rounded-lg p-3 shadow-sm ${
                msg.user === "You"
                  ? "bg-[#635bff] text-white ml-auto max-w-[80%]"
                  : msg.user === "System"
                  ? "bg-slate-100 text-slate-700 text-center text-sm dark:bg-gray-800 dark:text-gray-200"
                  : "bg-slate-100 text-slate-800 max-w-[80%] dark:bg-gray-800 dark:text-white"
              }`}
            >
              {msg.user !== "System" && (
                <div className="text-xs text-slate-600 dark:text-gray-300 mb-1">
                  {msg.user}
                </div>
              )}
              <div className="text-sm">{msg.message}</div>
              <div className="text-xs text-slate-500 dark:text-gray-400 mt-1">
                {msg.timestamp.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 border-t border-slate-200 dark:border-white/10 bg-white/80 dark:bg-transparent">
        <div className="flex space-x-2">
          <Input
            value={chatMessage}
            onChange={(e) => setChatMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            className="flex-1 bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-[#635bff] dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
          />
          <Button
            onClick={() => sendMessage(chatMessage)}
            size="sm"
            className="bg-[#635bff] hover:bg-[#544dc9] transition-colors text-white"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ChatComponent;
