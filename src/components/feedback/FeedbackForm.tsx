"use client";

import { Send } from "lucide-react";
import { useState } from "react";

const MAX_LENGTH = 2000;

const fieldClass =
  "w-full rounded-lg border border-line-strong bg-panel px-3 text-[13.5px] text-ink outline-none transition placeholder:text-ink-3 focus:border-accent";

/** 反馈经访客自己的邮件客户端发出(mailto)，站点不收集、不存储任何内容。 */
export function FeedbackForm({ to }: { to: string }) {
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");

  const send = () => {
    const body = [message.trim(), email.trim() ? `\n——\n回复邮箱：${email.trim()}` : ""].join("\n");
    window.location.href = `mailto:${to}?subject=${encodeURIComponent("早筛情报站反馈")}&body=${encodeURIComponent(body)}`;
  };

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        send();
      }}
      className="rounded-xl border border-line bg-panel p-4 shadow-panel sm:p-5"
    >
      <label htmlFor="feedback-message" className="sr-only">
        反馈内容
      </label>
      <textarea
        id="feedback-message"
        value={message}
        onChange={(event) => setMessage(event.target.value.slice(0, MAX_LENGTH))}
        rows={8}
        required
        placeholder="数据勘误(请附出处)、想加的企业或信源、功能建议、使用问题"
        className={`${fieldClass} resize-y py-[10px] leading-[1.7]`}
      />
      <div className="mt-1 text-right text-[11.5px] tabular-nums text-ink-3">
        {message.length}/{MAX_LENGTH}
      </div>

      <label htmlFor="feedback-email" className="sr-only">
        回复邮箱(选填)
      </label>
      <input
        id="feedback-email"
        type="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder="回复邮箱(选填)"
        autoComplete="email"
        className={`${fieldClass} mt-2 h-[38px] sm:max-w-[320px]`}
      />

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={!message.trim()}
          className="inline-flex h-[36px] items-center gap-[6px] rounded-lg bg-accent px-4 text-[13.5px] font-semibold text-panel transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Send size={14} aria-hidden />
          发送
        </button>
        <a href={`mailto:${to}`} className="text-[12.5px] text-ink-3 transition hover:text-accent-ink">
          {to}
        </a>
      </div>
      <p className="mt-4 text-[12px] leading-[1.7] text-ink-3">请勿提交密钥、患者信息或其他敏感内容。</p>
    </form>
  );
}
