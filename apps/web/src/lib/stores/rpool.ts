// Stores for Saved (Course Pools for ReCal+)

import { getCurrentTerm } from "$lib/scripts/ReCal+/getters";
import type { CourseData } from "$lib/types/dbTypes";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Invalidator, Subscriber, Unsubscriber } from "svelte/motion";
import { writable } from "svelte/store";
import {
    rawCourseData,
    scheduleCourseMeta,
    searchCourseData,
    type ScheduleCourseMetadata
} from "./recal";
import { sectionData, type SectionData } from "./rsections";

// Course pool type
type CoursePool = {
    set: (this: void, value: Record<number, CourseData[]>) => void;
    update: (
        this: void,
        updater: (
            value: Record<number, CourseData[]>
        ) => Record<number, CourseData[]>
    ) => void;
    subscribe: (
        this: void,
        run: Subscriber<Record<number, CourseData[]>>,
        invalidate?: Invalidator<Record<number, CourseData[]>>
    ) => Unsubscriber;
    add: (
        supabase: SupabaseClient,
        scheduleId: number,
        course: CourseData,
        SCD?: boolean
    ) => Promise<boolean>;
    remove: (
        supabase: SupabaseClient,
        scheduleId: number,
        course: CourseData,
        SCD?: boolean
    ) => Promise<boolean>;
    clear: (supabase: SupabaseClient, scheduleId: number) => Promise<boolean>;
};

//----------------------------------------------------------------------
// Helpers
//----------------------------------------------------------------------

/**
 * Add default metadata to a course
 * @param course
 * @param scheduleId
 */
export const addCourseMetadata = async (
    supabase: SupabaseClient,
    course: CourseData,
    scheduleId: number
): Promise<boolean> => {
    // Create default metadata
    const meta: any = {
        complete: false,
        color: undefined,
        sections: [],
        confirms: {}
    };

    // * Handle color
    // Get other saved course colors
    let otherIds: number[] = [];
    const otherColors: number[] = [];
    savedCourses.subscribe(x => {
        otherIds = x[scheduleId].map(y => y.id);
    })();
    scheduleCourseMeta.subscribe(x => {
        if (!Object.prototype.hasOwnProperty.call(x, scheduleId))
            x[scheduleId] = {};
        for (let i = 0; i < otherIds.length; i++) {
            otherColors.push(x[scheduleId][otherIds[i]].color);
        }
    })();

    const colorMap: Record<number, number> = {};
    for (const o of otherColors) {
        if (Object.prototype.hasOwnProperty.call(colorMap, o)) colorMap[o] += 1;
        else colorMap[o] = 1;
    }

    // Find the first unused color
    for (let i = 0; i < 7; i++) {
        if (!Object.prototype.hasOwnProperty.call(colorMap, i)) {
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
        const categories = sections.map(x => x.category);
        const uniqueCategories = [...new Set(categories)];
        meta.sections = uniqueCategories.sort();

        // Sections are not loaded
    } else {
        // Load section data
        const res = await sectionData.add(
            supabase,
            getCurrentTerm(),
            course.id
        );

        if (!res) return false;

        // Get section data
        sectionData.subscribe(x => {
            sections = x[course.term][course.id]
                ? x[course.term][course.id]
                : [];
        })();

        // Add categories
        const categories = sections.map(x => x.category);
        const uniqueCategories = [...new Set(categories)];
        meta.sections = uniqueCategories.sort();
    }

    // Auto-Add if only one section in a category and check if complete
    meta.complete = true;
    for (let i = 0; i < meta.sections.length; i++) {
        const category = meta.sections[i];
        const categorySections = sections.filter(x => x.category === category);
        if (categorySections.length === 1) {
            meta.confirms[category] = categorySections[0].title;
        } else {
            meta.complete = false;
        }
    }

    // * Update scheduleCourseMeta
    scheduleCourseMeta.update(x => {
        if (!Object.prototype.hasOwnProperty.call(x, scheduleId))
            x[scheduleId] = {};
        x[scheduleId][course.id] = meta as ScheduleCourseMetadata;
        return x;
    });

    return true;
};
/**
 * Get the current pool for a given schedule
 * @param pool
 * @param scheduleId
 * @returns course data array for the current pool
 */
const getCurrentPool = (pool: CoursePool, scheduleId: number): CourseData[] => {
    let data: CourseData[] = [];
    pool.subscribe(x => {
        if (Object.prototype.hasOwnProperty.call(x, scheduleId))
            data = x[scheduleId];
        else data = [];
    })();
    return data;
};

/**
 * Initialize a course pool
 * @param supabase
 * @param scheduleId
 * @param term
 */
export const initSchedule = async (
    supabase: SupabaseClient,
    scheduleId: number,
    term: number
) => {
    let loaded = false;
    savedCourses.update(x => {
        if (Object.prototype.hasOwnProperty.call(x, scheduleId)) loaded = true;
        else x[scheduleId] = [];

        return x;
    });
    if (loaded) return;

    const rawCourses = rawCourseData.get(term);

    // Fetch course-schedule-associations
    const { data, error } = await supabase
        .from("course_schedule_associations")
        .select("course_id, metadata")
        .eq("schedule_id", scheduleId);

    if (error) {
        console.log(error);
        return;
    }
    if (!data) return;

    searchCourseData.reset(term);

    for (let i = 0; i < data.length; i++) {
        const x = data[i];

        // Find Course
        const cur = rawCourses.find(y => y.id === x.course_id) as CourseData;

        // Add metadata
        scheduleCourseMeta.update(y => {
            if (!Object.prototype.hasOwnProperty.call(y, scheduleId))
                y[scheduleId] = {};
            y[scheduleId][cur.id] = x.metadata;
            return y;
        });

        // Load section data
        await sectionData.add(supabase, term, cur.id);

        // Update pool
        const pool = savedCourses;
        pool.update(x => {
            x[scheduleId] = [...x[scheduleId], cur];
            return x;
        });
    }
};

/**
 * Add a course to a pool
 * @param supabase
 * @param pool
 * @param scheduleId
 * @param course
 * @param SCD
 * @returns true if successful, false if failure
 */
const addCourse = async (
    supabase: SupabaseClient,
    pool: CoursePool,
    scheduleId: number,
    course: CourseData,
    SCD?: boolean
): Promise<boolean> => {
    // Get current pool courses
    const currentPool: CourseData[] = getCurrentPool(pool, scheduleId);

    // Add metadata
    let meta: ScheduleCourseMetadata | object = {};
    if (pool === savedCourses) {
        addCourseMetadata(supabase, course, scheduleId);
        scheduleCourseMeta.subscribe(x => {
            meta = x[scheduleId][course.id];
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
            metadata: meta
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
};

/**
 * Remove a course from a pool
 * @param supabase
 * @param pool
 * @param scheduleId
 * @param course
 * @param SCD
 * @returns true if successful, false if failure
 */
const removeCourse = async (
    supabase: SupabaseClient,
    pool: CoursePool,
    scheduleId: number,
    course: CourseData,
    SCD?: boolean
): Promise<boolean> => {
    // Get current pool courses
    const currentPool: CourseData[] = getCurrentPool(pool, scheduleId);

    if (currentPool.length === 0) return false;

    // Update store
    pool.update(x => {
        x[scheduleId] = x[scheduleId].filter(y => y.id !== course.id);
        return x;
    });

    if (SCD) searchCourseData.add(getCurrentTerm(), [course]);

    // Update course-schedule-associations table
    const { error } = await supabase
        .from("course_schedule_associations")
        .delete()
        .eq("course_id", course.id)
        .eq("schedule_id", scheduleId);

    // Revert if error
    if (error) {
        console.log(error);
        pool.update(x => {
            x[scheduleId] = currentPool;
            return x;
        });
        if (SCD) searchCourseData.remove(getCurrentTerm(), [course]);
        return false;
    }
    return true;
};

/**
 * Clear a pool
 * @param supabase
 * @param pool
 * @param scheduleId
 * @returns true if successful, false if failure
 */
const clearPool = async (
    supabase: SupabaseClient,
    pool: CoursePool,
    scheduleId: number
): Promise<boolean> => {
    // Get current pool courses
    const currentPool: CourseData[] = getCurrentPool(savedCourses, scheduleId);

    // Update store
    pool.update(x => {
        x[scheduleId] = [];
        return x;
    });

    searchCourseData.add(getCurrentTerm(), currentPool);

    // Update course-schedule-associations table
    const { error } = await supabase
        .from("course_schedule_associations")
        .delete()
        .eq("schedule_id", scheduleId);

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
};

//----------------------------------------------------------------------
// Saved courses
//----------------------------------------------------------------------

const {
    set: setSave,
    update: updateSave,
    subscribe: subscribeSave
} = writable<Record<number, CourseData[]>>({});

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
    add: async (
        supabase: SupabaseClient,
        scheduleId: number,
        course: CourseData,
        SCD?: boolean
    ): Promise<boolean> => {
        return await addCourse(supabase, savedCourses, scheduleId, course, SCD);
    },

    /**
     *
     * @param supabase
     * @param scheduleId
     * @param course
     */
    remove: async (
        supabase: SupabaseClient,
        scheduleId: number,
        course: CourseData,
        SCD?: boolean
    ): Promise<boolean> => {
        return await removeCourse(
            supabase,
            savedCourses,
            scheduleId,
            course,
            SCD
        );
    },

    /**
     *
     * @param supabase
     * @param scheduleId
     */
    clear: async (
        supabase: SupabaseClient,
        scheduleId: number
    ): Promise<boolean> => {
        return await clearPool(supabase, savedCourses, scheduleId);
    }
};
