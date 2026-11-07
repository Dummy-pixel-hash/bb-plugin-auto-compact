import { defineRpcContract } from "@get-bb/plugin-sdk";
import { z } from "zod";

export function usageTag(threadId: string): string {
  return `usage:${threadId}`;
}

const usageSchema = z.object({
  percent: z.number().nullable(),
  usedTokens: z.number().nullable(),
  modelContextWindow: z.number().nullable(),
  thresholdPercent: z.number(),
});

// RPC contract shared by the backend and the thread-header Compact action.
// `usage` is keyed by thread id and tagged per thread, so the header reads it
// through bb's live query cache and refreshes only when the server
// invalidates that thread's tag (after a turn settles or a compaction runs).
export const rpcContract = defineRpcContract({
  compact_now: {
    input: z.object({ threadId: z.string().min(1) }).strict(),
    output: z.object({ result: z.string() }),
  },
  usage: {
    input: z.object({ keys: z.array(z.string().min(1)) }).strict(),
    output: z.record(z.string(), usageSchema),
    keyTags: (key) => [usageTag(key)],
  },
});
