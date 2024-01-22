// Functions for card actions
import { savedCourses } from "$lib/stores/rpool";
import type { CourseData } from "$lib/types/dbTypes";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getCurrentSchedule } from "./getters";
import { get } from "svelte/store";
import { hoveredCourse } from "$lib/stores/recal";
import { sectionData } from "$lib/stores/rsections";
import { toastStore } from "$lib/stores/toast";

//----------------------------------------------------------------------
// From Search
//----------------------------------------------------------------------

/**
 * Save a course from the search results
 * @param supabase 
 * @param course 
 */
const saveCourseFromSearch = async (supabase: SupabaseClient, course: CourseData) => {
    // Check if section data is loaded
    if (!get(sectionData)[course.term][course.id]) return;

    // Check if schedule is at capacity
    if (get(savedCourses)[getCurrentSchedule()].length >= 50) {
        toastStore.add("error", "Schedules are limited to 50 courses.");
        return;
    };

    hoveredCourse.set(null);
    await savedCourses.add(supabase, getCurrentSchedule(), course, true);
}


//----------------------------------------------------------------------
// From Saved
//----------------------------------------------------------------------

/**
 * Remove a course from the saved courses
 * @param supabase 
 * @param course 
 */
const removeCourseFromSaved = async (supabase: SupabaseClient, course: CourseData) => {
    await savedCourses.remove(supabase, getCurrentSchedule(), course, true);
}


export {
    saveCourseFromSearch,
    removeCourseFromSaved,
}