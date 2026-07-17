import { z } from "zod";

export const eventFormSchema = z.object({
  title: z.string().min(3).max(120),
  slug: z
    .string()
    .min(3)
    .max(80)
    .regex(/^[a-z0-9-]+$/),
  venue: z.string().min(2).max(120),
  address: z.string().min(5).max(200),
  city: z.string().min(2).max(80),
  startsAt: z.string().min(1),
  endsAt: z.string().min(1),
  capacityMen: z.coerce.number().int().min(1).max(500),
  capacityWomen: z.coerce.number().int().min(1).max(500),
  priceCents: z.coerce.number().int().min(0),
  status: z.enum(["draft", "published", "sold_out", "live", "closed"]),
  earlyAccessUntil: z.string().optional().or(z.literal("")),
});

export type EventFormValues = z.infer<typeof eventFormSchema>;
