import { UploadCloud } from 'lucide-react';

export default function EvidenceUploader() {
  return (
    <label className="glass-card flex cursor-pointer flex-col items-center justify-center gap-2 border-dashed p-6 text-center text-slate-300">
      <UploadCloud className="h-7 w-7 text-indigo-300" />
      <span className="text-sm">Drag and drop evidence files or click to upload</span>
      <input type="file" className="hidden" />
    </label>
  );
}
