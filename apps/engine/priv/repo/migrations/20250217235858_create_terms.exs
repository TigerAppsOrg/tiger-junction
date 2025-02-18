defmodule Engine.Repo.Migrations.CreateTerms do
  use Ecto.Migration

  def change do
    create table(:terms, primary_key: false) do
      add :code, :string, primary_key: true
      add :suffix, :string
      add :name, :string
      add :cal_name, :string
      add :reg_name, :string
      add :start_date, :string
      add :end_date, :string

      timestamps()
    end
  end
end
