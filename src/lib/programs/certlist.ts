import type { ProgramInput } from "$lib/dbTypes";

const CertAAS: ProgramInput = {
    name: "African American Studies",
    category: "certificate",
    link: "https://aas.princeton.edu/",
    ind_work: false,
    requirement_groups: 
    [
        {
            name: "Core",
            requirements: 
            [
                {
                    name: "",
                    count: 2,
                    courses: ["AAS244", "AAS245", "AAS353", "AAS359", "AAS366", "AAS367"]
                }
            ],
        },
        {
            name: "Electives",
            requirements:
            [
                {
                    name: "",
                    count: 3,
                    courses: ["AAS200", "AAS201", "AAS201", "AAS220", "AAS230", "AAS"]
                }
            ]
        }
    ]
};