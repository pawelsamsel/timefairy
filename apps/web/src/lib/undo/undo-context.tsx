import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  pushCreateUndo,
  pushDeleteUndo,
  pushUpdateUndo,
} from "./time-entry-undo";
import type { TimeEntryWithRelations, UpdateTimeEntryInput } from "@timefairy/shared-types";

export type UndoAction = {
  label: string;
  run: () => Promise<unknown>;
};

export type PushUndoFn = (action: UndoAction) => void;

type UndoContextValue = {
  pushUndo: PushUndoFn;
  undo: () => Promise<void>;
  canUndo: boolean;
};

const MAX_UNDO = 50;

const UndoContext = createContext<UndoContextValue | null>(null);

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (target.isContentEditable) return true;
  return false;
}

export function UndoProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const stackRef = useRef<UndoAction[]>([]);
  const undoingRef = useRef(false);
  const [canUndo, setCanUndo] = useState(false);

  const pushUndo = useCallback<PushUndoFn>((action) => {
    stackRef.current.push(action);
    if (stackRef.current.length > MAX_UNDO) {
      stackRef.current.shift();
    }
    setCanUndo(true);
  }, []);

  const undo = useCallback(async () => {
    if (undoingRef.current || stackRef.current.length === 0) return;

    const action = stackRef.current.pop();
    if (!action) return;

    setCanUndo(stackRef.current.length > 0);
    undoingRef.current = true;

    try {
      await action.run();
      await qc.invalidateQueries({ queryKey: ["time-entries"] });
    } catch {
      stackRef.current.push(action);
      setCanUndo(true);
    } finally {
      undoingRef.current = false;
    }
  }, [qc]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== "z" || e.shiftKey) return;
      if (isEditableTarget(e.target)) return;
      if (stackRef.current.length === 0) return;

      e.preventDefault();
      void undo();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [undo]);

  return (
    <UndoContext.Provider value={{ pushUndo, undo, canUndo }}>{children}</UndoContext.Provider>
  );
}

export function useUndo() {
  const ctx = useContext(UndoContext);
  if (!ctx) {
    throw new Error("useUndo must be used within UndoProvider");
  }
  return ctx;
}

export function useTimeEntryUndo() {
  const { pushUndo } = useUndo();

  return {
    pushCreateUndo: (entryId: string) => pushCreateUndo(pushUndo, entryId),
    pushUpdateUndo: (entryId: string, before: UpdateTimeEntryInput) =>
      pushUpdateUndo(pushUndo, entryId, before),
    pushDeleteUndo: (entry: TimeEntryWithRelations) => pushDeleteUndo(pushUndo, entry),
  };
}
