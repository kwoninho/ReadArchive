// 검색 후 요약 보강: Naver/Google이 돌려준 후보 중 요약이 부실·비한국어인 상위 N개를 Gemini로 재생성
import type { SearchCandidate } from "@/types";
import { GoogleGenerativeAI, type GenerativeModel } from "@google/generative-ai";
import { hangulRatio, isKoreanQuery } from "./language";

const SUMMARY_TIMEOUT_MS = 4000;
const MIN_SUMMARY_LEN = 80;
const MIN_HANGUL_RATIO_KO = 0.3; // 한글 쿼리 결과에서 요약이 한국어로 간주되는 최소 한글 비율
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

  return `아래 책의 핵심 내용을 2~3문장(최대 200자)으로 요약하세요.

**출력 규칙 (엄수)**:
- 반드시 한국어로만 작성. 영어·중국어·일본어 사용 금지.
- 메타데이터(제목·저자) 나열 금지, 책의 주제·메시지를 요약.
- 실제 존재하는 책인지 확신이 없거나 정보가 부족하면 빈 문자열만 반환.
- 요약 텍스트만 반환 (따옴표·설명·접두어 없이).

책 정보:
${meta}`;
}

async function generateSummary(c: SearchCandidate): Promise<string> {
  const model = getModel();
  const prompt = buildPrompt(c);
  const result = await withTimeout(model.generateContent(prompt), SUMMARY_TIMEOUT_MS);
  const text = result.response.text().trim();
  // 따옴표·백틱·코드펜스 제거
  return text
    .replace(/^```[\s\S]*?\n/, "")
    .replace(/```$/, "")
    .replace(/^["'`]+|["'`]+$/g, "")
    .trim();
}

function needsEnrichment(c: SearchCandidate, queryIsKorean: boolean): boolean {
  const s = c.summary?.trim() ?? "";
  // 너무 짧으면 무조건 재생성
  if (s.length < MIN_SUMMARY_LEN) return true;
  // 한국어 쿼리인데 요약에 한글이 거의 없으면(영문/다른언어) 재생성
  if (queryIsKorean && hangulRatio(s) < MIN_HANGUL_RATIO_KO) return true;
  return false;
}

export async function enrichSummaries(
  candidates: SearchCandidate[],
  query: string,
  topN: number = DEFAULT_TOP_N
): Promise<void> {
  if (!process.env.GEMINI_API_KEY) return;
  const queryIsKorean = isKoreanQuery(query);

  const targets = candidates
    .slice(0, topN)
    .filter((c) => needsEnrichment(c, queryIsKorean));
  if (targets.length === 0) return;

  console.log(`[summary] enriching ${targets.length} candidates (koQuery=${queryIsKorean})`);

  await Promise.allSettled(
    targets.map(async (c) => {
      try {
        const next = await generateSummary(c);
        if (!next) return;
        // 한글 쿼리인데 결과도 비한국어면 스킵 (잘못된 재생성 방지)
        if (queryIsKorean && hangulRatio(next) < MIN_HANGUL_RATIO_KO) return;
        if (next.length < MIN_SUMMARY_LEN / 2) return;
        c.summary = next.length > 300 ? next.slice(0, 300) : next;
      } catch {
        // 개별 실패 삼킴
      }
    })
  );
}
