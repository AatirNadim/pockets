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

export default function Home() {
  const router = useRouter();
  const { roomId, setRoomId } = useUserStore();
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);

  const joinRoom = async () => {
    if (!roomId) {
      toast.error("Room Id cannot be empty");
      return;
    }
    if (isValidUUID(roomId.trim())) {
      setIsJoining(true);
      setTimeout(() => {
        router.push(`/${roomId.trim()}`);
      }, 500);
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
      const newRoomId = uuidV4();
      setRoomId(newRoomId);
      router.push(`/${newRoomId}`);
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
    <main className="relative min-h-screen bg-stripe-gradient overflow-hidden font-sans">
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8 text-center">
          {/* Header Section */}
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <Sparkle />
              <h1 className="text-5xl font-bold font-heading text-white drop-shadow-md">
                Pockets
              </h1>
            </div>
            <p className="text-lg text-white/90 max-w-sm mx-auto leading-relaxed font-medium">
              Create instant collaborative spaces or join existing ones with
              your friends
            </p>
          </div>

          {/* Create/Join Room */}
          <div className="group p-6 bg-white rounded-2xl shadow-xl hover:shadow-2xl hover:scale-[1.02] transition-all duration-300">
            <div className="space-y-5">
              <div className="flex items-center justify-center space-x-2 text-[#635bff]">
                <Plus className="w-5 h-5" />
                <Users className="w-5 h-5" />
                <span className="font-semibold">Create or Join a Room</span>
              </div>
              <Button
                onClick={createAndJoin}
                disabled={isCreating}
                className="w-full bg-[#635bff] hover:bg-[#544dc9] text-white font-semibold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
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
              </Button>
              <p className="text-sm text-gray-500">
                Spin up a brand-new collaborative space or jump into an existing
                one with a room ID.
              </p>
              <div className="space-y-4">
                <Input
                  type="text"
                  value={roomId || ""}
                  onChange={(e) => setRoomId(e.target.value)}
                  onKeyDown={handleKeyPress}
                  className="w-full h-12 px-4 bg-gray-50 border-2 border-gray-100 rounded-xl text-center font-mono tracking-wider focus:border-[#635bff] focus:ring-2 focus:ring-[#635bff]/20 transition-all duration-200 placeholder:text-gray-400"
                  placeholder="Enter Room ID"
                />
                <div className="text-xs font-semibold tracking-[0.3em] text-gray-400 text-center">
                  OR
                </div>
                <Button
                  onClick={joinRoom}
                  disabled={isJoining}
                  variant="outline"
                  className="w-full border-2 border-[#635bff] text-[#635bff] hover:bg-[#f5f3ff] font-semibold py-3 px-6 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isJoining ? (
                    <div className="flex items-center space-x-2 text-[#635bff]">
                      <div className="w-4 h-4 border-2 border-[#635bff] border-t-transparent rounded-full animate-spin"></div>
                      <span>Joining...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <Users className="w-4 h-4" />
                      <span>Join with ID</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
                    </div>
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="pt-8 text-center">
            <p className="text-sm text-white/60">
              Secure • Fast • Collaborative
            </p>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.6s ease-out;
        }
      `}</style>
    </main>
  );
}
