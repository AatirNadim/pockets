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
      className="relative min-h-screen overflow-hidden font-sans text-stone-900 dark:text-stone-100"
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
          className="w-full max-w-md rounded-3xl glass-strong p-10 text-center"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, type: "spring", stiffness: 120 }}
        >
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-linear-to-br from-amber-400 via-orange-500 to-rose-500 text-white shadow-lg">
            <Compass className="h-8 w-8" />
          </div>
          <p className="text-sm font-semibold tracking-[0.4em] text-amber-600/70 dark:text-amber-400/70">
            ERROR 404
          </p>
          <h1 className="mt-3 text-4xl font-bold text-stone-800 dark:text-stone-100">Nothing here ..!</h1>
          <p className="mt-4 text-base text-stone-600 dark:text-stone-300">
            The page you&apos;re looking for doesn&apos;t exist. Let&apos;s
            guide you back to the lobby so you can spin up a new room or rejoin
            your friends.
          </p>
          <div className="mt-8 flex flex-col gap-3">
            <Button
              asChild
              className="w-full bg-stone-900 hover:bg-stone-800 dark:bg-stone-100 dark:hover:bg-stone-200 text-stone-50 dark:text-stone-900 rounded-full"
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
