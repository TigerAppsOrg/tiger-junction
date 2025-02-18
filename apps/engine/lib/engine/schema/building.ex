defmodule Engine.Schema.Building do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :id, autogenerate: true}
  schema "buildings" do
    # From /courses
    field :location_code, :string
    field :name, :string

    timestamps()
  end

  def changeset(building, attrs) do
    building
    |> cast(attrs, [:location_code, :name])
    |> validate_required([:location_code, :name])
  end
end
