import { useCallback, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { NotebookPen, Pencil, Save } from "lucide-react";
import { api } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import { useIsMobileLayout } from "@/hooks/use-media-query";
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
  const isMobile = useIsMobileLayout();
  const [noteView, setNoteView] = useState<NoteView>("preview");
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
    setNoteView("preview");
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

  const saveNote = useCallback(() => {
    if (dayLogQuery.isLoading || saveDayLog.isPending || !dirty) return;
    saveDayLog.mutate(
      { note: noteDraft, isDayOff: dayOffDraft ?? false },
      { onSuccess: () => setNoteView("preview") },
    );
  }, [
    dayLogQuery.isLoading,
    saveDayLog,
    dirty,
    noteDraft,
    dayOffDraft,
  ]);

  const handleNoteKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "s") return;
    event.preventDefault();
    saveNote();
  };

  const autoDayOff = dayOffDraft === null ? false : dayOffDraft;

  const handleNoteAction = () => {
    if (noteView === "preview") {
      setNoteView("write");
      return;
    }
    if (dayLogQuery.isLoading || saveDayLog.isPending) return;
    if (!dirty) {
      setNoteView("preview");
      return;
    }
    saveNote();
  };

  return (
    <div
      className={cn(
        "shrink-0",
        isMobile
          ? "max-h-[min(40dvh,18rem)] overflow-y-auto border-b border-border/60 overscroll-y-contain"
          : "rounded-md border bg-card shadow-sm",
      )}
    >
      <div
        className={cn(
          "flex flex-wrap items-center justify-between gap-2 border-b px-3 py-2",
          !isMobile && "sm:px-4",
        )}
      >
        <div className="flex min-w-0 items-center gap-2">
          <NotebookPen className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          <span className="text-sm font-medium">Day note</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex cursor-pointer items-center gap-2">
            <Checkbox
              checked={autoDayOff}
              onCheckedChange={(checked) => setDayOffDraft(checked === true)}
            />
            <Label className="cursor-pointer font-normal">Day off</Label>
          </label>
          <Button
            type="button"
            size="icon"
            variant={noteView === "write" ? "default" : "ghost"}
            className="h-8 w-8"
            onClick={handleNoteAction}
            disabled={noteView === "write" && (dayLogQuery.isLoading || saveDayLog.isPending)}
            aria-label={noteView === "write" ? "Save note" : "Edit note"}
            aria-pressed={noteView === "write"}
          >
            {noteView === "write" ? (
              <Save className="h-4 w-4" />
            ) : (
              <Pencil className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      <div
        className={cn(
          "space-y-2 pb-3 pt-2",
          isMobile ? "bg-white px-0" : "px-3 sm:px-4 sm:pb-4",
        )}
      >
        {noteView === "write" ? (
          <Textarea
            value={noteDraft}
            onChange={(e) => setNoteDraft(e.target.value)}
            onKeyDown={handleNoteKeyDown}
            placeholder="Markdown note for this day…"
            className={cn(
              "min-h-28 rounded-none border-0 bg-transparent px-3 font-mono text-[13px] leading-relaxed shadow-none focus-visible:ring-0",
            )}
            spellCheck
          />
        ) : (
          <div className={cn("min-h-28", isMobile ? "px-3 py-1" : "rounded-md border border-border/50 bg-muted/20 px-3 py-2")}>
            <MarkdownContent source={noteDraft} />
          </div>
        )}

        {saveError && <p className={cn("text-xs text-destructive", isMobile && "px-3")}>{saveError}</p>}
      </div>
    </div>
  );
}
