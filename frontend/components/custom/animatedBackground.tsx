import { motion } from "framer-motion";

const AnimatedBackground = () => {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-white dark:bg-black transition-colors duration-700" />
      <motion.div
        className="absolute -top-32 -left-24 h-[60vw] w-[60vw] rounded-full bg-gradient-to-br from-purple-200/70 via-fuchsia-200/60 to-transparent blur-3xl dark:from-purple-900/40 dark:via-fuchsia-800/40"
        animate={{
          x: ["-5%", "8%", "-8%"],
          y: ["-5%", "6%", "-4%"],
          rotate: [0, 8, -6],
        }}
        transition={{
          duration: 18,
          repeat: Infinity,
          repeatType: "mirror",
          ease: "easeInOut",
        }}
      />
      <motion.div
        className="absolute top-1/2 right-[-15%] h-[55vw] w-[55vw] rounded-full bg-gradient-to-bl from-purple-300/60 via-indigo-200/70 to-transparent blur-[160px] dark:from-purple-800/40 dark:via-indigo-900/40"
        animate={{
          x: ["5%", "-6%", "4%"],
          y: ["-10%", "4%", "-6%"],
          scale: [1, 1.1, 0.95],
        }}
        transition={{
          duration: 16,
          repeat: Infinity,
          repeatType: "mirror",
          ease: "easeInOut",
          delay: 2,
        }}
      />
      <motion.div
        className="absolute bottom-[-10%] left-1/3 h-[40vw] w-[40vw] rounded-full bg-gradient-to-tr from-violet-200/70 via-purple-200/60 to-transparent blur-3xl dark:from-violet-900/40 dark:via-purple-800/40"
        animate={{
          x: ["0%", "6%", "-4%"],
          y: ["0%", "-6%", "4%"],
          rotate: [-4, 4, -2],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          repeatType: "mirror",
          ease: "easeInOut",
          delay: 1,
        }}
      />
    </div>
  );
};

export default AnimatedBackground;
