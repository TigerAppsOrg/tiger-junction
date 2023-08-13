-- Update the section_data table when a section is updated

create function public.handle_section_data()
returns trigger as $$
begin
  insert into public.section_data (section_id, recorded_at, tot, cap)
  values (new.id, now(), new.tot, new.cap);
  return new;
end;
$$ language plpgsql security definer;
create trigger on_section_updated
  after update or insert on public.sections
  for each row execute procedure public.handle_section_data();
