import {
  definePluginApp,
  experimental_useRpcKeyedQuery,
  experimental_useRpcMutation,
  type PluginThreadActionDataInput,
} from "@get-bb/plugin-sdk/app";
import { toast } from "sonner";
import { rpcContract } from "./contract";

interface ThreadUsage {
  percent: number | null;
  thresholdPercent: number;
}

interface CompactActionData {
  usage: Readonly<Record<string, ThreadUsage>>;
  compactingThreadIds: ReadonlySet<string>;
  compact(threadId: string): Promise<void>;
}

// Usage for the threads whose header is on screen, read through bb's live
// query cache: no polling, refreshed when the server invalidates a thread's
// usage tag after a turn settles or a compaction runs.
function useCompactActionData({
  threadIds,
}: PluginThreadActionDataInput): CompactActionData {
  const usage = experimental_useRpcKeyedQuery({
    contract: rpcContract,
    method: "usage",
    keys: threadIds,
  });
  const compactNow = experimental_useRpcMutation({
    contract: rpcContract,
    method: "compact_now",
  });
  async function compact(threadId: string): Promise<void> {
    try {
      const { result } = await compactNow.mutate({ threadId });
      if (result === "compacted") {
        toast.success("Thread compacted.");
      } else if (result.startsWith("unsupported:")) {
        toast.warning("This thread's provider doesn't support compaction.");
      } else {
        toast.error(`Compaction did not run: ${result}`);
      }
    } catch (error) {
      toast.error(
        `Compaction failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
  return {
    usage: usage.data ?? {},
    compactingThreadIds: new Set(
      compactNow.pendingInputs.map((input) => input.threadId),
    ),
    compact,
  };
}

export default definePluginApp((app) => {
  app.slots.experimental_threadAction<CompactActionData>({
    id: "compact-now",
    title: "Compact now",
    icon: "Minimize2",
    group: "auto-compact",
    placement: "header",
    useData: useCompactActionData,
    item: ({ thread, data }) => {
      if (thread.archivedAt !== null) return null;
      const running = data.compactingThreadIds.has(thread.id);
      const usage = data.usage[thread.id];
      const percent = usage?.percent ?? null;
      return {
        label: running
          ? "Compacting"
          : percent === null
            ? "Compact"
            : `Compact ${percent.toFixed(0)}%`,
        ...(usage === undefined
          ? {}
          : { detail: `Auto-compacts at ${usage.thresholdPercent}%` }),
        icon: "Minimize2",
        disabled: running,
        run: () => data.compact(thread.id),
      };
    },
  });
});
