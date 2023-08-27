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
    add: (supabase: SupabaseClient, scheduleId: number, course: CourseData) 
        => void,
    remove: (supabase: SupabaseClient, scheduleId: number, course: CourseData) 
        => void,
    clear: (supabase: SupabaseClient, scheduleId: number) => void,
}

//----------------------------------------------------------------------
// Helpers
//----------------------------------------------------------------------

// Get the current pool of courses
const getCurrentPool = (pool: CoursePool, scheduleId: number): 
CourseData[] => {
    let data: CourseData[] = [];
    pool.subscribe((x) => {
        if (x.hasOwnProperty(scheduleId)) data = x[scheduleId];
        else data = [];
    })();
    return data;
}

// Add a course to a pool
const addCourse = (supabase: SupabaseClient, pool: CoursePool, 
scheduleId: number, course: CourseData, isPinned: boolean): void => {
    // Get current pool courses
    let currentPool: CourseData[] = getCurrentPool(savedCourses, scheduleId);

    // Update store
    pool.update(x => {
        if (currentPool.length === 0) x[scheduleId] = [course];
        else x[scheduleId] = [...x[scheduleId], course];
        return x;
    });

    // Update course-schedule-associations table
    supabase.from("course_schedule_associations")
        .insert({
            course_id: course.id,
            schedule_id: scheduleId,
            is_pinned: isPinned
        })
    .then(res => {
        // Revert if error
        if (res.error) {
            console.log(res.error);
            pool.update(x => {
                x[scheduleId] = currentPool;
                return x;
            });
        }
    });
}

// Remove a course from a pool
const removeCourse = (supabase: SupabaseClient, pool: CoursePool, 
scheduleId: number, course: CourseData): void => {
    // Get current pool courses
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
            console.log(res.error);
            pool.update(x => {
                x[scheduleId] = currentPool;
                return x;
            });
        }
    });
}

// Clear a pool
const clearPool = (supabase: SupabaseClient, pool: CoursePool, 
scheduleId: number): void => {
    // Get current pool courses
    let currentPool: CourseData[] = getCurrentPool(savedCourses, scheduleId);

    // Update store
    pool.set([]);

    // Update course-schedule-associations table
    supabase.from("course_schedule_associations")
        .delete()
        .eq("schedule_id", scheduleId)
    .then(res => {
        // Revert if error
        if (res.error) {
            console.log(res.error);
            pool.update(x => {
                x[scheduleId] = currentPool
                return x;
            })
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
     * 
     * @param supabase 
     * @param scheduleId 
     * @param course 
     */
    add: (supabase: SupabaseClient, scheduleId: number, 
    course: CourseData): void => {
        addCourse(supabase, savedCourses, scheduleId, course, false);
    },

    /**
     * 
     * @param supabase 
     * @param scheduleId 
     * @param course 
     */
    remove: (supabase: SupabaseClient, scheduleId: number, 
    course: CourseData): void => {
        removeCourse(supabase, savedCourses, scheduleId, course);
    },

    /**
     * 
     * @param supabase 
     * @param scheduleId 
     */
    clear: (supabase: SupabaseClient, scheduleId: number): void => {
        clearPool(supabase, savedCourses, scheduleId);
    }
}

//----------------------------------------------------------------------
// Pinned courses
//----------------------------------------------------------------------

const { set: setPin, update: updatePin, subscribe: subscribePin }: 
Writable<Record<number, CourseData[]>> = writable([]);

export const pinnedCourses: CoursePool = {
    set: setPin,
    update: updatePin,
    subscribe: subscribePin,

    /**
     * 
     * @param supabase 
     * @param scheduleId 
     * @param course 
     */
    add: (supabase: SupabaseClient, scheduleId: number, 
    course: CourseData): void => {
        addCourse(supabase, pinnedCourses, scheduleId, course, true);
    },

    /**
     * 
     * @param supabase 
     * @param scheduleId 
     * @param course 
     */
    remove: (supabase: SupabaseClient, scheduleId: number, 
    course: CourseData): void => {
        removeCourse(supabase, pinnedCourses, scheduleId, course);
    },

    /**
     * 
     * @param supabase 
     * @param scheduleId 
     */
    clear: (supabase: SupabaseClient, scheduleId: number): void => {
        clearPool(supabase, pinnedCourses, scheduleId);
    }
}