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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ImageDropzone } from "@/components/items/ImageDropzone";
import { itemsApi } from "@/api/items";
import { CATEGORIES } from "@/lib/constants";

const schema = z.object({
  title: z.string().min(2, "Title must be at least 2 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  category: z.string().min(1, "Select a category"),
  color: z.string().optional(),
  brand: z.string().optional(),
  lost_at: z.string().min(1, "Date lost is required"),
  lost_location: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export function ReportLostItemPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [image, setImage] = useState<File | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const mutation = useMutation({
    mutationFn: (formData: FormData) => itemsApi.createLostItem(formData as unknown as globalThis.FormData),
    onSuccess: (item) => {
      queryClient.invalidateQueries({ queryKey: ["lost-items"] });
      navigate(`/items/lost/${item.id}`);
    },
  });

  const onSubmit = (data: FormData) => {
    const fd = new globalThis.FormData();
    Object.entries(data).forEach(([k, v]) => { if (v) fd.append(k, v); });
    if (image) fd.append("image", image);
    mutation.mutate(fd as unknown as FormData);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Report Lost Item</h1>
          <p className="text-muted-foreground text-sm">
            The more detail you provide, the better the AI matching works.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Photo</CardTitle>
          <CardDescription>Optional but strongly recommended — used for AI image matching</CardDescription>
        </CardHeader>
        <CardContent>
          <ImageDropzone value={image} onChange={setImage} />
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
                <Input placeholder="e.g. iPhone 14 Pro" {...register("title")} />
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
                placeholder="Describe the item in detail — colour, size, distinguishing marks, what was inside…"
                rows={4}
                {...register("description")}
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Colour" error={errors.color?.message}>
                <Input placeholder="e.g. Space Grey" {...register("color")} />
              </Field>
              <Field label="Brand / Model" error={errors.brand?.message}>
                <Input placeholder="e.g. Apple" {...register("brand")} />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Date lost *" error={errors.lost_at?.message}>
                <Input type="date" max={new Date().toISOString().split("T")[0]} {...register("lost_at")} />
              </Field>
              <Field label="Where you lost it" error={errors.lost_location?.message}>
                <Input placeholder="e.g. Central Metro, Line 2" {...register("lost_location")} />
              </Field>
            </div>

            {mutation.error && (
              <p className="text-sm text-destructive bg-destructive/10 rounded px-3 py-2">
                {String((mutation.error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? "Failed to submit. Please try again.")}
              </p>
            )}

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Report Item
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
