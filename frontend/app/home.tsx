"use client";

import type React from "react";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { v4 as uuidV4 } from "uuid";
import { ArrowRight, Zap, Users } from "lucide-react";
import { toast } from "sonner";
import { useUserStore } from "@/lib/stores/userStore";
import { cn, isValidUUID } from "@/lib/utils";
import { ThemeToggle } from "@/components/custom/themeToggle";
import { motion, useMotionValue, useSpring } from "framer-motion";
import type { Variants } from "framer-motion";
import AnimatedBackground from "@/components/custom/animatedBackground";

// Magnetic button component for organic feel
const MagneticButton = ({
  children,
  onClick,
  disabled,
  variant = "primary",
  className = "",
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary";
  className?: string;
}) => {
  const ref = useRef<HTMLButtonElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const springConfig = { damping: 15, stiffness: 150 };
  const springX = useSpring(x, springConfig);
  const springY = useSpring(y, springConfig);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!ref.current || disabled) return;
    const rect = ref.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    x.set((e.clientX - centerX) * 0.15);
    y.set((e.clientY - centerY) * 0.15);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  const baseStyles =
    variant === "primary"
      ? "bg-stone-900 dark:bg-stone-100 text-stone-50 dark:text-stone-900 hover:bg-stone-800 dark:hover:bg-stone-200"
      : "bg-transparent border-2 border-stone-300 dark:border-stone-600 text-stone-700 dark:text-stone-300 hover:border-stone-400 dark:hover:border-stone-500 hover:bg-stone-50 dark:hover:bg-stone-900/50";

  return (
    <motion.button
      ref={ref}
      onClick={onClick}
      disabled={disabled}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ x: springX, y: springY }}
      whileTap={{ scale: 0.97 }}
      className={`
        relative overflow-hidden rounded-full px-8 py-4 font-medium
        transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed
        ${baseStyles} ${className}
      `}
    >
      {children}
    </motion.button>
  );
};

// Floating label input with better UX
const FloatingInput = ({
  value,
  onChange,
  onKeyDown,
  placeholder,
  label,
  icon: Icon,
}: {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  placeholder: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const hasValue = value.length > 0;

  return (
    <div className="relative group">
      <motion.label
        className={`
          absolute left-4 transition-all duration-200 pointer-events-none z-10
          ${
            isFocused || hasValue
              ? "-top-2.5 text-xs font-medium bg-stone-50 dark:bg-stone-900 px-2 text-stone-600 dark:text-stone-400"
              : "top-1/2 -translate-y-1/2 text-stone-400 dark:text-stone-500"
          }
        `}
        animate={{
          scale: isFocused || hasValue ? 0.9 : 1,
        }}
      >
        {label}
      </motion.label>
      <div className="relative">
        {Icon && (
          <Icon
            className={`
            absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors duration-200
            ${
              isFocused
                ? "text-stone-600 dark:text-stone-300"
                : "text-stone-300 dark:text-stone-600"
            }
          `}
          />
        )}
        <input
          type="text"
          value={value}
          onChange={onChange}
          onKeyDown={onKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className={`
            w-full h-14 px-4 ${Icon ? "pr-12" : ""} rounded-2xl
            bg-stone-50 dark:bg-stone-900/80
            border-2 transition-all duration-200
            text-stone-800 dark:text-stone-200
            placeholder:text-transparent
            focus:outline-none
            ${
              isFocused
                ? "border-stone-400 dark:border-stone-500 shadow-sm"
                : "border-stone-200 dark:border-stone-700/50"
            }
          `}
          placeholder={placeholder}
        />
      </div>
    </div>
  );
};

export default function Home() {
  const router = useRouter();
  const { roomId, setRoomId, initializeUserAsGuest, initializeUserAsHost } =
    useUserStore();
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [activeTab, setActiveTab] = useState<"create" | "join">("create");
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 10) {
        console.log("Scrolled more than 10");
      }
      setIsScrolled(window.scrollY > 10);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    console.log("isScrolled changed: ", isScrolled);
  }, [isScrolled]);

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
      toast.error("Invalid Room ID. Please check and try again.");
    }
  };

  const createAndJoin = () => {
    try {
      setIsCreating(true);
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

  const handleJoinKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      joinRoom();
    }
  };

  // Stagger children animation
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring" as const,
        stiffness: 100,
        damping: 15,
      },
    },
  };

  return (
    <main className="relative min-h-screen overflow-hidden">
      <AnimatedBackground />

      {/* Header */}
      <motion.header
        className={cn(
          "fixed top-0 left-0 right-0 z-50 px-6 py-4",
          isScrolled ? "glass" : ""
        )}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo */}
          <motion.div
            className="flex items-center gap-3"
            whileHover={{ scale: 1.02 }}
          >
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-linear-to-br from-amber-400 via-orange-500 to-rose-500 flex items-center justify-center shadow-lg shadow-orange-500/25">
                <Zap className="w-5 h-5 text-white" strokeWidth={2.5} />
              </div>
              <div className="absolute -inset-1 rounded-xl bg-linear-to-br from-amber-400 via-orange-500 to-rose-500 opacity-30 blur-md -z-10" />
            </div>
            <span className="text-xl font-semibold tracking-tight text-stone-800 dark:text-stone-200">
              Pockets
            </span>
          </motion.div>

          <ThemeToggle />
        </div>
      </motion.header>

      {/* Main content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center px-6 py-24">
        <motion.div
          className="w-full max-w-xl"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Hero text */}
          <motion.div className="text-center mb-12" variants={itemVariants}>
            <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight text-stone-800 dark:text-stone-100 mb-4">
              Spaces that
              <span className="relative inline-block ml-3">
                <span className="relative z-10">connect</span>
                <motion.span
                  className="absolute bottom-1 left-0 right-0 h-3 bg-linear-to-r from-amber-300/60 via-orange-300/60 to-rose-300/60 dark:from-amber-500/30 dark:via-orange-500/30 dark:to-rose-500/30 z-0 rounded-full"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: 0.6, duration: 0.5, ease: "easeOut" }}
                  style={{ originX: 0 }}
                />
              </span>
            </h1>
            <p className="text-lg text-stone-500 dark:text-stone-400 max-w-md mx-auto leading-relaxed">
              Create instant collaborative rooms or join with an invite. Simple,
              secure, seamless.
            </p>
          </motion.div>

          {/* Main card */}
          <motion.div className="relative" variants={itemVariants}>
            {/* Card glow effect */}
            <div className="absolute -inset-1 bg-linear-to-r from-amber-200/50 via-orange-200/50 to-rose-200/50 dark:from-amber-900/20 dark:via-orange-900/20 dark:to-rose-900/20 rounded-3xl blur-xl opacity-60" />

            <div className="relative bg-white/80 dark:bg-stone-900/80 backdrop-blur-2xl rounded-3xl border border-stone-200/50 dark:border-stone-700/50 shadow-xl shadow-stone-900/5 dark:shadow-stone-900/50 overflow-hidden">
              {/* Tab navigation */}
              <div className="flex border-b border-stone-200/50 dark:border-stone-700/50">
                {[
                  { id: "create" as const, label: "Create Room", icon: Zap },
                  { id: "join" as const, label: "Join Room", icon: Users },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      flex-1 relative px-6 py-4 flex items-center justify-center gap-2 text-sm font-medium
                      transition-colors duration-200
                      ${
                        activeTab === tab.id
                          ? "text-stone-800 dark:text-stone-100"
                          : "text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300"
                      }
                    `}
                  >
                    <tab.icon className="w-4 h-4" />
                    {tab.label}
                    {activeTab === tab.id && (
                      <motion.div
                        className="absolute bottom-0 left-4 right-4 h-0.5 bg-linear-to-r from-amber-500 via-orange-500 to-rose-500 rounded-full"
                        layoutId="activeTab"
                        transition={{
                          type: "spring",
                          stiffness: 300,
                          damping: 30,
                        }}
                      />
                    )}
                  </button>
                ))}
              </div>

              {/* Tab content */}
              <div className="p-8">
                {/* Display name (shared between tabs) */}
                <div className="mb-6">
                  <FloatingInput
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Display name"
                    label="Your display name (optional)"
                  />
                  <p className="mt-2 text-xs text-stone-400 dark:text-stone-500 ml-1">
                    This is how others will see you in the room
                  </p>
                </div>

                {/* Create tab content */}
                {activeTab === "create" && (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-6"
                  >
                    <div className="p-4 rounded-2xl bg-linear-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border border-amber-200/50 dark:border-amber-800/30">
                      <p className="text-sm text-stone-600 dark:text-stone-400 leading-relaxed">
                        Start a new space and get an instant invite link to
                        share with collaborators.
                      </p>
                    </div>

                    <MagneticButton
                      onClick={createAndJoin}
                      disabled={isCreating}
                      variant="primary"
                      className="w-full flex items-center justify-center gap-3"
                    >
                      {isCreating ? (
                        <>
                          <motion.div
                            className="w-5 h-5 border-2 border-stone-400 border-t-transparent rounded-full"
                            animate={{ rotate: 360 }}
                            transition={{
                              duration: 1,
                              repeat: Infinity,
                              ease: "linear",
                            }}
                          />
                          <span>Creating...</span>
                        </>
                      ) : (
                        <>
                          <Zap className="w-5 h-5" />
                          <span>Create New Room</span>
                          <ArrowRight className="w-5 h-5" />
                        </>
                      )}
                    </MagneticButton>
                  </motion.div>
                )}

                {/* Join tab content */}
                {activeTab === "join" && (
                  <motion.div
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-6"
                  >
                    <FloatingInput
                      value={roomId || ""}
                      onChange={(e) => setRoomId(e.target.value)}
                      onKeyDown={handleJoinKeyPress}
                      placeholder="Room ID"
                      label="Enter room invite ID"
                      icon={Users}
                    />

                    <MagneticButton
                      onClick={joinRoom}
                      disabled={isJoining || !roomId}
                      variant="secondary"
                      className="w-full flex items-center justify-center gap-3"
                    >
                      {isJoining ? (
                        <>
                          <motion.div
                            className="w-5 h-5 border-2 border-stone-400 border-t-transparent rounded-full"
                            animate={{ rotate: 360 }}
                            transition={{
                              duration: 1,
                              repeat: Infinity,
                              ease: "linear",
                            }}
                          />
                          <span>Joining...</span>
                        </>
                      ) : (
                        <>
                          <Users className="w-5 h-5" />
                          <span>Join Room</span>
                          <ArrowRight className="w-5 h-5" />
                        </>
                      )}
                    </MagneticButton>
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>

          {/* Features strip */}
          <motion.div
            className="mt-12 flex items-center justify-center gap-8 text-sm text-stone-400 dark:text-stone-500"
            variants={itemVariants}
          >
            {["Encrypted", "No signup", "Instant"].map((feature) => (
              <div key={feature} className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-linear-to-br from-amber-400 to-orange-500" />
                <span>{feature}</span>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </div>

      {/* Decorative elements */}
      <motion.div
        className="fixed bottom-8 left-8 text-xs text-stone-300 dark:text-stone-700 font-mono"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
      >
        v1.0
      </motion.div>
    </main>
  );
}
