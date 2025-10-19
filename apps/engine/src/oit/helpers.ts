// src/oit/helpers.ts
// Author(s): Joshua Lau

export const getRegistrarToken = async () => {
  const response = await fetch("https://registrar.princeton.edu/course-offerings");
  const text = await response.text();
  return "Bearer " + text.split('apiToken":"')[1].split('"')[0];
};
