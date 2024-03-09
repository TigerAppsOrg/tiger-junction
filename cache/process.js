import fs from "fs";

const args = process.argv.slice(2);
const term = args[0];

if (!term) {
  console.error("No term specified");
  process.exit(1);
}

let courselist = JSON.parse(fs.readFileSync("./" + term + ".json", "utf8"));
courselist = courselist.map(x => {
    x.course_sections.course_section.map(y => {
        delete y.enrl_status;
        delete y.calculated_status;
        delete y.enrl_tot;
        delete y.enrl_cap;
        delete y.class_meetings;
        return y;
    });
    delete x.reading_list_title_1;
    delete x.reading_list_title_2;
    delete x.reading_list_title_3;
    delete x.reading_list_title_4;
    delete x.reading_list_title_5;
    delete x.reading_list_title_6;
    delete x.reading_list_author_1;
    delete x.reading_list_author_2;
    delete x.reading_list_author_3;
    delete x.reading_list_author_4;
    delete x.reading_list_author_5;
    delete x.reading_list_author_6;
    delete x.distribution_area_long;
    return x;
});

fs.writeFileSync("./" + term + "_sm.json", JSON.stringify(courselist, null, 4));

