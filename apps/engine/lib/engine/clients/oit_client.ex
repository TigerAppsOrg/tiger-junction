defmodule Engine.Clients.OitClient do
  use Tesla
  use Engine.Clients.BaseClient

  plug Tesla.Middleware.BaseUrl, "https://api.princeton.edu/student-app"

  plug Tesla.Middleware.Headers, [
    {"Authorization", System.get_env("OIT_AUTH_TOKEN")}
  ]

  plug Tesla.Middleware.JSON

  def get_terms do
    get("/courses/terms", query: [fmt: "json"])
    |> handle_response()
  end

  def get_courses(term, subject, catnum \\ nil, search \\ nil) do
    query_params =
      [term: term, subject: subject, fmt: "json"]
      |> add_if_present(:catnum, catnum)
      |> add_if_present(:search, search)

    get("/courses/courses", query: query_params)
    |> handle_response()
  end

  def get_course_details(term, course_id) do
    get("/courses/details", query: [term: term, fmt: "json", course_id: course_id])
    |> handle_response()
  end

  def get_seats(term, course_ids) do
    get("/courses/seats", query: [term: term, fmt: "json", course_ids: course_ids])
    |> handle_response()
  end

  def get_resseats(term, course_ids) do
    get("/courses/resseats", query: [term: term, fmt: "json", course_ids: course_ids])
    |> handle_response()
  end

  defp add_if_present(params, _key, nil), do: params
  defp add_if_present(params, key, value), do: Keyword.put(params, key, value)
end
