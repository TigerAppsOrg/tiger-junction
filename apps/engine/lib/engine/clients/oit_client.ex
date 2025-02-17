defmodule Engine.Clients.OitClient do
  use Tesla
  use Engine.Clients.BaseClient

  plug Tesla.Middleware.BaseUrl, "https://api.princeton.edu/student-app"
  plug Tesla.Middleware.JSON

  def get_terms do
    get("/courses/terms", query: [fmt: "json"])
    |> handle_response()
  end
end
