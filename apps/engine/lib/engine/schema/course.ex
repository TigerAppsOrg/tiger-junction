defmodule Engine.Schema.Course do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :id, autogenerate: true}
  schema "courses" do
    # Custom fields
    field :term, :string

    # From eval scraping
    field :eval_quality_of_course, :string
    field :eval_overall_quality_of_the_course, :string
    field :eval_overall_course_quality_rating, :string
    field :eval_quality_of_the_seminar, :string
    field :eval_quality_of_lectures, :string
    field :eval_quality_of_precepts, :string
    field :eval_quality_of_laboratories, :string
    field :eval_recommend_to_other_students, :string
    field :eval_quality_of_readings, :string
    field :eval_quality_of_written_assignments, :string

    # From /courses
    field :guid, :string
    field :course_id, :string
    field :catalog_number, :string
    field :title, :string
    field :start_date, :string
    field :end_date, :string
    field :track, :string
    field :description, :string
    field :seat_reservations, :string

    has_many :classes, Engine.Schema.Class
    has_many :instructors, Engine.Schema.Instructor

    # From /details
    field :subject, :string
    field :catnum, :string
    field :reading_writing_assignment, :string
    field :distribution_area_long, :string
    field :transcript_title, :string
    field :drop_consent, :string
    field :add_consent, :string
    field :web_address, :string
    field :pu_flag, :string
    field :topic_title, :string
    field :crosslistings, :string
    field :grading_basis, :string
    field :long_title, :string
    field :distribution_area_short, :string

    field :grading_prog_assign, :string
    field :grading_mid_exam, :string
    field :grading_papers, :string
    field :grading_paper_final_exam, :string
    field :grading_lab_reports, :string
    field :grading_other_exam, :string
    field :grading_quizzes, :string
    field :grading_home_mid_exam, :string
    field :grading_oral_pres, :string
    field :grading_paper_mid_exam, :string
    field :grading_final_exam, :string
    field :grading_design_projects, :string
    field :grading_other, :string
    field :grading_home_final_exam, :string
    field :grading_prob_sets, :string
    field :grading_precept_part, :string
    field :grading_term_papers, :string

    field :reading_list_title_1, :string
    field :reading_list_title_2, :string
    field :reading_list_title_3, :string
    field :reading_list_title_4, :string
    field :reading_list_title_5, :string
    field :reading_list_title_6, :string
    field :reading_list_author_1, :string
    field :reading_list_author_2, :string
    field :reading_list_author_3, :string
    field :reading_list_author_4, :string
    field :reading_list_author_5, :string
    field :reading_list_author_6, :string

    timestamps()
  end
end
