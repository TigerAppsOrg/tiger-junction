defmodule Engine.Scheduler.Worker do
  alias Engine.Sync.{CourseSync}

  def sync_all_data do
    CourseSync.sync_terms()
  end
end
