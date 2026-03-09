/** A tuple [label, value] returned by the server for selector options. */
export type ServerOptionTuple = [label: string, value: string];

/** A single selector returned by ruletmpl:Resolve for a template variable. */
export interface ServerSelector {
  type?: string;
  name?: string;
  options?: ServerOptionTuple[];
}

/** The response shape from ruletmpl:Resolve — selectors keyed by template variable name. */
export interface ResolveResponse {
  selectors?: Record<string, ServerSelector>;
  /** Selectors may also appear at the top level (without a wrapper key). */
  [key: string]: unknown;
}
