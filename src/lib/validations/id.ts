import { z } from "zod";

// The largest Postgres `integer`: a bigger id would make the query fail instead of finding nothing.
const MAX_ID = 2_147_483_647;

/** A row id as forms and URLs send it (a string). */
export const idSchema = z.coerce.number().int().positive().max(MAX_ID);
