<script lang="ts">
    import { modalStore } from "$lib/stores/modal";
    import AdvancedSearch from "../recal/modals/AdvancedSearch.svelte";
    import EditEvent from "../recal/modals/EditEvent.svelte";
    import ManageEvents from "../recal/modals/ManageEvents.svelte";
    import ExportCal from "../recal/modals/ExportCal.svelte";
    import AddSchedule from "../recal/elements/save/AddSchedule.svelte";
    import EditSchedule from "../recal/elements/save/EditSchedule.svelte";
    import RecalColors from "../recal/modals/RecalColors.svelte";
    import RecalPalettes from "../recal/modals/RecalPalettes.svelte";
    import RecalStats from "../recal/modals/RecalStats.svelte";
    import Feedback from "./Feedback.svelte";
    import FeedbackPop from "../feedbackpopup/FeedbackPop.svelte";

    // Register modal components here
    const modalComponents: Record<string, any> = {
        adv: AdvancedSearch,
        manageEvents: ManageEvents,
        editEvent: EditEvent,
        exportCal: ExportCal,
        addSchedule: AddSchedule,
        editSchedule: EditSchedule,
        rcolors: RecalColors,
        rpalettes: RecalPalettes,
        rstats: RecalStats,
        feedback: Feedback,
        feedbackpop: FeedbackPop
    };
</script>

{#if $modalStore && $modalStore in modalComponents}
    <svelte:component this={modalComponents[$modalStore]} showModal={true} />
{/if}
