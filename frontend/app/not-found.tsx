"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import AnimatedBackground from "@/components/custom/animatedBackground";
import { ThemeToggle } from "@/components/custom/themeToggle";

const NotFound = () => {
  return (
    <motion.main
      className="relative min-h-screen overflow-hidden font-sans text-slate-900 dark:text-white"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      <AnimatedBackground />
      <div className="absolute top-6 right-6 z-20">
        <ThemeToggle />
      </div>
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 py-12">
        <motion.div
          className="w-full max-w-md rounded-3xl border border-white/60 bg-white/90 p-10 text-center shadow-2xl backdrop-blur dark:border-white/10 dark:bg-gray-900/80"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, type: "spring", stiffness: 120 }}
        >
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#635bff] to-[#00d4ff] text-white">
            <Compass className="h-8 w-8" />
          </div>
          <p className="text-sm font-semibold tracking-[0.4em] text-[#635bff]/70 dark:text-white/70">
            ERROR 404
          </p>
          <h1 className="mt-3 text-4xl font-bold">Nothing here ..!</h1>
          <p className="mt-4 text-base text-slate-600 dark:text-gray-300">
            The page you&apos;re looking for doesn&apos;t exist. Let&apos;s
            guide you back to the lobby so you can spin up a new room or rejoin
            your friends.
          </p>
          <div className="mt-8 flex flex-col gap-3">
            <Button
              asChild
              className="w-full bg-[#635bff] hover:bg-[#4f48ca] text-white"
            >
              <Link href="/">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Home
              </Link>
            </Button>
          </div>
        </motion.div>
      </div>
    </motion.main>
  );
};

export default NotFound;
