import { TERM_MAP } from "$lib/changeme";
import type { RequestHandler } from "@sveltejs/kit";
import fs from "fs";
import path from "path";

export const GET: RequestHandler = async ({ url }) => {
    const term = url.searchParams.get("term");
    if (!term || !TERM_MAP.hasOwnProperty(parseInt(term))) {
        return new Response("Invalid term", { status: 400 });
    }
    
    const filePath = path.resolve("cache/coursedata/sm/" + term + "_sm.json");
    const data = fs.readFileSync(filePath, "utf8");
    return new Response(data, { status: 200, headers: { "Content-Type": "application/json" } });
};