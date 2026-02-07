// =====================================================
// Editor Type Definitions
// =====================================================

// Block types
export type BlockType =
  | "paragraph"
  | "table"
  | "divider"
  | "input"
  | "image"
  | "timetable"
  | "dataTable";

// Cell types
export type CellType =
  | "paragraph"
  | "data"
  | "time"
  | "timeRange"
  | "checkbox"
  | "input"
  | "select";

// Form types
export type FormType = "timetable" | "syllabus" | "print" | "other";

// =====================================================
// Style-related types
// =====================================================

export type TextAlign = "left" | "center" | "right";

export type BorderStyle =
  | "solid"
  | "dotted"
  | "dashed"
  | "double"
  | "groove"
  | "ridge"
  | "inset"
  | "outset"
  | "none"
  | "hidden";

export interface StyleProps {
  fontSize?: string;
  fontWeight?: number;
  textAlign?: TextAlign;
  borderWidth?: number;
  borderColor?: string;
  borderStyle?: BorderStyle | string;
  borderRadius?: string;
  backgroundColor?: string;
}

// =====================================================
// Cell types
// =====================================================

export interface SelectOption {
  id: string;
  text: string;
  value: string;
}

export type DataTextElement =
  | string
  | { tag: "DATA"; location: string }
  | { tag: "BR" };

export interface CellData extends StyleProps {
  id: string;
  type: CellType;
  data?: { text?: string };
  align?: TextAlign;
  isHeader?: boolean;
  colSpan?: number;
  rowSpan?: number;
  // checkbox
  name?: string;
  checked?: boolean;
  timeRangeStart?: string;
  timeRangeEnd?: string;
  // input
  placeholder?: string;
  required?: boolean;
  // select
  options?: SelectOption[];
  // data
  dataText?: DataTextElement[];
}

// =====================================================
// Data connection types
// =====================================================

export interface DataRepeatConfig {
  by: string;
  index: number;
  max: number;
}

export interface FilterConfig {
  key: string;
  by: string;
  operator: "===" | "!==";
  value: string;
  cell?: string;
}

export interface OrderConfig {
  key: string;
  by: string;
  priority: string;
  order: "asc" | "desc";
}

// =====================================================
// Block data types
// =====================================================

export interface ParagraphBlockData {
  text?: string;
  fontSize?: string;
  fontWeight?: number;
  textAlign?: TextAlign;
  width?: number;
}

export interface TableBlockData extends StyleProps {
  columns: number[];
  table: CellData[][];
  width?: number;
  align?: string;
  // Data connection
  dataRepeat?: DataRepeatConfig;
  dataFilter?: FilterConfig[];
  dataOrFilter?: FilterConfig[];
  dataCellFilter?: FilterConfig[];
  dataOrder?: OrderConfig[];
}

export interface DividerBlockData {
  width?: number;
}

export interface InputBlockData {
  name?: string;
  label?: string;
  placeholder?: string;
  required?: boolean;
  fontSize?: string;
  fontWeight?: number;
  width?: number;
}

export interface ImageBlockData {
  src?: string;
  alt?: string;
  width?: number;
  alignment?: TextAlign;
  caption?: string;
}

export interface DataTableBlockData {
  dataTableFrom?: string;
  dataTableColumns?: number[];
  dataTableHeaders?: string[];
  dataTableBody?: string[];
  width?: number;
}

export interface TimeTableBlockData {
  width?: number;
}

export type BlockData =
  | ParagraphBlockData
  | TableBlockData
  | DividerBlockData
  | InputBlockData
  | ImageBlockData
  | DataTableBlockData
  | TimeTableBlockData;

// =====================================================
// Editor block
// =====================================================

export interface EditorBlock {
  id: string;
  type: BlockType;
  data: BlockData;
}

// =====================================================
// Editor store types
// =====================================================

export interface CellPosition {
  row: number;
  col: number;
}

export interface CellRange {
  start: CellPosition;
  end: CellPosition;
}

export interface EditorState {
  // Metadata
  formId: string;
  title: string;
  formType: FormType;

  // Mode
  mode: "edit" | "preview";

  // Block data
  blocks: EditorBlock[];

  // Selection state
  selectedBlockId: string | null;
  selectedCellPosition: CellPosition | null;
  selectedCellRange: CellRange | null;
  isDraggingCells: boolean;

  // Undo/Redo
  history: string[];
  future: string[];
  maxHistory: number;

  // UI state
  sidebarOpen: boolean;

  // Loading
  isLoading: boolean;
  isSaving: boolean;
}

export interface EditorActions {
  // Initialization
  loadForm: (formId: string, FormAPI: any) => Promise<void>;
  saveForm: (FormAPI: any) => Promise<void>;

  // Title
  setTitle: (title: string) => void;

  // Mode
  setMode: (mode: "edit" | "preview") => void;
  toggleMode: () => void;

  // Sidebar
  toggleSidebar: () => void;

  // Selection
  selectBlock: (blockId: string | null) => void;
  selectCell: (position: CellPosition | null, blockId?: string) => void;
  selectCellRange: (range: CellRange | null) => void;
  startCellDrag: (position: CellPosition, blockId?: string) => void;
  updateCellDrag: (position: CellPosition) => void;
  endCellDrag: () => void;
  getSelectedCells: () => CellPosition[];
  updateSelectedCells: (blockId: string, data: Partial<CellData>) => void;

  // Block operations
  addBlock: (params: {
    blockType: BlockType;
    insertAfterIndex?: number;
    blockData?: any;
  }) => void;
  removeBlock: (blockId: string) => void;
  moveBlock: (fromIndex: number, toIndex: number) => void;
  duplicateBlock: (blockId: string) => void;
  updateBlockData: (blockId: string, data: Partial<BlockData>) => void;

  // Cell operations
  updateCell: (
    blockId: string,
    row: number,
    col: number,
    data: Partial<CellData>
  ) => void;
  saveCell: (
    blockIndex: number,
    row: number,
    col: number,
    data: Partial<CellData>
  ) => void;
  changeCellType: (
    blockId: string,
    row: number,
    col: number,
    newType: CellType
  ) => void;
  setCellColumn: (blockId: string, colIndex: number, ratio: number) => void;
  addRow: (blockId: string, afterRow: number) => void;
  addColumn: (blockId: string, afterCol: number) => void;
  insertColumnBefore: (blockId: string, beforeCol: number) => void;
  removeRow: (blockId: string, row: number) => void;
  removeColumn: (blockId: string, col: number) => void;

  // Undo/Redo
  undo: () => void;
  redo: () => void;
  saveSnapshot: () => void;

  // Getters
  getBlock: (blockId: string) => EditorBlock | undefined;
  getBlockByIndex: (index: number) => EditorBlock | undefined;
  getBlockIndex: (blockId: string) => number;
  getSelectedBlock: () => EditorBlock | undefined;
  getSelectedCell: () => CellData | null;
  getCellColumn: (blockId: string, colIndex: number) => number;
}

export type EditorStore = EditorState & EditorActions;

// =====================================================
// Component prop types
// =====================================================

export interface BlockProps {
  blockId: string;
  index: number;
}

export interface CellProps {
  blockId: string;
  blockIndex: number;
  row: number;
  column: number;
}

export interface SidebarPanelProps {
  blockId: string;
}
