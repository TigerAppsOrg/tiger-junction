<script lang="ts">
    import StdModal from "$lib/components/elements/StdModal.svelte";

    export let showModal: boolean = false;
</script>

<StdModal title="Edit Event" stdClose={true} {showModal}></StdModal>
