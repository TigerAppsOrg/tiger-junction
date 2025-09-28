import adapter from "svelte-kit-sst";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

/** @type {import('@sveltejs/kit').Config} */
const config = {
    preprocess: vitePreprocess(),
    kit: {
        adapter: adapter()
    },
    compilerOptions: {
        // Use the new compatibility option instead of legacy
        compatibility: {
            componentApi: 4
        }
    }
};

export default config;
