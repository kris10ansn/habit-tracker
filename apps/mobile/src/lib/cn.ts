import { twMerge } from "tailwind-merge";

/** @deprecated use twMerge instead */
export const cn = (...parts: (string | false | null | undefined)[]): string =>
    twMerge(...parts);
