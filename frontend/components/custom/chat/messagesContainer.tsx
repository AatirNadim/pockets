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
import { clearDownloadDestination, describeSaveError, pickFileDestination, pickFolderDestinations, saveBlobToHandle, setDownloadDestination } from "@/lib/utils/fileSaving";
import { toast } from "sonner";
import type { SaveFileHandle } from "@/lib/utils/fileSaving";

const groupByOwner = <T extends { ownerId: string }>(files: T[]) => {
  const grouped = new Map<string, T[]>();
  for (const file of files) grouped.set(file.ownerId, [...(grouped.get(file.ownerId) ?? []), file]);
  return grouped;
};

type MessagesContainerProps = {
  onRequestFile: (fileIds: string[], ownerId: string) => boolean;
  onCheckAvailability: (fileIds: string[], ownerId: string) => Promise<{ availableFileIds: string[]; unavailableFileIds: string[] } | null>;
  onRequestReupload: (fileIds: string[], ownerId: string, names: string[]) => boolean;
  onPromptReupload: (files: Array<{ id: string; name: string }>, onFinish: (request: boolean) => void) => void;
};

const MessagesContainer = ({ onRequestFile, onCheckAvailability, onRequestReupload, onPromptReupload }: MessagesContainerProps) => {
  const { chatMessages } = useChatStore();

  const { userId } = useUserStore();

  const { downloadProgress, getLocalFile, hasLocalFile } = useFileStore();

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const actionBusyRef = useRef(false);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const deriveAttachmentState = useCallback(
    (attachment: FileAttachment): AttachmentState => {
      if (hasLocalFile(attachment.id)) {
        return AttachmentState.LOCAL;
      }

      return AttachmentState.REMOTE;
    },
    [hasLocalFile]
  );

  const saveAttachment = useCallback(async (attachment: FileAttachment) => {
    try {
      if (attachment.ownerId === userId && !getLocalFile(attachment.id)) {
        toast.info("This shared file has expired", { description: "Attach the file again to make it available to the room." });
        return;
      }
      const handle = await pickFileDestination(attachment.name);
      const state = deriveAttachmentState(attachment);
      const localFile = state === AttachmentState.LOCAL ? getLocalFile(attachment.id) : undefined;
      if (localFile) await saveBlobToHandle(localFile, handle);
      else if (attachment.ownerId === userId) {
        toast.info("This shared file has expired", { description: "Attach the file again to make it available to the room." });
        return;
      }
      else {
        setDownloadDestination(attachment.id, handle);
        const availability = await onCheckAvailability([attachment.id], attachment.ownerId);
        if (!availability) {
          clearDownloadDestination(attachment.id);
          throw new Error("The sender did not respond. Try again when they are available.");
        }
        if (availability.unavailableFileIds.length) {
          onPromptReupload([{ id: attachment.id, name: attachment.name }], (request) => {
            clearDownloadDestination(attachment.id);
            if (request) onRequestReupload([attachment.id], attachment.ownerId, [attachment.name]);
          });
          return;
        }
        if (!onRequestFile([attachment.id], attachment.ownerId)) {
          clearDownloadDestination(attachment.id);
          throw new Error("Could not send the download request to the peer.");
        }
        return;
      }
      toast.success(`Saved ${attachment.name}`);
    } catch (error) {
      toast.error("Could not save download", { description: describeSaveError(error) });
    }
  }, [deriveAttachmentState, getLocalFile, onRequestFile, onCheckAvailability, onPromptReupload, onRequestReupload, userId]);

  const handleAttachmentAction = useCallback(async (attachments: FileAttachment[]) => {
    if (actionBusyRef.current) return;
    const uniqueAttachments = Array.from(new Map(attachments.map((attachment) => [attachment.id, attachment])).values());
    if (uniqueAttachments.some((attachment) => downloadProgress[attachment.id])) return;
    actionBusyRef.current = true;
    if (uniqueAttachments.length === 1) {
      try {
        await saveAttachment(uniqueAttachments[0]);
      } finally {
        actionBusyRef.current = false;
      }
      return;
    }
    try {
      const destinations = await pickFolderDestinations(uniqueAttachments.map(({ id, name }) => ({ id, name })));
      const remoteByOwner = new Map<string, string[]>();
      const direct: Array<{ attachment: FileAttachment; handle: SaveFileHandle }> = [];
      const unavailable: Array<{ id: string; name: string; ownerId: string }> = [];
      for (const attachment of uniqueAttachments) {
        const handle = destinations.get(attachment.id);
        if (!handle) continue;
        const state = deriveAttachmentState(attachment);
        if (state === AttachmentState.REMOTE) {
          if (attachment.ownerId === userId) {
            unavailable.push({ id: attachment.id, name: attachment.name, ownerId: attachment.ownerId });
            continue;
          }
          setDownloadDestination(attachment.id, handle);
          remoteByOwner.set(attachment.ownerId, [...(remoteByOwner.get(attachment.ownerId) ?? []), attachment.id]);
          continue;
        }
        const file = state === AttachmentState.LOCAL ? getLocalFile(attachment.id) : undefined;
        if (file) direct.push({ attachment, handle });
      }

      const availabilityEntries = await Promise.all(Array.from(remoteByOwner, async ([ownerId, fileIds]) => [ownerId, fileIds, await onCheckAvailability(fileIds, ownerId)] as const));
      if (availabilityEntries.some(([, , result]) => !result)) {
        remoteByOwner.forEach((fileIds) => fileIds.forEach(clearDownloadDestination));
        throw new Error("A sender did not respond. No files were saved; try again when everyone is available.");
      }
      const availableByOwner = new Map<string, string[]>();
      for (const [ownerId, fileIds, result] of availabilityEntries) {
        if (!result) continue;
        availableByOwner.set(ownerId, result.availableFileIds);
        const missing = new Set(result.unavailableFileIds);
        uniqueAttachments.filter((file) => fileIds.includes(file.id) && missing.has(file.id)).forEach((file) => unavailable.push({ id: file.id, name: file.name, ownerId }));
      }

      const finish = async (askToReupload: boolean) => {
        if (askToReupload) {
          const requestable = unavailable.filter((file) => file.ownerId !== userId);
          for (const [ownerId, files] of groupByOwner(requestable)) {
            if (!onRequestReupload(files.map((file) => file.id), ownerId, files.map((file) => file.name))) {
              toast.error("Could not request files again", { description: "The request could not be sent to the file owner." });
            }
          }
        }
        if (unavailable.some((file) => file.ownerId === userId)) toast.info("Attach expired files again", { description: "Your own shared copy expired from room memory and must be selected again." });
        unavailable.forEach(({ id }) => clearDownloadDestination(id));
        const failedSaves: string[] = [];
        const expiredLocalFiles: string[] = [];
        for (const { attachment, handle } of direct) {
          const file = getLocalFile(attachment.id);
          if (!file) {
            expiredLocalFiles.push(attachment.name);
            continue;
          }
          try {
            await saveBlobToHandle(file, handle);
          } catch (error) {
            failedSaves.push(attachment.name);
            console.error(`Could not save ${attachment.name}`, error);
          }
        }
        if (expiredLocalFiles.length) toast.info("Attach expired files again", { description: expiredLocalFiles.join(", ") });
        if (failedSaves.length) toast.error("Some files could not be saved", { description: failedSaves.join(", ") });
        for (const [ownerId, fileIds] of availableByOwner) {
          fileIds.forEach((id) => { const handle = destinations.get(id); if (handle) setDownloadDestination(id, handle); });
          if (!onRequestFile(fileIds, ownerId)) {
            fileIds.forEach(clearDownloadDestination);
            toast.error("Could not request some files", { description: "The request could not be sent to a peer." });
          }
        }
        if (!availableByOwner.size && direct.length && !failedSaves.length) toast.success("Files saved to the selected folder");
      };

      const requestableUnavailable = unavailable.filter((file) => file.ownerId !== userId);
      if (requestableUnavailable.length) {
        const request = await new Promise<boolean>((resolve) => {
          onPromptReupload(requestableUnavailable.map(({ id, name }) => ({ id, name })), resolve);
        });
        await finish(request);
        return;
      }
      await finish(false);
    } catch (error) {
      toast.error("Could not save files", { description: describeSaveError(error) });
    } finally {
      actionBusyRef.current = false;
    }
  }, [deriveAttachmentState, downloadProgress, getLocalFile, onRequestFile, onCheckAvailability, onRequestReupload, onPromptReupload, saveAttachment, userId]);

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
                    ? "bg-amber-600 text-white rounded-br-sm"
                    : "bg-stone-200/80 text-stone-900 dark:bg-stone-800 dark:text-stone-100 rounded-bl-sm"
                )}
              >
                <div className="text-xs font-semibold uppercase tracking-wide opacity-75">
                  {resolveSender(
                    msg as ChatMessage & { user?: string },
                    userId || ""
                  )}
                </div>
                {msg.recipients?.length ? <span className={cn("mb-1 inline-flex cursor-help items-center gap-1 rounded-full px-2 py-0.5 text-[10px]", isOwnMessage ? "bg-white/15 text-white" : "bg-stone-300/70 text-stone-800 dark:bg-stone-700/70 dark:text-stone-100")} title={`Visible to: ${msg.recipients.map((recipient) => recipient.userName).join(", ")}`} aria-label={`Private message visible to ${msg.recipients.map((recipient) => recipient.userName).join(", ")}`}><span aria-hidden="true">◉</span> {msg.recipients.length === 1 ? "Private" : `${msg.recipients.length} recipients`}</span> : null}
                <div className="text-sm wrap-break-word whitespace-pre-wrap">
                  {msg.message}
                </div>
                {msg.attachments?.length ? (
                  <div className="mt-2 space-y-1">
                    {msg.attachments.map((attachment) => {
                      const state = deriveAttachmentState(attachment);
                      const tracker = downloadProgress[attachment.id];
                      const isDownloading = Boolean(tracker);
                      const expired = attachment.ownerId === userId && state === AttachmentState.REMOTE;
                      const label =
                        state === AttachmentState.LOCAL
                          ? "Open"
                          : expired
                          ? "Expired"
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
                            state === AttachmentState.REMOTE && (isDownloading || expired)
                          }
                          className={cn(
                            "w-full rounded-xl border px-3 py-2 text-left text-xs transition focus-visible:outline-none focus-visible:ring-2",
                            isOwnMessage
                              ? "border-white/30 bg-white/15 hover:bg-white/25 focus-visible:ring-white/60"
                              : "border-stone-300/80 bg-white/80 text-stone-900 hover:bg-white focus-visible:ring-amber-600 dark:border-stone-700 dark:bg-stone-900/70 dark:text-stone-100 dark:hover:bg-stone-900 dark:focus-visible:ring-amber-400",
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
                        disabled={msg.attachments.some((attachment) => Boolean(downloadProgress[attachment.id]))}
                        className={cn(
                          "group flex w-full items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50",
                          isOwnMessage
                            ? "border-white/30 bg-white/15 hover:bg-white/25 focus-visible:ring-white/60 disabled:hover:bg-white/15"
                            : "border-stone-300/80 bg-white/80 text-stone-900 hover:bg-white focus-visible:ring-amber-600 disabled:hover:bg-white/80 dark:border-stone-700 dark:bg-stone-900/70 dark:text-stone-100 dark:hover:bg-stone-900 dark:focus-visible:ring-amber-400 dark:disabled:hover:bg-stone-900/70"
                        )}
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
