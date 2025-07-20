"use client"

import type React from "react"

import { useEffect, useRef, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  MessageSquare,
  Users,
  Settings,
  Copy,
  Send,
  Minimize2,
  Maximize2,
  Sparkles,
  Volume2,
  VolumeX,
} from "lucide-react"

interface ChatMessage {
  id: string
  user: string
  message: string
  timestamp: Date
}

export default function Room() {
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const params = useParams()
  const router = useRouter()
  const roomId = params.room as string

  // States
  const [isMuted, setIsMuted] = useState(false)
  const [isVideoOff, setIsVideoOff] = useState(false)
  const [isSpeakerOff, setIsSpeakerOff] = useState(false)
  const [showChat, setShowChat] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [chatMessage, setChatMessage] = useState("")
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      user: "System",
      message: "Welcome to the room! Share the room ID with others to invite them.",
      timestamp: new Date(),
    },
  ])
  const [participantCount, setParticipantCount] = useState(1)
  const [connectionStatus, setConnectionStatus] = useState<"connecting" | "connected" | "disconnected">("connecting")
  const [roomCopied, setRoomCopied] = useState(false)

  useEffect(() => {
    // WebRTC logic will go here
    console.log(`Joining room: ${roomId}`)

    // Simulate connection
    setTimeout(() => {
      setConnectionStatus("connected")
    }, 2000)
  }, [roomId])

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }, [chatMessages])

  const toggleMute = () => {
    setIsMuted(!isMuted)
  }

  const toggleVideo = () => {
    setIsVideoOff(!isVideoOff)
  }

  const toggleSpeaker = () => {
    setIsSpeakerOff(!isSpeakerOff)
  }

  const leaveRoom = () => {
    router.push("/")
  }

  const copyRoomId = async () => {
    try {
      await navigator.clipboard.writeText(roomId)
      setRoomCopied(true)
      setTimeout(() => setRoomCopied(false), 2000)
    } catch (err) {
      console.error("Failed to copy room ID:", err)
    }
  }

  const sendMessage = () => {
    if (chatMessage.trim()) {
      const newMessage: ChatMessage = {
        id: Date.now().toString(),
        user: "You",
        message: chatMessage.trim(),
        timestamp: new Date(),
      }
      setChatMessages([...chatMessages, newMessage])
      setChatMessage("")
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white overflow-hidden">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-20 bg-black/20 backdrop-blur-md border-b border-white/10">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-3">
            <div className="p-1.5 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                Pockets
              </h1>
              <div className="flex items-center space-x-2 text-xs text-gray-400">
                <div
                  className={`w-2 h-2 rounded-full ${
                    connectionStatus === "connected"
                      ? "bg-green-400"
                      : connectionStatus === "connecting"
                        ? "bg-yellow-400 animate-pulse"
                        : "bg-red-400"
                  }`}
                ></div>
                <span className="capitalize">{connectionStatus}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 bg-white/10 rounded-lg px-3 py-1.5">
              <Users className="w-4 h-4 text-gray-300" />
              <span className="text-sm font-medium">{participantCount}</span>
            </div>

            <Button
              onClick={copyRoomId}
              variant="ghost"
              size="sm"
              className="text-gray-300 hover:text-white hover:bg-white/10 transition-all duration-200"
            >
              <Copy className="w-4 h-4 mr-2" />
              {roomCopied ? "Copied!" : "Copy ID"}
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex pt-20">
        {/* Video Area */}
        <div className={`flex-1 relative transition-all duration-300 ${showChat ? "mr-80" : ""}`}>
          <div className="h-full flex flex-col">
            {/* Remote Video */}
            <div className="flex-1 relative bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg m-4 overflow-hidden shadow-2xl">
              <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center space-y-4">
                  <div className="w-24 h-24 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mx-auto">
                    <Users className="w-12 h-12 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-300">Waiting for others...</h2>
                    <p className="text-sm text-gray-500 mt-1">Share the room ID to invite participants</p>
                  </div>
                </div>
              </div>

              {/* Remote user info overlay */}
              <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-sm rounded-lg px-3 py-1.5">
                <span className="text-sm font-medium">Remote User</span>
              </div>
            </div>

            {/* Local Video (Picture-in-Picture) */}
            <div
              className={`absolute bottom-24 right-8 w-48 h-36 bg-gradient-to-br from-gray-700 to-gray-800 rounded-lg overflow-hidden shadow-xl border-2 border-white/20 transition-all duration-300 ${
                isMinimized ? "w-16 h-12" : ""
              }`}
            >
              <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
              {isVideoOff && (
                <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
                  <VideoOff className="w-8 h-8 text-gray-400" />
                </div>
              )}

              <div className="absolute top-2 left-2 bg-black/50 backdrop-blur-sm rounded px-2 py-1">
                <span className="text-xs font-medium">You</span>
              </div>

              <Button
                onClick={() => setIsMinimized(!isMinimized)}
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2 w-6 h-6 p-0 bg-black/50 hover:bg-black/70 transition-colors"
              >
                {isMinimized ? <Maximize2 className="w-3 h-3" /> : <Minimize2 className="w-3 h-3" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Chat Sidebar */}
        <div
          className={`bg-gray-900/95 backdrop-blur-sm border-l border-white/10 transition-all duration-300 ${
            showChat ? "w-80" : "w-0 overflow-hidden"
          }`}
        >
          <div className="h-full flex flex-col">
            <div className="p-4 border-b border-white/10">
              <h3 className="font-semibold flex items-center">
                <MessageSquare className="w-4 h-4 mr-2" />
                Chat
              </h3>
            </div>

            <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-3">
              {chatMessages.map((msg) => (
                <div key={msg.id} className={`${msg.user === "You" ? "ml-4" : msg.user === "System" ? "" : "mr-4"}`}>
                  <div
                    className={`rounded-lg p-3 ${
                      msg.user === "You"
                        ? "bg-indigo-600 ml-auto max-w-[80%]"
                        : msg.user === "System"
                          ? "bg-gray-700 text-center text-sm"
                          : "bg-gray-700 max-w-[80%]"
                    }`}
                  >
                    {msg.user !== "System" && <div className="text-xs text-gray-300 mb-1">{msg.user}</div>}
                    <div className="text-sm">{msg.message}</div>
                    <div className="text-xs text-gray-400 mt-1">
                      {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-white/10">
              <div className="flex space-x-2">
                <Input
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type a message..."
                  className="flex-1 bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-indigo-500"
                />
                <Button onClick={sendMessage} size="sm" className="bg-indigo-600 hover:bg-indigo-700 transition-colors">
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Control Bar */}
      <div className="absolute bottom-0 left-0 right-0 bg-black/40 backdrop-blur-md border-t border-white/10">
        <div className="flex items-center justify-center space-x-4 p-6">
          <Button
            onClick={toggleMute}
            variant="ghost"
            size="lg"
            className={`w-12 h-12 rounded-full transition-all duration-200 ${
              isMuted
                ? "bg-red-600 hover:bg-red-700 text-white"
                : "bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white"
            }`}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </Button>

          <Button
            onClick={toggleVideo}
            variant="ghost"
            size="lg"
            className={`w-12 h-12 rounded-full transition-all duration-200 ${
              isVideoOff
                ? "bg-red-600 hover:bg-red-700 text-white"
                : "bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white"
            }`}
          >
            {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
          </Button>

          <Button
            onClick={toggleSpeaker}
            variant="ghost"
            size="lg"
            className={`w-12 h-12 rounded-full transition-all duration-200 ${
              isSpeakerOff
                ? "bg-red-600 hover:bg-red-700 text-white"
                : "bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white"
            }`}
          >
            {isSpeakerOff ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </Button>

          <Button
            onClick={() => setShowChat(!showChat)}
            variant="ghost"
            size="lg"
            className={`w-12 h-12 rounded-full transition-all duration-200 ${
              showChat
                ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                : "bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white"
            }`}
          >
            <MessageSquare className="w-5 h-5" />
          </Button>

          <Button
            variant="ghost"
            size="lg"
            className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition-all duration-200"
          >
            <Settings className="w-5 h-5" />
          </Button>

          <div className="w-px h-8 bg-white/20 mx-2"></div>

          <Button
            onClick={leaveRoom}
            variant="ghost"
            size="lg"
            className="w-12 h-12 rounded-full bg-red-600 hover:bg-red-700 text-white transition-all duration-200 transform hover:scale-105"
          >
            <PhoneOff className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Room ID Display */}
      <div className="absolute top-24 left-4 bg-black/50 backdrop-blur-sm rounded-lg px-4 py-2 border border-white/10">
        <div className="text-xs text-gray-400 mb-1">Room ID</div>
        <div className="font-mono text-sm text-white">{roomId}</div>
      </div>
    </div>
  )
}
