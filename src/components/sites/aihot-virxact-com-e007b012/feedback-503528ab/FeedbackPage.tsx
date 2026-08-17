"use client";

import { useState } from "react";
import { Mail, Send } from "lucide-react";

const FEEDBACK_EMAIL = "yunyang.wei@geneseeq.com";

/**
 * 反馈页 — 参照模板站 / feedback。
 * 「发送反馈」按钮经 mailto 指向 yunyang.wei@geneseeq.com。
 */
export function FeedbackPage() {
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");

  const send = () => {
    const subject = encodeURIComponent("早筛情报站反馈");
    const body = encodeURIComponent(
      `${message}\n\n——\n联系邮箱：${email || "(未留)"}\n页面：早筛情报站(本地演示)`
    );
    window.location.href = `mailto:${FEEDBACK_EMAIL}?subject=${subject}&body=${body}`;
  };

  return (
    <div className="grid gap-4">
      <header className="pt-[6px]">
        <h1 className="m-0 text-[23px] font-bold leading-[1.2] tracking-[-0.01em] text-mc-ink">
          反馈
        </h1>
        <p className="mt-[5px] max-w-[700px] text-[12px] leading-[1.6] text-mc-ink2">
          发现数据错误、想要的监测维度、看不顺眼的地方——都可以告诉我，我都会看到。
        </p>
        <hr className="mt-[10px] mb-[8px] border-0 border-t border-mc-line-soft" />
      </header>

      <section className="rounded-xl border border-mc-line bg-mc-card p-[16px_18px] shadow-mc-card">
        <label className="block text-[12.5px] font-semibold text-mc-ink" htmlFor="fb-msg">
          想说点什么?
        </label>
        <textarea
          id="fb-msg"
          value={message}
          onChange={(e) => setMessage(e.target.value.slice(0, 2000))}
          rows={7}
          placeholder="数据勘误(请附出处)、想加的竞品或信源、功能建议、使用问题…"
          className="mt-[8px] w-full resize-y rounded-[8px] border border-mc-line-strong bg-mc-surface0 px-[12px] py-[10px] text-[13px] leading-[1.7] text-mc-ink outline-none transition placeholder:text-mc-ink2 focus:border-[rgba(var(--theme-accent-rgb),.3)] focus:bg-mc-surface2 focus:[box-shadow:0_0_0_3px_rgba(var(--theme-accent-rgb),.12)]"
        />
        <div className="mt-[4px] text-right text-[11px] tabular-nums text-mc-ink2">
          {message.length}/2000
        </div>

        <label
          className="mt-[10px] block text-[12.5px] font-semibold text-mc-ink"
          htmlFor="fb-email"
        >
          邮箱(选填)
        </label>
        <input
          id="fb-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="方便回复你的话再留"
          className="mt-[8px] w-full max-w-[360px] rounded-[8px] border border-mc-line-strong bg-mc-surface0 px-[12px] py-[8px] text-[13px] text-mc-ink outline-none transition placeholder:text-mc-ink2 focus:border-[rgba(var(--theme-accent-rgb),.3)] focus:bg-mc-surface2 focus:[box-shadow:0_0_0_3px_rgba(var(--theme-accent-rgb),.12)]"
        />

        <div className="mt-[14px] flex flex-wrap items-center gap-[12px]">
          <button
            type="button"
            onClick={send}
            disabled={message.trim().length === 0}
            className="inline-flex min-h-[34px] items-center gap-[6px] rounded-[8px] border border-mc-accent bg-mc-accent px-[16px] py-[5px] text-[13px] font-semibold text-mc-accent-contrast transition hover:bg-mc-accent-hover active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Send size={14}/>
            发送反馈
          </button>
          <span className="inline-flex items-center gap-[5px] text-[12px] text-mc-ink2">
            <Mail size={13}/>
            发送至 {FEEDBACK_EMAIL}
          </span>
        </div>

        <p className="mt-[14px] text-[11.5px] leading-[1.7] text-mc-ink2">
          请勿提交密钥、患者信息或与问题无关的敏感信息。反馈内容、选填邮箱与页面信息仅用于改进本看板。
        </p>
      </section>
    </div>
  );
}
