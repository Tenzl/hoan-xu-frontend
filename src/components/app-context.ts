import type { User } from "@/lib/api";
import type { Data, Field } from "./ui";
export type Dialog = {
    title: string;
    fields: Field[];
    initial?: Data;
    submit: string;
    action: (v: Data) => Promise<void>;
};
export type AppContext = {
    me?: User;
    config: Data;
    act: (path: string, method?: string, body?: unknown) => Promise<any>;
    notify: (s: string) => void;
    dialog: (d: Dialog | null) => void;
};
