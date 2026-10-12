import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { ArrowLeft, Upload, Download, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { itemsApi } from "@/api/items";

const CSV_TEMPLATE = `title,description,category,color,brand,found_at,found_location
Blue Backpack,Navy blue school backpack with laptop compartment,bags,blue,Wildcraft,2026-10-10,Main entrance gate
iPhone 14,Black iPhone 14 with cracked screen protector,electronics,black,Apple,2026-10-10,Food court
Car keys,Toyota key fob with red keychain,keys,silver,Toyota,2026-10-10,Parking level 2
`;

function downloadTemplate() {
  const blob = new Blob([CSV_TEMPLATE], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "found_items_template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export function BulkUploadPage() {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const mutation = useMutation({
    mutationFn: (f: File) => itemsApi.bulkUploadFoundItems(f),
  });

  const handleFile = (f: File) => {
    if (!f.name.endsWith(".csv")) return;
    setFile(f);
    mutation.reset();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const handleSubmit = () => {
    if (file) mutation.mutate(file);
  };

  const result = mutation.data;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/items/found")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Bulk Upload Found Items</h1>
          <p className="text-muted-foreground text-sm">Upload a CSV to add multiple items at once.</p>
        </div>
      </div>

      {/* Template download */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">CSV Format</CardTitle>
          <CardDescription>
            Download the template to see the required columns. Images can be added later per item.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" className="gap-2" onClick={downloadTemplate}>
            <Download className="h-4 w-4" />
            Download Template
          </Button>
          <p className="mt-3 text-xs text-muted-foreground">
            Required: <code className="bg-muted px-1 rounded">title</code>,{" "}
            <code className="bg-muted px-1 rounded">category</code>,{" "}
            <code className="bg-muted px-1 rounded">found_at</code> (YYYY-MM-DD),{" "}
            <code className="bg-muted px-1 rounded">found_location</code>. All other fields optional.
          </p>
        </CardContent>
      </Card>

      {/* Drop zone */}
      <Card>
        <CardContent className="p-6">
          <div
            className={`border-2 border-dashed rounded-lg p-10 text-center transition-colors cursor-pointer ${
              dragging ? "border-primary bg-primary/5" : "border-muted-foreground/30 hover:border-primary/50"
            }`}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
          >
            <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
            {file ? (
              <p className="font-medium">{file.name}</p>
            ) : (
              <>
                <p className="font-medium">Drop your CSV here</p>
                <p className="text-sm text-muted-foreground mt-1">or click to browse</p>
              </>
            )}
            <input
              ref={inputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />
          </div>

          {file && !result && (
            <Button className="mt-4 w-full" onClick={handleSubmit} disabled={mutation.isPending}>
              {mutation.isPending ? "Uploading…" : `Upload ${file.name}`}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Result */}
      {result && (
        <Card className={result.error_count === 0 ? "border-green-500/40" : "border-yellow-500/40"}>
          <CardContent className="p-5 space-y-4">
            <div className="flex items-start gap-3">
              {result.error_count === 0 ? (
                <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="h-5 w-5 text-yellow-500 shrink-0 mt-0.5" />
              )}
              <div>
                <p className="font-semibold">
                  {result.created} of {result.total_rows} items created
                  {result.error_count > 0 && ` · ${result.error_count} errors`}
                </p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Embeddings are being generated in the background.
                </p>
              </div>
            </div>

            {result.errors.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-destructive">Row errors:</p>
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {result.errors.map((e) => (
                    <div key={e.row} className="text-xs bg-destructive/10 rounded px-3 py-1.5">
                      <span className="font-semibold">Row {e.row}:</span>{" "}
                      {e.errors.join(", ")}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => navigate("/items/found")}>View Found Items</Button>
              <Button variant="ghost" onClick={() => { setFile(null); mutation.reset(); }}>Upload Another</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {mutation.error && !result && (
        <p className="text-sm text-destructive bg-destructive/10 rounded px-3 py-2">
          Upload failed. Please check the file format and try again.
        </p>
      )}
    </div>
  );
}
