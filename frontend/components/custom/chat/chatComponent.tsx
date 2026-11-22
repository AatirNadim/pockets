"use client";

import { Files, File as FileIcon, MessageSquare, Paperclip, Send, X, Download } from "lucide-react";
import React, { useCallback, useRef, useState } from "react";
import { Input } from "../../ui/input";
import { Button } from "../../ui/button";
import { formatBytes } from "@/lib/utils";
import { useFileStore } from "@/lib/stores/fileStore";
import { useChatStore } from "@/lib/stores/chatStore";
import { useUserStore } from "@/lib/stores/userStore";
import dynamic from "next/dynamic";
import { MAX_FILE_SIZE_MB_MULTIPLE_SEND, MAX_FILE_SIZE_SINGLE_SEND, MAX_QUEUED_FILES } from "@/lib/constants";
import { toast } from "sonner";

const MessagesContainer = dynamic(() => import("./messagesContainer"), { ssr: false });
const AttachementsToSend = dynamic(() => import("./attachementsToSend"), { ssr: false });

type ChatComponentProps = {
  onSendMessage: (message: string) => boolean;
  onRequestFile: (fileIds: string[], ownerId: string) => boolean;
  onClose?: () => void;
};

const ChatComponent = ({ onSendMessage, onRequestFile, onClose }: ChatComponentProps) => {
  const { receivedFiles, filesToBeSent, downloadProgress, addFiles, removeFile, getLocalFile } = useFileStore();
  const { chatMessages } = useChatStore();
  const { userId } = useUserStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [chatMessage, setChatMessage] = useState("");
  const [activeTab, setActiveTab] = useState<"chat" | "files">("chat");
  const sharedFiles = Array.from(new Map(chatMessages.flatMap((message) => (message.attachments ?? []).map((file) => [file.id, { file, sender: message.userName }] as const))).values());

  const handleSend = useCallback(() => {
    if (chatMessage.trim() && onSendMessage(chatMessage)) setChatMessage("");
  }, [chatMessage, onSendMessage]);
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
  const handleFileAction = (id: string, ownerId: string, name: string) => {
    const url = receivedFiles[id]?.url;
    const file = getLocalFile(id);
    const downloadUrl = url || (file ? URL.createObjectURL(file) : null);
    if (downloadUrl) {
      const anchor = document.createElement("a");
      anchor.href = downloadUrl;
      anchor.download = name;
      anchor.click();
      if (file) URL.revokeObjectURL(downloadUrl);
    } else onRequestFile([id], ownerId);
  };

  return <div className="flex h-full min-h-0 flex-col text-stone-800 dark:text-stone-100">
    <div className="flex items-center justify-between border-b border-stone-200 p-4 dark:border-stone-800">
      <div><h3 className="font-semibold">Room conversation</h3><p className="mt-0.5 text-xs text-stone-500">Messages and shared files</p></div>
      {onClose && <Button type="button" variant="ghost" size="sm" onClick={onClose} className="h-10 w-10 rounded-xl lg:hidden" aria-label="Close chat and files"><X size={18} /></Button>}
    </div>
    <div role="tablist" aria-label="Room conversation" className="grid grid-cols-2 gap-1 border-b border-stone-200 p-2 dark:border-stone-800">
      <button type="button" role="tab" aria-selected={activeTab === "chat"} onClick={() => setActiveTab("chat")} className={`flex min-h-10 items-center justify-center gap-2 rounded-lg text-sm font-medium ${activeTab === "chat" ? "bg-stone-100 text-stone-900 dark:bg-stone-800 dark:text-white" : "text-stone-500"}`}><MessageSquare size={16} />Chat</button>
      <button type="button" role="tab" aria-selected={activeTab === "files"} onClick={() => setActiveTab("files")} className={`flex min-h-10 items-center justify-center gap-2 rounded-lg text-sm font-medium ${activeTab === "files" ? "bg-stone-100 text-stone-900 dark:bg-stone-800 dark:text-white" : "text-stone-500"}`}><Files size={16} />Files <span className="text-xs">{sharedFiles.length}</span></button>
    </div>

    <div className={activeTab === "chat" ? "flex min-h-0 flex-1 flex-col" : "hidden"} role="tabpanel" aria-label="Chat messages">
      <MessagesContainer onRequestFile={onRequestFile} />
      <div className="border-t border-stone-200 bg-white p-3 dark:border-stone-800 dark:bg-stone-900">
        {filesToBeSent.length > 0 && <AttachementsToSend filesToBeSent={filesToBeSent} handleRemoveQueuedFile={removeFile} formatBytes={formatBytes} />}
        <div className="flex gap-2">
          <Button type="button" onClick={() => fileInputRef.current?.click()} variant="ghost" size="sm" className="h-11 w-11 shrink-0 rounded-xl border border-stone-200 dark:border-stone-700" aria-label="Attach files"><Paperclip size={17} /></Button>
          <Input value={chatMessage} onChange={(e) => setChatMessage(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }} placeholder="Type a message…" aria-label="Message" className="min-w-0 rounded-xl bg-white dark:bg-stone-800" />
          <Button onClick={handleSend} disabled={!chatMessage.trim()} className="h-11 w-11 shrink-0 rounded-xl bg-amber-600 text-white hover:bg-amber-700 dark:bg-amber-500 dark:text-stone-950" aria-label="Send message"><Send size={17} /></Button>
        </div>
      </div>
    </div>

    <section role="tabpanel" aria-label="Shared files" className={activeTab === "files" ? "flex-1 overflow-y-auto p-4" : "hidden"}>
      <p className="mb-4 text-sm text-stone-500 dark:text-stone-400">Recipients request a copy when a file is available.</p>
      {!sharedFiles.length ? <div className="rounded-xl border border-dashed border-stone-300 p-6 text-center text-sm text-stone-500 dark:border-stone-700">No files shared yet.</div> : <ul className="space-y-2">{sharedFiles.map(({ file, sender }) => {
        const local = file.ownerId === userId || filesToBeSent.some((entry) => entry.id === file.id);
        const ready = Boolean(receivedFiles[file.id]?.url);
        const progress = downloadProgress[file.id];
        const status = local ? "Available to room" : ready ? "Downloaded" : progress?.status === "requested" ? "Request sent" : progress?.status === "in-progress" ? "Downloading" : "Available to request";
        const percent = progress?.status === "in-progress" && progress.totalBytes ? Math.min(100, Math.round(progress.receivedBytes / progress.totalBytes * 100)) : 0;
        return <li key={file.id} className="rounded-xl border border-stone-200 bg-white p-3 dark:border-stone-800 dark:bg-stone-950"><div className="flex items-start gap-3"><FileIcon size={18} className="mt-0.5 shrink-0 text-amber-700 dark:text-amber-400" /><div className="min-w-0 flex-1"><p className="break-all text-sm font-medium">{file.name}</p><p className="mt-1 text-xs text-stone-500">{formatBytes(file.size)} · Shared by {sender || (local ? "You" : "participant")}</p><p className="mt-1 text-xs text-stone-500">{status}{progress?.status === "in-progress" ? ` · ${percent}%` : ""}</p>{progress?.status === "in-progress" && <progress className="mt-2 h-1.5 w-full accent-amber-600" max={100} value={percent} aria-label={`Downloading ${file.name}`} />}</div><Button size="sm" variant="secondary" className="min-h-10 shrink-0" disabled={!local && !ready && Boolean(progress)} onClick={() => handleFileAction(file.id, file.ownerId, file.name)} aria-label={`${local || ready ? "Download" : progress ? "Download pending" : "Request"} ${file.name}`}>{local || ready ? <><Download size={15} /><span className="ml-1">Download</span></> : progress ? "Pending" : "Request"}</Button></div></li>;
      })}</ul>}
    </section>
    <input ref={fileInputRef} type="file" className="hidden" multiple onChange={handleFileSelection} aria-label="Choose files to share" />
  </div>;
};

export default ChatComponent;
