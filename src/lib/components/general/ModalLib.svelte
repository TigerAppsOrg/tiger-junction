<script lang="ts">
import { modalStore } from "$lib/stores/modal";
import AdvancedSearch from "../recal/elements/adv/AdvancedSearch.svelte";
import EditCb from "../recal/elements/cb/EditCb.svelte";
import ManageCb from "../recal/elements/cb/ManageCb.svelte";
    import ExportCal from "../recal/elements/export/ExportCal.svelte";
    import ShareCal from "../recal/elements/export/ShareCal.svelte";
    import AddSchedule from "../recal/elements/save/AddSchedule.svelte";
    import EditSchedule from "../recal/elements/save/EditSchedule.svelte";
</script>

<AdvancedSearch showModal={$modalStore === "adv"} />
<ManageCb showModal={$modalStore === "manageCb"} />
<EditCb showModal={$modalStore === "editCb"} />
<ShareCal showModal={$modalStore === "shareCal"} />
<ExportCal showModal={$modalStore === "exportCal"} />
<AddSchedule showModal={$modalStore === "addSchedule"} />
<EditSchedule showModal={$modalStore === "editSchedule"} />
