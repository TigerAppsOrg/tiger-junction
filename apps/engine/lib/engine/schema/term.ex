defmodule Engine.Schema.Term do
  use Ecto.Schema
  import Ecto.Changeset

  schema "terms" do
    field :code, :string
    field :suffix, :string
    field :name, :string
    field :cal_name, :string
    field :reg_name, :string
    field :start_date, :string
    field :end_date, :string

    timestamps()
  end

  def changeset(term, attrs) do
    term
    |> cast(attrs, [:code, :suffix, :name, :cal_name, :reg_name, :start_date, :end_date])
    |> validate_required([:code, :suffix, :name, :cal_name, :reg_name, :start_date, :end_date])
  end
end
