<script lang="ts">
    export let listData: string[] = [];
</script> 

<div>
    {#if listData.length === 0}
        <p>No data</p>
    {:else}
        <ul>
            {#each listData as item}
                <li>
                    <a href={"/" + item.slice(0, 3).toUpperCase()}>
                        {item}
                    </a>
                </li>
            {/each}
        </ul>
    {/if}
</div>
