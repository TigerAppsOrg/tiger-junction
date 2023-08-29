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
}


/**
 * Pin a course from the search results
 * @param supabase 
 * @param course 
 */
const pinCourseFromSearch = async (supabase: SupabaseClient, course: CourseData) => {
    await pinnedCourses.add(supabase, getCurrentSchedule(), course, true);
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
    // Update pools
    savedCourses.update(x => {
        if (!x.hasOwnProperty(getCurrentSchedule())) 
            x[getCurrentSchedule()] = [];
        x[getCurrentSchedule()] = x[getCurrentSchedule()]
            .filter(x => x.id !== course.id);
        return x;
    });
    
    pinnedCourses.update(x => {
        if (!x.hasOwnProperty(getCurrentSchedule())) 
            x[getCurrentSchedule()] = [];
        x[getCurrentSchedule()].push(course);
        return x;
    });

    // Update the course schedule association
    const { error } = await supabase
        .from("course_schedule_associations")
        .update({is_pinned: true})
        .eq("course_id", course.id)
        .eq("schedule_id", getCurrentSchedule());

    // Revert if error
    if (error) {
        console.log(error);
        pinnedCourses.update(x => {
            x[getCurrentSchedule()] = x[getCurrentSchedule()]
                .filter(x => x.id !== course.id);
            return x;
        });
        savedCourses.update(x => {
            x[getCurrentSchedule()].push(course);
            return x;
        });
    }
}

/**
 * Remove a course from the saved courses
 * @param supabase 
 * @param course 
 */
const removeCourseFromSaved = async (supabase: SupabaseClient, course: CourseData) => {
    await savedCourses.remove(supabase, getCurrentSchedule(), course, true);
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
    // Update pools
    pinnedCourses.update(x => {
        if (!x.hasOwnProperty(getCurrentSchedule())) 
            x[getCurrentSchedule()] = [];
        x[getCurrentSchedule()] = x[getCurrentSchedule()]
            .filter(x => x.id !== course.id);
        return x;
    });

    savedCourses.update(x => {
        if (!x.hasOwnProperty(getCurrentSchedule())) 
            x[getCurrentSchedule()] = [];
        x[getCurrentSchedule()].push(course);
        return x;
    });

    // Update the course schedule association
    const { error } = await supabase
        .from("course_schedule_associations")
        .update({is_pinned: false})
        .eq("course_id", course.id)
        .eq("schedule_id", getCurrentSchedule());

    // Revert if error
    if (error) {
        console.log(error);
        savedCourses.update(x => {
            x[getCurrentSchedule()] = x[getCurrentSchedule()]
                .filter(x => x.id !== course.id);
            return x;
        });

        pinnedCourses.update(x => {
            x[getCurrentSchedule()].push(course);
            return x;
        });
    }
}

/**
 * Remove a course from the pinned courses
 * @param supabase 
 * @param course 
 */
const removeCourseFromPinned = async (supabase: SupabaseClient, course: CourseData) => {
    await pinnedCourses.remove(supabase, getCurrentSchedule(), course, true);
}


export {
    saveCourseFromSearch,
    pinCourseFromSearch,
    pinCourseFromSaved,
    removeCourseFromSaved,
    saveCourseFromPinned,
    removeCourseFromPinned,
}