import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Camera, Crosshair, Loader2, ScanLine, WifiOff } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { addToQueue, getQueueCount, isEffectivelyOnline, QUEUE_CHANGED_EVENT } from "@/lib/offlineQueue";
import { bulkCreateVaccines, createChild } from "@/lib/recordsApi";
import {
  DISTRICTS,
  generateScheduleFromDOB,
  generateShishuId,
  getAgeInMonths,
} from "@/lib/vaccineEngine";
import Button from "@/components/ui/button";
import Card from "@/components/ui/card";
import Input from "@/components/ui/input";
import Label from "@/components/ui/label";
import Select from "@/components/ui/select";

const EMPTY_FORM = {
  mother_name: "",
  mother_nid: "",
  phone: "",
  dob: "",
  epi_center_code: "",
  epi_center_name: "",
  district: "Satkhira",
  upazila: "",
  gender: "Female",
};

const OCR_PROMPT =
  "You are an OCR system reading a Bangladesh EPI (Expanded Programme on Immunization) child vaccination card. Extract the following fields from the image if visible: mother's NID number (mother_nid), child's date of birth (dob, in YYYY-MM-DD format), EPI center code (epi_center_code), mother's name (mother_name), contact phone number (phone), and EPI center name (epi_center_name). If a field cannot be read, return an empty string for it. Return only the JSON object.";

function stopStream(stream) {
  stream?.getTracks().forEach((track) => track.stop());
}

async function requestCameraStream() {
  try {
    return await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        facingMode: { ideal: "environment" },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
    });
  } catch (err) {
    if (err?.name === "OverconstrainedError" || err?.name === "NotFoundError") {
      return navigator.mediaDevices.getUserMedia({ audio: false, video: true });
    }
    throw err;
  }
}

function cameraErrorMessage(err) {
  const name = err?.name;
  if (name === "NotAllowedError" || name === "PermissionDeniedError") {
    return "Camera permission is blocked. Allow camera access for this site, then tap Retry camera.";
  }
  if (name === "NotFoundError") {
    return "No camera was found on this device.";
  }
  if (name === "NotReadableError") {
    return "The camera is in use by another app. Close it, then retry.";
  }
  return "Could not open the camera. Allow camera access, then tap Retry camera.";
}

function Scanner() {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [stage, setStage] = useState("idle");
  const [form, setForm] = useState(EMPTY_FORM);
  const [imageUrl, setImageUrl] = useState("");
  const [error, setError] = useState("");
  const [ocrNotice, setOcrNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [startingCamera, setStartingCamera] = useState(false);
  const [online, setOnline] = useState(() => isEffectivelyOnline());
  const [pendingCount, setPendingCount] = useState(() => getQueueCount());

  useEffect(() => {
    const refresh = () => {
      setOnline(isEffectivelyOnline());
      setPendingCount(getQueueCount());
    };
    window.addEventListener(QUEUE_CHANGED_EVENT, refresh);
    window.addEventListener("online", refresh);
    window.addEventListener("offline", refresh);
    return () => {
      window.removeEventListener(QUEUE_CHANGED_EVENT, refresh);
      window.removeEventListener("online", refresh);
      window.removeEventListener("offline", refresh);
    };
  }, []);

  const closeCamera = () => {
    stopStream(streamRef.current);
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraReady(false);
  };

  const startCamera = async (isCancelled = () => false) => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("This phone browser cannot open the camera. Enter details manually, or use Chrome/Safari.");
      return;
    }
    setStartingCamera(true);
    setCameraError("");
    try {
      stopStream(streamRef.current);
      streamRef.current = null;
      const stream = await requestCameraStream();
      if (isCancelled()) {
        stopStream(stream);
        return;
      }
      streamRef.current = stream;
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        video.setAttribute("playsinline", "true");
        await video.play();
      }
      if (isCancelled()) {
        closeCamera();
        return;
      }
      setCameraReady(true);
    } catch (err) {
      if (isCancelled()) return;
      setCameraError(cameraErrorMessage(err));
      setCameraReady(false);
    } finally {
      if (!isCancelled()) setStartingCamera(false);
    }
  };

  useEffect(() => {
    if (stage !== "idle") {
      closeCamera();
      return undefined;
    }
    let cancelled = false;
    startCamera(() => cancelled);
    return () => {
      cancelled = true;
      closeCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const processCapture = async (file) => {
    if (!file) return;
    setError("");
    setOcrNotice("");
    setImageUrl(URL.createObjectURL(file));
    setStage("scanning");
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const extracted = await base44.integrations.Core.InvokeLLM({
        prompt: OCR_PROMPT,
        file_urls: [file_url],
        response_json_schema: {
          type: "object",
          properties: {
            mother_nid: { type: "string" },
            dob: { type: "string" },
            epi_center_code: { type: "string" },
            mother_name: { type: "string" },
            phone: { type: "string" },
            epi_center_name: { type: "string" },
          },
        },
      });
      setForm((prev) => ({
        ...prev,
        mother_nid: extracted?.mother_nid || "",
        dob: extracted?.dob || "",
        epi_center_code: extracted?.epi_center_code || "",
        mother_name: extracted?.mother_name || "",
        phone: extracted?.phone || "",
        epi_center_name: extracted?.epi_center_name || "",
      }));
      setStage("scanned");
    } catch {
      setOcrNotice("Could not read the card automatically. Enter the details manually.");
      setStage("manual");
    }
  };

  const captureCard = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !cameraReady || video.videoWidth === 0) {
      setCameraError("Wait for the camera preview, then capture the card.");
      return;
    }
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
    if (!blob) {
      setCameraError("Could not capture a still from the camera. Try again.");
      return;
    }
    const file = new File([blob], "epi-card.jpg", { type: "image/jpeg" });
    await processCapture(file);
  };

  const reset = () => {
    setForm(EMPTY_FORM);
    setImageUrl("");
    setError("");
    setOcrNotice("");
    setCameraError("");
    setStage("idle");
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setError("");
    if (!form.mother_nid || !form.dob || !form.epi_center_code) {
      setError("Mother's NID, date of birth, and EPI center code are required.");
      return;
    }
    const months = getAgeInMonths(form.dob);
    const child = {
      shishu_id: generateShishuId(),
      mother_name: form.mother_name,
      mother_nid: form.mother_nid,
      phone: form.phone,
      epi_center_code: form.epi_center_code,
      epi_center_name: form.epi_center_name,
      dob: form.dob,
      gender: form.gender,
      district: form.district,
      upazila: form.upazila,
      sync_status: online ? "SYNCED" : "PENDING_SYNC",
      zero_dose: months >= 12 && months <= 23,
    };
    const schedule = generateScheduleFromDOB(form.dob);
    setSaving(true);
    try {
      if (!online) {
        addToQueue({ child, schedule });
        navigate("/children");
        return;
      }
      const created = await createChild(child);
      await bulkCreateVaccines(schedule.map((row) => ({ ...row, shishu_id: child.shishu_id })));
      navigate(`/children/${created.id || child.shishu_id}`);
    } catch (err) {
      setError(err?.message || "Could not save this child.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-heading text-2xl font-bold">Scan EPI Card</h1>
        <p className="text-sm text-muted-foreground">Use the phone camera to photograph the vaccination card and auto-extract details</p>
      </div>

      {!online ? (
        <div className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-100 p-4 text-amber-700">
          <WifiOff className="mt-0.5 h-5 w-5" />
          <div>
            <p className="font-semibold">You are offline. Records will queue locally.</p>
            <p className="text-sm">{pendingCount} record(s) already pending sync.</p>
          </div>
        </div>
      ) : null}

      {stage === "idle" ? (
        <div className="space-y-3">
          <div className="relative min-h-[320px] overflow-hidden rounded-2xl border-2 border-primary bg-slate-900 text-white">
            <video
              ref={videoRef}
              className="absolute inset-0 h-full w-full object-cover"
              autoPlay
              muted
              playsInline
            />
            <canvas ref={canvasRef} className="hidden" />
            <div className="pointer-events-none absolute inset-6">
              <div className="absolute inset-y-0 left-1/3 w-px bg-emerald-400/40" />
              <div className="absolute inset-y-0 left-2/3 w-px bg-emerald-400/40" />
              <div className="absolute inset-x-0 top-1/3 h-px bg-emerald-400/40" />
              <div className="absolute inset-x-0 top-2/3 h-px bg-emerald-400/40" />
              <div className="absolute left-0 top-0 h-10 w-10 border-l-4 border-t-4 border-emerald-400" />
              <div className="absolute right-0 top-0 h-10 w-10 border-r-4 border-t-4 border-emerald-400" />
              <div className="absolute bottom-0 left-0 h-10 w-10 border-b-4 border-l-4 border-emerald-400" />
              <div className="absolute bottom-0 right-0 h-10 w-10 border-b-4 border-r-4 border-emerald-400" />
            </div>
            {!cameraReady ? (
              <div className="relative z-10 flex min-h-[320px] flex-col items-center justify-center px-4 text-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500">
                  {startingCamera ? <Loader2 className="h-6 w-6 animate-spin" /> : <ScanLine className="h-6 w-6" />}
                </div>
                <p className="font-heading text-lg font-bold">Scan EPI Card</p>
                <p className="text-sm text-slate-200">
                  {startingCamera ? "Opening rear camera..." : "Allow camera access to align the card"}
                </p>
              </div>
            ) : (
              <div className="pointer-events-none absolute inset-x-0 bottom-4 z-10 flex flex-col items-center">
                <Crosshair className="mb-2 h-8 w-8 text-emerald-400" />
                <p className="text-sm font-semibold text-white">Align the card within the green frame</p>
              </div>
            )}
          </div>

          {cameraError ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-100 p-4 text-sm font-semibold text-amber-700">
              {cameraError}
            </div>
          ) : null}

          <Button type="button" className="w-full" onClick={captureCard} disabled={!cameraReady || startingCamera}>
            <Camera className="h-5 w-5" />
            {cameraReady ? "Capture card" : startingCamera ? "Starting camera..." : "Camera unavailable"}
          </Button>
          {!cameraReady && !startingCamera ? (
            <Button type="button" variant="outline" className="w-full" onClick={() => startCamera()}>
              Retry camera
            </Button>
          ) : null}
          <button type="button" className="text-sm font-semibold text-primary" onClick={() => setStage("manual")}>
            Or enter details manually →
          </button>
        </div>
      ) : null}

      {stage === "scanning" ? (
        <Card className="flex flex-col items-center p-10 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="mt-3 font-semibold">Scanning card...</p>
          <p className="text-sm text-muted-foreground">Extracting text via OCR</p>
        </Card>
      ) : null}

      {ocrNotice ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-100 p-4 text-sm font-semibold text-amber-700">{ocrNotice}</div>
      ) : null}

      {stage === "scanned" || stage === "manual" ? (
        <Card className="p-5">
          {stage === "scanned" ? (
            <div className="mb-4">
              <h2 className="font-heading text-lg font-bold">Card Scanned</h2>
              <p className="text-sm text-muted-foreground">Review and verify the extracted details below before saving.</p>
              {imageUrl ? <img src={imageUrl} alt="Captured EPI card" className="mt-3 max-h-48 rounded-xl border border-border object-contain" /> : null}
            </div>
          ) : (
            <h2 className="mb-4 font-heading text-lg font-bold">Enter child details</h2>
          )}
          <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="mother_name">Mother's Name</Label>
              <Input id="mother_name" value={form.mother_name} onChange={(e) => update("mother_name", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mother_nid">Mother's NID *</Label>
              <Input id="mother_nid" value={form.mother_nid} onChange={(e) => update("mother_nid", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" type="tel" value={form.phone} onChange={(e) => update("phone", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dob">Date of Birth *</Label>
              <Input id="dob" type="date" value={form.dob} onChange={(e) => update("dob", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="epi_center_code">EPI Center Code *</Label>
              <Input id="epi_center_code" value={form.epi_center_code} onChange={(e) => update("epi_center_code", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="epi_center_name">EPI Center Name</Label>
              <Input id="epi_center_name" value={form.epi_center_name} onChange={(e) => update("epi_center_name", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="district">District</Label>
              <Select id="district" value={form.district} onChange={(e) => update("district", e.target.value)}>
                {DISTRICTS.map((district) => (
                  <option key={district} value={district}>
                    {district}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="upazila">Upazila</Label>
              <Input id="upazila" value={form.upazila} onChange={(e) => update("upazila", e.target.value)} />
            </div>
            {error ? <p className="md:col-span-2 text-sm font-semibold text-red-700">{error}</p> : null}
            <div className="md:col-span-2 flex flex-wrap gap-2">
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : online ? "Save child" : "Save to Offline Queue"}
              </Button>
              <Button type="button" variant="outline" onClick={reset}>
                Reset
              </Button>
            </div>
          </form>
        </Card>
      ) : null}
    </div>
  );
}

export default Scanner;
