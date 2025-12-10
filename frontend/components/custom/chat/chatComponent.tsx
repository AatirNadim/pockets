"use client";

import { Download, MessageSquare, Paperclip, Send, X } from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useChatStore } from "../../../lib/stores/chatStore";
import { useUserStore } from "@/lib/stores/userStore";
import { Input } from "../../ui/input";
import { Button } from "../../ui/button";
import { AnimatePresence, motion } from "framer-motion";
import { cn, formatBytes, formatTimestamp, resolveSender } from "@/lib/utils";
import { ChatMessage, FileAttachment } from "@/lib/types";
import { useFileStore } from "@/lib/stores/fileStore";
import DownloadIndicator from "../downloadIndicator";
import { AttachmentState } from "@/lib/constants";

const MotionButton = motion(Button);

type ChatComponentProps = {
  onSendMessage: (message: string) => boolean;
  onRequestFile: (fileId: string, ownerId: string) => boolean;
};

const ChatComponent = ({
  onSendMessage,
  onRequestFile,
}: ChatComponentProps) => {
  const { chatMessages } = useChatStore();
  const { userId } = useUserStore();
  const {
    receivedFiles,
    getLocalFile,
    getReceivedFile,
    hasLocalFile,
    filesToBeSent,
    addFiles,
    removeFile,
    downloadProgress,
  } = useFileStore();
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [chatMessage, setChatMessage] = useState("");

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);

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

  const downloadBlob = (url: string, name: string) => {
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = name;
    anchor.click();
  };

  const triggerLocalDownload = (file: File, name: string) => {
    const localUrl = URL.createObjectURL(file);
    downloadBlob(localUrl, name);
    URL.revokeObjectURL(localUrl);
  };

  const deriveAttachmentState = (
    attachment: FileAttachment
  ): AttachmentState => {
    if (attachment.ownerId === userId || hasLocalFile(attachment.id)) {
      return AttachmentState.LOCAL;
    }

    const received = getReceivedFile(attachment.id);
    if (received?.url) {
      return AttachmentState.READY;
    }

    return AttachmentState.REMOTE;
  };

  const handleAttachmentAction = (attachment: FileAttachment) => {
    const state = deriveAttachmentState(attachment);
    const progressTracker = downloadProgress[attachment.id];

    if (progressTracker && state === AttachmentState.REMOTE) {
      return;
    }

    if (state === AttachmentState.LOCAL) {
      const file = getLocalFile(attachment.id);
      if (file) {
        triggerLocalDownload(file, attachment.name);
      }
      return;
    }

    if (state === AttachmentState.READY) {
      const received = getReceivedFile(attachment.id);
      if (received?.url) {
        downloadBlob(received.url, attachment.name);
      }
      return;
    }

    onRequestFile(attachment.id, attachment.ownerId);
  };

  const renderDownloadIndicator = (attachmentId: string) => {
    const tracker = downloadProgress[attachmentId];
    if (!tracker) {
      return <Download className="h-3.5 w-3.5 opacity-80" />;
    }

    const total = tracker.totalBytes ?? 1;
    const progress =
      tracker.status === "requested"
        ? 0
        : Math.min(1, tracker.receivedBytes / total);
    const radius = 7;
    const circumference = 2 * Math.PI * radius;
    const dashOffset = circumference * (1 - progress);

    return <DownloadIndicator radius={radius} dashOffset={dashOffset} />;
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
        <AnimatePresence initial={false}>
          {chatMessages.map((msg) => {
            const derivedUserId = (msg as Partial<ChatMessage>).userId;
            const legacyUserValue = (msg as { user?: string }).user;
            const isOwnMessage = Boolean(
              (derivedUserId && userId && derivedUserId === userId) ||
                (!derivedUserId && legacyUserValue === "You")
            );

            return (
              <motion.div
                key={msg.id}
                className={cn(
                  "flex w-full",
                  isOwnMessage ? "justify-end" : "justify-start"
                )}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                layout
              >
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-4 py-2 shadow-sm",
                    isOwnMessage
                      ? "bg-[#635bff] text-white rounded-br-sm"
                      : "bg-gray-100 text-slate-800 dark:bg-gray-800 dark:text-gray-100 rounded-bl-sm"
                  )}
                >
                  <div className="text-xs font-semibold uppercase tracking-wide opacity-70">
                    {resolveSender(
                      msg as ChatMessage & { user?: string },
                      userId || ""
                    )}
                  </div>
                  <div className="text-sm break-words whitespace-pre-wrap">
                    {msg.message}
                  </div>
                  {msg.attachments?.length ? (
                    <div className="mt-2 space-y-1">
                      {msg.attachments.map((attachment) => {
                        const state = deriveAttachmentState(attachment);
                        const tracker = downloadProgress[attachment.id];
                        const isDownloading = Boolean(tracker);
                        const label =
                          state === AttachmentState.LOCAL
                            ? "Open"
                            : state === AttachmentState.READY
                            ? "Download"
                            : isDownloading
                            ? "Downloading"
                            : "Request";
                        const total = tracker?.totalBytes ?? 1;
                        const percent = tracker
                          ? tracker.status === "requested"
                            ? 0
                            : Math.min(
                                100,
                                Math.round(
                                  (tracker.receivedBytes / total) * 100 || 0
                                )
                              )
                          : 0;

                        return (
                          <button
                            key={attachment.id}
                            type="button"
                            onClick={() => handleAttachmentAction(attachment)}
                            disabled={
                              state === AttachmentState.REMOTE && isDownloading
                            }
                            className={cn(
                              "w-full rounded-xl border border-white/40 bg-white/10 px-3 py-2 text-left text-xs backdrop-blur transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50",
                              state === AttachmentState.REMOTE &&
                                isDownloading &&
                                "cursor-not-allowed opacity-80"
                            )}
                          >
                            <div className="flex items-center gap-2">
                              <Paperclip className="h-3.5 w-3.5" />
                              <div className="flex-1 truncate text-[11px] font-medium">
                                {attachment.name}
                              </div>
                              <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide">
                                {state === AttachmentState.REMOTE &&
                                isDownloading ? (
                                  <>
                                    {renderDownloadIndicator(attachment.id)}
                                    <span>{percent}%</span>
                                  </>
                                ) : (
                                  <Download className="h-3.5 w-3.5 opacity-80" />
                                )}
                              </div>
                            </div>
                            <div className="mt-1 flex items-center justify-between text-[10px] uppercase tracking-wide opacity-70">
                              <span>{formatBytes(attachment.size)}</span>
                              <span>{label}</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ) : null}
                  <div className="text-[10px] mt-1 opacity-80">
                    {formatTimestamp(msg.timestamp)}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      <div className="p-4 border-t border-slate-200 dark:border-white/10 bg-white/80 dark:bg-transparent">
        {filesToBeSent.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {filesToBeSent.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center gap-2 rounded-full bg-slate-200/70 px-3 py-1 text-xs text-slate-700 dark:bg-white/10 dark:text-gray-200"
              >
                <div className="max-w-[140px] truncate font-medium">
                  {entry.file.name}
                </div>
                <span className="text-[10px] uppercase tracking-wide opacity-70">
                  {formatBytes(entry.file.size)}
                </span>
                <button
                  type="button"
                  onClick={() => handleRemoveQueuedFile(entry.id)}
                  className="rounded-full bg-white/50 p-1 text-slate-600 transition hover:bg-white hover:text-slate-900 dark:bg-white/10 dark:text-gray-200 dark:hover:bg-white/20"
                  aria-label="Remove file"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
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
