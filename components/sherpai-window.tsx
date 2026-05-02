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
    <section className={cn("flex min-h-0 max-h-full flex-col overflow-hidden rounded-[1.35rem] border border-slate-200/90 bg-[linear-gradient(180deg,#ffffff_0%,#f7fafc_100%)] shadow-[0_24px_60px_rgba(15,23,42,0.12)] dark:border-white/10 dark:bg-[linear-gradient(180deg,#08101c_0%,#0f172a_100%)]", className)}>
      <div className="border-b border-slate-200/85 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.14),transparent_34%),linear-gradient(180deg,#fbfdff_0%,#f3f8fc_100%)] p-4 dark:border-white/10 dark:bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.12),transparent_32%),linear-gradient(180deg,#09111d_0%,#0f172a_100%)]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <div className="relative mt-0.5 shrink-0 rounded-[1.05rem] border border-sky-100 bg-[linear-gradient(180deg,#ffffff_0%,#ecf6ff_100%)] p-2.5 shadow-[0_10px_24px_rgba(14,165,233,0.18)] dark:border-sky-400/20 dark:bg-[linear-gradient(180deg,rgba(56,189,248,0.14)_0%,rgba(15,23,42,0.92)_100%)]">
              <div className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_0_5px_rgba(74,222,128,0.18)]" />
              <Image src="/brand/sherpai.png" alt="SherpAI" width={28} height={28} className="rounded-full" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-sky-700 dark:text-sky-300">
                <span>{kicker}</span>
                <span className="rounded-full border border-sky-200/80 bg-white/85 px-2 py-0.5 text-[9px] tracking-[0.18em] text-sky-700 dark:border-sky-400/20 dark:bg-sky-400/10 dark:text-sky-200">Live</span>
              </div>
              <div className="mt-1 text-[1.08rem] font-semibold leading-6 text-slate-950 dark:text-white">{title}</div>
              <p className="mt-2 max-w-[56ch] text-sm leading-6 text-slate-600 dark:text-slate-300">{summary}</p>
            </div>
          </div>
          {hideModeBadge ? null : (
            <div className="self-start rounded-full border border-slate-200 bg-white/90 px-3 py-1.5 text-right text-[11px] font-medium text-slate-600 shadow-sm dark:border-white/10 dark:bg-slate-900/85 dark:text-slate-300">
              {roleLabel ? <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-sky-700 dark:text-sky-300">{roleLabel}</div> : null}
              <div>{modeLabel}</div>
            </div>
          )}
        </div>

        {showContextPills && contextPills.length ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {contextPills.slice(0, 3).map((pill) => (
              <span key={pill} className="rounded-full border border-slate-200/80 bg-white/85 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                {pill}
              </span>
            ))}
          </div>
        ) : null}

        {metrics.length ? (
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            {metrics.map((metric) => (
              <div key={metric.label} className="rounded-[0.95rem] border border-slate-200/70 bg-white/85 px-3 py-2 shadow-[0_8px_18px_rgba(15,23,42,0.04)] dark:border-white/10 dark:bg-white/5">
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
          <div className={cn(children ? "mt-4" : "", "rounded-[1rem] border border-slate-200/80 bg-[linear-gradient(180deg,#f8fafc_0%,#f2f7fb_100%)] p-4 dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.05)_0%,rgba(255,255,255,0.03)_100%)]")}>
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-950 dark:text-white">
              <Bot className="h-4 w-4 text-sky-700 dark:text-sky-300" /> {promptTitle}
            </div>
            <div className="mt-3 grid gap-2">
              {suggestedPrompts.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => submitPrompt(item)}
                  className="rounded-[0.95rem] border border-slate-200 bg-white px-3 py-2 text-left text-sm text-slate-700 transition hover:-translate-y-0.5 hover:border-sky-200 hover:bg-sky-50/50 dark:border-white/10 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-sky-400/20 dark:hover:bg-slate-800"
                >
                  {item}
                </button>
              ))}
            </div>
            <div className="mt-4 flex items-start gap-2 rounded-[0.95rem] border border-sky-200/80 bg-white px-3 py-2 text-sm text-slate-700 dark:border-sky-400/20 dark:bg-slate-900 dark:text-slate-200">
              <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-sky-700 dark:text-sky-300" />
              <span>{handoff}</span>
            </div>
          </div>
        ) : children ? null : (
          <div className="rounded-[0.95rem] border border-slate-200/80 bg-[linear-gradient(180deg,#f8fafc_0%,#f2f7fb_100%)] px-3 py-2 text-sm text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
            {handoff}
          </div>
        )}

        <div className="mt-4 rounded-[1.05rem] border border-slate-200/80 bg-[linear-gradient(180deg,#f8fafc_0%,#eef4f8_100%)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.05)_0%,rgba(255,255,255,0.03)_100%)]">
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
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:border-sky-200 hover:bg-sky-50 dark:border-white/10 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-sky-400/20 dark:hover:bg-slate-800"
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
                  "sherpai-scroll mt-3 min-h-[150px] space-y-3 rounded-[1rem] border border-slate-200/80 bg-white/90 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] dark:border-white/10 dark:bg-slate-950/85",
                  chatScrollable ? [chatMaxHeightClass, "overflow-y-auto"] : "overflow-visible",
                )}
              >
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      "max-w-[95%] rounded-[1rem] px-3 py-2.5 text-sm leading-6 shadow-[0_10px_24px_rgba(15,23,42,0.05)] sm:max-w-[88%]",
                      message.role === "assistant"
                        ? "border border-sky-100 bg-[linear-gradient(180deg,#ffffff_0%,#f7fbff_100%)] text-slate-700 dark:border-sky-400/15 dark:bg-slate-900 dark:text-slate-200"
                        : "ml-auto bg-[linear-gradient(180deg,#0f172a_0%,#162338_100%)] text-white dark:bg-[linear-gradient(180deg,#e2e8f0_0%,#f8fafc_100%)] dark:text-slate-950",
                    )}
                  >
                    <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
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
                      className="shrink-0 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-600 transition hover:border-sky-200 hover:bg-sky-50/70 dark:border-white/10 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-sky-400/20 dark:hover:bg-slate-800"
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
                  className="min-h-[84px] w-full flex-1 resize-y rounded-[1rem] border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-700 outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100 dark:border-white/10 dark:bg-slate-900 dark:text-slate-200 dark:focus:border-sky-400/20 dark:focus:ring-sky-400/10"
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
            <div className="mt-3 rounded-[0.95rem] border border-slate-200 bg-white px-3 py-3 text-sm text-slate-600 dark:border-white/10 dark:bg-slate-900 dark:text-slate-300">
              Open the chat when you want a route read, comparison, or short operational brief for this terrain.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}