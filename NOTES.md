# Random Dev Notes

## Supabase Types

If you have access to the Supabase, update Supabase DB types with:

```bash
npx supabase login
npx supabase gen types typescript --project-id "capvnrguyrvudlllydxa" --schema public > src/lib/types/supabaseTypes.ts
```
