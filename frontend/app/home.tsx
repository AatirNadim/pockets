"use client";

import type React from "react";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { v4 as uuidV4 } from "uuid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Users, ArrowRight } from "lucide-react";
import Sparkle from "./assets/sparkle";
import { toast } from "sonner";
import { useUserStore } from "@/lib/stores/userStore";
import { isValidUUID } from "@/lib/utils";
import { ThemeToggle } from "@/components/custom/themeToggle";
import { motion } from "framer-motion";
import AnimatedBackground from "@/components/custom/animatedBackground";

const MotionButton = motion(Button);

export default function Home() {
  const router = useRouter();
  const { roomId, setRoomId, initializeUserAsGuest, initializeUserAsHost } =
    useUserStore();
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [displayName, setDisplayName] = useState("");

  const joinRoom = async () => {
    if (!roomId) {
      toast.error("Room Id cannot be empty");
      return;
    }

    if (isValidUUID(roomId.trim())) {
      setIsJoining(true);

      initializeUserAsGuest(displayName.trim());

      router.push(`/room/${roomId.trim()}`);
    } else {
      // Add shake animation for invalid input
      console.log("Invalid Room ID:", roomId);
      const input = document.querySelector("input");
      input?.classList.add("animate-pulse");
      setTimeout(() => input?.classList.remove("animate-pulse"), 2000);
      toast.error("Invalid Room ID. Please check and try again.");
    }
  };

  const createAndJoin = () => {
    try {
      setIsCreating(true);
      console.debug("Creating new room...");
      initializeUserAsHost(displayName.trim());
      const newRoomId = uuidV4();
      setRoomId(newRoomId);
      router.push(`/room/${newRoomId}`);
    } catch (error) {
      console.error("Error creating room:", error);
      toast.error("Failed to create room. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      joinRoom();
    }
  };

  return (
    <motion.main
      className="relative min-h-screen overflow-hidden font-sans text-slate-900 dark:text-white"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <AnimatedBackground />
      <div className="absolute top-6 right-6 z-20">
        <ThemeToggle />
      </div>
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8 text-center">
          {/* Header Section */}
          <motion.div
            className="space-y-4 text-[var(--primary)]"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, type: "spring", stiffness: 120 }}
          >
            <div className="flex items-center justify-center space-x-2 mb-2">
              <Sparkle />
              <h1 className="text-5xl font-bold font-heading drop-shadow-md">
                Pockets
              </h1>
            </div>
            <p className="text-lg max-w-sm mx-auto leading-relaxed font-semibold">
              Create instant collaborative spaces or join existing ones with
              your friends
            </p>
          </motion.div>

          {/* Create/Join Room */}
          <motion.div
            className="group p-6 bg-white dark:bg-gray-900/90 rounded-2xl shadow-xl border border-white/60 dark:border-white/10"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              delay: 0.15,
              duration: 0.5,
              type: "spring",
              stiffness: 140,
            }}
            whileHover={{ scale: 1.02 }}
          >
            <div className="space-y-5">
              <div className="flex items-center justify-center space-x-2 text-[var(--primary)]">
                <Plus className="w-5 h-5" />
                <Users className="w-5 h-5" />
                <span className="font-semibold">Create or Join a Room</span>
              </div>
              <Input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                onKeyDown={handleKeyPress}
                className="w-full h-12 px-4 bg-gray-50 border-2 border-gray-100 rounded-xl text-center font-sans tracking-wide focus:border-[#635bff] focus:ring-2 focus:ring-[#635bff]/20 transition-all duration-200 placeholder:text-gray-400 dark:bg-gray-900/60 dark:border-gray-700 dark:text-white"
                placeholder="Enter display name (optional)"
              />
              <MotionButton
                onClick={createAndJoin}
                disabled={isCreating}
                className="w-full bg-[#635bff] hover:bg-[#544dc9] text-white font-semibold py-3 px-6 rounded-xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                whileHover={{ scale: 1.015 }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                {isCreating ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Creating...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <Plus className="w-4 h-4" />
                    <span>Quick Create</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
                  </div>
                )}
              </MotionButton>
              <p className="text-sm text-gray-500 dark:text-gray-300">
                Spin up a brand-new collaborative space or jump into an existing
                one with a room ID.
              </p>
              <div className="space-y-4">
                <Input
                  type="text"
                  value={roomId || ""}
                  onChange={(e) => setRoomId(e.target.value)}
                  onKeyDown={handleKeyPress}
                  className="w-full h-12 px-4 bg-gray-50 border-2 border-gray-100 rounded-xl text-center font-mono tracking-wider focus:border-[#635bff] focus:ring-2 focus:ring-[#635bff]/20 transition-all duration-200 placeholder:text-gray-400 dark:bg-gray-900/60 dark:border-gray-700 dark:text-white"
                  placeholder="Enter Room ID"
                />
                <div className="text-xs font-semibold tracking-[0.3em] text-gray-400 dark:text-gray-500 text-center">
                  OR
                </div>
                <MotionButton
                  onClick={joinRoom}
                  disabled={isJoining}
                  variant="outline"
                  className="w-full border-2 border-[#635bff] text-[#635bff] hover:bg-[#f5f3ff] font-semibold py-3 px-6 rounded-xl shadow-sm disabled:opacity-50 disabled:cursor-not-allowed dark:border-white dark:text-white dark:hover:bg-white/10"
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.97 }}
                  transition={{ type: "spring", stiffness: 280, damping: 18 }}
                >
                  {isJoining ? (
                    <div className="flex items-center space-x-2 text-[#635bff] dark:text-white">
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                      <span>Joining...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <Users className="w-4 h-4" />
                      <span>Join with ID</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
                    </div>
                  )}
                </MotionButton>
              </div>
            </div>
          </motion.div>

          {/* Footer */}
          <div className="pt-8 text-center text-[var(--primary)]">
            <p className="text-sm">
              Secure • Fast • Collaborative
            </p>
          </div>
        </div>
      </div>
    </motion.main>
  );
}
