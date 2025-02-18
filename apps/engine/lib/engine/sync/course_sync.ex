defmodule Engine.Sync.CourseSync do
  alias Engine.Repo
  alias Engine.Clients.OitClient
  alias Engine.Schema.{Term}

  def sync_terms do
    with {:ok, data} <- OitClient.get_terms() do
      Enum.each(data["term"], fn term_data ->
        term_data
        |> Term.changeset(term_data)
        |> Repo.insert_or_update()
      end)
    end
  end
end
