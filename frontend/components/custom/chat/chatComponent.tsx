"use client";

import { Files, File as FileIcon, MessageSquare, Paperclip, Send, X, Download, Users } from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Input } from "../../ui/input";
import { Button } from "../../ui/button";
import { formatBytes } from "@/lib/utils";
import { useFileStore } from "@/lib/stores/fileStore";
import { useChatStore } from "@/lib/stores/chatStore";
import { useUserStore } from "@/lib/stores/userStore";
import { useConnectionStore } from "@/lib/stores/connectionStore";
import dynamic from "next/dynamic";
import { MAX_FILE_SIZE_MB_MULTIPLE_SEND, MAX_FILE_SIZE_SINGLE_SEND, MAX_QUEUED_FILES } from "@/lib/constants";
import { toast } from "sonner";
import { clearDownloadDestination, describeSaveError, pickFileDestination, saveBlobToHandle, setDownloadDestination } from "@/lib/utils/fileSaving";
import { ReuploadRequestDialog } from "./reuploadRequestDialog";

type AvailabilityResult = { availableFileIds: string[]; unavailableFileIds: string[] } | null;

const MessagesContainer = dynamic(() => import("./messagesContainer"), { ssr: false });
const AttachementsToSend = dynamic(() => import("./attachementsToSend"), { ssr: false });

type ChatComponentProps = {
  onSendMessage: (message: string, recipientIds?: string[]) => boolean;
  onRequestFile: (fileIds: string[], ownerId: string) => boolean;
  onCheckAvailability: (fileIds: string[], ownerId: string) => Promise<AvailabilityResult>;
  onRequestReupload: (fileIds: string[], ownerId: string, names: string[]) => boolean;
  onClose?: () => void;
};

const ChatComponent = ({ onSendMessage, onRequestFile, onCheckAvailability, onRequestReupload, onClose }: ChatComponentProps) => {
  const { filesToBeSent, downloadProgress, addFiles, removeFile, getLocalFile } = useFileStore();
  const { chatMessages } = useChatStore();
  const { userId } = useUserStore();
  const remoteUsers = useUserStore((state) => state.remoteUsers);
  const peers = useConnectionStore((state) => state.peers);
  const [recipientIds, setRecipientIds] = useState<string[]>([]);
  const connectedPeople = Object.entries(remoteUsers).filter(([id]) => peers[id]?.phase === "connected");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileActionBusyRef = useRef(false);
  const [chatMessage, setChatMessage] = useState("");
  const [activeTab, setActiveTab] = useState<"chat" | "files">("chat");
  const [reuploadPrompt, setReuploadPrompt] = useState<{ files: Array<{ id: string; name: string }>; onFinish: (request: boolean) => void } | null>(null);
  const sharedFiles = Array.from(new Map(chatMessages.flatMap((message) => (message.attachments ?? []).map((file) => [file.id, { file, sender: message.userName }] as const))).values());
  const promptForReupload = useCallback((files: Array<{ id: string; name: string }>, onFinish: (request: boolean) => void) => {
    setReuploadPrompt((current) => {
      if (!current) return { files, onFinish };
      const currentIds = new Set(current.files.map((file) => file.id));
      const additions = files.filter((file) => !currentIds.has(file.id));
      if (!additions.length) return current;
      return {
        files: [...current.files, ...additions],
        onFinish: (request) => { current.onFinish(request); onFinish(request); },
      };
    });
  }, []);

  useEffect(() => {
    const handleUnavailable = (event: Event) => {
      const detail = (event as CustomEvent<{ fileIds: string[]; availableFileIds: string[]; ownerId: string }>).detail;
      if (!detail?.ownerId || !Array.isArray(detail.fileIds)) return;
      const unavailable = detail.fileIds.filter((id) => !detail.availableFileIds?.includes(id));
      const files = useChatStore.getState().chatMessages.flatMap((message) => message.attachments ?? [])
        .filter((file) => unavailable.includes(file.id))
        .map((file) => ({ id: file.id, name: file.name }));
      if (!files.length) {
        if (detail.availableFileIds?.length) onRequestFile(detail.availableFileIds, detail.ownerId);
        return;
      }
      promptForReupload(files, (request) => {
        if (request) onRequestReupload(files.map((file) => file.id), detail.ownerId, files.map((file) => file.name));
        if (detail.availableFileIds.length) onRequestFile(detail.availableFileIds, detail.ownerId);
      });
    };
    window.addEventListener("file-download-unavailable", handleUnavailable);
    return () => window.removeEventListener("file-download-unavailable", handleUnavailable);
  }, [onRequestFile, onRequestReupload, promptForReupload]);

  const handleSend = useCallback(() => {
    if (chatMessage.trim() && onSendMessage(chatMessage, recipientIds)) setChatMessage("");
  }, [chatMessage, onSendMessage, recipientIds]);
  const handleFileSelection = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files ?? []).filter((file) => !filesToBeSent.some((entry) => entry.file.name === file.name && entry.file.size === file.size));
    const availableSlots = Math.max(0, MAX_QUEUED_FILES - filesToBeSent.length);
    const accepted = selected.slice(0, availableSlots);
    const candidate = [...filesToBeSent.map((entry) => entry.file), ...accepted];
    const MB = 1024 * 1024;
    const error = candidate.length === 1 && candidate[0].size > MAX_FILE_SIZE_SINGLE_SEND * MB
      ? `A single file can be up to ${MAX_FILE_SIZE_SINGLE_SEND} MB.`
      : candidate.length > 1 && candidate.some((file) => file.size > MAX_FILE_SIZE_MB_MULTIPLE_SEND * MB)
      ? `When sharing multiple files, each file must be ${MAX_FILE_SIZE_MB_MULTIPLE_SEND} MB or smaller.`
      : null;
    if (error) toast.error("File cannot be queued", { description: error });
    else if (accepted.length) addFiles(accepted);
    if (selected.length > accepted.length && !error) toast.warning("Queue limit reached", { description: `The queue holds up to ${MAX_QUEUED_FILES} files. Added the available files.` });
    if (!selected.length && (event.target.files?.length ?? 0) > 0) toast.info("Those files are already queued.");
    event.target.value = "";
  }, [addFiles, filesToBeSent]);
  const handleFileAction = async (id: string, ownerId: string, name: string) => {
    if (fileActionBusyRef.current) return;
    fileActionBusyRef.current = true;
    const file = getLocalFile(id);
    if (ownerId === userId && !file) {
      toast.info("This shared file has expired", { description: "Attach the file again to make it available to the room." });
      fileActionBusyRef.current = false;
      return;
    }
    try {
      const handle = await pickFileDestination(name);
      const currentFile = getLocalFile(id);
      if (currentFile) await saveBlobToHandle(currentFile, handle);
      else if (ownerId === userId) {
        toast.info("This shared file has expired", { description: "Attach the file again to make it available to the room." });
        return;
      }
      else {
        setDownloadDestination(id, handle);
        const availability = await onCheckAvailability([id], ownerId);
        if (!availability) {
          clearDownloadDestination(id);
          throw new Error("The sender did not respond. Try again when they are available.");
        }
        if (availability.unavailableFileIds.length) {
          const request = await new Promise<boolean>((resolve) => promptForReupload([{ id, name }], resolve));
          clearDownloadDestination(id);
          if (request) onRequestReupload([id], ownerId, [name]);
          return;
        }
        if (!onRequestFile([id], ownerId)) {
          clearDownloadDestination(id);
          throw new Error("Could not send the download request to the peer.");
        }
        return;
      }
      toast.success(`Saved ${name}`);
    } catch (error) {
      toast.error("Could not save download", { description: describeSaveError(error) });
    } finally {
      fileActionBusyRef.current = false;
    }
  };

  return <div className="flex h-full min-h-0 flex-col text-stone-800 dark:text-stone-100">
    <div className="flex items-center justify-between border-b border-stone-200 p-4 dark:border-stone-800">
      <div><h2 className="font-semibold tracking-tight">Room conversation</h2><p className="mt-0.5 text-xs text-stone-600 dark:text-stone-400">Messages and shared files</p></div>
      {onClose && <Button type="button" variant="ghost" size="icon" onClick={onClose} className="size-11 rounded-xl lg:hidden" aria-label="Close chat and files"><X size={18} /></Button>}
    </div>
    <div role="tablist" aria-label="Room conversation" className="grid grid-cols-2 gap-1 border-b border-stone-200 p-2 dark:border-stone-800">
      <button type="button" role="tab" aria-selected={activeTab === "chat"} onClick={() => setActiveTab("chat")} className={`flex min-h-11 items-center justify-center gap-2 rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 dark:focus-visible:ring-amber-400 ${activeTab === "chat" ? "bg-stone-200/80 text-stone-900 dark:bg-stone-800 dark:text-white" : "text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100"}`}><MessageSquare size={16} />Chat</button>
      <button type="button" role="tab" aria-selected={activeTab === "files"} onClick={() => setActiveTab("files")} className={`flex min-h-11 items-center justify-center gap-2 rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 dark:focus-visible:ring-amber-400 ${activeTab === "files" ? "bg-stone-200/80 text-stone-900 dark:bg-stone-800 dark:text-white" : "text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100"}`}><Files size={16} />Files <span className="text-xs">{sharedFiles.length}</span></button>
    </div>

    <div className={activeTab === "chat" ? "flex min-h-0 flex-1 flex-col" : "hidden"} role="tabpanel" aria-label="Chat messages">
      <MessagesContainer onRequestFile={onRequestFile} onCheckAvailability={onCheckAvailability} onRequestReupload={onRequestReupload} onPromptReupload={promptForReupload} />
      <div className="border-t border-stone-200 bg-white p-3 dark:border-stone-800 dark:bg-stone-900">
        {filesToBeSent.length > 0 && <AttachementsToSend filesToBeSent={filesToBeSent} handleRemoveQueuedFile={removeFile} formatBytes={formatBytes} />}
        <details className="group mb-2">
          <summary className="flex min-h-11 w-fit cursor-pointer list-none items-center gap-2 rounded-lg px-2 text-xs font-medium text-stone-600 hover:bg-stone-200/70 dark:text-stone-300 dark:hover:bg-stone-800">
            <Users size={15} />
            {recipientIds.length ? `Only ${recipientIds.length} ${recipientIds.length === 1 ? "person" : "people"}` : "Everyone in the room"}
            <span aria-hidden="true" className="text-stone-600 dark:text-stone-400">▾</span>
          </summary>
          <div className="mb-2 max-h-40 overflow-y-auto rounded-lg border border-stone-200 bg-white p-2 shadow-sm dark:border-stone-700 dark:bg-stone-900">
            {connectedPeople.length === 0 ? <p className="px-2 py-1 text-xs text-stone-600 dark:text-stone-400">No other connected participants.</p> : connectedPeople.map(([id, person]) => (
              <label key={id} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg px-2 text-sm hover:bg-stone-200/60 dark:hover:bg-stone-800">
                <input type="checkbox" checked={recipientIds.includes(id)} onChange={(event) => setRecipientIds((current) => event.target.checked ? [...current, id] : current.filter((item) => item !== id))} className="accent-amber-600" />
                <span>{person.name}</span>
              </label>
            ))}
            <p className="px-2 pt-1 text-[11px] text-stone-600 dark:text-stone-400">No one selected sends to everyone.</p>
          </div>
        </details>
        <div className="flex gap-2">
          <Button type="button" onClick={() => fileInputRef.current?.click()} variant="ghost" size="icon" className="h-11 w-11 shrink-0 rounded-xl border border-stone-200 dark:border-stone-700" aria-label="Attach files"><Paperclip size={17} /></Button>
          <Input value={chatMessage} onChange={(e) => setChatMessage(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }} placeholder="Type a message…" aria-label="Message" className="min-w-0 rounded-xl bg-white dark:bg-stone-800" />
          <Button onClick={handleSend} disabled={!chatMessage.trim()} className="h-11 w-11 shrink-0 rounded-xl bg-amber-600 text-white hover:bg-amber-700 dark:bg-amber-400 dark:text-stone-950 dark:hover:bg-amber-300" aria-label="Send message"><Send size={17} /></Button>
        </div>
      </div>
    </div>

    <section role="tabpanel" aria-label="Shared files" className={activeTab === "files" ? "flex-1 overflow-y-auto p-4" : "hidden"}>
      <p className="mb-4 text-sm text-stone-600 dark:text-stone-400">Shared files stay available for 10 minutes. Availability is checked before each download.</p>
      {!sharedFiles.length ? <div className="rounded-xl border border-dashed border-stone-300 p-6 text-center text-sm text-stone-600 dark:border-stone-700 dark:text-stone-400">No files shared yet.</div> : <ul className="space-y-2">{sharedFiles.map(({ file, sender }) => {
        const local = Boolean(getLocalFile(file.id)) || filesToBeSent.some((entry) => entry.id === file.id);
        const progress = downloadProgress[file.id];
        const expired = file.ownerId === userId && !local;
        const status = local ? "Available to room" : expired ? "Expired · attach again" : progress?.status === "requested" ? "Request sent" : progress?.status === "in-progress" ? "Downloading" : "Available to request";
        const percent = progress?.status === "in-progress" && progress.totalBytes ? Math.min(100, Math.round(progress.receivedBytes / progress.totalBytes * 100)) : 0;
        return <li key={file.id} className="rounded-xl border border-stone-200 bg-white p-3 dark:border-stone-800 dark:bg-stone-950"><div className="flex items-start gap-3"><FileIcon size={18} className="mt-0.5 shrink-0 text-amber-700 dark:text-amber-400" /><div className="min-w-0 flex-1"><p className="break-all text-sm font-medium">{file.name}</p><p className="mt-1 text-xs text-stone-600 dark:text-stone-400">{formatBytes(file.size)} · Shared by {sender || (local ? "You" : "participant")}</p><p className="mt-1 text-xs text-stone-600 dark:text-stone-400">{status}{progress?.status === "in-progress" ? ` · ${percent}%` : ""}</p>{progress?.status === "in-progress" && <progress className="mt-2 h-1.5 w-full accent-amber-600" max={100} value={percent} aria-label={`Downloading ${file.name}`} />}</div><Button size="lg" variant="secondary" className="min-h-11 shrink-0 px-3" disabled={expired || (!local && Boolean(progress))} onClick={() => handleFileAction(file.id, file.ownerId, file.name)} aria-label={`${expired ? "Expired" : local ? "Download" : progress ? "Download pending" : "Request"} ${file.name}`}>{local ? <><Download size={15} /><span className="ml-1">Download</span></> : expired ? "Expired" : progress ? "Pending" : "Request"}</Button></div></li>;
      })}</ul>}
    </section>
    <input ref={fileInputRef} type="file" className="hidden" multiple onChange={handleFileSelection} aria-label="Choose files to share" />
    <ReuploadRequestDialog files={reuploadPrompt?.files ?? []} open={Boolean(reuploadPrompt)} onConfirm={() => { reuploadPrompt?.onFinish(true); setReuploadPrompt(null); }} onCancel={() => { reuploadPrompt?.onFinish(false); setReuploadPrompt(null); }} />
  </div>;
};

export default ChatComponent;
