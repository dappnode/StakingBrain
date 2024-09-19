import { createErrorFactory } from "./createErrorFactory.js";

export const ApiError = createErrorFactory("ApiError");
export const BrainDbError = createErrorFactory("BrainDbError");
export const CronError = createErrorFactory("CronError");
