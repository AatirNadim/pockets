"use client";

import { MessageSquare, Paperclip, Send } from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Input } from "../../ui/input";
import { Button } from "../../ui/button";
import { motion } from "framer-motion";
import { formatBytes } from "@/lib/utils";
import { useFileStore } from "@/lib/stores/fileStore";
import AttachementsToSend from "./attachementsToSend";
import MessagesContainer from "./messagesContainer";

const MotionButton = motion(Button);

type ChatComponentProps = {
  onSendMessage: (message: string) => boolean;
  onRequestFile: (fileId: string, ownerId: string) => boolean;
};

const ChatComponent = ({
  onSendMessage,
  onRequestFile,
}: ChatComponentProps) => {
  const { receivedFiles, filesToBeSent, addFiles, removeFile } = useFileStore();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [chatMessage, setChatMessage] = useState("");

  useEffect(() => {
    console.log("Updated received files:", receivedFiles);
  }, [receivedFiles]);

  const handleSend = useCallback(() => {
    if (!chatMessage.trim()) {
      return;
    }
    const sent = onSendMessage(chatMessage);
    if (sent) {
      setChatMessage("");
    }
  }, [chatMessage, onSendMessage]);

  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const handleAttachClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelection = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = Array.from(event.target.files ?? []);
      if (selectedFiles.length) {
        addFiles(selectedFiles);
      }
      event.target.value = "";
    },
    [addFiles]
  );

  const handleRemoveQueuedFile = useCallback(
    (fileId: string) => {
      removeFile(fileId);
    },
    [removeFile]
  );

  return (
    <div className="h-full flex flex-col text-slate-800 dark:text-white">
      <div className="p-4 border-b border-slate-200 dark:border-white/10">
        <h3 className="font-semibold flex items-center text-slate-700 dark:text-white">
          <MessageSquare className="w-4 h-4 mr-2" />
          Chat
        </h3>
      </div>

      <MessagesContainer onRequestFile={onRequestFile} />

      <div className="p-4 border-t border-slate-200 dark:border-white/10 bg-white/80 dark:bg-transparent">
        {filesToBeSent.length > 0 && (
          <AttachementsToSend
            filesToBeSent={filesToBeSent}
            handleRemoveQueuedFile={handleRemoveQueuedFile}
            formatBytes={formatBytes}
          />
        )}
        <div className="flex space-x-2">
          <Button
            type="button"
            onClick={handleAttachClick}
            variant="ghost"
            size="sm"
            className="h-10 w-10 rounded-full border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-100 dark:border-white/10 dark:bg-gray-800 dark:text-gray-200"
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          <Input
            value={chatMessage}
            onChange={(e) => setChatMessage(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Type a message..."
            className="flex-1 bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-[#635bff] dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
          />
          <MotionButton
            onClick={handleSend}
            size="sm"
            className="bg-[#635bff] hover:bg-[#544dc9] transition-colors text-white"
            disabled={!chatMessage.trim()}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Send className="w-4 h-4" />
          </MotionButton>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          multiple
          onChange={handleFileSelection}
        />
      </div>
    </div>
  );
};

export default ChatComponent;
