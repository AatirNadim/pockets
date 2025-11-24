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
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-white/10">
        <h3 className="font-semibold flex items-center">
          <MessageSquare className="w-4 h-4 mr-2" />
          Chat
        </h3>
      </div>

      <div
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-3"
      >
        {chatMessages.map((msg) => (
          <div
            key={msg.id}
            className={`${
              msg.user === "You" ? "ml-4" : msg.user === "System" ? "" : "mr-4"
            }`}
          >
            <div
              className={`rounded-lg p-3 ${
                msg.user === "You"
                  ? "bg-[#635bff] ml-auto max-w-[80%]"
                  : msg.user === "System"
                  ? "bg-gray-700 text-center text-sm"
                  : "bg-gray-700 max-w-[80%]"
              }`}
            >
              {msg.user !== "System" && (
                <div className="text-xs text-gray-300 mb-1">{msg.user}</div>
              )}
              <div className="text-sm">{msg.message}</div>
              <div className="text-xs text-gray-400 mt-1">
                {msg.timestamp.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 border-t border-white/10">
        <div className="flex space-x-2">
          <Input
            value={chatMessage}
            onChange={(e) => setChatMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            className="flex-1 bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-indigo-500"
          />
          <Button
            onClick={() => sendMessage(chatMessage)}
            size="sm"
            className="bg-[#635bff] hover:bg-[#544dc9] transition-colors"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ChatComponent;
