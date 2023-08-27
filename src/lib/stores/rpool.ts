// Stores for Saved and Pinned (Course Pools for ReCal+)

import type { CourseData } from "$lib/types/dbTypes";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Invalidator, Subscriber, Unsubscriber } from "svelte/motion";
import { writable, type Writable } from "svelte/store";

// Course pool type
type CoursePool = {
    set: (this: void, value: Record<number, CourseData[]>) => void,
    update: (this: void, updater: (value: Record<number, CourseData[]>) 
        => Record<number, CourseData[]>) => void,
    subscribe: (this: void, run: Subscriber<Record<number, CourseData[]>>, 
        invalidate?: Invalidator<Record<number, CourseData[]>>) 
        => Unsubscriber,
    add: (supabase: SupabaseClient, scheduleId: number, course: CourseData) => void,
    remove: (supabase: SupabaseClient, scheduleId: number, course: CourseData) => void,
    clear: (supabase: SupabaseClient, scheduleId: number) => void,
}

//----------------------------------------------------------------------
// Helpers
//----------------------------------------------------------------------

// Get the current pool of courses
const getCurrentPool = (pool: CoursePool, scheduleId: number): CourseData[] => {
    let data: CourseData[] = [];
    pool.subscribe((x) => {
        if (x.hasOwnProperty(scheduleId)) data = x[scheduleId];
        else data = [];
    })();
    return data;
}

// Remove a course from a pool
const removeCourse = (supabase: SupabaseClient, pool: CoursePool, scheduleId: number, course: CourseData): void => {
    // Get current saved courses
    let currentPool: CourseData[] = getCurrentPool(savedCourses, scheduleId);

    if (currentPool.length === 0) return;

    // Update store
    pool.update(x => {
        x[scheduleId] = x[scheduleId].filter(y => y.id !== course.id)
        return x;
    });

    // Update course-schedule-associations table
    supabase.from("course_schedule_associations")
        .delete()
        .eq("course_id", course.id)
        .eq("schedule_id", scheduleId)
    .then(res => {
        // Revert if error
        if (res.error) {
            updateSave(x => {
                x[scheduleId] = currentPool;
                return x;
            });
        }
    });
}

//----------------------------------------------------------------------
// Saved courses
//----------------------------------------------------------------------

const { set: setSave, update: updateSave, subscribe: subscribeSave }: 
Writable<Record<number, CourseData[]>> = writable([]);

export const savedCourses: CoursePool = {
    set: setSave,
    update: updateSave,
    subscribe: subscribeSave,

    /**
     * Add a course to saved courses
     * @param course 
     */
    add: (supabase: SupabaseClient, scheduleId: number, course: CourseData): void => {
        // Get current saved courses
        let saved: CourseData[] = getCurrentPool(savedCourses, scheduleId);

        // Update store
        updateSave(x => [...x, course]);

        // Update course-schedule-associations table


        // Revert if error
        

    },

    /**
     * Remove a course from saved courses
     * @param course 
     */
    remove: (supabase: SupabaseClient, scheduleId: number, course: CourseData): void => {
        removeCourse(supabase, savedCourses, scheduleId, course);
    },

    /**
     * Clear the saved courses
     */
    clear: (supabase: SupabaseClient, scheduleId: number): void => {
        // Get current saved courses
        let saved: CourseData[] = getCurrentPool(savedCourses, scheduleId);

        // Update store
        savedCourses.set([]);

        // Update course-schedule-associations table


        // Revert if error

    }
}

//----------------------------------------------------------------------
// Pinned courses
//----------------------------------------------------------------------

const { set: setPin, update: updatePin, subscribe: subscribePin }: 
Writable<CourseData[]> = writable([]);

export const pinnedCourses: CoursePool = {
    set: setPin,
    update: updatePin,
    subscribe: subscribePin,

    /**
     * Add a course to pinned courses
     * @param course 
     */
    add: (supabase: SupabaseClient, scheduleId: number, course: CourseData): void => {
        // Get current saved courses
        let pinned: CourseData[] = getCurrentPool(pinnedCourses, scheduleId);

        // Update store
        updatePin(x => [...x, course]);

        // Update course-schedule-associations table


        // Revert if error
        
    },

    /**
     * Remove a course from pinned courses
     * @param course 
     */
    remove: (supabase: SupabaseClient, scheduleId: number, course: CourseData): void => {
        removeCourse(supabase, pinnedCourses, scheduleId, course);
    },

    /**
     * Clear the pinned courses
     */
    clear: (supabase: SupabaseClient, scheduleId: number): void => {
        // Get current saved courses
        let pinned: CourseData[] = getCurrentPool(pinnedCourses, scheduleId);

        // Update store
        pinnedCourses.set([]);

        // Update course-schedule-associations table


        // Revert if error
    }
}