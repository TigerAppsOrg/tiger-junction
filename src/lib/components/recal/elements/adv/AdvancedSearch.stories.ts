import AdvancedSearch__SvelteComponent_ from "./AdvancedSearch.svelte";
import { action } from "@storybook/addon-actions";

export default {
    component: AdvancedSearch__SvelteComponent_,
    title: "Advanced Search",
}

const Template = ({ ...args }) => ({
    Component: AdvancedSearch__SvelteComponent_,
    props: args,
});


export const Default = Template.bind({});
