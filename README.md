<h1 align="center">
<a href="https://junction.tigerapps.org/">
  <img src="static/tigerjunctiontextlogo.png" alt="ReCal+ Logo" width="80%">
</a>
</h1>

<p align="center">
  <i align="center">✨ Princeton course selection, amplified ✨</i>
</p>

`TigerJunction` is the ultimate application for seamless, customizable Princeton course planning and selection. It features 3 fully integrated applications and an API:

### ReCal+

### CourseGenie (Coming Very Soon)

### Panthera (Coming Very Soon)

### Student Developer API (Coming Soon)

## Tech Stack
Unlike most Princeton student applications, `TigerJunction` utilizes a JS backend (with SvelteKit) and is hosted primarily with serverless cloud providers. There are many reasons for this, the main ones being cloud cost minimization, being developed separately from COS333 (Princeton's project-based software engineering course), and preferring JS over Python for web development.

**Languages:** JavaScript, TypeScript, SQL, HTML, CSS

**Libraries/Frameworks:** Svelte, SvelteKit, TailwindCSS, MeltUI, Vite

**Backend:** Supabase (PostgreSQL and Deno), Vercel, Cloudflare (DNS, DoS Protection, R2, and Workers), Redis, NodeJS, Princeton StudentApp API

**Dev Tools:** Git, GitHub, Storybook, Visual Studio Code

## Acknowledgements
This project is sponsored by [TigerApps](https://tigerapps.org/) (which is a Princeton USG initiative), and is inspired by 4 other TigerApps: [ReCal](https://recal.io/), [TigerPath](https://www.tigerpath.io/), [PrincetonCourses](https://www.princetoncourses.com/), [TigerMap](https://tigermap.tigerapps.org/). While it does not use any of the code from these projects, they guided decisions about UI, functionality, and overall project design. Additional thanks to the Princeton OIT for providing their API.

This project would also not have been possible without the numerous students who gave and continue to give valuable input and feedback.

## Contact
Please join our email list [here](https://docs.google.com/forms/d/e/1FAIpQLSebVwd90RtgYf0WtPueOF2BUh8gX2zl-C6Tbjtfxo1E6jo6xA/viewform?usp=sf_link) to receive periodic updates on `TigerJunction`. If you have any questions, feedback, or need assistance, feel free to reach out to me at motoaki@princeton.edu. 

## Screenshots
<div align="center">
<img src="static/recalplusscreenshot.png" width="80%" alt="Screenshot of ReCalPlus">
<p>Screenshot of ReCal+ App</p>
</div>

<br />

<div align="center">
<img src="static/TigerJunctionERD.png" width="80%" alt="Database ERD">
<p>The entity relationship diagram for the entire app</p>
</div>
