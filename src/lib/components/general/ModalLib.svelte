<script lang="ts">
import { modalStore } from "$lib/stores/modal";
import type { SupabaseClient } from "@supabase/supabase-js";
import AdvancedSearch from "../recal/elements/adv/AdvancedSearch.svelte";
import EditCb from "../recal/elements/cb/editCb.svelte";
import ManageCb from "../recal/elements/cb/manageCb.svelte";
import ExportCal from "../recal/elements/export/ExportCal.svelte";
import ShareCal from "../recal/elements/export/ShareCal.svelte";
import AddSchedule from "../recal/elements/save/AddSchedule.svelte";
import EditSchedule from "../recal/elements/save/EditSchedule.svelte";
import Pinned from "../recal/elements/save/Pinned.svelte";
import RecalColors from "../recal/elements/adv/RecalColors.svelte";
import RecalPalettes from "../recal/elements/adv/RecalPalettes.svelte";

export let supabase: SupabaseClient;

</script>

{#if $modalStore === "adv"}
<AdvancedSearch showModal={$modalStore === "adv"} />
{/if}

{#if $modalStore === "manageCb"}
<ManageCb showModal={$modalStore === "manageCb"} />
{/if}

{#if $modalStore === "editCb"}
<EditCb showModal={$modalStore === "editCb"} />
{/if}

{#if $modalStore === "shareCal"}
<ShareCal showModal={$modalStore === "shareCal"} />
{/if}

{#if $modalStore === "exportCal"}
<ExportCal showModal={$modalStore === "exportCal"} />
{/if}

{#if $modalStore === "addSchedule"}
<AddSchedule showModal={$modalStore === "addSchedule"} {supabase} />
{/if}

{#if $modalStore === "editSchedule"}
<EditSchedule showModal={$modalStore === "editSchedule"} {supabase} />
{/if}

{#if $modalStore === "pinned"}
<Pinned showModal={$modalStore === "pinned"} {supabase} />
{/if}

{#if $modalStore === "rcolors"}
<RecalColors showModal={$modalStore === "rcolors"} />
{/if}

{#if $modalStore === "rpalettes"}
<RecalPalettes showModal={$modalStore === "rpalettes"} />
{/if}
