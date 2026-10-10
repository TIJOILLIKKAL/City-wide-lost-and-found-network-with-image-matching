import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { ImagePlus, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface MultiImageUploadProps {
  values: File[];
  onChange: (files: File[]) => void;
  maxFiles?: number;
  required?: boolean;
}

export function MultiImageUpload({ values, onChange, maxFiles = 5, required }: MultiImageUploadProps) {
  const previews = values.map((f) => ({ file: f, url: URL.createObjectURL(f) }));

  const onDrop = useCallback(
    (accepted: File[]) => {
      const remaining = maxFiles - values.length;
      if (remaining <= 0) return;
      onChange([...values, ...accepted.slice(0, remaining)]);
    },
    [values, onChange, maxFiles]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [".jpg", ".jpeg", ".png", ".webp"] },
    maxFiles,
    maxSize: 10 * 1024 * 1024,
    disabled: values.length >= maxFiles,
  });

  const remove = (index: number) => {
    onChange(values.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      {/* Drop zone — only shown when more slots available */}
      {values.length < maxFiles && (
        <div
          {...getRootProps()}
          className={cn(
            "flex flex-col items-center justify-center w-full h-36 rounded-lg border-2 border-dashed cursor-pointer transition-colors",
            isDragActive
              ? "border-primary bg-primary/5"
              : "border-input hover:border-primary/50 hover:bg-muted/40"
          )}
        >
          <input {...getInputProps()} required={required && values.length === 0} />
          <ImagePlus className="h-7 w-7 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">
            {isDragActive ? "Drop images here" : "Drag & drop or click to upload"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            JPG, PNG, WebP · max 10 MB · {values.length}/{maxFiles} added
          </p>
        </div>
      )}

      {/* Thumbnails */}
      {previews.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {previews.map(({ url }, i) => (
            <div key={i} className="relative aspect-square rounded-lg overflow-hidden border bg-muted">
              <img src={url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
              {i === 0 && (
                <span className="absolute bottom-0 left-0 right-0 text-center text-[10px] font-semibold bg-black/50 text-white py-0.5">
                  Primary
                </span>
              )}
              <button
                type="button"
                onClick={() => remove(i)}
                className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5 hover:bg-black/80"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
