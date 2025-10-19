// src/cli.ts
// Author(s): Joshua Lau

import OIT_API from "./oit";

const api = new OIT_API();
const courseIds = await api.getCourseIds("1262");
const startTime = Date.now();
const seats = await api.getSeats("1262", courseIds);
const endTime = Date.now();

console.log(`Fetched ${seats.length} seats in ${endTime - startTime}ms`);
