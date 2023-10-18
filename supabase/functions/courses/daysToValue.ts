export const daysToValue = (section: WeekDays) => {
  let days = 0;
  if(section.mon === "Y") days += 1;
  if(section.tues === "Y") days += 2;
  if(section.wed === "Y") days += 4;
  if(section.thurs === "Y") days += 8;
  if(section.fri === "Y") days += 16;
  return days;
};
