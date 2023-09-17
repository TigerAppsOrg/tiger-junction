// Stores for Saved and Pinned (Course Pools for ReCal+)

import type { CourseData } from "$lib/types/dbTypes";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Invalidator, Subscriber, Unsubscriber } from "svelte/motion";
import { writable, type Writable } from "svelte/store";
import { rawCourseData, searchCourseData } from "./recal";
import { getCurrentTerm } from "$lib/scripts/ReCal+/getters";
import { sectionData, type SectionData } from "./rsections";
import { rMeta, type RMetadata } from "./rmeta";

// Course pool type
type CoursePool = {
    set: (this: void, value: Record<number, CourseData[]>) => void,
    update: (this: void, updater: (value: Record<number, CourseData[]>) 
        => Record<number, CourseData[]>) => void,
    subscribe: (this: void, run: Subscriber<Record<number, CourseData[]>>, 
        invalidate?: Invalidator<Record<number, CourseData[]>>) 
        => Unsubscriber,
    add: (supabase: SupabaseClient, scheduleId: number, course: CourseData, SCD?: boolean) 
        => Promise<boolean>,
    remove: (supabase: SupabaseClient, scheduleId: number, course: CourseData, SCD?: boolean) 
        => Promise<boolean>,
    clear: (supabase: SupabaseClient, scheduleId: number) => Promise<boolean>,
}

//----------------------------------------------------------------------
// Helpers
//----------------------------------------------------------------------

/**
 * Add default metadata to a course
 * @param course 
 * @param scheduleId 
 */
export const addCourseMetadata = async (supabase: SupabaseClient, course: CourseData, 
scheduleId: number): Promise<boolean> => {
    // Create default metadata
    let meta: any = {
        complete: false,
        color: undefined,
        sections: [],
        confirms: {},
    };

    // * Handle color
    // Get other saved course colors
    let otherIds: number[] = [];
    let otherColors: number[] = [];
    savedCourses.subscribe(x => {
        otherIds = x[scheduleId].map(y => y.id);
    })();
    rMeta.subscribe(x => {
        if (!x.hasOwnProperty(scheduleId)) x[scheduleId] = {};
        for (let i = 0; i < otherIds.length; i++) {
            otherColors.push(x[scheduleId][otherIds[i]].color)
        }
    })();
        
    let colorMap: Record<number, number> = {};
    for (const o of otherColors) {
        if (colorMap.hasOwnProperty(o)) colorMap[o] += 1;
        else colorMap[o] = 1;
    }

    // Find the first unused color
    for (let i = 0; i < 7; i++) {
        if (!colorMap.hasOwnProperty(i)) {
            meta.color = i;
            break;
        }
    }

    // If no color found, default to least used color
    if (meta.color === undefined) {
        let min = 0;
        for (const [k, v] of Object.entries(colorMap)) {
            if (v < colorMap[min]) min = k as unknown as number;
        }
        meta.color = min;
    }

    // * Handle Sections
    // Check if section data is already populated
    let sections: SectionData[] = [];
    sectionData.subscribe(x => {
        sections = x[course.term][course.id] ? x[course.term][course.id] : [];
    });

    // Sections are already loaded
    if (sections.length > 0) {
        let categories = sections.map(x => x.category);
        let uniqueCategories = [...new Set(categories)];
        meta.sections = uniqueCategories.sort();

    // Sections are not loaded
    } else {
        // Load section data
        let res = await sectionData.add(supabase, getCurrentTerm(), course.id);

        if (!res) return false;

        // Get section data
        sectionData.subscribe(x => {
            sections = x[course.term][course.id] ? x[course.term][course.id] : [];
        })();

        // Add categories
        let categories = sections.map(x => x.category);
        let uniqueCategories = [...new Set(categories)];
        meta.sections = uniqueCategories.sort();
    }

    // * Update rMeta
    rMeta.update(x => {
        if (!x.hasOwnProperty(scheduleId)) x[scheduleId] = {};
        x[scheduleId][course.id] = meta as RMetadata;
        return x;
    });

    return true;
}
/**
 * Get the current pool for a given schedule
 * @param pool 
 * @param scheduleId 
 * @returns course data array for the current pool
 */
const getCurrentPool = (pool: CoursePool, scheduleId: number): 
CourseData[] => {
    let data: CourseData[] = [];
    pool.subscribe((x) => {
        if (x.hasOwnProperty(scheduleId)) data = x[scheduleId];
        else data = [];
    })();
    return data;
}

/**
 * Initialize a course pool
 * @param supabase 
 * @param scheduleId 
 * @param term 
 */
export const initSchedule = async (supabase: SupabaseClient, scheduleId: number, 
term: number) => {
    let loaded = false;
    savedCourses.update(x => {
        if (x.hasOwnProperty(scheduleId)) loaded = true;
        else x[scheduleId] = [];
        
        return x;
    });
    pinnedCourses.update(x => {
        if (x.hasOwnProperty(scheduleId)) loaded = true;
        else x[scheduleId] = [];
        
        return x;
    });
    if (loaded) return;

    const rawCourses = rawCourseData.get(term);

    // Fetch course-schedule-associations
    let { data, error } = await supabase.from("course_schedule_associations")
        .select("course_id, is_pinned, metadata")
        .eq("schedule_id", scheduleId)

    if (error) {
        console.log(error);
        return;
    }
    if (!data) return;

    searchCourseData.reset(term);

    for (let i = 0; i < data.length; i++) {
        let x = data[i];

        // Find Course
        let cur = rawCourses.find(y => y.id === x.course_id) as CourseData;

        // Add metadata
        rMeta.update(y => {
            if (!y.hasOwnProperty(scheduleId)) y[scheduleId] = {};
            y[scheduleId][cur.id] = x.metadata;
            return y;
        });
        // addCourseMetadata(supabase, cur, scheduleId);

        // Load section data
        await sectionData.add(supabase, term, cur.id);

        // Update pool
        let pool = x.is_pinned ? pinnedCourses : savedCourses;
        pool.update(x => {
            x[scheduleId] = [...x[scheduleId], cur];
            return x;
        });
    }        
}

/**
 * Add a course to a pool
 * @param supabase 
 * @param pool 
 * @param scheduleId 
 * @param course 
 * @param isPinned 
 * @param SCD 
 * @returns true if successful, false if failure
 */
const addCourse = async (supabase: SupabaseClient, pool: CoursePool, 
scheduleId: number, course: CourseData, isPinned: boolean, SCD?: boolean): 
Promise<boolean> => {
    // Get current pool courses
    let currentPool: CourseData[] = getCurrentPool(pool, scheduleId);

    
    // Add metadata
    let meta: RMetadata | {} = {};
    if (pool === savedCourses) {
        addCourseMetadata(supabase, course, scheduleId);
        rMeta.subscribe(x => {
            meta =  x[scheduleId][course.id];
        })();
    }
    
    // Update store
    pool.update(x => {
        if (currentPool.length === 0) x[scheduleId] = [course];
        else x[scheduleId] = [...x[scheduleId], course];
        return x;
    });

    if (SCD) searchCourseData.remove(getCurrentTerm(), [course]);


    // Update course-schedule-associations table
    const { error } = await supabase
        .from("course_schedule_associations")
        .insert({
            course_id: course.id,
            schedule_id: scheduleId,
            is_pinned: isPinned,
            metadata: meta,
        });

    // Revert if error
    if (error) {
        console.log(error);
        pool.update(x => {
            x[scheduleId] = currentPool;
            return x;
        });
        if (SCD) searchCourseData.add(getCurrentTerm(), [course]);
        return false;
    }
    return true;
}

/**
 * Remove a course from a pool
 * @param supabase 
 * @param pool 
 * @param scheduleId 
 * @param course 
 * @param SCD 
 * @returns true if successful, false if failure
 */
const removeCourse = async (supabase: SupabaseClient, pool: CoursePool, 
scheduleId: number, course: CourseData, SCD?: boolean): Promise<boolean> => {
    // Get current pool courses
    let currentPool: CourseData[] = getCurrentPool(pool, scheduleId);

    if (currentPool.length === 0) return false;

    // Update store
    pool.update(x => {
        x[scheduleId] = x[scheduleId].filter(y => y.id !== course.id)
        return x;
    });

    if (SCD) searchCourseData.add(getCurrentTerm(), [course]);

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
        if (SCD) searchCourseData.remove(getCurrentTerm(), [course]);
        return false;
    }
    return true;
}

/**
 * Clear a pool
 * @param supabase 
 * @param pool 
 * @param scheduleId 
 * @returns true if successful, false if failure
 */
const clearPool = async (supabase: SupabaseClient, pool: CoursePool, 
scheduleId: number): Promise<boolean> => {
    // Get current pool courses
    let currentPool: CourseData[] = getCurrentPool(savedCourses, scheduleId);

    // Update store
    pool.update(x => {
        x[scheduleId] = [];
        return x;
    });

    searchCourseData.add(getCurrentTerm(), currentPool);

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
        searchCourseData.remove(getCurrentTerm(), currentPool);
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
    course: CourseData, SCD?: boolean): Promise<boolean> => {
        return await addCourse(supabase, savedCourses, scheduleId, 
            course, false, SCD);
    },

    /**
     * 
     * @param supabase 
     * @param scheduleId 
     * @param course 
     */
    remove: async (supabase: SupabaseClient, scheduleId: number, 
    course: CourseData, SCD?: boolean): Promise<boolean> => {
        return await removeCourse(supabase, savedCourses, scheduleId, 
            course, SCD);
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
    course: CourseData, SCD?: boolean): Promise<boolean> => {
        return await addCourse(supabase, pinnedCourses, scheduleId, 
            course, true, SCD);
    },

    /**
     * 
     * @param supabase 
     * @param scheduleId 
     * @param course 
     */
    remove: async (supabase: SupabaseClient, scheduleId: number, 
    course: CourseData, SCD?: boolean): Promise<boolean> => {
        return await removeCourse(supabase, pinnedCourses, scheduleId, 
            course, SCD);
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