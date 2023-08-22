<script lang="ts">
import { modalStore } from "$lib/stores/modal";
import AdvancedSearch from "../recal/elements/adv/AdvancedSearch.svelte";
</script>

<AdvancedSearch showModal={$modalStore === "adv"} />