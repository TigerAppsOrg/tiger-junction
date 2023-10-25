//  Store for drip-style loaded section data

import type { SupabaseClient } from "@supabase/supabase-js";
import { writable, type Writable } from "svelte/store";

// term -> SectionMap
type RawSectionData = {
    [key: number]: SectionMap
}

// course_id -> SectionData[]
type SectionMap = {
    [key: string]: SectionData[]
}

export type SectionData = {
    cap: number,
    category: string,
    course_id: number,
    days: number,
    end_time: number,
    id: number,
    num: number,
    room: string,
    start_time: number,
    title: string,
    tot: number,
    status: number,
}

const { set, update, subscribe }: Writable<RawSectionData> = writable({
    1242: {},
    1234: {},
    1232: {}
});

export const sectionData = {
    set,
    update,
    subscribe,

    /**
     * Add section data for a given course
     * @param supabase 
     * @param term 
     * @param courseId 
     */
    add: async (supabase: SupabaseClient, term: keyof RawSectionData, 
    courseId: number): Promise<boolean> => {
        // Check if the data is already loaded
        let loaded = false;
        sectionData.subscribe(x => {
            if (x[term][courseId]) loaded = true;
        })();
        if (loaded) return true;

        // Load the data
        const { data, error } = await supabase
            .from("sections")
            .select("*")
            .eq("course_id", courseId)
            .order("id", { ascending: true });

        if (error) {
            console.log(error);
            return false;
        }

        // Add the data
        update(x => {
            x[term][courseId] = data;
            return x;
        });
        return true;
    }
}

export const sectionDone = writable({
    1242: true,
    1234: false,
    1232: false
});