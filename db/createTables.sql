-- Create public DB tables

-- Associations
DROP TABLE IF EXISTS snatches;
DROP TABLE IF EXISTS course_instructor_associations;
DROP TABLE IF EXISTS cb_schedule_associations;
DROP TABLE IF EXISTS course_schedule_associations;
DROP TABLE IF EXISTS schedule_courselist_associations;
DROP TABLE IF EXISTS courselist_program_associations;
DROP TABLE IF EXISTS listing_courselist_associations;
DROP TABLE IF EXISTS themes;

-- Low Source
DROP TABLE IF EXISTS section_data;
DROP TABLE IF EXISTS sections;
DROP TABLE IF EXISTS prereqs;
DROP TABLE IF EXISTS evaluations;
DROP TABLE IF EXISTS instructors;
DROP TABLE IF EXISTS cb_times;
DROP TABLE IF EXISTS programs;
DROP TABLE IF EXISTS courselists;

-- High Source
DROP TABLE IF EXISTS custom_blocks;
DROP TABLE IF EXISTS schedules;
DROP TABLE IF EXISTS plans;
DROP TABLE IF EXISTS courses;
DROP TABLE IF EXISTS listings;

-- General
CREATE TABLE themes (
  id INTEGER GENERATED ALWAYS AS IDENTITY,
  author_id UUID references public.profiles(id) on DELETE CASCADE NOT NULL,
  is_public boolean NOT NULL DEFAULT false,
  title VARCHAR(100) NOT NULL,
  primary_color VARCHAR(6) NOT NULL,
  secondary_color VARCHAR(6) NOT NULL,
  tertiary_color VARCHAR(6) NOT NULL,
  accent_color VARCHAR(6) NOT NULL,
  warning_color VARCHAR(6) NOT NULL,
  error_color VARCHAR(6) NOT NULL,
  text_color VARCHAR(6) NOT NULL,
  PRIMARY KEY(id)
);

CREATE TABLE listings (
  id TEXT UNIQUE NOT NULL,
  code TEXT NOT NULL,
  title TEXT NOT NULL,
  aka TEXT[],
  ult_term SMALLINT,
  pen_term SMALLINT,
  PRIMARY KEY(id)
);

CREATE TABLE courses (
  id INTEGER GENERATED ALWAYS AS IDENTITY,
  listing_id TEXT REFERENCES public.listings(id) ON DELETE CASCADE NOT NULL,
  term SMALLINT NOT NULL,
  code TEXT NOT NULL,
  title TEXT NOT NULL,
  status SMALLINT,
  basis VARCHAR(100),
  dists VARCHAR(3)[],
  rating REAL,
  has_final BOOLEAN,
  course_info JSONB,
  reading_info JSONB,
  PRIMARY KEY(id)
);

CREATE TABLE sections (
  id INTEGER GENERATED ALWAYS AS IDENTITY,
  course_id INTEGER REFERENCES public.courses(id) on DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  category VARCHAR(1) NOT NULL,
  num INTEGER NOT NULL,
  building TEXT,
  room TEXT,
  tot SMALLINT,
  cap SMALLINT,
  days SMALLINT,
  start_time REAL,
  end_time REAL,
  status SMALLINT,
  PRIMARY KEY(id)
);

CREATE TABLE evaluations (
  course_id INTEGER REFERENCES public.courses(id) ON DELETE CASCADE UNIQUE NOT NULL,
  listing_id TEXT REFERENCES public.listings(id) ON DELETE CASCADE NOT NULL,
  rating REAL NOT NULL,
  metadata JSONB,
  PRIMARY KEY(course_id)
);

CREATE TABLE prereqs (
  course_id TEXT REFERENCES public.listings(id) ON DELETE CASCADE NOT NULL,
  prereq_id TEXT REFERENCES public.listings(id) ON DELETE CASCADE NOT NULL,
  PRIMARY KEY(course_id, prereq_id)
);

CREATE TABLE instructors (
  netid TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  rating real,
  PRIMARY KEY(netid)
);

CREATE TABLE course_instructor_associations (
  course_id INTEGER REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  instructor_id TEXT REFERENCES public.instructors(netid) ON DELETE CASCADE NOT NULL,
  PRIMARY KEY(course_id, instructor_id)
);

-- ReCal+
CREATE TABLE custom_blocks (
  id INTEGER GENERATED ALWAYS AS IDENTITY,
  user_id UUID REFERENCES public.profiles(id) on DELETE CASCADE NOT NULL,
  title VARCHAR(100) NOT NULL,
  is_public BOOLEAN,
  PRIMARY KEY(id)
);

CREATE TABLE cb_times (
  id INTEGER GENERATED ALWAYS AS IDENTITY,
  cb_id INTEGER REFERENCES public.custom_blocks(id) on DELETE CASCADE NOT NULL,
  days SMALLINT NOT NULL,
  start_time REAL NOT NULL,
  end_time REAL NOT NULL,
  PRIMARY KEY(id)
);

CREATE TABLE schedules (
  id INTEGER GENERATED ALWAYS AS IDENTITY,
  user_id UUID REFERENCES public.profiles(id) on DELETE CASCADE NOT NULL,
  title VARCHAR(100) NOT NULL,
  term SMALLINT NOT NULL,
  is_public BOOLEAN DEFAULT false,
  PRIMARY KEY(id)
);

CREATE TABLE cb_schedule_associations (
  custom_block_id integer REFERENCES public.custom_blocks(id) on DELETE CASCADE NOT NULL,
  schedule_id integer REFERENCES public.schedules(id) on DELETE CASCADE NOT NULL,
  PRIMARY KEY(custom_block_id, schedule_id)
);

CREATE TABLE course_schedule_associations (
  course_id INTEGER REFERENCES public.courses(id) on DELETE CASCADE NOT NULL,
  schedule_id INTEGER REFERENCES public.schedules(id) on DELETE CASCADE NOT NULL,
  metadata JSONB,
  PRIMARY KEY(course_id, schedule_id)
);

-- CourseGenie
CREATE TABLE plans (
  id INTEGER GENERATED ALWAYS AS IDENTITY,
  user_id UUID REFERENCES public.profiles(id) on DELETE CASCADE NOT NULL,
  title VARCHAR(100) NOT NULL,
  is_public BOOLEAN DEFAULT false,
  PRIMARY KEY(id)
);

CREATE TABLE courselists (
  id INTEGER GENERATED ALWAYS AS IDENTITY,
  user_id UUID REFERENCES public.profiles(id) on DELETE CASCADE NOT NULL,
  plan_id integer REFERENCES public.plans (id) on DELETE CASCADE NOT NULL,
  title VARCHAR(100) NOT NULL,
  is_public boolean DEFAULT false,
  term SMALLINT,
  slot SMALLINT,
  PRIMARY KEY(id)
);

CREATE TABLE schedule_courselist_associations (
  schedule_id INTEGER REFERENCES public.schedules(id) on DELETE CASCADE NOT NULL,
  courselist_id INTEGER REFERENCES public.courselists(id) ON DELETE CASCADE NOT NULL,
  PRIMARY KEY(schedule_id, courselist_id)
);


CREATE TABLE listing_courselist_associations (
  listing_id TEXT REFERENCES public.listings(id) ON DELETE CASCADE NOT NULL,
  courselist_id INTEGER REFERENCES public.courselists(id) ON DELETE CASCADE NOT NULL,
  PRIMARY KEY (listing_id, courselist_id)  
);

CREATE TABLE programs (
  id INTEGER GENERATED ALWAYS AS IDENTITY,
  title TEXT NOT NULL,
  abv TEXT NOT NULL,
  category TEXT NOT NULL,
  is_ind boolean DEFAULT TRUE,
  is_active boolean DEFAULT TRUE,
  description TEXT,
  website TEXT,
  requirements JSONB,
  PRIMARY KEY(id)
);

CREATE TABLE courselist_program_associations (
  courselist_id INTEGER REFERENCES public.courselists(id) ON DELETE CASCADE NOT NULL,
  program_id INTEGER REFERENCES public.programs(id) ON DELETE CASCADE NOT NULL,
  PRIMARY KEY(courselist_id, program_id)
);

CREATE TABLE snatches (
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  course_id INTEGER REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  PRIMARY KEY(user_id, course_id)
);