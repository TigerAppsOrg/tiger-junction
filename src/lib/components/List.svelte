<script lang="ts">
    export let listData: string[] = [];
    export let url: string = "/";
</script> 

<div>
    {#if listData.length === 0}
        <p>No data</p>
    {:else}
        <ul>
            {#each listData as item}
                <li>
                    <a href={url + item.slice(0, 3).toUpperCase()}>
                        {item}
                    </a>
                </li>
            {/each}
        </ul>
    {/if}
</div>
