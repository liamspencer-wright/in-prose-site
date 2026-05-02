import { serialiseSchemas } from "./schema";

type Props = {
  schemas: unknown[];
  /** Optional id suffix for the <script> tag — useful when multiple groups are emitted. */
  id?: string;
};

/**
 * Renders one or more JSON-LD schema objects inside a single <script> tag.
 * Multiple schemas are wrapped in `@graph` so a single parse covers them all.
 */
export function JsonLd({ schemas, id }: Props) {
  if (schemas.length === 0) return null;
  return (
    <script
      type="application/ld+json"
      id={id}
      dangerouslySetInnerHTML={{ __html: serialiseSchemas(schemas) }}
    />
  );
}
