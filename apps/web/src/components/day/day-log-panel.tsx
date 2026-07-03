import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { NotebookPen } from "lucide-react";
import { api } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import { cn } from "@/lib/utils";
import { MarkdownContent } from "@/components/day/markdown-content";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type DayLogPanelProps = {
  selectedDate: string;
};

type NoteView = "write" | "preview";

export function DayLogDateSummary({ selectedDate }: { selectedDate: string }) {
  const dayLogQuery = useQuery({
    queryKey: ["day-log", selectedDate],
    queryFn: () => api.getDayLog(selectedDate),
  });

  const isDayOff = dayLogQuery.data?.isDayOff === true;
  const notePreview = dayLogQuery.data?.note?.trim().split("\n").find((line) => line.trim()) ?? "";

  if (!isDayOff && !notePreview) return null;

  return (
    <>
      <span className="text-muted-foreground/50" aria-hidden>
        ·
      </span>
      {isDayOff && (
        <Badge variant="secondary" className="h-5 px-1.5 text-[11px] font-normal">
          Day off
        </Badge>
      )}
      {notePreview && (
        <span className="max-w-[min(28rem,55vw)] truncate text-xs text-muted-foreground">
          {notePreview}
        </span>
      )}
    </>
  );
}

export function DayLogPanel({ selectedDate }: DayLogPanelProps) {
  const qc = useQueryClient();
  const [noteView, setNoteView] = useState<NoteView>("write");
  const [noteDraft, setNoteDraft] = useState("");
  const [dayOffDraft, setDayOffDraft] = useState<boolean | null>(null);
  const [saveError, setSaveError] = useState("");

  const dayLogQuery = useQuery({
    queryKey: ["day-log", selectedDate],
    queryFn: () => api.getDayLog(selectedDate),
  });

  const serverNote = dayLogQuery.data?.note ?? "";
  const serverDayOff = dayLogQuery.data?.isDayOff ?? null;

  useEffect(() => {
    setNoteDraft(serverNote);
    setDayOffDraft(serverDayOff);
    setSaveError("");
  }, [selectedDate, serverNote, serverDayOff]);

  const saveDayLog = useMutation({
    mutationFn: (payload: { note: string; isDayOff: boolean }) =>
      api.upsertDayLog(selectedDate, payload),
    onSuccess: (saved) => {
      qc.setQueryData(["day-log", selectedDate], saved);
      qc.invalidateQueries({ queryKey: ["day-logs"] });
      setSaveError("");
    },
    onError: (err) => setSaveError(getErrorMessage(err, "Failed to save day note")),
  });

  const dirty =
    noteDraft !== serverNote ||
    (dayOffDraft ?? false) !== (serverDayOff ?? false);

  const saveRef = useRef(saveDayLog.mutate);
  saveRef.current = saveDayLog.mutate;

  const saveNow = useCallback(() => {
    if (dayLogQuery.isLoading || saveDayLog.isPending || !dirty) return;
    saveRef.current({
      note: noteDraft,
      isDayOff: dayOffDraft ?? false,
    });
  }, [dayLogQuery.isLoading, saveDayLog.isPending, dirty, noteDraft, dayOffDraft]);

  useEffect(() => {
    if (!dirty || dayLogQuery.isLoading) return;

    const timer = window.setTimeout(() => {
      saveRef.current({
        note: noteDraft,
        isDayOff: dayOffDraft ?? false,
      });
    }, 600);

    return () => window.clearTimeout(timer);
  }, [noteDraft, dayOffDraft, dirty, dayLogQuery.isLoading, selectedDate]);

  const handleNoteKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "s") return;
    event.preventDefault();
    saveNow();
  };

  const autoDayOff = dayOffDraft === null ? false : dayOffDraft;

  return (
    <div className="shrink-0 rounded-md border bg-card shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b px-3 py-2 sm:px-4">
        <div className="flex min-w-0 items-center gap-2">
          <NotebookPen className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          <span className="text-sm font-medium">Day note</span>
        </div>
        <label className="flex cursor-pointer items-center gap-2">
          <Checkbox
            checked={autoDayOff}
            onCheckedChange={(checked) => setDayOffDraft(checked === true)}
          />
          <Label className="cursor-pointer font-normal">Day off</Label>
        </label>
      </div>

      <div className="space-y-2 px-3 pb-3 pt-2 sm:px-4 sm:pb-4">
        <div className="flex items-center gap-1">
          <Button
            type="button"
            size="sm"
            variant={noteView === "write" ? "default" : "ghost"}
            className="h-7 px-2.5 text-xs"
            onClick={() => setNoteView("write")}
          >
            Write
          </Button>
          <Button
            type="button"
            size="sm"
            variant={noteView === "preview" ? "default" : "ghost"}
            className="h-7 px-2.5 text-xs"
            onClick={() => setNoteView("preview")}
          >
            Preview
          </Button>
          {saveDayLog.isPending && (
            <span className="ml-auto text-xs text-muted-foreground">Saving…</span>
          )}
          {!saveDayLog.isPending && dirty && (
            <span className="ml-auto text-xs text-muted-foreground">Unsaved changes</span>
          )}
        </div>

        {noteView === "write" ? (
          <Textarea
            value={noteDraft}
            onChange={(e) => setNoteDraft(e.target.value)}
            onKeyDown={handleNoteKeyDown}
            placeholder="Markdown note for this day…"
            className={cn("min-h-[7rem] font-mono text-[13px] leading-relaxed")}
            spellCheck
          />
        ) : (
          <div className="min-h-[7rem] rounded-md border border-border/50 bg-muted/20 px-3 py-2">
            <MarkdownContent source={noteDraft} />
          </div>
        )}

        {saveError && <p className="text-xs text-destructive">{saveError}</p>}
      </div>
    </div>
  );
}
