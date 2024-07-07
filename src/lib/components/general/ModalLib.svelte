<script lang="ts">
    import { modalStore } from "$lib/stores/modal";

    // Recal Modals
    import AdvancedSearch from "../recal/modals/AdvancedSearch.svelte";
    import ExportCal from "../recal/modals/ExportCal.svelte";
    import AddSchedule from "../recal/elements/save/AddSchedule.svelte";
    import EditSchedule from "../recal/elements/save/EditSchedule.svelte";
    import RecalStats from "../recal/modals/RecalStats.svelte";
    import Feedback from "./Feedback.svelte";
    import FeedbackPop from "../feedbackpopup/FeedbackPop.svelte";

    // Style Modals
    import RecalColors from "../recal/modals/RecalColors.svelte";
    import RecalPalettes from "../recal/modals/RecalPalettes.svelte";

    // Event Modals
    import AddEvent from "../recal/modals/events/AddEvent.svelte";
    import ManageEvents from "../recal/modals/events/ManageEvents.svelte";
    import EditEvent from "../recal/modals/events/EditEvent.svelte";
    import DeleteEvent from "../recal/modals/events/DeleteEvent.svelte";

    // Register modal components here
    const modalComponents: Record<string, any> = {
        adv: AdvancedSearch,
        exportCal: ExportCal,
        addSchedule: AddSchedule,
        editSchedule: EditSchedule,
        rstats: RecalStats,
        feedback: Feedback,
        feedbackpop: FeedbackPop,
        rcolors: RecalColors,
        rpalettes: RecalPalettes,
        manageEvents: ManageEvents,
        addEvent: AddEvent,
        editEvent: EditEvent,
        deleteEvent: DeleteEvent
    };
</script>

{#if $modalStore && $modalStore in modalComponents}
    <svelte:component this={modalComponents[$modalStore]} showModal={true} />
{/if}
