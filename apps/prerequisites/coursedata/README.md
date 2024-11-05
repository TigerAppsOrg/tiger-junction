# Princeton Course Data Cache

This directory contains a cache of the course details for each term. This exists so I don't have to keep hitting the Princeton course data API, but you can feel free to use it as well. `fillcache.js` is the script that fetches the data. It takes quite a while to run, so as to not overwhelm the Princeton servers. You can run it with `node fillcache.js <term code>`. The term code is mandatory (find codes below).

The files correspond to their term codes. For example, 1244 corresponds to the Spring 2024 term:

-   1244: Spring 2024
-   1242: Fall 2023
-   1234: Spring 2023
-   1232: Fall 2022
-   1224: Spring 2022
-   1222: Fall 2021
-   1214: Spring 2021
-   1212: Fall 2020
