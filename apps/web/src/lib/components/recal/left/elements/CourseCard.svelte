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

    let {
        course,
        category = "search"
    }: { course: CourseData; category?: string } = $props();

    const supabase = getContext("supabase") as SupabaseClient;

    // Course code with spaces before and after all slashes
    const code = course.code.replace(/\//g, " / ");
    const title = course.title;

    const { registrar, tigersnatch, princetoncourses } = getLinks(course);

    // Helper to compute text/hover colors from base color
    const computeDerivedColors = (baseColor: string) => {
        if (!baseColor) return { text: "", hoverColor: "", hoverText: "" };

        const lightness = parseInt(
            baseColor.split(",")[2]?.split("%")[0] || "50"
        );
        if (lightness > 50) {
            return {
                text: darkenHSL(baseColor, 60),
                hoverColor: darkenHSL(baseColor, 10),
                hoverText: darkenHSL(baseColor, 70)
            };
        } else {
            return {
                text: darkenHSL(baseColor, -60),
                hoverColor: darkenHSL(baseColor, -10),
                hoverText: darkenHSL(baseColor, -70)
            };
        }
    };

    // Make styles reactive to theme and color changes
    let styles = $derived.by(() => {
        const baseStyles = {
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

        // Search result styling
        if (category === "search") {
            baseStyles.stripes = "";
            if ($darkTheme) {
                baseStyles.color = "hsl(0, 0%, 10%)";
                baseStyles.text = "hsl(0, 0%, 90%)";
                baseStyles.hoverColor = "hsl(0, 0%, 10%)";
                baseStyles.hoverText = "hsl(0, 0%, 100%)";
            } else {
                baseStyles.color = "hsl(0, 0%,100%)";
                const derived = computeDerivedColors(baseStyles.color);
                Object.assign(baseStyles, derived);
            }
        } else {
            // Dynamic color (saved courses)
            const meta = $scheduleCourseMeta[$currentSchedule]?.[course.id];
            if (!meta) return baseStyles;

            const baseColor =
                $calColors[meta.color as unknown as keyof CalColors];
            baseStyles.color = baseColor;
            const derived = computeDerivedColors(baseColor);
            Object.assign(baseStyles, derived);
            baseStyles.trans = "solid";

            if (meta.complete) {
                baseStyles.stripes = "";
                baseStyles.border = darkenHSL(baseColor, 40);
            } else {
                baseStyles.color = darkenHSL(baseColor, -10);
                baseStyles.alpha = "0.8";
                baseStyles.border = darkenHSL(baseColor, 20);
            }
        }

        return baseStyles;
    });

    let flipped: boolean = $state(false);

    // Handle section loading on view
    let isInView: boolean = $state(false);
    const options = {};

    $effect(() => {
        if (isInView) {
            sectionData.add(supabase, $currentTerm, course.id);
        }
    });

    let cssVarStyles = $derived(
        Object.entries(styles)
            .map(([key, value]) => `--${key}:${value}`)
            .join(";")
    );

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

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
    id="card"
    transition:slide={{ duration: 150, axis: "y" }}
    class="duration-100 border-b-[1px] border-zinc-200 dark:border-zinc-700
    {category === 'saved' ? 'dark:border-zinc-900' : ''}"
    style={cssVarStyles}
    onmouseenter={handleHover}
    onmouseleave={handleLeave}
    onblur={handleLeave}
    onfocus={handleHover}
    use:inview={options}
    oninview_enter={(e: CustomEvent) => (isInView = e.detail.inView)}>
    <div
        id="topcard"
        class="flex justify-between items-stretch duration-75
        {$courseHoverRev === course.id ? 'tchover' : ''}">
        <button
            class="text-xs font-light text-left w-[75%] p-1"
            onclick={() => (flipped = !flipped)}>
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
                    onclick={() => {
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
                    onclick={() => {
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
        @apply border-b-[2px];
    }

    :global(.dark) #buttons {
        @apply border-zinc-800;
    }

    .add-button:hover {
        @apply bg-green-500;
    }

    :global(.dark) .add-button:hover {
        @apply bg-green-700;
    }

    .remove-button:hover {
        @apply bg-red-500;
    }

    :global(.dark) .remove-button:hover {
        @apply bg-red-700;
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
        @apply w-5 h-5 invert-[.5];
    }

    :global(.dark) .ic {
        @apply invert-[.7];
    }
</style>
