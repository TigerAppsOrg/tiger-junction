// Functions for card actions
import { searchCourseData } from "$lib/stores/recal";
import { pinnedCourses, savedCourses } from "$lib/stores/rpool";
import type { CourseData } from "$lib/types/dbTypes";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getCurrentSchedule } from "./getters";

//----------------------------------------------------------------------
// From Search
//----------------------------------------------------------------------

/**
 * Save a course from the search results
 * @param supabase 
 * @param course 
 */
const saveCourseFromSearch = async (supabase: SupabaseClient, course: CourseData) => {
    await savedCourses.add(supabase, getCurrentSchedule(), course, true);
    // searchCourseData.remove(getCurrentTerm(), [course]);
}


/**
 * Pin a course from the search results
 * @param supabase 
 * @param course 
 */
const pinCourseFromSearch = async (supabase: SupabaseClient, course: CourseData) => {
    await pinnedCourses.add(supabase, getCurrentSchedule(), course, true);
    // searchCourseData.remove(getCurrentTerm(), [course]);
}

//----------------------------------------------------------------------
// From Saved
//----------------------------------------------------------------------

/**
 * Pin a course from the saved courses
 * @param supabase 
 * @param course 
 */
const pinCourseFromSaved = async (supabase: SupabaseClient, course: CourseData) => {
    let r1 = await pinnedCourses.add(supabase, getCurrentSchedule(), course);
    if (r1) await savedCourses.remove(supabase, getCurrentSchedule(), course);
}

/**
 * Remove a course from the saved courses
 * @param supabase 
 * @param course 
 */
const removeCourseFromSaved = async (supabase: SupabaseClient, course: CourseData) => {
    await savedCourses.remove(supabase, getCurrentSchedule(), course, true);
    // searchCourseData.add(getCurrentTerm(), [course]);
}

//----------------------------------------------------------------------
// From Pinned
//----------------------------------------------------------------------

/**
 * Save a course from the pinned courses
 * @param supabase 
 * @param course 
 */
const saveCourseFromPinned = async (supabase: SupabaseClient, course: CourseData) => {
    let r1 = await savedCourses.add(supabase, getCurrentSchedule(), course);
    if (r1) await pinnedCourses.remove(supabase, getCurrentSchedule(), course);
}

/**
 * Remove a course from the pinned courses
 * @param supabase 
 * @param course 
 */
const removeCourseFromPinned = async (supabase: SupabaseClient, course: CourseData) => {
    await pinnedCourses.remove(supabase, getCurrentSchedule(), course, true);
    // searchCourseData.add(getCurrentTerm(), [course]);
}


export {
    saveCourseFromSearch,
    pinCourseFromSearch,
    pinCourseFromSaved,
    removeCourseFromSaved,
    saveCourseFromPinned,
    removeCourseFromPinned,
}