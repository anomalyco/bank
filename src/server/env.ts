import type { Workspace } from "./workspace"

export type Env = {
  ASSETS: Fetcher
  WORKSPACES: DurableObjectNamespace<Workspace>
  PUBLIC_URL: string
  SLACK_CLIENT_ID: string
  SLACK_CLIENT_SECRET: string
  SLACK_SIGNING_SECRET: string
  SESSION_SECRET: string
}
