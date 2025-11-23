import { Sparkles } from "lucide-react";
import React from "react";

function Sparkle() {
  return (
    <div className="p-2 bg-gradient-to-r from-[#635bff] to-[#00d4ff] rounded-xl shadow-lg transform rotate-12 hover:rotate-0 transition-transform duration-300">
      <Sparkles className="w-6 h-6 text-white" />
    </div>
  );
}

export default Sparkle;
