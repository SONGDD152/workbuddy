// AI 报告：基于条目下全部碎片笔记整合生成，流式输出。
// 有 OPENAI_API_KEY 走真实大模型；无 key 时基于真实笔记组装，明确标注不编造。

export type ReportKind = "book" | "movie" | "study";

export interface ReportInput {
  kind: ReportKind;
  title: string;
  notes: string[]; // 碎片笔记（按时间倒序传入）
  related?: string[]; // 同类历史标题（用于"关联"章节）
}

const SECTIONS: Record<ReportKind, string[]> = {
  book: [
    "核心观点提炼",
    "个人感悟汇总",
    "金句摘录",
    "作者写作技巧分析",
    "逻辑思路分析",
    "关联同类历史书籍",
    "评分",
    "一句话总结",
  ],
  movie: [
    "核心观点提炼",
    "个人感悟汇总",
    "金句 / 名场面摘录",
    "导演 / 编剧技巧分析",
    "叙事与逻辑分析",
    "关联同类影片",
    "评分",
    "一句话总结",
  ],
  study: [
    "知识框架梳理",
    "个人理解",
    "关键公式 / 代码 / 图表摘录",
    "关联其他主题",
    "待深入方向",
  ],
};

function systemPrompt(kind: ReportKind): string {
  const sub =
    kind === "study"
      ? "你是学习总结助手，请基于用户提供的学习碎片笔记，梳理知识框架、提炼个人理解，不要编造笔记中没有的事实。"
      : "你是读后/观后报告助手，请基于用户提供的碎片笔记，整合生成结构化报告，不要编造笔记中没有的内容。";
  return `${sub}\n请严格使用以下 Markdown 章节（# 一级标题）：\n${SECTIONS[kind]
    .map((s) => `- ${s}`)
    .join("\n")}\n输出语言：中文。评分用 /10。一句话总结放在最后并精炼。`;
}

function buildUserPrompt(input: ReportInput): string {
  const notesBlock = input.notes
    .map((n, i) => `${i + 1}. ${n}`)
    .join("\n");
  const relatedBlock = input.related?.length
    ? `\n同类历史：${input.related.join("、")}`
    : "";
  return `标题：《${input.title}》\n以下是我的碎片笔记（按时间顺序）：\n${notesBlock}${relatedBlock}\n\n请生成报告。`;
}

function fallbackMarkdown(input: ReportInput): string {
  const notesList = input.notes.map((n, i) => `${i + 1}. ${n}`).join("\n");
  const related = input.related?.length
    ? input.related.map((r) => `- 《${r}》`).join("\n")
    : "- （暂无同类历史记录）";
  const infer = "（此处需你基于上方笔记进一步提炼；当前为无 AI Key 的离线模式，未自动生成推断内容）";
  const parts = SECTIONS[input.kind].map((s) => {
    if (s === "评分") return `## 评分\n\n（请自行打分 /10）`;
    if (s === "一句话总结") return `## 一句话总结\n\n（用一句话概括《${input.title}》）`;
    if (s.startsWith("关联")) return `## ${s}\n\n${related}`;
    if (s === "金句摘录" || s === "金句 / 名场面摘录")
      return `## ${s}\n\n${infer}`;
    return `## ${s}\n\n${infer}`;
  });
  return `# 《${input.title}》${input.kind === "study" ? "学习总结" : "报告"}\n\n> 离线模式：以下基于你的真实笔记组装，推断性内容已标注，未编造。\n\n${parts.join("\n\n")}\n\n---\n### 原始笔记\n${notesList}\n`;
}

export async function streamReport(input: ReportInput): Promise<ReadableStream<Uint8Array>> {
  const enc = new TextEncoder();
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    const md = fallbackMarkdown(input);
    return new ReadableStream({
      start(controller) {
        controller.enqueue(enc.encode(md));
        controller.close();
      },
    });
  }

  const base = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  const res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      stream: true,
      temperature: 0.7,
      messages: [
        { role: "system", content: systemPrompt(input.kind) },
        { role: "user", content: buildUserPrompt(input) },
      ],
    }),
  });

  if (!res.ok || !res.body) {
    const md = fallbackMarkdown(input);
    return new ReadableStream({
      start(controller) {
        controller.enqueue(enc.encode(md));
        controller.close();
      },
    });
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";

  return new ReadableStream({
    async pull(controller) {
      const { done, value } = await reader.read();
      if (done) {
        controller.close();
        return;
      }
      buf += decoder.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() || "";
      for (const line of lines) {
        const t = line.trim();
        if (!t.startsWith("data:")) continue;
        const data = t.slice(5).trim();
        if (data === "[DONE]") {
          controller.close();
          return;
        }
        try {
          const json = JSON.parse(data);
          const delta = json.choices?.[0]?.delta?.content;
          if (delta) controller.enqueue(enc.encode(delta));
        } catch {
          /* ignore */
        }
      }
    },
    cancel() {
      reader.cancel();
    },
  });
}
