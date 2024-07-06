-- Create public DB tables

-- Associations
DROP TABLE IF EXISTS course_instructor_associations;
DROP TABLE IF EXISTS event_schedule_associations;
DROP TABLE IF EXISTS course_schedule_associations;

-- Low Source
DROP TABLE IF EXISTS sections;
DROP TABLE IF EXISTS evaluations;
DROP TABLE IF EXISTS instructors;

-- High Source
DROP TABLE IF EXISTS events;
DROP TABLE IF EXISTS schedules;
DROP TABLE IF EXISTS courses;
DROP TABLE IF EXISTS listings;

-- General
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
CREATE TABLE events (
  id INTEGER GENERATED ALWAYS AS IDENTITY,
  user_id UUID REFERENCES public.profiles(id) on DELETE CASCADE NOT NULL,
  title VARCHAR(100) NOT NULL,
  times JSONB NOT NULL,
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

CREATE TABLE event_schedule_associations (
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
