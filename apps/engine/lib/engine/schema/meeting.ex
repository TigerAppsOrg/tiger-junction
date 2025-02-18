defmodule Engine.Schema.Meeting do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :id, autogenerate: true}
  schema "meetings" do
    # From /courses
    field :meeting_number, :string
    field :start_time, :string
    field :end_time, :string
    field :room, :string
    field :days, {:array, :string}

    has_one :building, Engine.Schema.Building

    timestamps()
  end
end
