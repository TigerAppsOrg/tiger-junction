//  Store for drip-style loaded section data

import type { SupabaseClient } from "@supabase/supabase-js";
import { writable, type Writable } from "svelte/store";

type RawSectionData = {
    [key: number]: SectionMap
}

type SectionMap = {
    [key: string]: SectionData[]
}

type SectionData = {
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
    courseId: number) => {
        // Check if the data is already loaded
        let loaded = false;
        sectionData.subscribe(x => {
            if (x[term][courseId]) loaded = true;
        })();
        if (loaded) return;

        // Load the data
        const { data, error } = await supabase
            .from("sections")
            .select("*")
            .eq("course_id", courseId)
            .order("id", { ascending: true });

        if (error) {
            console.log(error);
            return;
        }

        // Add the data
        update(x => {
            x[term][courseId] = data;
            return x;
        });
    }
}