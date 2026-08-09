import * as z from "zod";

/**
 * Convert a Zod schema into the JSON Schema Groq's strict mode expects.
 *
 * Zod 4 already emits `required` for every non-optional field and
 * `additionalProperties: false` on objects — both mandatory under strict mode —
 * and turns `.describe()` into `description`, so the field notes written for the
 * model travel with the schema.
 *
 * The only fix-up needed is dropping `$schema`: Groq validates the object it is
 * given, and a dialect declaration is not part of what it accepts.
 */
export function toGroqSchema(schema: z.ZodType): Record<string, unknown> {
  const generated = z.toJSONSchema(schema) as Record<string, unknown>;
  delete generated.$schema;
  return generated;
}
