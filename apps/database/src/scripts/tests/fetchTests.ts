import { fetchRegDepartments } from "../shared/reg-fetchers";
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

export const fetchTests = {
    "Fetch Departments": testDepartments
};
