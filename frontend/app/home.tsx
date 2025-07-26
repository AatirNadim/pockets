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

export default function Home() {
  const router = useRouter();
  const [roomId, setRoomId] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);

  const joinRoom = async () => {
    if (roomId.trim()) {
      setIsJoining(true);
      setTimeout(() => {
        router.push(`/${roomId.trim()}`);
      }, 500);
    } else {
      // Add shake animation for invalid input
      const input = document.querySelector("input");
      input?.classList.add("animate-pulse");
      setTimeout(() => input?.classList.remove("animate-pulse"), 500);
    }
  };

  const createAndJoin = () => {
    try {
      console.debug("Creating new room...");
      const newRoomId = uuidV4();
      setRoomId(newRoomId);
      setIsJoining(true);
      router.push(`/${newRoomId}`);
    } catch (error) {
      console.error("Error creating room:", error);
      toast.error("Failed to create room. Please try again.");
    } finally {
      setIsJoining(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      joinRoom();
    }
  };

  return (
    <main className="relative min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-60 h-60 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-pulse delay-500"></div>
      </div>

      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8 text-center">
          {/* Header Section */}
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <Sparkle />
              <h1 className="text-5xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                Pockets
              </h1>
            </div>
            <p className="text-lg text-gray-600 max-w-sm mx-auto leading-relaxed">
              Create instant collaborative spaces or join existing ones with
              your friends
            </p>
            {/* <Button
              onClick={() => {
                sendWsMessage(JSON.stringify({ type: "ping" }));
              }}
            >
              Press here!
            </Button> */}
          </div>

          {/* Action Cards */}
          <div className="space-y-6">
            {/* Create Room Card */}
            <div className="group p-6 bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 hover:shadow-xl hover:scale-105 transition-all duration-300">
              <div className="space-y-4">
                <div className="flex items-center justify-center space-x-2 text-indigo-600">
                  <Plus className="w-5 h-5" />
                  <span className="font-semibold">Create New Room</span>
                </div>
                <p className="text-sm text-gray-500">
                  Start a fresh collaborative space
                </p>
                <Button
                  onClick={createAndJoin}
                  disabled={isCreating}
                  className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {isCreating ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Creating...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <Plus className="w-4 h-4" />
                      <span>Create Room</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
                    </div>
                  )}
                </Button>
              </div>
            </div>

            {/* Join Room Card */}
            <div className="group p-6 bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 hover:shadow-xl hover:scale-105 transition-all duration-300">
              <div className="space-y-4">
                <div className="flex items-center justify-center space-x-2 text-green-600">
                  <Users className="w-5 h-5" />
                  <span className="font-semibold">Join Existing Room</span>
                </div>
                <p className="text-sm text-gray-500">
                  Enter a room ID to join others
                </p>
                <div className="space-y-3">
                  <Input
                    type="text"
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value)}
                    // onKeyPress={handleKeyPress}
                    className="w-full h-12 px-4 bg-white/50 border-2 border-gray-200 rounded-xl text-center font-mono tracking-wider focus:border-green-400 focus:ring-2 focus:ring-green-200 transition-all duration-200 placeholder:text-gray-400"
                    placeholder="Enter Room ID"
                  />
                  <Button
                    onClick={joinRoom}
                    disabled={isJoining}
                    className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    {isJoining ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Joining...</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <Users className="w-4 h-4" />
                        <span>Join Room</span>
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
                      </div>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="pt-8 text-center">
            <p className="text-sm text-gray-400">
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
