import * as t from "./types";
import * as h from "./helpers";
import { I_OIT_API } from "./interface";

export default class OIT_API implements I_OIT_API {
  private readonly regPublicUrl = "https://api.princeton.edu/registrar/course-offerings/classes/";
  private readonly baseUrl = "https://api.princeton.edu/student-app/1.0.3";
  private apiKey: string;

  constructor() {
    if (!process.env.API_ACCESS_TOKEN) {
      throw new Error("API_ACCESS_TOKEN environment variable is not set.");
    }
    this.apiKey = process.env.API_ACCESS_TOKEN;
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

  async getTerms(): Promise<t.OIT_Term[]> {
    const data = await this.fetchOIT<{
      term: t.OIT_Term[];
    }>("/courses/terms?fmt=json");
    return data.term;
  }

  async getCourses(
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

    const data = await this.fetchOIT<{
      term: t.OIT_CoursesResponse;
    }>(`/courses/courses?${params}`);
    return data.term;
  }

  async getMostRecentTermCode(): Promise<string | null> {
    const terms = await this.getTerms();
    return terms.length > 0 ? terms[0].code : null;
  }

  async getSeats(
    options: {
      term?: string;
      courseIds?: string;
    } = {}
  ): Promise<t.OIT_SeatsResponse> {
    const params = new URLSearchParams({ fmt: "json" });

    if (options.term) params.append("term", options.term);
    if (options.courseIds) params.append("course_ids", options.courseIds);

    const data = await this.fetchOIT<{
      course: t.OIT_SeatsResponse;
    }>(`/courses/seats?${params}`);
    return data.course;
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
}
