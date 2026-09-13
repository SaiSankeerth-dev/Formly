"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Bot,
  Sparkles,
  X,
  Send,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  FileText,
  Search,
  CheckCircle2,
} from "lucide-react";
import { POPULAR_SERVICES_LIST } from "@/lib/services/popular-services-data";
import { ServiceDetail } from "@/components/services/ServiceDetailDrawer";

interface Message {
  id: string;
  sender: "user" | "saarthi";
  text: string;
  link?: { label: string; url: string };
  service?: ServiceDetail;
}

interface FloatingSaarthiAIProps {
  isOpen?: boolean;
  onClose?: () => void;
  onOpen?: () => void;
  onSelectService?: (service: ServiceDetail) => void;
}

export function FloatingSaarthiAI({
  isOpen: controlledIsOpen,
  onClose: controlledOnClose,
  onOpen: controlledOnOpen,
  onSelectService,
}: FloatingSaarthiAIProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;

  const handleOpen = () => {
    if (controlledOnOpen) controlledOnOpen();
    else setInternalIsOpen(true);
  };

  const handleClose = () => {
    if (controlledOnClose) controlledOnClose();
    else setInternalIsOpen(false);
  };

  const [inputQuery, setInputQuery] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "m_welcome",
      sender: "saarthi",
      text: "Namaste! I am Saarthi, your AI assistant for Indian government services. How can I assist you today?",
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  // Listen for global open event
  useEffect(() => {
    const handleGlobalOpen = () => {
      handleOpen();
    };
    window.addEventListener("SEVA_SAARTHI_OPEN_AI", handleGlobalOpen);
    return () => window.removeEventListener("SEVA_SAARTHI_OPEN_AI", handleGlobalOpen);
  }, []);

  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [lastFailedQuery, setLastFailedQuery] = useState<string | null>(null);

  const handleSendMessage = async (queryText: string) => {
    const text = queryText.trim();
    if (!text || isLoadingAI) return;

    const userMsg: Message = {
      id: `u_${Date.now()}`,
      sender: "user",
      text,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery("");
    setIsLoadingAI(true);
    setLastFailedQuery(null);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          conversationId,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setLastFailedQuery(text);
        const errorText = data.message || "Saarthi is temporarily unavailable.";
        setMessages((prev) => [
          ...prev,
          {
            id: `err_${Date.now()}`,
            sender: "saarthi",
            text: errorText,
          },
        ]);
        return;
      }

      if (data.conversationId) {
        setConversationId(data.conversationId);
      }

      let matchedService: ServiceDetail | undefined = undefined;
      if (data.serviceId) {
        matchedService = POPULAR_SERVICES_LIST.find((s) => s.id === data.serviceId);
      }

      const aiMsg: Message = {
        id: `ai_${Date.now()}`,
        sender: "saarthi",
        text: data.message,
        link: data.suggestedLink,
        service: matchedService,
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      console.error("[FloatingSaarthiAI] Request failed:", err);
      setLastFailedQuery(text);
      setMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          sender: "saarthi",
          text: "Saarthi is temporarily unavailable. Please try again in a few moments.",
        },
      ]);
    } finally {
      setIsLoadingAI(false);
    }
  };

  const quickPrompts = [
    "Find a service",
    "Explain a requirement",
    "Prepare a document",
    "Help me apply",
  ];

  return (
    <>
      {/* 1. Floating Trigger Pill matching Reference Image */}
      {!isOpen && (
        <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end">
          <button
            onClick={handleOpen}
            className="group relative flex items-center gap-3 pl-4 pr-1.5 py-1.5 bg-gradient-to-r from-[#2F27CE] via-[#3830E0] to-[#433BFF] text-white rounded-full shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer ring-4 ring-indigo-500/10"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
              <span className="text-xs font-black tracking-wide pr-1">
                Ask Saarthi AI
              </span>
            </div>

            {/* Cute Friendly Robot Avatar inside Pill with Pulse Ring */}
            <div className="relative w-9 h-9 rounded-full bg-white/95 flex items-center justify-center text-[#2F27CE] shadow-sm">
              <span className="absolute inset-0 rounded-full bg-indigo-400 opacity-30 animate-ping pointer-events-none" />
              <Bot className="w-5 h-5 stroke-[2.2]" />
            </div>
          </button>
          <div className="text-[10px] font-semibold text-slate-400 mt-1.5 pr-2 select-none">
            Always here to help
          </div>
        </div>
      )}

      {/* 2. Compact Assistant Chat Panel */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-full max-w-sm sm:max-w-md bg-white border border-slate-200/90 rounded-3xl shadow-2xl flex flex-col h-[520px] overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200">
          {/* Header */}
          <div className="px-5 py-4 bg-gradient-to-r from-[#2F27CE] to-[#433BFF] text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-white border border-white/30">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black tracking-tight leading-tight flex items-center gap-1.5">
                  <span>Saarthi</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                </h3>
                <p className="text-[11px] text-indigo-100 font-medium leading-tight">
                  Your government-service assistant
                </p>
              </div>
            </div>

            <button
              onClick={handleClose}
              className="p-1.5 rounded-xl hover:bg-white/10 text-white/80 hover:text-white transition-colors cursor-pointer"
              aria-label="Close Saarthi AI"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Prompts Bar */}
          <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
            {quickPrompts.map((prompt) => (
              <button
                key={prompt}
                onClick={() => handleSendMessage(prompt)}
                className="shrink-0 text-[11px] font-semibold px-2.5 py-1 bg-white hover:bg-indigo-50 text-slate-700 hover:text-[#2F27CE] border border-slate-200 rounded-full transition-colors cursor-pointer"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Messages Area */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-[#FBFBFE]">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs font-medium leading-relaxed ${
                    msg.sender === "user"
                      ? "bg-[#2F27CE] text-white rounded-br-xs shadow-xs"
                      : "bg-white text-slate-800 border border-slate-200/80 rounded-bl-xs shadow-2xs"
                  }`}
                >
                  {msg.text}

                  {msg.id.startsWith("err_") && lastFailedQuery && (
                    <div className="mt-2 pt-2 border-t border-red-100 flex items-center justify-between">
                      <button
                        onClick={() => handleSendMessage(lastFailedQuery)}
                        className="text-[11px] font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-2.5 py-1 rounded-md transition-colors cursor-pointer"
                      >
                        Try Again
                      </button>
                    </div>
                  )}

                  {/* Card / Link inside AI response */}
                  {msg.link && (
                    <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                      <button
                        onClick={() => {
                          if (msg.service && onSelectService) {
                            onSelectService(msg.service);
                          } else {
                            window.open(msg.link!.url, "_blank", "noopener,noreferrer");
                          }
                        }}
                        className="text-[11px] font-bold text-[#2F27CE] hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <span>{msg.link.label}</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isLoadingAI && (
              <div className="flex flex-col items-start">
                <div className="max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs font-medium leading-relaxed bg-white text-slate-500 border border-slate-200/80 rounded-bl-xs shadow-2xs flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-500 animate-spin" />
                  <span>Saarthi is thinking...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Box */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage(inputQuery);
            }}
            className="p-3 bg-white border-t border-slate-100 flex items-center gap-2"
          >
            <input
              type="text"
              placeholder="Ask about any government scheme or requirement..."
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              className="flex-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2F27CE]/20 focus:border-[#2F27CE] transition-all font-medium"
            />
            <button
              type="submit"
              disabled={!inputQuery.trim()}
              className="p-2.5 rounded-xl bg-[#2F27CE] hover:bg-[#231CA8] active:scale-95 text-white disabled:opacity-40 transition-all cursor-pointer shrink-0"
              aria-label="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
