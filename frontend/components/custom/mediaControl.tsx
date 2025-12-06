import React, { useState } from "react";
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
          className={cn(
            "min-w-[160px] justify-between rounded-full px-4 text-sm font-medium",
            isDisabled
              ? "cursor-not-allowed bg-slate-200 text-slate-500 opacity-50 dark:bg-white/5 dark:text-gray-500"
              : "bg-slate-200 text-slate-700 hover:bg-slate-300 hover:text-slate-900 dark:bg-white/10 dark:text-gray-300 dark:hover:bg-white/20 dark:hover:text-white"
          )}
          disabled={isDisabled}
        >
          <span className="flex items-center gap-2">
            {icon}
            {activeLabel || `Select ${label}`}
          </span>
          <svg
            className="h-4 w-4"
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
        className="w-64"
      >
        <DropdownMenuLabel className="text-xs tracking-wide uppercase">
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
                  "flex items-center justify-between gap-3",
                  selectedId === device.deviceId && "text-[#635bff]"
                )}
              >
                <span className="truncate text-sm">{device.label}</span>
                {selectedId === device.deviceId && (
                  <Check className="h-4 w-4" />
                )}
              </DropdownMenuItem>
            ))
          ) : (
            <div className="px-2 py-3 text-sm text-slate-500 dark:text-gray-400">
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
  onLeave: () => void;
};

const MediaControl = ({
  cameras,
  microphones,
  selectedCameraId,
  selectedMicrophoneId,
  onCameraChange,
  onMicrophoneChange,
  onLeave,
}: MediaControlProps) => {
  const { isVideoOff, isSpeakerOff, toggleSpeakerOff, toggleVideoOff } =
    useMediaStore();
  const { showChat, toggleShowChat } = useChatStore();
  const [isMuted, setIsMuted] = useState(false);

  return (
    <div className="w-full bg-white/80 text-slate-700 backdrop-blur-md border-t border-slate-200 dark:bg-black/40 dark:text-white dark:border-white/10">
      <div className="flex flex-wrap items-center justify-center gap-4 p-6">
        <Button
          onClick={() => {
            setIsMuted((prev) => !prev);
          }}
          variant="ghost"
          size="lg"
          className={`w-12 h-12 rounded-full transition-all duration-200 ${
            isMuted
              ? "bg-red-600 hover:bg-red-700 text-white"
              : "bg-slate-200 hover:bg-slate-300 text-slate-700 hover:text-slate-900 dark:bg-white/10 dark:hover:bg-white/20 dark:text-gray-300 dark:hover:text-white"
          }`}
        >
          {isMuted ? (
            <MicOff className="w-5 h-5" />
          ) : (
            <Mic className="w-5 h-5" />
          )}
        </Button>

        <Button
          onClick={toggleVideoOff}
          variant="ghost"
          size="lg"
          className={`w-12 h-12 rounded-full transition-all duration-200 ${
            isVideoOff
              ? "bg-red-600 hover:bg-red-700 text-white"
              : "bg-slate-200 hover:bg-slate-300 text-slate-700 hover:text-slate-900 dark:bg-white/10 dark:hover:bg-white/20 dark:text-gray-300 dark:hover:text-white"
          }`}
        >
          {isVideoOff ? (
            <VideoOff className="w-5 h-5" />
          ) : (
            <Video className="w-5 h-5" />
          )}
        </Button>

        <Button
          onClick={toggleSpeakerOff}
          variant="ghost"
          size="lg"
          className={`w-12 h-12 rounded-full transition-all duration-200 ${
            isSpeakerOff
              ? "bg-red-600 hover:bg-red-700 text-white"
              : "bg-slate-200 hover:bg-slate-300 text-slate-700 hover:text-slate-900 dark:bg-white/10 dark:hover:bg-white/20 dark:text-gray-300 dark:hover:text-white"
          }`}
        >
          {isSpeakerOff ? (
            <VolumeX className="w-5 h-5" />
          ) : (
            <Volume2 className="w-5 h-5" />
          )}
        </Button>

        <DeviceDropdown
          label="Camera"
          icon={<Camera className="w-4 h-4" />}
          devices={cameras}
          selectedId={selectedCameraId}
          onSelect={onCameraChange}
        />

        <DeviceDropdown
          label="Microphone"
          icon={<Mic className="w-4 h-4" />}
          devices={microphones}
          selectedId={selectedMicrophoneId}
          onSelect={onMicrophoneChange}
        />

        <Button
          onClick={toggleShowChat}
          variant="ghost"
          size="lg"
          className={`w-12 h-12 rounded-full transition-all duration-200 ${
            showChat
              ? "bg-[#635bff] hover:bg-[#544dc9] text-white"
              : "bg-slate-200 hover:bg-slate-300 text-slate-700 hover:text-slate-900 dark:bg-white/10 dark:hover:bg-white/20 dark:text-gray-300 dark:hover:text-white"
          }`}
        >
          <MessageSquare className="w-5 h-5" />
        </Button>

        <Button
          variant="ghost"
          size="lg"
          className="w-12 h-12 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-700 hover:text-slate-900 transition-all duration-200 dark:bg-white/10 dark:hover:bg-white/20 dark:text-gray-300 dark:hover:text-white"
        >
          <Settings className="w-5 h-5" />
        </Button>

        <div className="w-px h-8 bg-slate-300 dark:bg-white/20 mx-2"></div>

        <Button
          onClick={onLeave}
          variant="ghost"
          size="lg"
          className="w-12 h-12 rounded-full bg-red-600 hover:bg-red-700 text-white transition-all duration-200 transform hover:scale-105"
        >
          <PhoneOff className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
};

export default MediaControl;
