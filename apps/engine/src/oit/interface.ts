import * as t from "./types.js";

export interface I_OIT_API {
  /**
   * Get the latest term code
   */
  getLatestTermCode(): Promise<string | null>;

  /**
   * Get courses for a specific department in a term
   * @param term - 4-digit term code (e.g., "1202")
   * @param dept - 3-letter department code (e.g., "COS")
   */
  getDeptCourses(term: string, dept: string): Promise<t.OIT_Course[]>;

  /**
   * Get fast seat information for courses
   * Note: This is a fast endpoint and can be spammed
   * @param term - Optional 4-digit term code
   * @param courseIds - Optional comma-separated list of course IDs
   */
  getSeats(options?: { term?: string; courseIds?: string }): Promise<t.OIT_SeatsResponse>;

  /**
   * Get detailed course information
   * @param courseId - Course ID
   * @param term - Optional 4-digit term code
   */
  getCourseDetails(courseId: string, term?: string): Promise<t.OIT_CourseDetails>;

  /**
   * Get the course listings from the registrar
   * Note: This is a public endpoint and should NOT be spammed
   * @param term - 4-digit term code (e.g., "1202")
   */
  getRegListings(term: string): Promise<t.OIT_RegListing[]>;

  /**
   * Get alphabetically-sorted list of 3-letter department codes for a given term
   * Note: This is a public endpoint and should NOT be spammed
   * @param term - 4-digit term code (e.g., "1262")
   */
  getRegDepartments(term: string): Promise<string[]>;

  /**
   * Scrape evaluations for a course
   * @param courseId - Course ID
   */
  getCourseEvals(courseId: string): Promise<Record<string, t.OIT_Eval[]>>;
}
