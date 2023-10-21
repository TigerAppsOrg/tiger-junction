<script lang="ts">
import { modalStore } from "$lib/stores/modal";
import type { SupabaseClient } from "@supabase/supabase-js";
import AdvancedSearch from "../recal/modals/AdvancedSearch.svelte";
import EditCb from "../recal/modals/EditCb.svelte";
import ManageCb from "../recal/modals/ManageCb.svelte";
import ExportCal from "../recal/modals/ExportCal.svelte";
import ShareCal from "../recal/modals/ShareCal.svelte";
import AddSchedule from "../recal/elements/save/AddSchedule.svelte";
import EditSchedule from "../recal/elements/save/EditSchedule.svelte";
import Pinned from "../recal/elements/save/Pinned.svelte";
import RecalColors from "../recal/modals/RecalColors.svelte";
import RecalPalettes from "../recal/modals/RecalPalettes.svelte";
import RecalUtils from "../recal/modals/RecalUtils.svelte";
import RecalStats from "../recal/modals/RecalStats.svelte";
import SiteTimer from "../recal/modals/SiteTimer.svelte";

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
<ExportCal showModal={$modalStore === "exportCal"} {supabase} />
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

{#if $modalStore === "rutils"}
<RecalUtils showModal={$modalStore === "rutils"} />
{/if}

{#if $modalStore === "rstats"}
<RecalStats showModal={$modalStore === "rstats"} />
{/if}

{#if $modalStore === "rtimer"}
<SiteTimer showModal={$modalStore === "rtimer"} />
{/if}

