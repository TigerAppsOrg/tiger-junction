# Program JSON
**Please read before modifying the program JSONs!!**

## Overview
These JSON files are stored in the public.programs table in the database. When using CourseGenie, the JSON is parsed, checked against the current courselists (for selected programs), and updates the UI based on satisfied requirements. 

Because this process relies on a parser that checks specific keywords, incorrect formatting could lead to incorrect requirement displays or could just break the program. Make sure to test any changes in development before pushing to production. 

## Formatting Rules


See [explanation.md](./explanation.md) and [format.json](./format.json) for a general example. 