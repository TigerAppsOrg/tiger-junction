# Princeton Course Prerequisites
This directory contains the prerequisites for all courses at Princeton. The data is stored in YAML files, one for each department. This data is compiled into a JSON file for use in applications.

Unfortunately, due to prerequisites not being strictly enforced at Princeton, they don't really exist in a structured format. Individual courses list their prerequisites in a paragraph of text, meaning that algorithms struggle to parse them accurately (especially and/or relationships). Another option would be to use some form of AI to parse the texts, but that could also be inaccurate and would be a lot of work to set up. Therefore, the data is manually compiled from the course catalogs.

## File Structure
Each file begins with YAML front matter with the code, name, and other metadata. This is entirely for readability, and the compiler will ignore it. The rest of the file is a list of courses in that department with information about their prerequisites.

Prerequisites for a course can change over time. When updating the data, prioritize the most recent information.

## Updating the Data


## Compiling the Data
Running `node compile.js` in this directory will create 2 JSON files: `prereqs.json` which contains only the prerequisites of courses and `prereqs_comp.json` which contains both the prerequisites of and for courses. For example, for GER 102, `prereqs.json` will only contain the prerequisites of GER 102 (GER 101), while `prereqs_comp.json` will contain both the prerequisites of GER 102 (GER 101) and the courses that GER 102 is a prerequisite for (GER 105). 

Choosing which file to use depends on if you want more speed (`prereqs_comp.json`) or less space (`prereqs.json`). TigerJunction uses `prereqs_comp.json`.

Before compilation, the data is validated to ensure that it is in the correct format. If there are any errors, the compiler will print them to the console and stop. The errors must be fixed before the data can be compiled.

## Categories
For readability, the departments are divided into the following categories. Please leave and issue if you feel that a department is in the wrong category.

### World Languages (lang)
ARA, ASL, BCS, CHI, CZE, FRE, GER, GEZ, HEB, HIN, ITA, JPN, KOR, LAT, MOG, PER, PLS, POR, RUS, SAN, SPA, SWA, TUR, TWI, UKR, URD

### Social Sciences (socsci)
ANT, CTL, ECO, ENT, FIN, JRN, LIN, POL, POP, PSY, SOC, SPI, STC, TRA, URB

### Ethnic and Cultural Studies (eth)
AAS, AFS, AMS, ASA, EAS, ECS, EPS, GSS, JDS, HLS, LAO, LAS, NES, RES, SAS, SLA

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