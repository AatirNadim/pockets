import React from "react";
import { Button } from "../ui/button";
import {
  Camera,
  Check,
  MessageSquare,
  Mic,
  MicOff,
  PhoneOff,
  Settings,
  Video,
  VideoOff,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useChatStore } from "@/lib/stores/chatStore";
import { useMediaStore } from "@/lib/stores/mediaStore";
import type { MediaDeviceOption } from "@/lib/stores/mediaStore";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type DeviceDropdownProps = {
  label: string;
  icon: React.ReactNode;
  devices: MediaDeviceOption[];
  selectedId: string | null;
  onSelect: (deviceId: string) => void | Promise<void>;
};

const DeviceDropdown = ({
  label,
  icon,
  devices,
  selectedId,
  onSelect,
}: DeviceDropdownProps) => {
  const activeLabel = devices.find(
    (device) => device.deviceId === selectedId
  )?.label;
  const isDisabled = devices.length === 0;
  const buttonLabel = activeLabel || `Select ${label}`;

  const handleSelect = (deviceId: string) => {
    return Promise.resolve(onSelect(deviceId));
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="lg"
          aria-label={buttonLabel}
          className={cn(
            "h-11 min-w-11 justify-center rounded-2xl px-2.5 text-sm font-medium sm:h-12 sm:min-w-0 sm:max-w-36 sm:justify-between sm:px-3.5 md:max-w-44 xl:max-w-52",
            isDisabled
              ? "cursor-not-allowed bg-stone-200 text-stone-600 opacity-50 dark:bg-stone-800 dark:text-stone-400"
              : "bg-stone-200/80 text-stone-800 hover:bg-stone-200 hover:text-stone-900 dark:bg-stone-800 dark:text-stone-200 dark:hover:bg-stone-700 dark:hover:text-white"
          )}
          disabled={isDisabled}
        >
          <span className="flex min-w-0 items-center gap-2">
            {icon}
            <span className="sr-only">{buttonLabel}</span>
            <span className="hidden truncate sm:inline">{buttonLabel}</span>
          </span>
          <svg
            className="hidden h-4 w-4 shrink-0 sm:inline"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="center"
        side="top"
        sideOffset={12}
        className="w-64 max-w-[calc(100vw-1.5rem)] rounded-2xl border-stone-200/50 dark:border-stone-700/50 bg-white/95 dark:bg-stone-900/95 backdrop-blur-xl"
      >
        <DropdownMenuLabel className="text-xs tracking-wide uppercase text-stone-500 dark:text-stone-400">
          {label}
        </DropdownMenuLabel>
        <div className="max-h-56 overflow-y-auto">
          {devices.length ? (
            devices.map((device) => (
              <DropdownMenuItem
                key={device.deviceId}
                onSelect={() => {
                  handleSelect(device.deviceId);
                }}
                className={cn(
                  "flex items-center justify-between gap-3 rounded-xl",
                  selectedId === device.deviceId && "text-amber-600 dark:text-amber-400"
                )}
              >
                <span className="truncate text-sm">{device.label}</span>
                {selectedId === device.deviceId && (
                  <Check className="h-4 w-4" />
                )}
              </DropdownMenuItem>
            ))
          ) : (
            <div className="px-2 py-3 text-sm text-stone-500 dark:text-stone-400">
              No devices detected
            </div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

type MediaControlProps = {
  cameras: MediaDeviceOption[];
  microphones: MediaDeviceOption[];
  selectedCameraId: string | null;
  selectedMicrophoneId: string | null;
  onCameraChange: (deviceId: string) => void | Promise<void>;
  onMicrophoneChange: (deviceId: string) => void | Promise<void>;
  onToggleMute: (nextMuted: boolean) => Promise<void>;
  onToggleVideo: (disabled: boolean) => Promise<void>;
  onToggleSpeaker: () => void;
  onLeave: () => void;
};

const MediaControl = ({
  cameras,
  microphones,
  selectedCameraId,
  selectedMicrophoneId,
  onCameraChange,
  onMicrophoneChange,
  onToggleMute,
  onToggleVideo,
  onToggleSpeaker,
  onLeave,
}: MediaControlProps) => {
  const { isVideoOff, isSpeakerOff, isMicrophoneMuted } =
    useMediaStore();
  const { showChat, toggleShowChat } = useChatStore();

  return (
    <div className="w-full shrink-0 border-t border-stone-200/70 bg-white/80 pb-[max(0.625rem,env(safe-area-inset-bottom))] backdrop-blur-xl dark:border-stone-700/50 dark:bg-stone-900/85 sm:pb-[max(0.875rem,env(safe-area-inset-bottom))]">
      <div aria-label="Call controls" className="flex flex-nowrap items-center justify-start gap-1.5 overflow-x-auto overscroll-x-contain px-2.5 py-2.5 [scrollbar-width:thin] min-[380px]:justify-center sm:flex-wrap sm:justify-center sm:gap-2.5 sm:px-4 sm:py-3.5 md:gap-3 lg:gap-4 lg:px-6 lg:py-4">
        <Button
          onClick={() => {
            onToggleMute(!isMicrophoneMuted).then(() => {
              console.log("toggle mute complete");
            });
          }}
          variant="ghost"
          size="lg"
          aria-label={isMicrophoneMuted ? "Turn microphone on" : "Turn microphone off"}
          aria-pressed={!isMicrophoneMuted}
          disabled={!microphones.length}
          className={`size-11 shrink-0 rounded-2xl transition-all duration-200 sm:size-12 ${
            isMicrophoneMuted
              ? "bg-rose-500 hover:bg-rose-600 text-white"
              : "bg-stone-200/80 hover:bg-stone-200 text-stone-800 hover:text-stone-900 dark:bg-stone-800 dark:hover:bg-stone-700 dark:text-stone-200 dark:hover:text-white"
          }`}
        >
          {isMicrophoneMuted ? (
            <MicOff className="w-5 h-5" />
          ) : (
            <Mic className="w-5 h-5" />
          )}
        </Button>

        <Button
          onClick={() => {
            onToggleVideo(!isVideoOff).then(() => {
              console.log("toggle video complete");
            });
          }}
          variant="ghost"
          size="lg"
          aria-label={isVideoOff ? "Turn camera on" : "Turn camera off"}
          aria-pressed={!isVideoOff}
          disabled={!cameras.length}
          className={`size-11 shrink-0 rounded-2xl transition-all duration-200 sm:size-12 ${
            isVideoOff
              ? "bg-rose-500 hover:bg-rose-600 text-white"
              : "bg-stone-200/80 hover:bg-stone-200 text-stone-800 hover:text-stone-900 dark:bg-stone-800 dark:hover:bg-stone-700 dark:text-stone-200 dark:hover:text-white"
          }`}
        >
          {isVideoOff ? (
            <VideoOff className="w-5 h-5" />
          ) : (
            <Video className="w-5 h-5" />
          )}
        </Button>

        <Button
          onClick={onToggleSpeaker}
          variant="ghost"
          size="lg"
          aria-label={isSpeakerOff ? "Turn speaker on" : "Turn speaker off"}
          aria-pressed={!isSpeakerOff}
          className={`size-11 shrink-0 rounded-2xl transition-all duration-200 sm:size-12 ${
            isSpeakerOff
              ? "bg-rose-500 hover:bg-rose-600 text-white"
              : "bg-stone-200/80 hover:bg-stone-200 text-stone-800 hover:text-stone-900 dark:bg-stone-800 dark:hover:bg-stone-700 dark:text-stone-200 dark:hover:text-white"
          }`}
        >
          {isSpeakerOff ? (
            <VolumeX className="w-5 h-5" />
          ) : (
            <Volume2 className="w-5 h-5" />
          )}
        </Button>

        <div className="hidden sm:block"><DeviceDropdown
          label="Camera"
          icon={<Camera className="w-4 h-4" />}
          devices={cameras}
          selectedId={selectedCameraId}
          onSelect={onCameraChange}
        /></div>

        <div className="hidden sm:block"><DeviceDropdown
          label="Microphone"
          icon={<Mic className="w-4 h-4" />}
          devices={microphones}
          selectedId={selectedMicrophoneId}
          onSelect={onMicrophoneChange}
        /></div>

        <div className="sm:hidden">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="ghost" size="lg" aria-label="Device settings" className="size-11 shrink-0 rounded-2xl bg-stone-200/80 text-stone-800 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-200 dark:hover:bg-stone-700">
                <Settings className="h-5 w-5" aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" side="top" sideOffset={12} className="max-h-[min(24rem,60dvh)] w-64 max-w-[calc(100vw-1.5rem)] overflow-y-auto rounded-2xl border-stone-200/50 bg-white/95 dark:border-stone-700/50 dark:bg-stone-900/95">
              {[
                { label: "Camera", devices: cameras, selectedId: selectedCameraId, onSelect: onCameraChange },
                { label: "Microphone", devices: microphones, selectedId: selectedMicrophoneId, onSelect: onMicrophoneChange },
              ].map(({ label, devices, selectedId, onSelect }) => (
                <div key={label} role="group" aria-label={label}>
                  <DropdownMenuLabel className="text-xs uppercase tracking-wide text-stone-500 dark:text-stone-400">{label}</DropdownMenuLabel>
                  {devices.length ? devices.map((device) => (
                    <DropdownMenuItem key={device.deviceId} onSelect={() => { void onSelect(device.deviceId); }} className={cn("flex items-center justify-between gap-3 rounded-xl", selectedId === device.deviceId && "text-amber-600 dark:text-amber-400")}>
                      <span className="truncate text-sm">{device.label}</span>
                      {selectedId === device.deviceId && <Check className="h-4 w-4 shrink-0" aria-label="Selected" />}
                    </DropdownMenuItem>
                  )) : <div className="px-2 py-3 text-sm text-stone-500 dark:text-stone-400">No devices detected</div>}
                </div>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <Button
          onClick={toggleShowChat}
          variant="ghost"
          size="lg"
          aria-label={showChat ? "Close chat and files" : "Open chat and files"}
          aria-pressed={showChat}
          className={`size-11 shrink-0 rounded-2xl transition-all duration-200 sm:size-12 ${
            showChat
              ? "bg-amber-600 hover:bg-amber-700 text-white dark:bg-amber-400 dark:text-stone-950 dark:hover:bg-amber-300"
              : "bg-stone-200/80 hover:bg-stone-200 text-stone-800 hover:text-stone-900 dark:bg-stone-800 dark:hover:bg-stone-700 dark:text-stone-200 dark:hover:text-white"
          }`}
        >
          <MessageSquare className="w-5 h-5" />
        </Button>

        <div className="mx-0.5 h-7 w-px shrink-0 bg-stone-300 dark:bg-stone-700 sm:mx-1.5 sm:h-8"></div>

        <Button
          onClick={onLeave}
          variant="ghost"
          size="lg"
          aria-label="Leave room"
          className="size-11 shrink-0 rounded-2xl bg-rose-500 text-white transition-all duration-200 transform hover:scale-105 hover:bg-rose-600 sm:size-12"
        >
          <PhoneOff className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
};

export default MediaControl;
