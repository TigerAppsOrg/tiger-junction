// Stores for Saved and Pinned (Course Pools for ReCal+)

import type { CourseData } from "$lib/types/dbTypes";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Invalidator, Subscriber, Unsubscriber } from "svelte/motion";
import { writable, type Writable } from "svelte/store";
import { rawCourseData, searchCourseData } from "./recal";

// Course pool type
type CoursePool = {
    set: (this: void, value: Record<number, CourseData[]>) => void,
    update: (this: void, updater: (value: Record<number, CourseData[]>) 
        => Record<number, CourseData[]>) => void,
    subscribe: (this: void, run: Subscriber<Record<number, CourseData[]>>, 
        invalidate?: Invalidator<Record<number, CourseData[]>>) 
        => Unsubscriber,
    add: (supabase: SupabaseClient, scheduleId: number, course: CourseData) 
        => Promise<boolean>,
    remove: (supabase: SupabaseClient, scheduleId: number, course: CourseData) 
        => Promise<boolean>,
    clear: (supabase: SupabaseClient, scheduleId: number) => Promise<boolean>,
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

// Initialize a schedule pool
export const initSchedule = async (supabase: SupabaseClient, scheduleId: number, 
term: number): Promise<void> => {
    savedCourses.update(x => {
        if (!x.hasOwnProperty(scheduleId)) x[scheduleId] = [];
        return x;
    });
    pinnedCourses.update(x => {
        if (!x.hasOwnProperty(scheduleId)) x[scheduleId] = [];
        return x;
    });

    let loaded = false;
    savedCourses.subscribe(x => {
        if (x[scheduleId].length > 0) loaded = true;
    })();
    pinnedCourses.subscribe(x => {
        if (x[scheduleId].length > 0) loaded = true;
    })();
    if (loaded) return;

    const rawCourses = rawCourseData.get(term);

    // Fetch course-schedule-associations
    let { data, error } = await supabase.from("course_schedule_associations")
        .select("course_id, is_pinned")
        .eq("schedule_id", scheduleId)

    if (error) {
        console.log(error);
        return;
    }
    if (!data) return;

    searchCourseData.reset(term);

    let courses: CourseData[] = [];
    data.forEach(x => {
        let pool = x.is_pinned ? pinnedCourses : savedCourses;
        let cur = rawCourses.find(y => y.id === x.course_id) as CourseData;
        courses.push(cur);
        pool.update(x => {
            x[scheduleId] = [...x[scheduleId], cur];
            return x;
        });
    });
}

// Add a course to a pool
const addCourse = async (supabase: SupabaseClient, pool: CoursePool, 
scheduleId: number, course: CourseData, isPinned: boolean): Promise<boolean> => {
    // Get current pool courses
    let currentPool: CourseData[] = getCurrentPool(savedCourses, scheduleId);

    // Update store
    pool.update(x => {
        if (currentPool.length === 0) x[scheduleId] = [course];
        else x[scheduleId] = [...x[scheduleId], course];
        return x;
    });

    // Update course-schedule-associations table
    const { error } = await supabase
        .from("course_schedule_associations")
        .insert({
            course_id: course.id,
            schedule_id: scheduleId,
            is_pinned: isPinned
        });

    // Revert if error
    if (error) {
        console.log(error);
        pool.update(x => {
            x[scheduleId] = currentPool;
            return x;
        });
        return false;
    }
    return true;
}

// Remove a course from a pool
const removeCourse = async (supabase: SupabaseClient, pool: CoursePool, 
scheduleId: number, course: CourseData): Promise<boolean> => {
    // Get current pool courses
    let currentPool: CourseData[] = getCurrentPool(savedCourses, scheduleId);

    if (currentPool.length === 0) return false;

    // Update store
    pool.update(x => {
        x[scheduleId] = x[scheduleId].filter(y => y.id !== course.id)
        return x;
    });

    // Update course-schedule-associations table
    const { error } = await supabase.from("course_schedule_associations")
        .delete()
        .eq("course_id", course.id)
        .eq("schedule_id", scheduleId)

    // Revert if error
    if (error) {
        console.log(error)
        pool.update(x => {
            x[scheduleId] = currentPool;
            return x;
        });
        return false;
    }
    return true;
}

// Clear a pool
const clearPool = async (supabase: SupabaseClient, pool: CoursePool, 
scheduleId: number): Promise<boolean> => {
    // Get current pool courses
    let currentPool: CourseData[] = getCurrentPool(savedCourses, scheduleId);

    // Update store
    pool.update(x => {
        x[scheduleId] = [];
        return x;
    });

    // Update course-schedule-associations table
    const { error } = await supabase.from("course_schedule_associations")
        .delete()
        .eq("schedule_id", scheduleId)

    // Revert if error
    if (error) {
        console.log(error);
        pool.update(x => {
            x[scheduleId] = currentPool;
            return x;
        });
        return false;
    }
    return true;
}

//----------------------------------------------------------------------
// Saved courses
//----------------------------------------------------------------------

const { set: setSave, update: updateSave, subscribe: subscribeSave }: 
Writable<Record<number, CourseData[]>> = writable({});

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
    add: async (supabase: SupabaseClient, scheduleId: number, 
    course: CourseData): Promise<boolean> => {
        return await addCourse(supabase, savedCourses, scheduleId, course, false);
    },

    /**
     * 
     * @param supabase 
     * @param scheduleId 
     * @param course 
     */
    remove: async (supabase: SupabaseClient, scheduleId: number, 
    course: CourseData): Promise<boolean> => {
        return await removeCourse(supabase, savedCourses, scheduleId, course);
    },

    /**
     * 
     * @param supabase 
     * @param scheduleId 
     */
    clear: async (supabase: SupabaseClient, scheduleId: number): 
    Promise<boolean> => {
        return await clearPool(supabase, savedCourses, scheduleId);
    }
}

//----------------------------------------------------------------------
// Pinned courses
//----------------------------------------------------------------------

const { set: setPin, update: updatePin, subscribe: subscribePin }: 
Writable<Record<number, CourseData[]>> = writable({});

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
    add: async (supabase: SupabaseClient, scheduleId: number, 
    course: CourseData): Promise<boolean> => {
        return await addCourse(supabase, pinnedCourses, scheduleId, course, true);
    },

    /**
     * 
     * @param supabase 
     * @param scheduleId 
     * @param course 
     */
    remove: async (supabase: SupabaseClient, scheduleId: number, 
    course: CourseData): Promise<boolean> => {
        return await removeCourse(supabase, pinnedCourses, scheduleId, course);
    },

    /**
     * 
     * @param supabase 
     * @param scheduleId 
     */
    clear: async (supabase: SupabaseClient, scheduleId: number): 
    Promise<boolean> => {
        return await clearPool(supabase, pinnedCourses, scheduleId);
    }
}