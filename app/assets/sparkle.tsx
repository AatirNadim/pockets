import { Sparkles } from "lucide-react";
import React from "react";

function Sparkle() {
  return (
    <div className="p-2 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl shadow-lg transform rotate-12 hover:rotate-0 transition-transform duration-300">
      <Sparkles className="w-6 h-6 text-white" />
    </div>
  );
}

export default Sparkle;
