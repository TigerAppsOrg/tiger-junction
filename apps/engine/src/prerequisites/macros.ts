/**
 * Special prerequisite macros from Tiger Junction (apps/prerequisites/scripts/shared.js).
 * These are common prerequisite groupings that can be used like course codes in `reqs` expressions.
 */

export const SPECIAL_MACROS: Record<string, string> = {
  ISCA: "ISC231 & ISC232 & ISC233 & ISC234",
  MECH: "PHY103 | PHY105 | ISC231 | EGR151",
  EAM: "PHY104 | PHY106 | ISC233 | EGR153",
  PHYS: "(PHY103 | PHY105 | ISC231 | EGR151) & (PHY104 | PHY106 | ISC233 | EGR153)",
  CALCULUS: "MAT104 | MAT210 | MAT215 | EGR152",
  MULTI: "MAT175 | MAT201 | MAT203 | MAT216 | ECO201 | EGR156",
  LINEAR: "MAT202 | MAT204 | MAT217 | MAT218 | EGR154",
  BSEMATH:
    "(MAT175 | MAT201 | MAT203 | MAT216 | ECO201 | EGR156) & (MAT202 | MAT204 | MAT217 | MAT218 | EGR154)",
  INTROCOS: "COS126 | ECE115 | (ISC231 & ISC232 & ISC233 & ISC234)",
  BOTHCOS: "COS217 & COS226",
  CHEM1: "CHM201 | CHM207 | CHM215",
  CHEM2: "CHM202 | CHM215",
  STATS:
    "ECO202 | EEB355 | ORF245 | POL345 | PSY251 | SOC301 | SML101 | SML201",
  INTROMOL: "MOL214 | (ISC231 & ISC232 & ISC233 & ISC234)",
};
