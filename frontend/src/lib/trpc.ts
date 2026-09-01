import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "../../../backend/server/routers";

export const trpc = createTRPCReact<AppRouter>();
