import type { usePagedQuery } from '@/lib/paged-query';
import type { UseQueryResult } from '@tanstack/react-query';
import type { Dispatch, ReactNode, SetStateAction } from 'react';
import type { AppContext } from '../app-context';
import type { Data, Field } from '../ui';
export type AdminViewProps = {
    path: string;
    ctx: AppContext;
    data: ReturnType<typeof usePagedQuery<Data>>;
    channelQ: UseQueryResult<Data[], Error>;
    ledger: UseQueryResult<Data[], Error>;
    rowData: Data[];
    page: number;
    setPage: Dispatch<SetStateAction<number>>;
    tab: string;
    setTab: Dispatch<SetStateAction<string>>;
    search: string;
    setSearch: Dispatch<SetStateAction<string>>;
    actionBusy: boolean;
    dialog: (title: string, fields: Field[], endpoint: string, initial?: Data, method?: string, extra?: Data) => void;
    event: (endpoint: string, action: string) => Promise<void>;
    common: {
        label: string;
        render: (r: Data) => ReactNode;
    }[];
    pager: ReactNode;
};
