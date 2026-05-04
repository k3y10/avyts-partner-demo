"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import { ArrowRight, Bot, ChevronDown, ChevronUp, MessageSquareText, Send, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SherpAIWindowMetric {
  label: string;
  value: string;
  icon: LucideIcon;
}

export interface SherpAIWindowProps {
  kicker: string;
  title: string;
  summary: string;
  modeLabel: string;
  roleLabel?: string;
  contextPills?: string[];
  metrics?: SherpAIWindowMetric[];
  suggestedPrompts: string[];
  handoff: string;
  introMessage: string;
  buildReply: (prompt: string) => string;
  promptTitle?: string;
  chatContextLabel?: string;
  showPromptPack?: boolean;
  quickReplyCount?: number;
  composerRows?: number;
  hideModeBadge?: boolean;
  contentScrollable?: boolean;
  chatScrollable?: boolean;
  chatMaxHeightClass?: string;
  showContextPills?: boolean;
  showQuickReplies?: boolean;
  showChatContextLabel?: boolean;
  chatTitle?: string;
  collapsibleChat?: boolean;
  defaultChatOpen?: boolean;
  children?: ReactNode;
  className?: string;
}

export function SherpAIWindow({
  kicker,
  title,
  summary,
  modeLabel,
  roleLabel,
  contextPills = [],
  metrics = [],
  suggestedPrompts,
  handoff,
  introMessage,
  buildReply,
  promptTitle = "Prompt pack",
  chatContextLabel = "Current context",
  showPromptPack = true,
  quickReplyCount = 2,
  composerRows = 2,
  hideModeBadge = false,
  contentScrollable = true,
  chatScrollable = true,
  chatMaxHeightClass = "max-h-[30vh] sm:max-h-[320px]",
  showContextPills = true,
  showQuickReplies = true,
  showChatContextLabel = true,
  chatTitle = "Ask the guide",
  collapsibleChat = false,
  defaultChatOpen = true,
  children,
  className,
}: SherpAIWindowProps) {
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<Array<{ id: string; role: "assistant" | "user"; text: string }>>([
    { id: "assistant-intro", role: "assistant", text: introMessage },
  ]);
  const [chatOpen, setChatOpen] = useState(defaultChatOpen);
  const messagesRef = useRef<HTMLDivElement | null>(null);

  const quickReplies = useMemo(() => suggestedPrompts.slice(0, quickReplyCount), [quickReplyCount, suggestedPrompts]);

  useEffect(() => {
    const node = messagesRef.current;
    if (!node) {
      return;
    }
    node.scrollTop = node.scrollHeight;
  }, [messages]);

  function submitPrompt(prompt: string) {
    const trimmed = prompt.trim();
    if (!trimmed) {
      return;
    }

    setMessages((current) => [
      ...current,
      { id: `user-${current.length + 1}`, role: "user", text: trimmed },
      { id: `assistant-${current.length + 2}`, role: "assistant", text: buildReply(trimmed) },
    ]);
    setDraft("");
  }

  return (
    <section className={cn("glass-card relative flex min-h-0 max-h-full flex-col overflow-hidden rounded-[1.35rem] ring-1 ring-white/45 shadow-[0_30px_82px_rgba(15,23,42,0.18)] dark:ring-white/6", className)}>
      <div className="border-b border-white/65 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.22),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(243,248,252,0.92)_100%)] p-4 backdrop-blur-2xl dark:border-white/10 dark:bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.18),transparent_32%),linear-gradient(180deg,rgba(8,16,28,0.96)_0%,rgba(15,23,42,0.92)_100%)]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <div className="relative mt-0.5 shrink-0 rounded-[1.05rem] border border-sky-100 bg-[linear-gradient(180deg,#ffffff_0%,#ecf6ff_100%)] p-2.5 shadow-[0_10px_24px_rgba(14,165,233,0.18)] dark:border-sky-400/20 dark:bg-[linear-gradient(180deg,rgba(56,189,248,0.14)_0%,rgba(15,23,42,0.92)_100%)]">
              <div className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_0_5px_rgba(74,222,128,0.18)]" />
              <Image src="/brand/sherpai.png" alt="SherpAI" width={28} height={28} className="rounded-full" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-sky-700 dark:text-sky-300">
                <span>{kicker}</span>
                <span className="rounded-full border border-sky-200/80 bg-white/92 px-2 py-0.5 text-[9px] tracking-[0.18em] text-sky-700 shadow-[0_8px_18px_rgba(14,165,233,0.12)] dark:border-sky-400/20 dark:bg-sky-400/12 dark:text-sky-200">Live</span>
              </div>
              <div className="mt-1 text-[1.08rem] font-semibold leading-6 text-slate-950 dark:text-white">{title}</div>
              <p className="mt-2 max-w-[56ch] text-sm leading-6 text-slate-600 dark:text-slate-300">{summary}</p>
            </div>
          </div>
          {hideModeBadge ? null : (
            <div className="self-start rounded-full border border-slate-200/85 bg-white/94 px-3 py-1.5 text-right text-[11px] font-medium text-slate-700 shadow-[0_10px_24px_rgba(15,23,42,0.08)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/88 dark:text-slate-200">
              {roleLabel ? <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-sky-700 dark:text-sky-300">{roleLabel}</div> : null}
              <div>{modeLabel}</div>
            </div>
          )}
        </div>

        {showContextPills && contextPills.length ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {contextPills.slice(0, 3).map((pill) => (
              <span key={pill} className="rounded-full border border-slate-200/80 bg-white/92 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-700 shadow-[0_8px_18px_rgba(15,23,42,0.05)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/88 dark:text-slate-200">
                {pill}
              </span>
            ))}
          </div>
        ) : null}

        {metrics.length ? (
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            {metrics.map((metric) => (
              <div key={metric.label} className="rounded-[0.95rem] border border-slate-200/75 bg-white/92 px-3 py-2 shadow-[0_10px_24px_rgba(15,23,42,0.06)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/82">
                <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                  <metric.icon className="h-3.5 w-3.5 text-sky-700 dark:text-sky-300" /> {metric.label}
                </div>
                <div className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{metric.value}</div>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <div className={cn("min-h-0 p-4", contentScrollable ? "overflow-y-auto" : "overflow-visible")}>
        {children}

        {showPromptPack ? (
          <div className={cn(children ? "mt-4" : "", "glass-popover rounded-[1rem] p-4")}>
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-950 dark:text-white">
              <Bot className="h-4 w-4 text-sky-700 dark:text-sky-300" /> {promptTitle}
            </div>
            <div className="mt-3 grid gap-2">
              {suggestedPrompts.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => submitPrompt(item)}
                  className="rounded-[0.95rem] border border-slate-200/90 bg-white/95 px-3 py-2 text-left text-sm text-slate-800 shadow-[0_10px_24px_rgba(15,23,42,0.04)] transition hover:-translate-y-0.5 hover:border-sky-200 hover:bg-sky-50/70 dark:border-white/10 dark:bg-slate-900/92 dark:text-slate-100 dark:hover:border-sky-400/20 dark:hover:bg-slate-800"
                >
                  {item}
                </button>
              ))}
            </div>
            <div className="mt-4 flex items-start gap-2 rounded-[0.95rem] border border-sky-200/80 bg-sky-50/92 px-3 py-2 text-sm text-slate-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] dark:border-sky-400/20 dark:bg-sky-500/10 dark:text-slate-100">
              <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-sky-700 dark:text-sky-300" />
              <span>{handoff}</span>
            </div>
          </div>
        ) : children ? null : (
          <div className="glass-popover rounded-[0.95rem] px-3 py-2 text-sm text-slate-800 dark:text-slate-100">
            {handoff}
          </div>
        )}

        <div className="glass-panel mt-4 rounded-[1.05rem] p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-950 dark:text-white">
                <MessageSquareText className="h-4 w-4 text-sky-700 dark:text-sky-300" /> {chatTitle}
              </div>
              {showChatContextLabel ? <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">{chatContextLabel}</div> : null}
            </div>
            {collapsibleChat ? (
              <button
                type="button"
                onClick={() => setChatOpen((current) => !current)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200/90 bg-white/95 text-slate-700 shadow-[0_10px_20px_rgba(15,23,42,0.06)] transition hover:border-sky-200 hover:bg-sky-50 dark:border-white/10 dark:bg-slate-900/92 dark:text-slate-100 dark:hover:border-sky-400/20 dark:hover:bg-slate-800"
                aria-label={chatOpen ? "Collapse chat" : "Expand chat"}
              >
                {chatOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
            ) : null}
          </div>

          {chatOpen ? (
            <>
              <div
                ref={messagesRef}
                className={cn(
                  "glass-popover sherpai-scroll mt-3 min-h-[150px] space-y-3 rounded-[1rem] p-3",
                  chatScrollable ? [chatMaxHeightClass, "overflow-y-auto"] : "overflow-visible",
                )}
              >
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      "max-w-[95%] rounded-[1rem] px-3 py-2.5 text-sm leading-6 shadow-[0_10px_24px_rgba(15,23,42,0.05)] sm:max-w-[88%]",
                      message.role === "assistant"
                        ? "border border-sky-200/80 bg-white/96 text-slate-800 dark:border-sky-400/20 dark:bg-slate-900/96 dark:text-slate-100"
                        : "ml-auto border border-slate-900/10 bg-[linear-gradient(180deg,#0f172a_0%,#162338_100%)] text-white dark:border-sky-300/20 dark:bg-[linear-gradient(180deg,rgba(56,189,248,0.24)_0%,rgba(15,23,42,0.98)_100%)] dark:text-slate-50",
                    )}
                  >
                    <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                      {message.role === "assistant" ? "Guide" : "You"}
                    </div>
                    <div>{message.text}</div>
                  </div>
                ))}
              </div>

              {showQuickReplies ? (
                <div className="sherpai-scroll mt-3 flex gap-2 overflow-x-auto pb-1">
                  {quickReplies.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => submitPrompt(item)}
                      className="shrink-0 rounded-full border border-slate-200/90 bg-white/95 px-3 py-1.5 text-[11px] font-semibold text-slate-700 shadow-[0_8px_18px_rgba(15,23,42,0.04)] transition hover:border-sky-200 hover:bg-sky-50/70 dark:border-white/10 dark:bg-slate-900/92 dark:text-slate-100 dark:hover:border-sky-400/20 dark:hover:bg-slate-800"
                    >
                      {item}
                    </button>
                  ))}
                </div>
              ) : null}

              <form
                className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end"
                onSubmit={(event) => {
                  event.preventDefault();
                  submitPrompt(draft);
                }}
              >
                <textarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  rows={composerRows}
                  placeholder="Ask about the current context or next step."
                  className="min-h-[84px] w-full flex-1 resize-y rounded-[1rem] border border-slate-200/90 bg-white/95 px-4 py-3 text-sm leading-6 text-slate-800 outline-none shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100 dark:border-white/10 dark:bg-slate-900/94 dark:text-slate-100 dark:focus:border-sky-400/20 dark:focus:ring-sky-400/10"
                />
                <button
                  type="submit"
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full border border-slate-900 bg-[linear-gradient(180deg,#0f172a_0%,#162338_100%)] px-4 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-[0_14px_28px_rgba(15,23,42,0.18)] sm:w-auto dark:border-sky-400/20 dark:bg-[linear-gradient(180deg,#e2e8f0_0%,#f8fafc_100%)] dark:text-slate-950 dark:hover:bg-white"
                >
                  <Send className="h-4 w-4" /> Send
                </button>
              </form>
            </>
          ) : (
            <div className="glass-popover mt-3 rounded-[0.95rem] px-3 py-3 text-sm text-slate-700 dark:text-slate-200">
              Open the chat when you want a route read, comparison, or short operational brief for this terrain.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}