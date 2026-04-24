// 검색 후 요약 보강: Naver/Google이 돌려준 후보 중 요약이 부실한 상위 N개를 Gemini로 재생성
import type { SearchCandidate } from "@/types";
import { GoogleGenerativeAI, type GenerativeModel } from "@google/generative-ai";

const SUMMARY_TIMEOUT_MS = 3000;
const MIN_SUMMARY_LEN = 80;
const DEFAULT_TOP_N = 3;

let summaryModel: GenerativeModel | null = null;

function getModel(): GenerativeModel {
  if (!summaryModel) {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    summaryModel = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 256,
      },
    });
  }
  return summaryModel;
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`summary 타임아웃 (${ms}ms)`)), ms);
  });
  return Promise.race([p, timeout]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

function buildPrompt(c: SearchCandidate): string {
  const meta = [
    `제목: ${c.title}`,
    c.author ? `저자: ${c.author}` : "",
    c.publisher ? `출판사: ${c.publisher}` : "",
    c.publishedYear > 0 ? `출간년도: ${c.publishedYear}` : "",
    c.category ? `분류: ${c.category}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  return `다음 책의 핵심 내용을 한국어로 2~3문장(최대 200자)으로 요약해주세요.
실제로 존재하는 책인지 확신이 없거나 정보가 부족하면 빈 문자열만 반환하세요.
메타데이터 나열이 아닌 책의 주제·메시지를 요약하세요. 답변은 요약 텍스트만 반환하세요.

${meta}`;
}

async function generateSummary(c: SearchCandidate): Promise<string> {
  const model = getModel();
  const prompt = buildPrompt(c);
  const result = await withTimeout(model.generateContent(prompt), SUMMARY_TIMEOUT_MS);
  const text = result.response.text().trim();
  // 따옴표·백틱·코드펜스 제거
  return text.replace(/^["'`]+|["'`]+$/g, "").replace(/^```[\s\S]*?\n|```$/g, "").trim();
}

export async function enrichSummaries(
  candidates: SearchCandidate[],
  topN: number = DEFAULT_TOP_N
): Promise<void> {
  if (!process.env.GEMINI_API_KEY) return;
  const targets = candidates
    .slice(0, topN)
    .filter((c) => !c.summary || c.summary.trim().length < MIN_SUMMARY_LEN);
  if (targets.length === 0) return;

  await Promise.allSettled(
    targets.map(async (c) => {
      try {
        const next = await generateSummary(c);
        if (next && next.length >= MIN_SUMMARY_LEN / 2) {
          c.summary = next.length > 300 ? next.slice(0, 300) : next;
        }
      } catch {
        // 개별 실패 삼킴
      }
    })
  );
}
