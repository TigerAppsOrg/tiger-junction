const DIRECTORY_MAP = {
    'bse': {
        'name': 'Engineering',
        'code': 'b',
    },
    'eth': {
        'name': 'Ethnic and Cultural Studies',
        'code': 'e',
    },
    'hum': {
        'name': 'Humanities',
        'code': 'h',
    },
    'lang': {
        'name': 'World Languages',
        'code': 'l',
    },
    'other': {
        'name': 'Other',
        'code': 'o',
    },
    'socsci': {
        'name': 'Social Sciences',
        'code': 's',
    },
    'stem': {
        'name': 'STEM',
        'code': 't',
    },
    'vpa': {
        'name': 'Visual and Performing Arts',
        'code': 'v',
    }
}

const TERM_MAP = {
    1244: {
        "name": "Spring 2024",
        "mobile_name": "S24"
    },
    1242: {
        "name": "Fall 2023",
        "mobile_name": "F23"
    },
    1234: {
        "name": "Spring 2023",
        "mobile_name": "S23"
    },
    1232: {
        "name": "Fall 2022",
        "mobile_name": "F22"
    },
    1224: {
        "name": "Spring 2022",
        "mobile_name": "S22"
    },
    1222: {
        "name": "Fall 2021",
        "mobile_name": "F21"
    },
    1214: {
        "name": "Spring 2021",
        "mobile_name": "S21"
    },
    1212: {
        "name": "Fall 2020",
        "mobile_name": "F20"
    },
    1204: {
        "name": "Spring 2020",
        "mobile_name": "S20"
    },
    1202: {
        "name": "Fall 2019",
        "mobile_name": "F19"
    },
    1194: {
        "name": "Spring 2019",
        "mobile_name": "S19"
    },
    1192: {
        "name": "Fall 2018",
        "mobile_name": "F18"
    },
}

const SPECIAL_FIELDS = {
    "ISCA": "ISC231 & ISC232 & ISC233 & ISC234",
    "MECH" : "PHY103 | PHY105 | ISC231 | EGR151",
    "EAM" : "PHY104 | PHY106 | ISC233 | EGR153",
    "PHYS": "(PHY103 | PHY105 | ISC231 | EGR151) & (PHY104 | PHY106 | ISC233 | EGR153)",
    "CALCULUS": "MAT104 | MAT210 | MAT215 | EGR152",
    "MULTI": "MAT175 | MAT201 | MAT203 | MAT216 | ECO201 | EGR156",
    "LINEAR": "MAT202 | MAT204 | MAT217 | MAT218 | EGR154",
    "BSEMATH": "(MAT175 | MAT201 | MAT203 | MAT216 | ECO201 | EGR156) & (MAT202 | MAT204 | MAT217 | MAT218 | EGR154)",
    "INTROCOS": "COS126 | ECE115 | (ISC231 & ISC232 & ISC233 & ISC234)",
    "BOTHCOS": "COS217 & COS226",
    "CHEM1": "CHM201 | CHM207 | CHM215",
    "CHEM2": "CHM202 | CHM215",
    "STATS": "ECO202 | EEB355 | ORF245 | POL345 | PSY251 | SOC301 | SML101 | SML 201",
    "INTROMOL": "MOL214 | (ISC231 & ISC232 & ISC233 & ISC234)"
}

export { TERM_MAP, DIRECTORY_MAP, SPECIAL_FIELDS }