defmodule Engine.Schema.Instructor do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :id, autogenerate: true}
  schema "instructors" do
    # From /courses
    field :emplid, :string
    field :first_name, :string
    field :last_name, :string
    field :full_name, :string

    # From /details
    field :netid, :string

    timestamps()
  end
end
