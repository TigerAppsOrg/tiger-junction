defmodule Engine.Schema.Evaluation do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :id, autogenerate: true}
  schema "evaluations" do
    belongs_to :course, Engine.Schema.Course

    field :class_number, :string
    field :section, :string
    field :status, :string
    field :type_name, :string
    field :capacity, :string
    field :enrollment, :string
    field :start_date, :string
    field :end_date, :string

    has_many :meetings, Engine.Schema.Meeting

    timestamps()
  end
end
