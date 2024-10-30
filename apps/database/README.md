# TigerJunction Database

This is where the Drizzle database schema is defined and where the scripts that update the course data are located. This is separated from the main web app in order to maintain a clean separation of concerns. Additionally, as we are migrating off Supabase, this will keep the migration process as clean and simple as possible.

## Getting Started

Make sure to have [Bun](https://bun.sh) installed and the environment variables set according to the `.env.example` file. Run `bun install` to install the dependencies. Check the `package.json` file for the available scripts.

There are 2 main directories. `db` contains the Drizzle database schema. `scripts` contains a collection of scripts used to keep course data up to date.
