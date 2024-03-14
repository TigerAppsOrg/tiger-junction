# Princeton Course Prerequisites
This directory contains the prerequisites for all courses at Princeton since Fall 2020. The data is stored in formatted YAML files, one for each department. This data can be compiled into a JSON files for use in applications.

### Why manually-inputted data?
At first glance, may would seem like some kind of algorithm could check prerequisites quickly, easily, and on-the-fly. Unfortunately, since prerequisites are not strictly enforced at Princeton, they don't exist in any official, structured format. Courses list their prerequisites in paragraph form, making algorithms struggle to accurately parse them and their relationships. 

Furthermore, some courses (especially language courses) do not list their prerequisites correctly. A 300-level course in Spanish literature would obviously require an advanced understanding of Spanish, but sometimes these courses list no prerequisites. Compound this with multiple pathways to advanced Spanish proficiency, not all of which may be listed as prerequisites, and you can see why deterministic algorithms are not the way to go.

A possible solution would be to use some form of NLP and AI. However, this would be a little overkill considering there's only around 10,000 courses every 4 years, and it would be difficult to ensure the model's accuracy without extensive work. Hence, I decided to just manually input the prerequisites.


## File Structure
The data is structured in a specific way so the compiler can understand it. Each file
begins with YAML front matter with the code, name, and other metadata. You can also place local variables (macros) here, with the `name` being replaced by the `equ` value in the `reqs` field. For example, in `GER.yaml`:
```yaml
vars:
  - name: ADVGER
    equ: GER107 | GER107G
```
The rest of the file is a list of courses in that department with information about their prerequisites. The format is as follows:

- `course` is the course code. Only include the first (primary) crosslisting.
- `last` is the term code for the most recent term in which the course was offered.
- `travel` indicates that the course requires travel outside of the Princeton area.
- `iw` indicates that the course is an independent work course open only to concentrators.
- `equiv` is a list of equivalent courses.
- `notes` is any additional information about the prerequisites. Use sparingly.
- `reqs` is the prerequisite boolean expression. Use `|` for or, and `&` for and, and separate with paranthesees. The expression should have no interpretational ambiguitiy.

Example:
```yaml
- course: ECE 250
  last: 1244
  travel:
  equiv:
    - ECE 220
    - ECE 230
  notes: >-
    All students are required to take the PHY 105 Special Relativity Minicourse, whether or not they are enrolled in PHY 105.
  reqs: (ECE202 | ECE205) & ECE100
```

Wildcard courses are also supported. For example, `MAT 2**` would match all courses in the MAT 200s. The compiler will automatically expand these into a list of courses. Placing a dollar sign before a course code means it can be taken as a corequisite. For example, `$MAT 202` means that MAT 202 can be taken as a corequisite. Placing a `<` before a coures code means that any course in the department with a course code greater than or equal to it satisfies the prerequisite.

## Special Macros
The following prerequisite groupings are common and have been given special macros that can be used like courses in the `reqs` field:
- `ISCA` -- **ISC231 & ISC232 & ISC233 & ISC234** -- complete integrated science sequence
- `MECH` -- **PHY103 | PHY105 | ISC231 | EGR151** -- classical mechanics
- `EAM` -- **PHY104 | PHY106 | ISC233 | EGR153** -- electricity and magnetism
- `PHYS` -- **MECH & EAM** -- both classical mechanics and electricity and magnetism.
- `CALCULUS` -- **MAT104 | MAT210 | MAT215 | EGR152** -- calculus II
- `MULTI` -- **MAT175 | MAT201 | MAT203 | MAT216 | ECO201 | EGR156** -- multivariable calculus
- `LINEAR` -- **MAT202 | MAT204 | MAT217 | MAT218 | EGR154** -- linear algebra
- `BSEMATH` -- **MULTI & LINEAR** -- both multivariable calculus and linear algebra
- `INTROCOS` -- **COS126 | ECE115 | ISCA** -- introductory computer science
- `BOTHCOS` -- **COS217 & COS226** -- 2nd year computer science
- `CHEM1` -- **CHM201 | CHM207 | CHM215** -- 1st semester general chemistry
- `CHEM2` -- **CHM202 | CHM215** -- 2nd semester general chemistry 
- `STATS` -- **ECO202 | EEB355 | ORF245 | POL345 | PSY251 | SOC301 | SML101 | SML 201** --introductory statistics 
- `INTROMOL` -- **MOL214 | ISCA** -- introductory molecular biology 

## Update Guidelines
To update the data, please follow these guidelines:
- Interpret the prerequisite information to the best of your ability. When a blatantly obvious prerequisite is missing, read the course description carefully and add it. Otherwise, even if a listed prerequiste seems silly, still include it. When in doubt, be conservative about what prerequisites you list.
- Do not record recommendations, only requirements.
- Use the special macros whenever you can. Define local macros when there's a consistently reappearing pattern within a file.
- Include a space for the course name and equivalent courses, but not in the `reqs` field. 
- Put courses in numeric order.

Prerequisites for a course can change over time. When updating the data, prioritize the most recent information.

## Scripts
There are 4 scripts in the `scripts` directory which make up the complete compilation process:
- `reformat.js` -- Reformats the data to the correct style.
- `add.js` -- Adds courses not manually added to the data.
- `link.js` -- Adds the ids of each course (ultimately an optional step meant for readability, the assembler supercedes this).
- `assemble.js` -- Assembles the data into a single JSON file according to options.

The default function can be exported from each of the files for use in a different script, or can be called directly from the command line (see individual files for usage). Running `compile.js` will run all of these scripts in order. All outputs are placed in the `out` directory.

### Assembly Options
The `assemble.js` script takes an options object as an argument. The following options are available:

## Categories
For readability, the departments are divided into the following categories. Please leave and issue if you feel that a department is in the wrong category.

### World Languages (lang)
ARA, ASL, BCS, CHI, CZE, FRE, GER, GEZ, HEB, HIN, HLS, ITA, JPN, KOR, LAT, MOG, PER, PLS, POR, RUS, SAN, SPA, SWA, TUR, TWI, UKR, URD

### Social Sciences (socsci)
ANT, CTL, ECO, ENT, FIN, JRN, LIN, POL, POP, PSY, SOC, SPI, STC, TRA, URB

### Ethnic and Cultural Studies (eth)
AAS, AFS, AMS, ASA, EAS, ECS, EPS, GSS, JDS, LAO, LAS, NES, RES, SAS, SLA

### Humanities (hum)
CDH, CHV, CLA, CLG, COM, CWR, ENG, HIS, HOS, HPD, HUM, MED, MOD, PAW, PHI, REL

### Visual and Performing Arts (vpa)
ART, ATL, DAN, LCA, MPP, MTD, MUS, THR, VIS

### Engineering (bse)
BNG, CBE, CEE, COS, ECE, EGR, MAE, MSE, ORF

### Non-BSE STEM (stem)
AOS, APC, ARC, AST, CGS, CHM, EEB, ENE, ENV, GEO, GHP, ISC, MAT, MOL, NEU, PHY, QCB, SML

### Other (other)
FRS, GLS, TPP, WRI