// src/cli.ts
// Author(s): Joshua Lau

import OIT_API from "./oit";

const api = new OIT_API();
const courseIds = await api.getCourseIds("1262");
const firstTen = courseIds.slice(0, 10);
console.log(await api.getSeats("1262", firstTen));
