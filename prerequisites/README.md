# Princeton Course Prerequisites
This directory contains the prerequisites for all courses at Princeton. The data is stored in YAML files, one for each department. This data is compiled into a JSON file for use in applications.

Unfortunately, due to prerequisites not being strictly enforced at Princeton, they don't really exist in a structured format. Individual courses list their prerequisites in a paragraph of text, meaning that algorithms struggle to parse them accurately (especially and/or relationships). Another option would be to use some form of AI to parse the texts, but that could also be inaccurate and would be a lot of work to set up. Therefore, the data is manually compiled from the course catalogs.

## File Structure
Each file begins with YAML front matter with the code, name, and other metadata.You can also place local variables here, with the `name` being replaced by the `equ` value in the `reqs` field. For example, in `GER.yaml`:
```yaml
vars:
  - name: ADVGER
    equ: GER107 | GER107G
```
The rest of the file is a list of courses in that department with information about their prerequisites. The format is as follows:

- `course` is the course code. Only list the first crosslisting, the compiler will automatically add the rest.
- `last` is the code for the most recent term that the course was offered.
- `travel` indicates that the course requires travel outside of the Princeton area.
- `iw` indicates that the course is an independent work course only open to concentrators.
- `equiv` is a list of equivalent courses.
- `notes` is any additional information about the prerequisites.
- `reqs` is the boolean expression of the prerequisite. Use `|` for or, and `&` for and. The compiler will automatically convert this into a JSON object.

```yaml
- course: ECE 250
  last: 1244
  travel:
  equiv:
    - ECE 220
    - ECE 230
  notes: >-
    All students are required to take the PHY 105 Special Relativity 
    Minicourse, whether or not they are enrolled in PHY 105.
  reqs: (ECE202 | ECE205) & ECE100
```

Wildcard courses are also supported. For example, `MAT 2**` would match all courses in the MAT 200s. The compiler will automatically expand these into a list of courses. Placing a dollar sign before a course code means it can be taken as a corequisite. For example, `$MAT 202` means that MAT 202 can be taken as a corequisite. Placing a `<` before a coures code means that any course in the department with a course code greater than or equal to it satisfies the prerequisite.

### Special Fields
The following prerequisite groupings are common and have been given special tags that can be used like courses in the `reqs` field:
- `MECH` -- **PHY103 | PHY105 | ISC231 | EGR151** -- classical mechanics is a prerequiste.
- `EAM` -- **PHY104 | PHY106 | ISC233 | EGR153** -- electricity and magnetism is a prerequisite.
- `PHYS` -- **MECH & EAM** -- both classical mechanics and electricity and magnetism are prerequisites.
- `CALCULUS` -- **MAT104 | MAT210 | MAT215 | EGR152** -- calculus II is a prerequisite.
- `MULTI` -- **MAT175 | MAT201 | MAT203 | MAT216 | ECO201 | EGR156** -- multivariable calculus is a prerequisite.
- `LINEAR` -- **MAT202 | MAT204 | MAT217 | MAT218 | EGR154** --linear algebra is a prerequisite.
- `BSEMATH` -- **MULTI & LINEAR** -- both multivariable calculus and linear algebra are prerequisites.
- `INTROCOS` -- **COS126 | ISCA**
- `BOTHCOS` -- **COS217 & COS226** -- both COS 217 and COS 226 are prerequisites.
- `CHEM1` -- **CHM201 | CHM207 | CHM215** -- first semester general chemistry is a prerequisite.
- `CHEM2` -- **CHM202 | CHM215** -- second semester general chemistry is a prerequisite.
- `STATS` -- **ECO202 | EEB355 | ORF245 | POL345 | PSY251 | SOC301 | SML101 | SML 201** -- statistics is a prerequisite.
- `ISCA` -- **ISC231 & ISC232 & ISC233 & ISC234** -- ISC sequence can be used.

## Guidelines
To update the data, please follow these guidelines:
- Record the prerequisites exactly as they are written in the course catalog even if they are somewhat incorrect with the exception of the special fields.
- Do not record recommendations, only requirements. If a reccomendation is important, it can be included in the notes field.
- Stylistically, include a space for the course name and equivalent courses, but not in the `reqs` field. This is for readability (the compiler will remove the spaces).
- Put courses in numeric order.

Even if a course has no prerequisites, it should still be listed with no fields. The `travel`, `special`, `equiv`, and `notes` fields are optional. Prerequisites for a course can change over time. When updating the data, prioritize the most recent information.

Run `node scripts/reformat.js` to reformat the data to the correct style.

## Scripts
Put info about each of the scripts here.

reformat -> add -> assemble -> link

Usage `node scripts/compile.js <args>`

Puts results in the `out` directory.

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