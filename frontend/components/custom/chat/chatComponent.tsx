"use client";

import { MessageSquare, Paperclip, Send, X } from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Input } from "../../ui/input";
import { Button } from "../../ui/button";
import { motion } from "framer-motion";
import { formatBytes } from "@/lib/utils";
import { useFileStore } from "@/lib/stores/fileStore";
import dynamic from "next/dynamic";

const MessagesContainer = dynamic(() => import("./messagesContainer"), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
    </div>
  ),
});

const AttachementsToSend = dynamic(() => import("./attachementsToSend"), {
  ssr: false,
  loading: () => null,
});

const MotionButton = motion(Button);

type ChatComponentProps = {
  onSendMessage: (message: string) => boolean;
  onRequestFile: (fileIds: string[], ownerId: string) => boolean;
  onClose?: () => void;
};

const ChatComponent = ({
  onSendMessage,
  onRequestFile,
  onClose,
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
    <div className="h-full flex flex-col text-stone-800 dark:text-stone-100">
      <div className="p-4 border-b border-stone-200/50 dark:border-stone-700/50">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold flex items-center text-stone-700 dark:text-stone-100">
            <MessageSquare className="w-4 h-4 mr-2" />
            Chat
          </h3>

          {onClose ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="sm:hidden h-9 w-9 rounded-xl"
              aria-label="Close chat"
            >
              <X className="h-4 w-4" />
            </Button>
          ) : null}
        </div>
      </div>

      <MessagesContainer onRequestFile={onRequestFile} />

      <div className="p-4 border-t border-stone-200/50 dark:border-stone-700/50 bg-white/80 dark:bg-stone-900/80">
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
            className="h-10 w-10 rounded-xl border border-stone-200/50 bg-white text-stone-600 transition hover:bg-stone-100 dark:border-stone-700/50 dark:bg-stone-800 dark:text-stone-200 dark:hover:bg-stone-700"
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          <Input
            value={chatMessage}
            onChange={(e) => setChatMessage(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Type a message..."
            className="flex-1 bg-white border-stone-200/50 text-stone-900 placeholder-stone-400 focus:border-amber-500 rounded-xl dark:bg-stone-800 dark:border-stone-700/50 dark:text-white dark:placeholder-stone-400"
          />
          <MotionButton
            onClick={handleSend}
            size="sm"
            className="bg-amber-500 hover:bg-amber-600 transition-colors text-white rounded-xl"
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
