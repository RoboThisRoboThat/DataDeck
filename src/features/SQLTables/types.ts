export interface TableDataRow {
    [key: string]: unknown;
}

export interface OpenTable {
    name: string;
    data: TableDataRow[];
    columns: string[];
    totalRows: number;
}

export interface SortConfig {
    column: string;
    direction: 'asc' | 'desc' | null;
}

export interface FilterCondition {
    operator: string;
    value: string;
}

export interface Filters {
    [key: string]: FilterCondition;
}

export interface MenuState {
    anchor: HTMLElement | null;
    column: string;
    type: 'filter' | null;
}

export interface PaginationState {
    page: number;
    rowsPerPage: number;
}



export const FILTER_OPERATOR_LABELS = {
    '=': 'Equal to',
    '>': 'Greater than',
    '>=': 'Greater than or equal to',
    '<': 'Less than',
    '<=': 'Less than or equal to',
    'LIKE': 'Contains',
    'NOT LIKE': 'Does not contain',
    'IN': 'In list',
    'NOT IN': 'Not in list',
    'IS NULL': 'Is empty',
    'IS NOT NULL': 'Is not empty'
};

export type FilterOperator = keyof typeof FILTER_OPERATOR_LABELS;

export const FILTER_OPERATORS: FilterOperator[] = Object.keys(FILTER_OPERATOR_LABELS) as FilterOperator[];