// src/oit/index.ts
// Author(s): Joshua Lau

import * as t from "./types";
import * as h from "./helpers";
import { I_OIT_API } from "./interface";
import { scrapeCourseEvals } from "./evals";

export default class OIT_API implements I_OIT_API {
  private readonly regPublicUrl = "https://api.princeton.edu/registrar/course-offerings/classes/";
  private readonly baseUrl = "https://api.princeton.edu/student-app/1.0.3";
  private readonly evalUrl = "https://registrarapps.princeton.edu/course-evaluation?";

  private apiKey: string;
  private sessionToken: string;

  constructor() {
    if (!process.env.API_ACCESS_TOKEN)
      throw new Error("API_ACCESS_TOKEN environment variable is not set.");
    this.apiKey = process.env.API_ACCESS_TOKEN;
    this.sessionToken = process.env.SESSION_TOKEN || "";
  }

  private async fetchOIT<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
      },
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch OIT API: ${response.statusText}`);
    }
    return await response.json();
  }

  async __oit_getTerms(): Promise<t.OIT_Term[]> {
    const data = await this.fetchOIT<{
      term: t.OIT_Term[];
    }>("/courses/terms?fmt=json");
    return data.term;
  }

  async __oit_getCourses(
    options: {
      term?: string;
      subject?: string;
      catnum?: string;
      search?: string;
    } = {}
  ): Promise<t.OIT_CoursesResponse> {
    const params = new URLSearchParams({ fmt: "json" });

    if (options.term) params.append("term", options.term);
    if (options.subject) params.append("subject", options.subject);
    if (options.catnum) params.append("catnum", options.catnum);
    if (options.search) params.append("search", options.search);

    const data = await this.fetchOIT<t.OIT_CoursesResponse>(`/courses/courses?${params}`);
    return data;
  }

  async __oit_getSeats(term: string, courseIds: string[]): Promise<t.OIT_Seat[]> {
    const params = new URLSearchParams({ fmt: "json" });

    params.append("term", term);
    params.append("course_ids", courseIds.join(","));

    const data = await this.fetchOIT<{
      course: t.OIT_Seat[];
    }>(`/courses/seats?${params}`);
    return data.course;
  }

  async getCourseIds(term: string): Promise<string[]> {
    const regListings = await this.getRegListings(term);
    return regListings.map((x) => x.course_id);
  }

  async getSeats(term: string, courseIds: string[]): Promise<t.OIT_Seat[]> {
    // Empirically, splitting into batches of 500 works the best
    // Make it larger, and the server fails to respond sometimes
    // Make it smaller, and it's inefficient with the number of calls made
    const BATCH_SIZE = 500;
    const allSeats: t.OIT_Seat[] = [];

    // Fetch in batches
    for (let i = 0; i < courseIds.length; i += BATCH_SIZE) {
      const chunk = courseIds.slice(i, i + BATCH_SIZE);
      const seats = await this.__oit_getSeats(term, chunk);
      allSeats.push(...seats);
    }

    return allSeats;
  }

  async getDeptCourses(term: string, dept: string): Promise<t.OIT_Course[]> {
    const data = await this.__oit_getCourses({ term, subject: dept });
    if (data.term.length === 0) return [];
    const subject = data.term[0].subjects.find((s) => s.code === dept);
    return subject ? subject.courses : [];
  }

  async getLatestTermCode(): Promise<string | null> {
    const terms = await this.__oit_getTerms();
    return terms.length > 0 ? terms[0].code : null;
  }

  async getCourseDetails(courseId: string, term?: string): Promise<t.OIT_CourseDetails> {
    const params = new URLSearchParams({
      course_id: courseId,
      fmt: "json",
    });

    if (term) params.append("term", term);

    const data = await this.fetchOIT<{
      course_details: {
        course_detail: t.OIT_CourseDetails;
      };
    }>(`/courses/details?${params}`);
    return data.course_details.course_detail;
  }

  async getRegListings(term: string): Promise<t.OIT_RegListing[]> {
    const token = await h.getRegistrarToken();
    const rawCourseList = await fetch(`${this.regPublicUrl}${term}`, {
      method: "GET",
      headers: {
        Authorization: token,
      },
    });
    const courseList = await rawCourseList.json();

    const valid =
      courseList &&
      courseList.classes &&
      courseList.classes.class &&
      Array.isArray(courseList.classes.class);
    if (!valid) throw new Error("Invalid course list response format");

    const regListings = courseList.classes.class as t.OIT_RegListing[];

    // Remove duplicates
    const seenIds = new Set<string>();
    const uniqueRegListings = regListings.filter((x) => {
      if (seenIds.has(x.course_id)) {
        return false;
      }
      seenIds.add(x.course_id);
      return true;
    });

    return uniqueRegListings;
  }

  async getRegDepartments(term: string): Promise<string[]> {
    const regListings = await this.getRegListings(term);
    return Array.from(new Set(regListings.map((x) => x.subject)));
  }

  async getCourseEvals(courseId: string): Promise<Record<string, t.OIT_Eval[]>> {
    if (this.sessionToken === "")
      throw new Error("Registrar session token not set. Please visit <TODO>.");

    const evals = await scrapeCourseEvals({
      evalUrl: this.evalUrl,
      sessionToken: this.sessionToken,
      courseId,
    });

    return evals;
  }
}
