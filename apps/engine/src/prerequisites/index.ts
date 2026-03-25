/**
 * Prerequisites module — loads Tiger Junction YAML prereq data and provides
 * an evaluation engine for checking/querying course prerequisites.
 */

export { SPECIAL_MACROS } from "./macros.js";
export { loadDeptFile, loadAllPrereqs } from "./loader.js";
export type { PrereqCourse, DeptPrereqs } from "./loader.js";
export {
  evaluatePrereqs,
  expandMacros,
  describePrereqs,
} from "./evaluator.js";
export type { PrereqResult } from "./evaluator.js";
