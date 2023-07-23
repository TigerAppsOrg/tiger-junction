<script lang="ts">
    import { enhance } from "$app/forms";
    import { scrapeCourses } from "$lib/populate/courses";

    export let form;
    $: console.log(form);
</script>

<div>
    <h1>Admin Dashboard</h1>
</div>
<div>
    <form action="?/getTerm" method="POST" use:enhance>
        <label for="term">Term</label>
        <input type="text" name="term" id="term" required>
        <button type="submit">Submit</button>
    </form>
</div>

