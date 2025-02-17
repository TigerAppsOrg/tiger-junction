defmodule Engine.Clients.BaseClient do
  @moduledoc """
  Provides common HTTP response handling for clients to interact
  with external APIs (like the OIT API).
  """

  @doc """
  Default implementation for handling HTTP responses. This function
  can be overridden in the client module to provide custom handling.

  By default it processes Tesla responses:
  * If the status code is 200, it returns the body.
  * If the status code is not 200, it returns an error tuple with the status code and body.
  * If the response is an error tuple, it returns the error tuple.
  """
  @callback handle_response({:ok, Tesla.Env.t()} | {:error, any()}) ::
              {:ok, any()} | {:error, any()}

  defmacro __using__(_opts) do
    quote do
      @behaviour Engine.Clients.BaseClient

      def handle_response({:ok, %{status: 200, body: body}}), do: {:ok, body}

      def handle_response({:ok, %{status: status, body: body}}),
        do: {:error, %{status: status, body: body}}

      def handle_response({:error, error}), do: {:error, error}

      defoverridable handle_response: 1
    end
  end
end
