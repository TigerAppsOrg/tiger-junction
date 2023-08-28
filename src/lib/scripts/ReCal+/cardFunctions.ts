// Functions for card actions
import { currentSchedule } from "$lib/stores/recal";
import { pinnedCourses, savedCourses } from "$lib/stores/rpool";
import type { CourseData } from "$lib/types/dbTypes";
import type { SupabaseClient } from "@supabase/supabase-js";

//----------------------------------------------------------------------
// From Search
//----------------------------------------------------------------------

/**
 * Save a course from the search results
 * @param supabase 
 * @param course 
 */
const saveCourseFromSearch = (supabase: SupabaseClient, course: CourseData) => {
    savedCourses.add(supabase, getCurrentSchedule(), course);
}


/**
 * Pin a course from the search results
 * @param supabase 
 * @param course 
 */
const pinCourseFromSearch = (supabase: SupabaseClient, course: CourseData) => {
    pinnedCourses.add(supabase, getCurrentSchedule(), course);
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
    await savedCourses.remove(supabase, getCurrentSchedule(), course);
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
    await pinnedCourses.remove(supabase, getCurrentSchedule(), course);
}

//----------------------------------------------------------------------
// Helpers
//----------------------------------------------------------------------

// Get the current schedule
const getCurrentSchedule = (): number => {
    let schedule: number = -1;
    currentSchedule.subscribe(x => {
        schedule = x;
    })();
    return schedule;
}

export {
    saveCourseFromSearch,
    pinCourseFromSearch,
    pinCourseFromSaved,
    removeCourseFromSaved,
    saveCourseFromPinned,
    removeCourseFromPinned,
}