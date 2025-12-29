"use client";

import { AttachmentState } from "@/lib/constants";
import { useChatStore } from "@/lib/stores/chatStore";
import { useFileStore } from "@/lib/stores/fileStore";
import { useUserStore } from "@/lib/stores/userStore";
import type { ChatMessage, FileAttachment } from "@pockets/shared";
import { cn, formatBytes, formatTimestamp, resolveSender } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { Download, Paperclip } from "lucide-react";
import React, { useCallback, useEffect, useRef } from "react";
import DownloadIndicator from "../downloadIndicator";

type MessagesContainerProps = {
  onRequestFile: (fileIds: string[], ownerId: string) => boolean;
};

const MessagesContainer = ({ onRequestFile }: MessagesContainerProps) => {
  const { chatMessages } = useChatStore();

  const { userId } = useUserStore();

  const { getReceivedFile, downloadProgress, getLocalFile, hasLocalFile } =
    useFileStore();

  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const downloadBlob = (url: string, name: string) => {
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = name;
    anchor.click();
  };

  const triggerLocalDownload = useCallback((file: File, name: string) => {
    const localUrl = URL.createObjectURL(file);
    downloadBlob(localUrl, name);
    URL.revokeObjectURL(localUrl);
  }, []);

  const deriveAttachmentState = useCallback(
    (attachment: FileAttachment): AttachmentState => {
      if (attachment.ownerId === userId || hasLocalFile(attachment.id)) {
        return AttachmentState.LOCAL;
      }

      const received = getReceivedFile(attachment.id);
      if (received?.url) {
        return AttachmentState.READY;
      }

      return AttachmentState.REMOTE;
    },
    [getReceivedFile, hasLocalFile, userId]
  );

  const downloadAllLocalFiles = useCallback(
    (attachments: FileAttachment[]) => {
      attachments.forEach((attachment) => {
        const state = deriveAttachmentState(attachment);
        if (state === AttachmentState.LOCAL) {
          const file = getLocalFile(attachment.id);
          if (file) {
            triggerLocalDownload(file, attachment.name);
          }
        } else if (state === AttachmentState.READY) {
          const received = getReceivedFile(attachment.id);
          if (received?.url) {
            downloadBlob(received.url, attachment.name);
          }
        }
      });
    },
    [deriveAttachmentState, getLocalFile, getReceivedFile, triggerLocalDownload]
  );

  const handleAttachmentAction = useCallback(
    (attachments: FileAttachment[]) => {
      const attachmentsToReceive = attachments.filter((attachment) => {
        const state = deriveAttachmentState(attachment);
        return state === AttachmentState.REMOTE;
      });

      const attachmentsToOpen = attachments.filter((attachment) => {
        const state = deriveAttachmentState(attachment);
        return state !== AttachmentState.REMOTE;
      });

      console.log("attachements total:", {
        attachmentsToOpen,
        attachmentsToReceive,
      });

      if (attachmentsToReceive.length === 0) {
        downloadAllLocalFiles(attachmentsToOpen);
      } else {
        onRequestFile(
          attachmentsToReceive.map((a) => a.id),
          attachmentsToReceive[0].ownerId
        );
      }
    },
    [deriveAttachmentState, downloadAllLocalFiles, onRequestFile]
  );

  const renderDownloadIndicator = useCallback(
    (attachmentId: string) => {
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
    },
    [downloadProgress]
  );

  return (
    <div
      ref={chatContainerRef}
      className="flex-1 overflow-y-auto p-4 space-y-3 bg-stone-50/60 dark:bg-stone-900/40"
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
                    ? "bg-amber-500 text-white rounded-br-sm"
                    : "bg-stone-100 text-stone-800 dark:bg-stone-800 dark:text-stone-100 rounded-bl-sm"
                )}
              >
                <div className="text-xs font-semibold uppercase tracking-wide opacity-70">
                  {resolveSender(
                    msg as ChatMessage & { user?: string },
                    userId || ""
                  )}
                </div>
                <div className="text-sm wrap-break-word whitespace-pre-wrap">
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
                          onClick={() => handleAttachmentAction([attachment])}
                          disabled={
                            state === AttachmentState.REMOTE && isDownloading
                          }
                          className={cn(
                            "w-full rounded-xl border border-white/40 bg-white/10 px-3 py-2 text-left text-xs backdrop-blur-sm transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50",
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
                    {msg.attachments.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleAttachmentAction(msg.attachments!)}
                        className="group flex w-full items-center justify-center gap-2 rounded-xl border border-white/40 bg-white/10 px-3 py-2 text-xs font-medium backdrop-blur-sm transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
                      >
                        <Download className="h-3.5 w-3.5 opacity-80 transition-opacity group-hover:opacity-100" />
                        <span>Download All</span>
                      </button>
                    )}
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
  );
};

export default MessagesContainer;
