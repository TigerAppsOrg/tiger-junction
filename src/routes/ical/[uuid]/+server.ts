import type { RequestHandler } from "@sveltejs/kit";

export const GET: RequestHandler = async ({ params }) => {
    const { uuid } = params;
    if (!uuid) throw new Error("No UUID provided");

    // Fetch file from Supabase Storage
    const data = await fetch(
        "https://capvnrguyrvudlllydxa.supabase.co/storage/v1/object/public/calendars/" +
            uuid
    );

    // Download file
    const buffer = await data.arrayBuffer();
    const file = new Uint8Array(buffer);
    const blob = new Blob([file], { type: "application/octet-stream" });

    return new Response(blob, {
        // Set filename
        headers: {
            "Content-Disposition": `attachment; filename=${uuid.substring(0, -3)}`
        }
    });
};
