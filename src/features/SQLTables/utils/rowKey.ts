import type { TableDataRow } from "../types";

export const getRowKey = (row: TableDataRow, primaryKeys: string[]): string => {
    if (!primaryKeys.length) {
        return "";
    }
    return primaryKeys.map((key) => String(row[key])).join("-");
};

