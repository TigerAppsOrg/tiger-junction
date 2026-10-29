import { mock } from "bun:test";

// No network calls: exercise the real importer and CLI with controlled API results.
const listing = {
    course_id: "002051", subject: "COS", catnum: "226",
    long_title: "Algorithms", topic_title: null,
    crosslistings: "COS226", distribution_area: "QCR"
};
mock.module("../../../shared/reg-fetchers", () => ({
    fetchRegListings: async () => [listing],
    fetchRegDeptCourses: async () => [{
        course_id: listing.course_id, title: listing.long_title, instructors: [],
        classes: [{
            class_number: "10001", section: "L01", pu_calc_status: "Open",
            type_name: "Lecture", enrollment: "10", capacity: "100",
            schedule: { meetings: [{ days: ["Monday"], start_time: "10:00 AM", end_time: "10:50 AM" }] }
        }]
    }],
    fetchRegCourseDetails: async () => ({ grading_basis: "GRD", grading_final_exam: "50" })
}));

const responses = [
    [], null, // listings: read, upsert
    [], [], [{ id: 1, listing_id: listing.course_id }], // courses: read, upsert, insert
    [], null, null, null // sections: read, upsert, insert, delete
];
let step = 0;
mock.module("../../shared", () => ({
    TERMS: [1274],
    supabase: {
        from() {
            const current = ++step;
            console.log(`DB_STEP=${current}`);
            const error = current === Number(process.env.FAIL_STEP)
                ? { message: "injected database failure", code: "TEST" } : null;
            const result = Promise.resolve({ data: responses[current - 1], error });
            const query = {
                select: () => query, eq: () => query, upsert: () => query,
                insert: () => query, delete: () => query, in: () => query,
                then: result.then.bind(result)
            };
            return query;
        }
    }
}));
mock.module("../../redis", () => ({
    redisTransfer: async () => { console.log("REDIS_SYNC_REACHED"); }
}));
