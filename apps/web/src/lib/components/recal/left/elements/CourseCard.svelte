<script lang="ts">
    import { CURRENT_TERM_ID, currentTerm } from "$lib/changeme";
    import { darkenHSL } from "$lib/scripts/convert";
    import * as cf from "$lib/scripts/ReCal+/cardFunctions";
    import { getLinks } from "$lib/scripts/ReCal+/getLinks";
    import {
        currentSchedule,
        scheduleCourseMeta,
        searchSettings
    } from "$lib/stores/recal";
    import { sectionData } from "$lib/stores/rsections";
    import { darkTheme, calColors, type CalColors } from "$lib/stores/styles";
    import type { CourseData } from "$lib/types/dbTypes";
    import type { SupabaseClient } from "@supabase/supabase-js";
    import { getContext } from "svelte";
    import { inview } from "svelte-inview";
    import { slide } from "svelte/transition";
    import {
        courseHover,
        courseHoverRev,
        hoveredCourse
    } from "../../../../scripts/ReCal+/calendar";
    import CardLinkButton from "./CardLinkButton.svelte";

    export let course: CourseData;
    export let category: string = "search";

    const supabase = getContext("supabase") as SupabaseClient;

    // Course code with spaces before and after all slashes
    const code = course.code.replace(/\//g, " / ");
    const title = course.title;

    const { registrar, tigersnatch, princetoncourses } = getLinks(course);

    // Determine color of card
    const styles = {
        color: "",
        text: "",
        hoverColor: "",
        hoverText: "",
        alpha: "1",
        border: "",
        trans: "hidden",
        stripes: `repeating-linear-gradient(
        45deg,
        transparent,
        transparent 5px,
        rgba(0, 0, 0, 0.05) 5px,
        rgba(0, 0, 0, 0.05) 10px);`
    };

    const fillStyles = () => {
        if (styles.color === "") return;

        if (parseInt(styles.color.split(",")[2].split("%")[0]) > 50) {
            styles.text = darkenHSL(styles.color, 60);
            styles.hoverColor = darkenHSL(styles.color, 10);
            styles.hoverText = darkenHSL(styles.color, 70);
        } else {
            styles.text = darkenHSL(styles.color, -60);
            styles.hoverColor = darkenHSL(styles.color, -10);
            styles.hoverText = darkenHSL(styles.color, -70);
        }
    };

    // Search result styling
    if (category === "search") {
        styles.stripes = "";
        if ($darkTheme) {
            styles.color = "hsl(0, 0%, 10%)";
            styles.text = "hsl(0, 0%, 90%)";
            styles.hoverColor = "hsl(0, 0%, 10%)";
            styles.hoverText = "hsl(0, 0%, 100%)";
        } else {
            styles.color = "hsl(0, 0%,100%)";
            fillStyles();
        }

        // Dynamic color (saved courses)
    } else {
        const meta = $scheduleCourseMeta[$currentSchedule][course.id];
        styles.color = $calColors[meta.color as unknown as keyof CalColors];
        fillStyles();
        styles.trans = "solid";

        if (meta.complete) {
            styles.stripes = "";
            styles.border = darkenHSL(
                $calColors[meta.color as unknown as keyof CalColors],
                40
            );
        } else {
            styles.color = darkenHSL(
                $calColors[meta.color as unknown as keyof CalColors],
                -10
            );
            styles.alpha = "0.8";
            styles.border = darkenHSL(
                $calColors[meta.color as unknown as keyof CalColors],
                20
            );
        }
    }

    let flipped: boolean = false;

    // Handle section loading on view
    let isInView: boolean;
    const options = {};

    $: if (isInView) {
        sectionData.add(supabase, $currentTerm, course.id);
    }

    $: cssVarStyles = Object.entries(styles)
        .map(([key, value]) => `--${key}:${value}`)
        .join(";");

    const handleHover = async () => {
        await sectionData.add(supabase, $currentTerm, course.id);

        $courseHover = course.id;
        if (category === "search") {
            $hoveredCourse = course;
        }
    };

    const handleLeave = () => {
        $courseHover = null;
        if (category === "search") {
            $hoveredCourse = null;
        }
    };
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
    id="card"
    transition:slide={{ duration: 150, axis: "y" }}
    class="duration-100 border-b-[1px] dark:border-zinc-800
    {category === 'saved' && 'dark:border-black'}"
    style={cssVarStyles}
    on:mouseenter={handleHover}
    on:mouseleave={handleLeave}
    on:blur={handleLeave}
    on:focus={handleHover}
    use:inview={options}
    on:inview_enter={e => (isInView = e.detail.inView)}>
    <div
        id="topcard"
        class="flex justify-between items-stretch duration-75
        {$courseHoverRev === course.id ? 'tchover' : ''}">
        <button
            class="text-xs font-light text-left w-[75%] p-1"
            on:click={() => (flipped = !flipped)}>
            <div class="font-normal serif-lowercase">
                {code}
            </div>
            <div class="serif-lowercase">
                {title}
            </div>

            <div class="text-xs italic font-light">
                {#if $searchSettings.style["Show Rating"]}
                    Rating: {course.rating ? course.rating : "N/A"}
                {/if}
                {#if $searchSettings.style["Show # of Comments"]}
                    ({course.num_evals ? course.num_evals : "N/A"} comments)
                {/if}
                {#if $searchSettings.style["Show Weighted Rating"]}
                    [{course.adj_rating} adj]
                {/if}
                {#if $searchSettings.style["Show Enrollment"]}
                    {@const sections =
                        $sectionData[$currentTerm]?.[course.id] || []}
                    {@const priority = ["L", "S", "C", "P", "B", "D", "U"]}
                    {@const mainCat = priority.find(cat =>
                        sections.some(s => s.category === cat)
                    )}
                    {@const mainSections = mainCat
                        ? sections.filter(s => s.category === mainCat)
                        : []}
                    {@const totalEnroll = mainSections.reduce(
                        (sum, s) => sum + s.tot,
                        0
                    )}
                    {@const totalCap = mainSections.reduce(
                        (sum, s) => sum + (s.cap !== 999 ? s.cap : 0),
                        0
                    )}
                    Enrollment: {totalCap > 0
                        ? `${totalEnroll}/${totalCap}`
                        : "N/A"}
                {/if}
            </div>

            {#if $searchSettings.style["Show Instructors"]}
                {#if course.instructors && course.instructors.length > 0}
                    {#each course.instructors as instructor}
                        <div class="text-xs italic font-light">
                            {instructor}
                        </div>
                    {/each}
                {/if}
            {/if}
        </button>

        <div class="w-[20%] flex justify-evenly">
            {#if category === "saved"}
                <button
                    class="remove-button
                z-50 h-full w-full flex items-center justify-center
                duration-100"
                    on:click={() => {
                        cf.removeCourseFromSaved(supabase, course);
                    }}>
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke-width="1.5"
                        stroke="currentColor"
                        class="ic">
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            d="M5 12h14" />
                    </svg>
                </button>
            {:else}
                <button
                    class="add-button
                z-50 h-full w-full flex items-center justify-center
                duration-100"
                    on:click={() => {
                        cf.saveCourseFromSearch(supabase, course);
                    }}>
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke-width="1.5"
                        stroke="currentColor"
                        class="ic">
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                </button>
            {/if}
        </div>
    </div>

    {#if flipped}
        <div class="w-full" transition:slide={{ axis: "y", duration: 150 }}>
            <div id="buttons" class="w-full flex flex-col">
                {#if $currentTerm === CURRENT_TERM_ID}
                    <CardLinkButton
                        href={tigersnatch}
                        title="TigerSnatch"
                        hoverColor={styles.hoverColor}
                        hoverText={styles.hoverText}
                        borderColor={styles.border}>
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke-width="1.5"
                            stroke="currentColor"
                            class="icon">
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </CardLinkButton>
                {/if}

                <CardLinkButton
                    href={princetoncourses}
                    title="PrincetonCourses"
                    hoverColor={styles.hoverColor}
                    hoverText={styles.hoverText}
                    borderColor={styles.border}>
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke-width="1.5"
                        stroke="currentColor"
                        class="icon">
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                    </svg>
                </CardLinkButton>

                <CardLinkButton
                    href={registrar}
                    title="Registrar"
                    hoverColor={styles.hoverColor}
                    hoverText={styles.hoverText}
                    borderColor={styles.border}>
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke-width="1.5"
                        stroke="currentColor"
                        class="icon">
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                    </svg>
                </CardLinkButton>
            </div>
        </div>
    {/if}
</div>

<style lang="postcss">
    #card {
        background-image: var(--stripes);
        opacity: var(--alpha);
        background-color: var(--color);
        color: var(--text);
        border-left: 4px var(--trans) var(--border);
    }

    .tchover {
        background-color: var(--hoverColor);
        color: var(--hoverText);
        opacity: var(--alpha);
    }

    #topcard:hover {
        background-color: var(--hoverColor);
        color: var(--hoverText);
    }

    #buttons {
        @apply border-b-[2px] dark:border-zinc-800;
    }

    .add-button:hover {
        @apply bg-green-500 dark:bg-green-700;
    }

    .remove-button:hover {
        @apply bg-red-500 dark:bg-red-700;
    }

    .cardlink {
        @apply w-1/3 m-0 px-0;
    }

    .cardbutton {
        @apply px-0 h-10 w-full rounded-none;
    }

    .icon {
        @apply w-6 h-6 mx-auto;
    }

    .ic {
        @apply w-5 h-5 invert-[.5] dark:invert-[.7];
    }
</style>
