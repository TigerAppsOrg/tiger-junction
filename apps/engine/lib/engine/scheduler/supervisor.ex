defmodule Engine.Scheduler.Supervisor do
  use Supervisor

  def start_link(args) do
    Supervisor.start_link(__MODULE__, args, name: __MODULE__)
  end

  def init(_args) do
    children = [
      {Quantum, [name: Engine.Scheduler] ++ scheduler_config()}
    ]

    Supervisor.init(children, strategy: :one_for_one)
  end

  defp scheduler_config do
    [
      jobs: [
        {"* * * * *", {Engine.Scheduler.Worker, :sync_all_data, []}}
      ]
    ]
  end
end
