import { Sparkles } from "lucide-react";
import React from "react";
import { motion } from "framer-motion";

function Sparkle() {
  return (
    <motion.div
      className="p-2 bg-linear-to-br from-amber-500 via-orange-500 to-rose-500 rounded-xl shadow-lg"
      initial={{ rotate: 12, scale: 0.95 }}
      whileHover={{ rotate: 0, scale: 1.05 }}
      transition={{ type: "spring", stiffness: 260, damping: 18 }}
    >
      <Sparkles className="w-6 h-6 text-white" />
    </motion.div>
  );
}

export default Sparkle;
