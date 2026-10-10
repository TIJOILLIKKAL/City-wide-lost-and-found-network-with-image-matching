import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MultiImageUpload } from "@/components/items/MultiImageUpload";
import { itemsApi } from "@/api/items";
import { CATEGORIES } from "@/lib/constants";

const schema = z.object({
  title: z.string().min(2, "Title must be at least 2 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  category: z.string().min(1, "Select a category"),
  color: z.string().optional(),
  brand: z.string().optional(),
  found_at: z.string().min(1, "Found date is required"),
  found_location: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export function UploadFoundItemPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [images, setImages] = useState<File[]>([]);
  const [imageError, setImageError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const mutation = useMutation({
    mutationFn: (formData: FormData) => itemsApi.createFoundItem(formData as unknown as globalThis.FormData),
    onSuccess: (item) => {
      queryClient.invalidateQueries({ queryKey: ["found-items"] });
      navigate(`/items/found/${item.id}`);
    },
  });

  const onSubmit = (data: FormData) => {
    if (images.length === 0) {
      setImageError("At least one photo is required.");
      return;
    }
    setImageError("");
    const fd = new globalThis.FormData();
    Object.entries(data).forEach(([k, v]) => { if (v) fd.append(k, v as string); });
    images.forEach((img) => fd.append("images", img));
    mutation.mutate(fd as unknown as FormData);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Log Found Item</h1>
          <p className="text-muted-foreground text-sm">Upload a photo and details of the item found at your venue.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Item Photos</CardTitle>
        </CardHeader>
        <CardContent>
          <MultiImageUpload values={images} onChange={setImages} maxFiles={5} required />
          {imageError && <p className="text-xs text-destructive mt-2">{imageError}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Item Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Title *" error={errors.title?.message}>
                <Input placeholder="e.g. Black leather wallet" {...register("title")} />
              </Field>
              <Field label="Category *" error={errors.category?.message}>
                <Select {...register("category")}>
                  <option value="">Select category…</option>
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </Select>
              </Field>
            </div>

            <Field label="Description *" error={errors.description?.message}>
              <Textarea
                placeholder="Describe the item — colour, markings, contents, condition…"
                rows={3}
                {...register("description")}
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Colour" error={errors.color?.message}>
                <Input placeholder="e.g. Black" {...register("color")} />
              </Field>
              <Field label="Brand" error={errors.brand?.message}>
                <Input placeholder="e.g. Samsung" {...register("brand")} />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Date found *" error={errors.found_at?.message}>
                <Input type="date" max={new Date().toISOString().split("T")[0]} {...register("found_at")} />
              </Field>
              <Field label="Location within venue" error={errors.found_location?.message}>
                <Input placeholder="e.g. Gate 3, Food Court" {...register("found_location")} />
              </Field>
            </div>

            {mutation.error && (
              <p className="text-sm text-destructive bg-destructive/10 rounded px-3 py-2">
                {String((mutation.error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? "Failed to upload. Please try again.")}
              </p>
            )}

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Submit Found Item
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate(-1)}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
