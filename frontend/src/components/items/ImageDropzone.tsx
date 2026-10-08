import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { ImagePlus, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImageDropzoneProps {
  value: File | null;
  onChange: (file: File | null) => void;
  required?: boolean;
}

export function ImageDropzone({ value, onChange, required }: ImageDropzoneProps) {
  const [preview, setPreview] = useState<string | null>(null);

  const onDrop = useCallback(
    (accepted: File[]) => {
      const file = accepted[0];
      if (!file) return;
      onChange(file);
      setPreview(URL.createObjectURL(file));
    },
    [onChange]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [".jpg", ".jpeg", ".png", ".webp"] },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024, // 10 MB
  });

  const clear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
    setPreview(null);
  };

  if (preview && value) {
    return (
      <div className="relative w-full rounded-lg overflow-hidden border border-input">
        <img src={preview} alt="preview" className="w-full max-h-64 object-cover" />
        <button
          type="button"
          onClick={clear}
          className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1 hover:bg-black/80"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div
      {...getRootProps()}
      className={cn(
        "flex flex-col items-center justify-center w-full h-40 rounded-lg border-2 border-dashed cursor-pointer transition-colors",
        isDragActive
          ? "border-primary bg-primary/5"
          : "border-input hover:border-primary/50 hover:bg-muted/40"
      )}
    >
      <input {...getInputProps()} required={required} />
      <ImagePlus className="h-8 w-8 text-muted-foreground mb-2" />
      <p className="text-sm text-muted-foreground">
        {isDragActive ? "Drop image here" : "Drag & drop or click to upload"}
      </p>
      <p className="text-xs text-muted-foreground mt-1">JPG, PNG, WebP · max 10 MB</p>
    </div>
  );
}
