import { JSDOM } from "jsdom";
import { OIT_Eval } from "./types";

const formatRatingsURL = (ratingsUrl: string, term: string, courseId: string) =>
  `${ratingsUrl}terminfo=${term}&courseinfo=${courseId}`;

const getEvalTerms = (pageText: string): string[] => {
  const dom = new JSDOM(pageText);
  const termLinks = dom.window.document.querySelectorAll(".terms-list .term-link");

  const terms: string[] = [];

  termLinks.forEach((link) => {
    const href = link.getAttribute("href");
    if (href) {
      const urlParams = new URLSearchParams(href.split("?")[1]);
      const termInfo = urlParams.get("terminfo");
      if (termInfo) {
        terms.push(termInfo);
      }
    }
  });

  return terms;
};

// Analyze the webpage and return the evaluation text + number of evals, or null if none found
const parseEvals = (pageText: string) => {
  const NULL_STRING = "the class you selected are not available online";
  if (pageText.includes(NULL_STRING)) return null;

  const dom = new JSDOM(pageText);
  const comments = dom.window.document.querySelectorAll(".comment");
  const text: string[] = [...comments].map((x) => x.textContent).filter((x) => x !== null);
  if (!text) return null;

  return { numComments: text.length, comments: text };
};

type RatingPair = {
  rating: number;
  ratingSource: string;
};

const parseRating = (pageText: string): RatingPair | null => {
  const NULL_STRING = "the class you selected are not available online";
  if (pageText.includes(NULL_STRING)) return null;

  const dom = new JSDOM(pageText);

  const evalLabels = dom.window.document.querySelectorAll("tr")[0].querySelectorAll("th");
  const evalRatings = dom.window.document.querySelectorAll("tr")[1].querySelectorAll("td");

  const evalMap = new Map<string, number>();
  for (let i = 0; i < evalLabels.length; i++) {
    const label = evalLabels[i].textContent;
    const rating = evalRatings[i].textContent;
    if (rating === null || label === null) continue;
    evalMap.set(label, parseFloat(rating));
  }

  // Find the first category that has a rating (order of priority)
  const CATEGORIES = [
    "Quality of Course", // General
    "Overall Quality of the Course", // Some grad courses
    "Overall Course Quality Rating", // FRS
    "Quality of the Seminar", // Seminar Edge Case
    "Quality of Lectures", // Lecture Edge Case
    "Quality of Precepts", // Precept Edge Case
    "Quality of Laboratories", // Lab Edge Case
    "Recommend to Other Students", // Edge Case
    "Quality of Readings", // Fallback
    "Quality of Written Assignments", // Fallback
  ];

  for (const category of CATEGORIES) {
    if (evalMap.has(category))
      return {
        rating: evalMap.get(category)!,
        ratingSource: category,
      };
  }

  return null;
};

export type ScrapeEvalsForCourseParams = {
  evalUrl: string;
  sessionToken: string;
  courseId: string;
};

export const scrapeCourseEvals = async (
  params: ScrapeEvalsForCourseParams
): Promise<Record<string, OIT_Eval[]>> => {
  const { evalUrl, sessionToken, courseId } = params;
  const initUrl = formatRatingsURL(evalUrl, "", courseId);
  const initRes = await fetch(initUrl, {
    headers: {
      cookie: "PHPSESSID=" + sessionToken,
    },
  });
  if (!initRes.ok) {
    throw new Error(`Failed to fetch course evaluations for ${courseId}: ${initRes.statusText}`);
  }
  const initText = await initRes.text();
  const termsWithEvals = getEvalTerms(initText);

  const courseEvals: Record<string, OIT_Eval[]> = {};
  for (const term of termsWithEvals) {
    const termUrl = formatRatingsURL(evalUrl, term, courseId);
    const termRes = await fetch(termUrl, {
      headers: {
        cookie: "PHPSESSID=" + sessionToken,
      },
    });
    const text = await termRes.text();
    const evals = parseEvals(text);
    const rating = parseRating(text);
    if (evals && rating) courseEvals[term] = [{ ...evals, ...rating }];
    else throw new Error(`Failed to parse evaluations for course ${courseId}, term ${term}`);
  }

  return courseEvals;
};
