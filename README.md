<h1 align="center">
<a href="https://junction.tigerapps.org/">
  <img src="public/tigerjunctiontextlogo.png" alt="TigerJunction Logo" width="80%">
</a>
</h1>

<p align="center">
  <i align="center">✨ Princeton course selection, amplified ✨</i>
</p>

[`TigerJunction`](https://junction.tigerapps.org) is the premier application for academic planning at Princeton University. Used by thousands of students, it allows easy schedule planning with a visual calendar, powerful advanced search and filtering, built-in course ratings, and iCal exporting.

## Media

The creator of TigerJunction, [Joshua Lau](https://github.com/joshuamotoaki), recorded a [demo video](https://mediacentral.princeton.edu/media/TigerJunction%2C+Joshua+Lau%2C+UG+%2726+%2885D0E676%29/1_pbsbeh9i) for Princeton Research Day 2024, highlighting some of the main features. TigerJunction has also been featured in campus publications:

- [The Daily Princetonian 1st Article](https://www.dailyprincetonian.com/article/2024/4/princeton-features-hotspot-tigerjunction-student-developers-build-apps-improve-campus-life-innovation)
- [The Daily Princetonian 2nd Article](https://www.dailyprincetonian.com/article/2023/11/princeton-news-stlife-tigerjunction-students-course-offerings-schedule-semester)
- [Princeton Correspondents on Undergraduate Research](https://pcur.princeton.edu/2023/11/tigerjunction-vs-recal-how-i-plan-my-courses-for-the-next-semester/)

## Tech Stack

Unlike most Princeton student applications, `TigerJunction` utilizes a JS backend (with SvelteKit) and is hosted primarily with serverless cloud providers. There are many reasons for this: cost minimization, being developed separately from COS333 (Princeton's project-based software engineering course), and preferring JS over Python for web development.

**Languages:** JavaScript, TypeScript, SQL, HTML, CSS

**Libraries/Frameworks:** Svelte, SvelteKit, TailwindCSS, Vite

**Backend:** Supabase PostgreSQL, AWS (Lambda, S3, Cloudfront; through SST), Cloudflare (DNS, DoS Protection), Redis, NodeJS, Princeton StudentApp API

**Dev Tools:** Git, GitHub Actions, Prettier, ESLint

## Acknowledgements

This project is sponsored by [TigerApps](https://tigerapps.org/) (a Princeton USG initiative), and is inspired by 4 other TigerApps: [ReCal](https://github.com/TigerAppsOrg/ReCal), [TigerPath](https://www.tigerpath.io/), [PrincetonCourses](https://www.princetoncourses.com/), [TigerMap](https://github.com/TigerAppsOrg/TigerMap). While it does not use any of the code from these projects, they guided decisions about UI, functionality, and overall project design. Additional thanks to the Princeton OIT for providing their API.

This project would also not have been possible without the numerous students who gave and continue to give valuable input and feedback.

## Contact

Please join our email list [here](https://docs.google.com/forms/d/e/1FAIpQLSebVwd90RtgYf0WtPueOF2BUh8gX2zl-C6Tbjtfxo1E6jo6xA/viewform?usp=sf_link) to receive periodic updates on `TigerJunction`. If you have any questions, feedback, or need assistance, feel free to reach out to us at it.admin@tigerapps.org

## Screenshots

<div align="center">
<img src="public/recalplusscreenshot.png" width="80%" alt="Screenshot of ReCalPlus">
<p>Screenshot of ReCal+ App</p>
</div>

<br />

<div align="center">
<img src="public/TigerJunctionERD.png" width="80%" alt="Database ERD">
<p>The entity relationship diagram for the entire app</p>
</div>
