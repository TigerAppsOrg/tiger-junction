import { afterEach, describe, expect, test } from "bun:test";
import OIT from "../oit/index.js";
import {
  extractCourseDetailsMetadata,
  parseOitPercent,
  readStoredDetailsMetadata,
  readStoredGrading,
  summarizeCourseGrading,
} from "../oit/grading.js";

const originalFetch = globalThis.fetch;
const originalToken = process.env.API_ACCESS_TOKEN;
const originalKey = process.env.CONSUMER_KEY;
const originalSecret = process.env.CONSUMER_SECRET;

afterEach(() => {
  globalThis.fetch = originalFetch;
  for (const [key, value] of Object.entries({
    API_ACCESS_TOKEN: originalToken,
    CONSUMER_KEY: originalKey,
    CONSUMER_SECRET: originalSecret,
  })) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

describe("parseOitPercent", () => {
  test("parses integer and decimal strings and ignores blank/invalid values", () => {
    expect(parseOitPercent("25")).toBe(25);
    expect(parseOitPercent(" 33.6 ")).toBe(34);
    expect(parseOitPercent(40)).toBe(40);
    expect(parseOitPercent("0")).toBe(0);
    expect(parseOitPercent("-5")).toBe(0);
    expect(parseOitPercent("")).toBe(0);
    expect(parseOitPercent("   ")).toBe(0);
    expect(parseOitPercent(undefined)).toBe(0);
    expect(parseOitPercent("n/a")).toBe(0);
  });
});

describe("summarizeCourseGrading", () => {
  test("recognizes 100% psets / 0% exams as known zero-exam course", () => {
    const summary = summarizeCourseGrading({
      grading_prob_sets: "100",
      grading_mid_exam: "0",
      grading_final_exam: "0",
    });

    expect(summary.known).toBe(true);
    expect(summary.totalPct).toBe(100);
    expect(summary.examPct).toBe(0);
    expect(summary.psetPct).toBe(100);
    expect(summary.hasAnyExam).toBe(false);
    expect(summary.hasSeatedFinal).toBe(false);
    expect(summary.breakdown).toEqual([
      {
        key: "grading_prob_sets",
        label: "Problem sets",
        category: "pset",
        percent: 100,
      },
    ]);
  });

  test("aggregates all exam categories and distinguishes seated finals from take-home/papers", () => {
    const seated = summarizeCourseGrading({
      grading_mid_exam: "25",
      grading_final_exam: "40",
      grading_quizzes: "10",
      grading_prob_sets: "25",
    });
    expect(seated.known).toBe(true);
    expect(seated.examPct).toBe(75);
    expect(seated.psetPct).toBe(25);
    expect(seated.hasSeatedFinal).toBe(true);
    expect(seated.hasAnyExam).toBe(true);

    const paperOnly = summarizeCourseGrading({
      grading_paper_mid_exam: "30",
      grading_paper_final_exam: "50",
      grading_precept_part: "20",
    });
    expect(paperOnly.known).toBe(true);
    expect(paperOnly.examPct).toBe(0);
    expect(paperOnly.psetPct).toBe(0);
    expect(paperOnly.hasSeatedFinal).toBe(false);
    expect(paperOnly.hasAnyExam).toBe(false);

    const takeHome = summarizeCourseGrading({
      grading_home_final_exam: "35",
      grading_prog_assign: "65",
    });
    expect(takeHome.known).toBe(true);
    expect(takeHome.examPct).toBe(35);
    expect(takeHome.psetPct).toBe(65);
    expect(takeHome.hasSeatedFinal).toBe(false);
    expect(takeHome.hasAnyExam).toBe(true);
  });

  test("keeps missing or all-zero OIT percentages strictly unknown instead of 0% exams", () => {
    for (const input of [
      {},
      { grading_mid_exam: "0", grading_final_exam: "0", grading_prob_sets: "" },
    ]) {
      const summary = summarizeCourseGrading(input);
      expect(summary.known).toBe(false);
      expect(summary.totalPct).toBe(0);
      expect(summary.examPct).toBeNull();
      expect(summary.psetPct).toBeNull();
      expect(summary.hasSeatedFinal).toBeNull();
      expect(summary.hasAnyExam).toBeNull();
      expect(summary.breakdown).toEqual([]);
    }
  });

  test("supports additional OIT fields (pu_pres_final_exam, pu_projects)", () => {
    const summary = summarizeCourseGrading({
      pu_pres_final_exam: "20",
      pu_projects: "80",
    });
    expect(summary.known).toBe(true);
    expect(summary.totalPct).toBe(100);
    expect(summary.examPct).toBe(0);
    expect(summary.psetPct).toBe(0);
    // Breakdown is sorted descending by percent
    expect(summary.breakdown.map((b) => b.key)).toEqual(["pu_projects", "pu_pres_final_exam"]);
  });
});

describe("extractCourseDetailsMetadata & stored row readers", () => {
  test("preserves reading list, single/array seat reservations, restrictions, and website", () => {
    const fetchedAt = new Date("2026-11-27T05:00:00.000Z");
    const meta = extractCourseDetailsMetadata(
      {
        grading_prob_sets: "60",
        grading_lab_reports: "40",
        web_address: " https://cos.princeton.edu/course ",
        other_restrictions: "Seniors only",
        other_requirements: "COS 226 required",
        other_information: "No audit",
        reading_writing_assignment: "Weekly labs",
        add_consent: "Instructor",
        drop_consent: " ",
        reading_list_author_1: "CLRS",
        reading_list_title_1: "Introduction to Algorithms",
        reading_list_author_3: "Sipser",
        reading_list_title_3: "Theory of Computation",
        seat_reservations: {
          seat_reservation: {
            class_section: "L01",
            description: "COS concentrators",
            enrl_cap: "50",
          },
        },
      },
      fetchedAt
    );

    expect(meta.fetchedAt).toBe("2026-11-27T05:00:00.000Z");
    expect(meta.grading.known).toBe(true);
    expect(meta.grading.examPct).toBe(0);
    expect(meta.grading.psetPct).toBe(60);
    expect(meta.webAddress).toBe("https://cos.princeton.edu/course");
    expect(meta.otherRestrictions).toBe("Seniors only");
    expect(meta.otherRequirements).toBe("COS 226 required");
    expect(meta.otherInformation).toBe("No audit");
    expect(meta.readingWritingAssignment).toBe("Weekly labs");
    expect(meta.addConsent).toBe("Instructor");
    expect(meta.dropConsent).toBeNull();
    expect(meta.readingList).toEqual([
      { author: "CLRS", title: "Introduction to Algorithms" },
      { author: "Sipser", title: "Theory of Computation" },
    ]);
    expect(meta.seatReservations).toEqual([
      { classSection: "L01", description: "COS concentrators", enrlCap: "50" },
    ]);

    expect(readStoredDetailsMetadata(meta)?.webAddress).toBe("https://cos.princeton.edu/course");
    expect(readStoredGrading({ detailsJson: meta }).psetPct).toBe(60);
  });

  test("readStoredGrading falls back cleanly for legacy DB rows", () => {
    const unknownRow = readStoredGrading({ gradingKnown: false, examPct: null, psetPct: null });
    expect(unknownRow.known).toBe(false);
    expect(unknownRow.examPct).toBeNull();

    const columnOnlyRow = readStoredGrading({
      gradingKnown: true,
      examPct: 20,
      psetPct: 80,
      hasFinal: false,
    });
    expect(columnOnlyRow.known).toBe(true);
    expect(columnOnlyRow.examPct).toBe(20);
    expect(columnOnlyRow.psetPct).toBe(80);
    expect(columnOnlyRow.hasSeatedFinal).toBe(false);
    expect(columnOnlyRow.hasAnyExam).toBe(true);
  });
});

describe("OIT.getAllCourseData details preservation", () => {
  test("populates full grading/detail metadata concurrently and keeps unknown grading null", async () => {
    process.env.API_ACCESS_TOKEN = "test-only-token";
    delete process.env.CONSUMER_KEY;
    delete process.env.CONSUMER_SECRET;

    globalThis.fetch = (async (input: string | URL | Request) => {
      const url = new URL(String(input));
      if (url.pathname.endsWith("/courses/courses")) {
        const subject = url.searchParams.get("subject");
        if (subject === "list") {
          return Response.json({
            term: [{ subjects: [{ code: "COS", name: "Computer Science", courses: [] }] }],
          });
        }
        return Response.json({
          term: [
            {
              code: "1274",
              subjects: [
                {
                  code: "COS",
                  courses: [
                    {
                      course_id: "002051",
                      catalog_number: "226",
                      title: "Algorithms and Data Structures",
                      detail: { description: "Algo", track: "UGRD" },
                      instructors: [
                        {
                          emplid: "1",
                          first_name: "Kevin",
                          last_name: "Wayne",
                          full_name: "Kevin Wayne",
                        },
                      ],
                      crosslistings: [],
                      classes: [
                        {
                          class_number: "10001",
                          section: "L01",
                          status: "Open",
                          type_name: "Lecture",
                          capacity: "100",
                          enrollment: "50",
                          schedule: {
                            meetings: [
                              {
                                meeting_number: "1",
                                start_time: "10:00 AM",
                                end_time: "10:50 AM",
                                days: ["M", "W"],
                                building: { name: "McCosh" },
                                room: "50",
                              },
                            ],
                          },
                        },
                      ],
                    },
                    {
                      course_id: "002999",
                      catalog_number: "499",
                      title: "Special Topics",
                      detail: { description: "Topics", track: "UGRD" },
                      instructors: [],
                      crosslistings: [],
                      classes: [
                        {
                          class_number: "10002",
                          section: "S01",
                          status: "Open",
                          type_name: "Seminar",
                          capacity: "15",
                          enrollment: "5",
                          schedule: {
                            meetings: [
                              {
                                meeting_number: "1",
                                start_time: "01:30 PM",
                                end_time: "04:20 PM",
                                days: ["Th"],
                                room: "105",
                              },
                            ],
                          },
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        });
      }

      if (url.pathname.endsWith("/courses/details")) {
        const courseId = url.searchParams.get("course_id");
        if (courseId === "002051") {
          return Response.json({
            course_details: {
              course_detail: {
                course_id: "002051",
                distribution_area_short: "QCR",
                grading_basis: "GRD",
                course_instructors: {
                  course_instructor: [{ netid: "kwayne", name: "Kevin Wayne" }],
                },
                grading_prog_assign: "50",
                grading_mid_exam: "20",
                grading_final_exam: "30",
                web_address: "https://www.cs.princeton.edu/courses/archive/spring27/cos226/",
                other_restrictions: "No freshmen without permission",
              },
            },
          });
        }
        // Empty grading breakdown on 002999
        return Response.json({
          course_details: {
            course_detail: {
              course_id: "002999",
              distribution_area_short: "",
              grading_basis: "NAU",
            },
          },
        });
      }

      throw new Error(`Unexpected fetch URL: ${url.toString()}`);
    }) as unknown as typeof fetch;

    const oit = new OIT();
    const results = await oit.getAllCourseData("1274");
    expect(results).toHaveLength(2);

    const cos226 = results.find((c) => c.listing_id === "002051")!;
    expect(cos226.grading_known).toBe(true);
    expect(cos226.exam_pct).toBe(50);
    expect(cos226.pset_pct).toBe(50);
    expect(cos226.has_final).toBe(true);
    expect(cos226.web_address).toBe(
      "https://www.cs.princeton.edu/courses/archive/spring27/cos226/"
    );
    expect(cos226.restrictions).toBe("No freshmen without permission");
    expect(cos226.details_json?.grading.breakdown).toHaveLength(3);
    expect(cos226.details_fetched_at).toBeInstanceOf(Date);

    const cos499 = results.find((c) => c.listing_id === "002999")!;
    expect(cos499.grading_known).toBe(false);
    expect(cos499.exam_pct).toBeNull();
    expect(cos499.pset_pct).toBeNull();
    expect(cos499.has_final).toBeNull();
  });
});
