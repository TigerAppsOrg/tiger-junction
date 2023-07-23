import { CATEGORIES } from "$lib/constants"

const getList = async (category: string) => {
    if (!CATEGORIES.includes(category)) throw new Error("Invalid category");
    
    let res = await fetch(`/api/list/${category}`);
    let data = await res.json();

    return data;
}