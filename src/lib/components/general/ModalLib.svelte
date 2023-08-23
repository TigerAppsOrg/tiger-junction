<script lang="ts">
import { modalStore } from "$lib/stores/modal";
import AdvancedSearch from "../recal/elements/adv/AdvancedSearch.svelte";
import EditCb from "../recal/elements/cb/editCb.svelte";
import ManageCb from "../recal/elements/cb/manageCb.svelte";
</script>

<AdvancedSearch showModal={$modalStore === "adv"} />
<ManageCb showModal={$modalStore === "manageCb"} />
<EditCb showModal={$modalStore === "editCb"} />
