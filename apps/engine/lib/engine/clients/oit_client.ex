defmodule Engine.Clients.OitClient do
  @moduledoc """
  Client for interacting with Princeton University's Student Application API
  provided by the OIT.

  This module provides functions to fetch course-related data including terms,
  course listings, course details, and seat availability information.

  All requests require an OIT authentication token which should be set in the
  environment variable `OIT_AUTH_TOKEN`.

  ## API Base URL
  All requests are made to: https://api.princeton.edu/student-app

  ## Documentation
  Please refer to the documentation provided by the OIT for more information
  """

  use Tesla
  use Engine.Clients.BaseClient

  plug Tesla.Middleware.BaseUrl, "https://api.princeton.edu/student-app"

  plug Tesla.Middleware.Headers, [
    {"Authorization", System.get_env("OIT_AUTH_TOKEN")}
  ]

  plug Tesla.Middleware.JSON

  @doc """
  Retrieves all active academic terms. More recent terms are listed first.
  """
  def get_terms do
    get("/courses/terms", query: [fmt: "json"])
    |> handle_response()
  end

  @doc """
  Retrieves all courses for a given term and subject.

  ## Parameters
    * `term` - The academic term code (e.g. `1254`)
    * `subject` - The course subject code (e.g. `COS`)
    * `catnum` - (optional) The course catalog number
    * `search` - (optional) A search term to filter courses by
  """
  def get_courses(term, subject, catnum \\ nil, search \\ nil) do
    query_params =
      [term: term, subject: subject, fmt: "json"]
      |> add_if_present(:catnum, catnum)
      |> add_if_present(:search, search)

    get("/courses/courses", query: query_params)
    |> handle_response()
  end

  @doc """
  Retrieves detailed information for a specific course in a term.
  Oddly, this data is NOT a superset of the data returned by `/courses/courses`,
  so it is necessary to call both endpoints to get all available data.

  ## Parameters
    * `term` - The academic term code (e.g. `1254`)
    * `course_id` - The course ID
  """
  def get_course_details(term, course_id) do
    get("/courses/details", query: [term: term, fmt: "json", course_id: course_id])
    |> handle_response()
  end

  @doc """
  Retrieves the number of seats taken and total seats available for specified courses.
  This is a fast endpoint that can be rapidly queried.

  ## Parameters
    * `term` - The academic term code (e.g. `1254`)
    * `course_ids` - A comma-separated list of course IDs
  """
  def get_seats(term, course_ids) do
    get("/courses/seats", query: [term: term, fmt: "json", course_ids: course_ids])
    |> handle_response()
  end

  @doc """
  Retrieves the number of seats taken per class year for specified courses.
  This only works for courses that have seat reservations enabled.

  ## Parameters
    * `term` - The academic term code (e.g. `1254`)
    * `course_ids` - A comma-separated list of course IDs
  """
  def get_resseats(term, course_ids) do
    get("/courses/resseats", query: [term: term, fmt: "json", course_ids: course_ids])
    |> handle_response()
  end

  @doc false
  defp add_if_present(params, _key, nil), do: params
  defp add_if_present(params, key, value), do: Keyword.put(params, key, value)
end
