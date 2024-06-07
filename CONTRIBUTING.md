# Contribution Guidelines

We welcome contribution to TigerJunction from both the TigerApps Team and the Princeton community! Please read the following guidelines before contributing. If you have any questions, feel free to reach out to the project lead at motoaki@princeton.edu.

## Setup

Before you start contributing, make sure you have Node.js version 18 or later installed. You can check your Node.js version by running `node -v` in your terminal. If you don't have Node.js installed, you can download it from the [official website](https://nodejs.org/). If you are working in VSCode, install the Prettier extension.

To get started, clone the repository and install the dependencies:

```bash
git clone https://github.com/tigerappsorg/tiger-junction
cd tigerjunction
npm install
```

To start the development server, run:

```bash
npm run dev
```

This will start the server at `localhost:5173`. You can access the admin panel at `localhost:5173/admin`. If you are not already logged in, you will need to replace `junction.tigerapps.org` with `localhost:5173` in the URL when the login page redirects you. If you do not have admin access, grant yourself admin access by going to the `private_profiles` table in Supabase and setting the `is_admin` column to `true` for your user. **PLEASE BE CAREFUL TO NOT ACCIDENTLY GRANT ADMIN ACCESS TO SOMEONE ELSE**. If you need the Supabase credentials, please reach out to the TigerJunction project lead.

## Branches

The `main` branch is the default branch and is protected. All changes should be made on a separate branch. When you are ready to merge your changes, open a pull request from your branch to `main`. The pull request will be reviewed by the project lead before being merged.

## Style

The style guidelines are enforced by Prettier (see [.prettierrc](.prettierrc)). If you are using VSCode, you can install the Prettier extension to automatically format your code. Other IDEs may have their own Prettier extensions. Alternatively, you can run `npm run format` to format your code.

## What to Contribute

There are 2 main sources to look for tasks to work on:

1. The [Issues](https://github.com/TigerAppsOrg/tiger-junction/issues) tab on GitHub
2. The [Workflow Document](https://junction.tigerapps.org/docs/workflow) on the TigerJunction website

If you are unsure about what to work on, reach out to the project lead for guidance.
