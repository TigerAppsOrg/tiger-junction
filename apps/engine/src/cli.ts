import OIT_API from "./oit";

const api = new OIT_API();

const mostRecentTerm = await api.getMostRecentTermCode();
if (!mostRecentTerm) throw new Error("No most recent term found");
const depts = await api.getRegDepartments(mostRecentTerm);

const x = new Set();

for (const dept of depts) {
  const courses = await api.getDeptCourses(mostRecentTerm, dept);
  for (const c of courses) {
    x.add(c.detail.track);
  }
}
