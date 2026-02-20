// src/oit/interface.ts
// Author(s): Joshua Lau

import * as t from "./types.js";

export interface I_OIT_API {
  /**
   * Get database-formatted course data for all courses in a specific term
   *
   * This is what you would want to call to get all the data you need
   * to populate the database for a term.
   * ! It is slow (can take up to 10 minutes to run during peak times),
   * ! use getSeats if you only need seat information!
   *
   * @param term - 4-digit term code (e.g., "1202")
   * @return List of course data for all courses in the specified term
   */
  getAllCourseData(term: string): Promise<t.OIT_CourseData[]>;

  /**
   * Get list of course IDs for a specific term
   * Note: This uses the public registrar endpoint and should NOT be spammed
   * @param term - 4-digit term code (e.g., "1202")
   * @return List of course IDs for the specified term
   */
  getCourseIds(term: string): Promise<string[]>;

  /**
   * Scrape evaluations for a course
   * @param courseId - Course ID
   */
  getCourseEvals(courseId: string): Promise<Record<string, t.OIT_Eval[]>>;

  /**
   * Get seat information for all courses in a specific term
   * Note: This is a fast endpoint and can be spammed
   * @param term - 4-digit term code (e.g., "1202")
   * @param courseIds - List of course IDs to fetch seat information for
   * @return List of seat information for all courses in the specified term
   */
  getSeats(term: string, courseIds: string[]): Promise<t.OIT_Seat[]>;

  //--------------------------------------------------------------------
  /**
   * Get the latest term code
   */
  getLatestTermCode(): Promise<string | null>;

  /**
   * Get all available term codes from the OIT API
   * @return List of term codes sorted newest-first (e.g., ["1264", "1262", "1254", ...])
   */
  getAllTermCodes(): Promise<string[]>;

  /**
   * Get courses for a specific department in a term
   * @param term - 4-digit term code (e.g., "1202")
   * @param dept - 3-letter department code (e.g., "COS")
   */
  getDeptCourses(term: string, dept: string): Promise<t.OIT_Course[]>;

  /**
   * Get detailed course information
   * @param term - 4-digit term code (e.g., "1202")
   * @param courseId - Course ID
   */
  getCourseDetails(term: string, courseId: string): Promise<t.OIT_CourseDetails>;

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
}
