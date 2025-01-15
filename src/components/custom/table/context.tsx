import { Table } from "@tanstack/react-table";
import { DataTableProps } from "./types/new";
import React from "react";
import { SanitizedOptions } from "./data-table-new";

export interface TableContext extends DataTableProps<any> {
  table: Table<any>;
  options: SanitizedOptions;
}

interface TableProviderProps extends TableContext {
  children: React.ReactNode;
}

export const TableContext = React.createContext<TableContext>({} as TableContext);

export const TableProvider = ({ children, ...props }: TableProviderProps) => {
  return (<TableContext.Provider value={props}>{children}</TableContext.Provider>);
}


export const useTableContext = () => React.useContext(TableContext);

const createTableContext = () => {
  const TableContext = React.createContext<TableContext>({} as TableContext);
  const TableProvider = ({ children, ...props }: TableProviderProps) => {
    console.log('context created', props.options)

    return (<TableContext.Provider value={props}>{children}</TableContext.Provider>);
  }


  const useTableContext = () => React.useContext(TableContext);
  return { TableContext, TableProvider, useTableContext };
}

export default createTableContext;

