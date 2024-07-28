<script lang="ts">
    import { modalStore } from "$lib/stores/modal";

    // Recal Modals
    import AdvancedSearch from "../recal/modals/AdvancedSearch.svelte";
    import ExportCal from "../recal/modals/schedule/ExportCal.svelte";
    import AddSchedule from "../recal/modals/schedule/AddSchedule.svelte";
    import EditSchedule from "../recal/modals/schedule/EditSchedule.svelte";
    import RecalStats from "../recal/modals/RecalStats.svelte";
    import Feedback from "./Feedback.svelte";
    import FeedbackPop from "./FeedbackPop.svelte";

    // Style Modals
    import Theme from "./style/Theme.svelte";
    import Palettes from "./style/Palettes.svelte";

    // Event Modals
    import ManageEvents from "../recal/modals/events/ManageEvents.svelte";
    import EditEvent from "../recal/modals/events/EditEvent.svelte";
    import DeleteEvent from "../recal/modals/events/DeleteEvent.svelte";

    // Register modal components here
    const modalComponents: Record<string, unknown> = {
        adv: AdvancedSearch,
        exportCal: ExportCal,
        addSchedule: AddSchedule,
        editSchedule: EditSchedule,
        rstats: RecalStats,
        feedback: Feedback,
        feedbackpop: FeedbackPop,
        theme: Theme,
        palettes: Palettes,
        manageEvents: ManageEvents,
        editEvent: EditEvent,
        deleteEvent: DeleteEvent
    };
</script>

{#if $modalStore && $modalStore in modalComponents}
    <svelte:component this={modalComponents[$modalStore]} showModal={true} />
{/if}
