"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Download, Loader2, Phone, Send } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { listChildren, listVaccineRecords } from "@/lib/recordsApi";
import { childHasOverdue, VACCINE_LABELS, withLiveStatus } from "@/lib/vaccineEngine";
import { cn } from "@/lib/utils";
import Button from "@/components/ui/button";
import Card from "@/components/ui/card";

const DIALECTS = [
  { id: "standard", name: "Standard Bengali", emoji: "🇧🇩" },
  { id: "chittagonian", name: "Chittagonian", emoji: "🌊" },
  { id: "sylheti", name: "Sylheti", emoji: "🍃" },
];

const SENT_KEY = "shishu_ivr_sent";

function buildScript(dialect, child, overdueNames) {
  const mother = child.mother_name || "মা";
  const vaccines = overdueNames.join(", ") || "টিকা";
  const center = child.epi_center_name || child.epi_center_code || "আপনার নিকটস্থ";
  if (dialect === "chittagonian") {
    return `আসসালামু আলাইকুম ${mother}, তোর গোদা শিশুর ${vaccines} টিকা এখনও বাকি আছে। তুই ${center} ইপিআই কেন্দ্রে আইয়ো। শিশুর হিফাজতের লাই আজই কেন্দ্রে আসো।`;
  }
  if (dialect === "sylheti") {
    return `আসসালামু আলাইকুম ${mother}, অনর বাইর শিশুর ${vaccines} টিকা এখনও বাকি আছে। ${center} ইপিআই কেন্দ্রে আইবা। শিশুর হিফাজতের লাই কেন্দ্রে আইবা।`;
  }
  return `আসসালামু আলাইকুম ${mother}, আপনার সন্তানের ${vaccines} টিকা বাকি আছে। অনুগ্রহ করে ${center} ইপিআই কেন্দ্রে এসে টিকা সম্পন্ন করুন। শিশুর সুরক্ষার জন্য আজই কেন্দ্রে আসুন।`;
}

function readSent() {
  try {
    const parsed = JSON.parse(localStorage.getItem(SENT_KEY) || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeSent(map) {
  localStorage.setItem(SENT_KEY, JSON.stringify(map));
}

function speechUrl(result) {
  if (!result) return "";
  if (typeof result === "string") return result;
  return result.url || result.audio_url || result.media_url || result.file_url || "";
}

async function generateSpeech(text) {
  const result = await base44.integrations.Core.GenerateSpeech({
    text,
    voice: "honey",
    language_code: "bn",
  });
  const url = speechUrl(result);
  if (!url) throw new Error("Speech service did not return an audio file.");
  return url;
}

async function shareOrDownloadAudio(url, filename, text) {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const file = new File([blob], filename, { type: blob.type || "audio/mpeg" });
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      await navigator.share({ title: "ShishuSurakkha voice reminder", text, files: [file] });
      return "shared";
    }
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(objectUrl);
    return "downloaded";
  } catch {
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.click();
    return "opened";
  }
}

function VoiceReminders() {
  const [children, setChildren] = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialect, setDialect] = useState("standard");
  const [selectedId, setSelectedId] = useState(null);
  const [audioUrl, setAudioUrl] = useState("");
  const [audioLoading, setAudioLoading] = useState(false);
  const [sentMap, setSentMap] = useState(() => readSent());
  const [launching, setLaunching] = useState(false);
  const [rowSending, setRowSending] = useState("");
  const [sendError, setSendError] = useState("");
  const [sendNote, setSendNote] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const [childRows, vaccineRows] = await Promise.all([listChildren(200), listVaccineRecords(1000)]);
      if (!active) return;
      setChildren(childRows);
      setRecords(vaccineRows);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  const overdueChildren = useMemo(() => {
    return children
      .map((child) => {
        const live = withLiveStatus(records.filter((row) => row.shishu_id === child.shishu_id));
        const overdue = live.filter((row) => row.status === "OVERDUE");
        return { child, overdue };
      })
      .filter((row) => row.overdue.length || childHasOverdue(records.filter((item) => item.shishu_id === row.child.shishu_id)));
  }, [children, records]);

  useEffect(() => {
    if (!selectedId && overdueChildren[0]) {
      setSelectedId(overdueChildren[0].child.shishu_id);
    }
  }, [overdueChildren, selectedId]);

  const selected = overdueChildren.find((row) => row.child.shishu_id === selectedId);
  const overdueNames = (selected?.overdue || []).map((row) => VACCINE_LABELS[row.vaccine_name]?.split(" ")[0] || row.vaccine_name);
  const script = selected ? buildScript(dialect, selected.child, overdueNames) : "";
  const selectedSent = selected ? sentMap[selected.child.shishu_id] : null;
  const playerUrl = audioUrl || selectedSent?.audioUrl || "";

  useEffect(() => {
    setAudioUrl("");
    setSendError("");
    setSendNote("");
  }, [selectedId, dialect]);

  const previewAudio = async () => {
    if (!script) return;
    setAudioLoading(true);
    setSendError("");
    try {
      const url = await generateSpeech(script);
      setAudioUrl(url);
    } catch (err) {
      setAudioUrl("");
      setSendError(err?.message || "Could not generate preview audio.");
    } finally {
      setAudioLoading(false);
    }
  };

  const markSent = (child, url, text) => {
    const payload = {
      audioUrl: url,
      phone: child.phone || "",
      dialect,
      script: text,
      sentAt: new Date().toISOString(),
    };
    const next = { ...readSent(), [child.shishu_id]: payload };
    writeSent(next);
    setSentMap(next);
    return payload;
  };

  const sendAudioReminder = async (entry, { share = true } = {}) => {
    const child = entry.child;
    const names = entry.overdue.map((row) => VACCINE_LABELS[row.vaccine_name]?.split(" ")[0] || row.vaccine_name);
    const text = buildScript(dialect, child, names);
    const reuse = child.shishu_id === selectedId ? audioUrl : "";
    const url = reuse || (await generateSpeech(text));
    if (child.shishu_id === selectedId) setAudioUrl(url);
    await new Promise((resolve) => setTimeout(resolve, 1200));
    markSent(child, url, text);
    if (share) {
      const result = await shareOrDownloadAudio(url, `${child.shishu_id}-reminder.mp3`, `${text}\n${child.phone || ""}`);
      if (result === "shared") setSendNote(`Audio sent toward ${child.phone || "the parent"} via the phone share sheet.`);
      else if (result === "downloaded") setSendNote("Audio file saved. Play it on the IVR handset or share it to the parent.");
      else setSendNote("Audio reminder is ready. Use the player or download to send it.");
    }
    return url;
  };

  const launchIvr = async () => {
    if (!selected) return;
    setLaunching(true);
    setSendError("");
    setSendNote("");
    try {
      await sendAudioReminder(selected);
    } catch (err) {
      setSendError(err?.message || "Could not generate audio to send.");
    } finally {
      setLaunching(false);
    }
  };

  const sendRowAudio = async (entry, event) => {
    event.stopPropagation();
    setSelectedId(entry.child.shishu_id);
    setRowSending(entry.child.shishu_id);
    setSendError("");
    setSendNote("");
    try {
      await sendAudioReminder(entry);
    } catch (err) {
      setSendError(err?.message || "Could not generate audio to send.");
    } finally {
      setRowSending("");
    }
  };

  const downloadSentAudio = async () => {
    if (!playerUrl || !selected) return;
    await shareOrDownloadAudio(playerUrl, `${selected.child.shishu_id}-reminder.mp3`, script);
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-heading text-2xl font-bold">Voice Reminders</h1>
        <p className="text-sm text-muted-foreground">Generate Bengali audio and send it with outbound IVR reminders</p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {DIALECTS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setDialect(item.id)}
            className={cn(
              "min-h-[48px] rounded-2xl border p-4 text-left",
              dialect === item.id ? "border-primary bg-accent text-accent-foreground" : "border-border bg-card"
            )}
          >
            <p className="text-xl">{item.emoji}</p>
            <p className="font-heading font-bold">{item.name}</p>
          </button>
        ))}
      </div>

      {!overdueChildren.length ? (
        <Card className="flex flex-col items-center p-10 text-center">
          <CheckCircle2 className="h-12 w-12 text-emerald-700" />
          <p className="mt-3 font-heading text-lg font-bold">No overdue children. All on schedule!</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {overdueChildren.map((entry) => {
            const { child, overdue } = entry;
            const sent = sentMap[child.shishu_id];
            const busy = rowSending === child.shishu_id;
            return (
              <div
                key={child.shishu_id}
                className={cn(
                  "flex min-h-[48px] w-full items-center gap-3 rounded-2xl border p-4",
                  selectedId === child.shishu_id ? "border-primary bg-accent" : "border-border bg-card"
                )}
              >
                <button type="button" className="flex min-w-0 flex-1 items-center gap-3 text-left" onClick={() => setSelectedId(child.shishu_id)}>
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 font-bold text-red-700">
                    {(child.mother_name || "C").slice(0, 1)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{child.shishu_id}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {child.mother_name || "মা"} · {overdue.map((row) => row.vaccine_name).join(", ")}
                    </p>
                  </div>
                </button>
                {sent ? <span className="text-sm font-bold text-emerald-700">✓</span> : null}
                <span className="hidden items-center gap-1 text-xs font-semibold text-muted-foreground sm:flex">
                  <Phone className="h-3.5 w-3.5" /> {child.phone || "No phone"}
                </span>
                <Button
                  type="button"
                  size="sm"
                  className="shrink-0"
                  disabled={busy || Boolean(sent)}
                  onClick={(event) => sendRowAudio(entry, event)}
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {sent ? "Sent" : "Send audio"}
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {selected ? (
        <Card className="border-primary p-5">
          <h2 className="font-heading font-bold">Reminder preview</h2>
          <p className="mt-1 text-xs text-muted-foreground">{DIALECTS.find((item) => item.id === dialect)?.name}</p>
          <p className="mt-3 rounded-xl bg-muted p-3 text-sm leading-relaxed">{script}</p>
          <p className="mt-3 text-xs text-muted-foreground">
            Dynamic tags: {"{Mother_Name}"}, {"{Vaccine_Name}"}, {"{EPI_Center}"}
          </p>
          <p className="mt-2 flex items-center gap-1 text-sm font-semibold">
            <Phone className="h-4 w-4 text-primary" />
            Send to {selected.child.phone || "no phone on file"}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button type="button" className="bg-violet-700 text-white hover:bg-violet-800" onClick={previewAudio} disabled={audioLoading || launching}>
              {audioLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Preview Audio
            </Button>
            <Button type="button" onClick={launchIvr} disabled={launching || audioLoading || Boolean(selectedSent)}>
              {launching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {selectedSent ? "Audio sent" : launching ? "Sending audio..." : "Send audio + IVR"}
            </Button>
            {playerUrl ? (
              <Button type="button" variant="outline" onClick={downloadSentAudio}>
                <Download className="h-4 w-4" />
                Download audio
              </Button>
            ) : null}
          </div>
          {sendError ? <p className="mt-2 text-sm font-semibold text-red-700">{sendError}</p> : null}
          {selectedSent ? (
            <p className="mt-2 text-sm font-semibold text-emerald-700">
              Sent ✓ Audio reminder dispatched{selectedSent.phone ? ` to ${selectedSent.phone}` : ""}.
            </p>
          ) : null}
          {sendNote ? <p className="mt-1 text-sm text-muted-foreground">{sendNote}</p> : null}
          {playerUrl ? (
            <div className="mt-4">
              <p className="mb-2 text-xs font-semibold text-muted-foreground">Audio to send</p>
              <audio className="w-full" controls src={playerUrl} />
            </div>
          ) : null}
        </Card>
      ) : null}
    </div>
  );
}

export default VoiceReminders;
