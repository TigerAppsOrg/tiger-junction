import {
    fetchRegDepartments,
    fetchRegListings,
    fetchRegSeats
} from "../shared/reg-fetchers";
import { assert } from "./shared";

const testDepartments = async () => {
    const term = 1254;
    const deptRes = await fetchRegDepartments(term);

    let passed = true;
    passed = assert(
        deptRes.every(x => x.length === 3),
        "Some departments are not 3 characters long"
    );
    passed = assert(
        deptRes.every(x => x === x.toUpperCase()),
        "Some departments are not uppercase"
    );
    passed = assert(
        deptRes.includes("COS"),
        "COS not found in department list"
    );
    passed = assert(
        deptRes.includes("WRI"),
        "WRI not found in department list"
    );
    passed = assert(!deptRes.includes("XXX"), "XXX found in department list");

    return passed;
};

const testSeats = async () => {
    const TERM = 1254;
    const BATCH_SIZE = 50;

    let passed = true;
    const startTime = Date.now();

    const courseList = await fetchRegListings(TERM);
    for (let i = 0; i < courseList.length; i += BATCH_SIZE) {
        const batch = courseList.slice(i, i + BATCH_SIZE).map(x => x.course_id);
        console.log("Fetching seats for batch " + i);
        const seatData = await fetchRegSeats(batch, TERM);
        passed = assert(
            seatData.length === batch.length,
            "Seat data length mismatch for batch " + i
        );
    }

    console.log(
        "Finished seat test in " + (Date.now() - startTime) / 1000 + "s"
    );

    return passed;
};

export const fetchTests = {
    "Fetch Departments": testDepartments,
    "Fetch Seats": testSeats
};
