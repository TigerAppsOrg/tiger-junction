import OIT_API from "./oit";

const api = new OIT_API();
const mostRecentTerm = await api.getMostRecentTermCode();
if (!mostRecentTerm) throw new Error("No most recent term found");
const terms = await api.getRegDepartments(mostRecentTerm);
console.log(terms);
