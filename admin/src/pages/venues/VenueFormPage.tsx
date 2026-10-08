import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ArrowLeft, Loader2 } from "lucide-react";
import { venuesApi, type VenueFormData } from "@/api/venues";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

const schema = z.object({
  name: z.string().min(2, "Required"),
  venue_type: z.string().min(1, "Required"),
  address: z.string().min(5, "Required"),
  city: z.string().min(2, "Required"),
  state: z.string().min(2, "Required"),
  pincode: z.string().min(4, "Required"),
  contact_name: z.string().min(2, "Required"),
  contact_email: z.string().email("Invalid email"),
  contact_phone: z.string().min(7, "Required"),
  registration_number: z.string().optional(),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

export function VenueFormPage() {
  const { slug } = useParams<{ slug?: string }>();
  const isEdit = !!slug;
  const navigate = useNavigate();

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } =
    useForm<FormValues>({ resolver: zodResolver(schema) });

  const { data: typesData } = useQuery({
    queryKey: ["venue-types"],
    queryFn: venuesApi.types,
    staleTime: Infinity,
  });

  const { data: venueData, isLoading } = useQuery({
    queryKey: ["admin-venue", slug],
    queryFn: () => venuesApi.get(slug!),
    enabled: isEdit,
  });

  useEffect(() => {
    if (venueData) {
      reset({
        name: venueData.name,
        venue_type: venueData.venue_type,
        address: venueData.address,
        city: venueData.city,
        state: venueData.state,
        pincode: venueData.pincode,
        contact_name: venueData.contact_name,
        contact_email: venueData.contact_email,
        contact_phone: venueData.contact_phone,
        registration_number: venueData.registration_number ?? "",
        latitude: venueData.latitude != null ? String(venueData.latitude) : "",
        longitude: venueData.longitude != null ? String(venueData.longitude) : "",
      });
    }
  }, [venueData, reset]);

  const createMutation = useMutation({
    mutationFn: (data: VenueFormData) => venuesApi.create(data),
    onSuccess: () => navigate("/venues"),
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<VenueFormData>) => venuesApi.update(slug!, data),
    onSuccess: () => navigate("/venues"),
  });

  const onSubmit = (values: FormValues) => {
    const payload: VenueFormData = {
      name: values.name,
      venue_type: values.venue_type,
      address: values.address,
      city: values.city,
      state: values.state,
      pincode: values.pincode,
      contact_name: values.contact_name,
      contact_email: values.contact_email,
      contact_phone: values.contact_phone,
      registration_number: values.registration_number || undefined,
      latitude: values.latitude ? Number(values.latitude) : null,
      longitude: values.longitude ? Number(values.longitude) : null,
    };
    isEdit ? updateMutation.mutate(payload) : createMutation.mutate(payload);
  };

  const busy = isSubmitting || createMutation.isPending || updateMutation.isPending;
  const mutationError = createMutation.error || updateMutation.error;

  if (isEdit && isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{isEdit ? "Edit Venue" : "New Venue"}</h1>
          {isEdit && <p className="text-sm text-gray-400">{slug}</p>}
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Basic Info</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Field label="Venue Name" error={errors.name?.message}>
              <Input placeholder="e.g. Terminal 2 Airport" {...register("name")} />
            </Field>
            <Field label="Venue Type" error={errors.venue_type?.message}>
              <Select {...register("venue_type")}>
                <option value="">Select type…</option>
                {typesData?.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </Select>
            </Field>
            <Field label="Registration Number (optional)" error={errors.registration_number?.message}>
              <Input placeholder="Company/venue registration" {...register("registration_number")} />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Address</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Field label="Street Address" error={errors.address?.message}>
              <Input placeholder="123 Main Street, Floor 2" {...register("address")} />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="City" error={errors.city?.message}>
                <Input placeholder="Mumbai" {...register("city")} />
              </Field>
              <Field label="State" error={errors.state?.message}>
                <Input placeholder="Maharashtra" {...register("state")} />
              </Field>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <Field label="Pincode" error={errors.pincode?.message}>
                <Input placeholder="400001" {...register("pincode")} />
              </Field>
              <Field label="Latitude" error={errors.latitude?.message}>
                <Input type="number" step="any" placeholder="19.0760" {...register("latitude")} />
              </Field>
              <Field label="Longitude" error={errors.longitude?.message}>
                <Input type="number" step="any" placeholder="72.8777" {...register("longitude")} />
              </Field>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Contact</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Field label="Contact Person" error={errors.contact_name?.message}>
              <Input placeholder="John Doe" {...register("contact_name")} />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Email" error={errors.contact_email?.message}>
                <Input type="email" placeholder="contact@venue.com" {...register("contact_email")} />
              </Field>
              <Field label="Phone" error={errors.contact_phone?.message}>
                <Input placeholder="+91 98765 43210" {...register("contact_phone")} />
              </Field>
            </div>
          </CardContent>
        </Card>

        {mutationError && (
          <p className="text-sm text-red-600">
            {(mutationError as Error).message || "Something went wrong."}
          </p>
        )}

        <div className="flex gap-3">
          <Button type="submit" disabled={busy}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEdit ? "Save Changes" : "Create Venue"}
          </Button>
          <Button type="button" variant="secondary" onClick={() => navigate("/venues")}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
