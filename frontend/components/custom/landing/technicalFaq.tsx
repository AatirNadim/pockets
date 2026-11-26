"use client";

import { useState } from "react";
import { ChevronDown, HelpCircle, Shield, Wifi, Database, Users, Cpu } from "lucide-react";

interface FaqItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  icon: typeof Shield;
}

const FAQS: FaqItem[] = [
  {
    id: "encryption",
    category: "Security",
    icon: Shield,
    question: "How does privacy and encryption work in Pockets?",
    answer:
      "All audio, video, chat, and Drop Circle file data are encrypted in transit using standard WebRTC DTLS (Datagram Transport Layer Security) and SRTP (Secure Real-time Transport Protocol). Because there is no media relay server decoding packets in the middle, Pockets cannot eavesdrop on or record your session. We speak honestly: Pockets does not use a central PKI identity system to verify users. Always share room links through trusted, out-of-band channels.",
  },
  {
    id: "capacity",
    category: "Architecture",
    icon: Users,
    question: "Why is room capacity capped at six participants?",
    answer:
      "Pockets operates on a pure peer-to-peer mesh architecture rather than an expensive, centralized Selective Forwarding Unit (SFU). In a 6-person mesh, each browser maintains 5 upstream and 5 downstream connections (15 total bidirectional channels). This guarantees maximum privacy and sub-100ms latency, while keeping CPU load and bandwidth manageable on standard laptops and mobile phones.",
  },
  {
    id: "file-storage",
    category: "Drop Circle",
    icon: Database,
    question: "Are files uploaded or stored on Pockets servers?",
    answer:
      "Never. Drop Circle uses WebRTC RTCDataChannels to stream raw binary slices in 30 KiB chunks directly from the sender's browser memory into the recipient's browser memory. If the sender closes their tab during a transfer, the transfer halts immediately because no server buffer exists.",
  },
  {
    id: "nat-firewall",
    category: "Networking",
    icon: Wifi,
    question: "What happens behind strict corporate firewalls and symmetric NATs?",
    answer:
      "Pockets uses public STUN servers to discover candidate IP addresses and establish direct peer-to-peer UDP connections. On strict enterprise networks or symmetric NATs that block peer-to-peer punch-through, a TURN relay server assists by shuttling the encrypted packets without decrypting the payload.",
  },
  {
    id: "installation",
    category: "Platform",
    icon: Cpu,
    question: "Do I or my guests need to install an app or create an account?",
    answer:
      "No. Pockets runs 100% inside modern web browsers (Chrome, Safari, Firefox, Edge) using native WebRTC, Canvas, and Web Audio APIs. There are no downloads, extensions, accounts, or cookies required.",
  },
];

export function TechnicalFaq() {
  const [openId, setOpenId] = useState<string | null>("encryption");

  const toggle = (id: string) => {
    setOpenId((curr) => (curr === id ? null : id));
  };

  return (
    <section aria-labelledby="faq-title" className="relative mx-auto w-full max-w-4xl px-5 py-20 lg:px-10">
      <div className="text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-white/70 px-3 py-1 text-xs font-semibold tracking-wider uppercase text-stone-600 dark:border-stone-800 dark:bg-stone-900/70 dark:text-stone-300">
          <HelpCircle size={12} className="text-amber-600 dark:text-amber-400" />
          Technical Specifications
        </span>
        <h2
          id="faq-title"
          className="mt-4 text-3xl font-semibold tracking-tight text-stone-900 dark:text-stone-100 sm:text-4xl"
        >
          Clear, grounded answers to how Pockets works.
        </h2>
        <p className="mt-3 text-base text-stone-600 dark:text-stone-300">
          No marketing hand-waving. Here is the exact technical reality under the hood.
        </p>
      </div>

      <div className="mt-12 divide-y divide-stone-200/90 rounded-3xl border border-stone-200/90 bg-white/80 shadow-sm backdrop-blur-md dark:divide-stone-800 dark:border-stone-800 dark:bg-stone-900/80">
        {FAQS.map((faq) => {
          const isOpen = openId === faq.id;
          const Icon = faq.icon;
          return (
            <div key={faq.id} className="transition-colors hover:bg-stone-200/35 dark:hover:bg-stone-800/30 first:rounded-t-3xl last:rounded-b-3xl">
              <button
                type="button"
                onClick={() => toggle(faq.id)}
                aria-expanded={isOpen}
                aria-controls={`faq-answer-${faq.id}`}
                id={`faq-question-${faq.id}`}
                className="flex w-full items-start justify-between gap-4 p-6 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-inset dark:focus-visible:ring-amber-400 sm:p-7"
              >
                <div className="flex items-start gap-4">
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-stone-200 bg-stone-200/70 text-amber-700 dark:border-stone-700 dark:bg-stone-800 dark:text-amber-400">
                    <Icon size={18} />
                  </div>
                  <div>
                    <span className="font-mono text-xs font-semibold tracking-wider text-amber-700 uppercase dark:text-amber-400">
                      {faq.category}
                    </span>
                    <h3 className="mt-1 text-base font-semibold tracking-tight text-stone-900 dark:text-stone-100 sm:text-lg">
                      {faq.question}
                    </h3>
                  </div>
                </div>

                <div
                  className={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-stone-200 text-stone-600 transition-transform duration-200 dark:border-stone-700 dark:text-stone-400 ${
                    isOpen ? "rotate-180 bg-stone-200/80 dark:bg-stone-800" : ""
                  }`}
                >
                  <ChevronDown size={16} />
                </div>
              </button>

              {isOpen && (
                <div
                  id={`faq-answer-${faq.id}`}
                  role="region"
                  aria-labelledby={`faq-question-${faq.id}`}
                  className="px-6 pb-6 pt-0 sm:px-7 sm:pb-7 sm:pl-[4.5rem]"
                >
                  <p className="text-sm leading-relaxed text-stone-600 dark:text-stone-300 sm:text-base">
                    {faq.answer}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
