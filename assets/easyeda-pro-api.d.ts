declare global {
	enum EDMT_ItemType {
		 WORKSPACE = 'Workspace',
		 TEAM = 'Team',
		 FOLDER = 'Folder',
		 PROJECT = 'Project',
		 CBB_PROJECT = 'CBB Project',
		 BOARD = 'Board',
		 SCHEMATIC = 'Schematic',
		 CBB_SCHEMATIC = 'CBB Schematic',
		 SCHEMATIC_PAGE = 'Schematic Page',
		 PCB = 'PCB',
		 CBB_PCB = 'CBB PCB',
		 PANEL = 'Panel',
	}
	interface IDMT_SchematicPageItem {
		readonly itemType: EDMT_ItemType.SCHEMATIC_PAGE;
		uuid: string;
		name: string;
		parentSchematicUuid: string;
		showTitleBlock: boolean;
		titleBlockData: Record<string, { showTitle: boolean; showValue: boolean; value: any }>;
	}
	enum ELIB_LibraryType {
		 DEVICE = '3',
		 SYMBOL = '2',
		 FOOTPRINT = '4',
		 CBB = '1',
		 MODEL = '5',
		 PANEL_LIBRARY = '29',
		 SIMULATION_MODEL_NGSPICE = '32',
		 SIMULATION_MODEL_SIMULIDE = '33',
	}
	interface ILIB_ClassificationIndex {
		libraryUuid: string;
		libraryType: ELIB_LibraryType;
		primaryClassificationUuid: string;
		secondaryClassificationUuid?: string;
	}
	enum ELIB_SymbolType {
		 COMPONENT = 2,
		 NET_FLAG = 18,
		 NET_PORT = 19,
		 DRAWING = 20,
		 NON_ELECTRICAL = 21,
		 SHORT_CIRCUIT_FLAG = 22,
		 OFF_PAGE_CONNECTOR = 25,
		 DIFFERENTIAL_PAIRS_FLAG = 31,
		 CBB_SYMBOL = 17,
	}
	interface ILIB_SymbolItem {
		readonly libraryType: ELIB_LibraryType.SYMBOL;
		uuid: string;
		libraryUuid: string;
		cbbUuid?: string;
		name: string;
		classification?: ILIB_ClassificationIndex | Array<string>;
		type: ELIB_SymbolType;
		description?: string;
		subPartNames: Array<string>;
		otherProperty?: Record<string, boolean | number | string | undefined>;
	}
	interface IDMT_SchematicItem {
		readonly itemType: EDMT_ItemType.SCHEMATIC | EDMT_ItemType.CBB_SCHEMATIC;
		uuid: string;
		name: string;
		page: Array<IDMT_SchematicPageItem>;
		parentProjectUuid: string;
		parentBoardName?: string;
		cbbSymbol?: ILIB_SymbolItem;
	}
	interface IDMT_PcbItem {
		readonly itemType: EDMT_ItemType.PCB | EDMT_ItemType.CBB_PCB;
		uuid: string;
		name: string;
		parentProjectUuid: string;
		parentBoardName?: string;
	}
	interface IDMT_BoardItem {
		readonly itemType: EDMT_ItemType.BOARD;
		name: string;
		schematic: IDMT_SchematicItem;
		pcb: IDMT_PcbItem;
		parentProjectUuid: string;
	}
	class DMT_Board {
		public createBoard(schematicUuid?: string, pcbUuid?: string): Promise<string | undefined>;
		public modifyBoardName(originalBoardName: string, boardName: string): Promise<boolean>;
		public copyBoard(sourceBoardName: string): Promise<string | undefined>;
		public getBoardInfo(boardName: string): Promise<IDMT_BoardItem | undefined>;
		public getAllBoardsInfo(): Promise<Array<IDMT_BoardItem>>;
		public getCurrentBoardInfo(): Promise<IDMT_BoardItem | undefined>;
		public deleteBoard(boardName: string): Promise<boolean>;
	}
	enum EDMT_EditorDocumentType {
		 HOME = -1,
		 BLANK = 0,
		 PROJECT = 5,
		 SCHEMATIC_PAGE = 1,
		 PCB = 3,
		 PCB_2D_PREVIEW = 12,
		 PCB_3D_PREVIEW = 15,
		 PANEL = 26,
		 PANEL_3D_PREVIEW = 27,
		 SYMBOL_COMPONENT = 2,
		 SYMBOL_NET_FLAG = 18,
		 SYMBOL_NET_PORT = 19,
		 SYMBOL_DRAWING = 20,
		 SYMBOL_NON_ELECTRICAL = 21,
		 SYMBOL_SHORT_CIRCUIT_FLAG = 22,
		 SYMBOL_OFF_PAGE_CONNECTOR_FLAG = 25,
		 SYMBOL_CBB = 17,
		 FOOTPRINT = 4,
		 PANEL_LIBRARY = 29,
		 SIMULATION_SCHEMATIC_PAGE_NGSPICE = 8,
		 SIMULATION_SCHEMATIC_PAGE_SIMULIDE = 9,
		 SIMULATION_SYMBOL_COMPONENT_NGSPICE = 7,
		 SIMULATION_SYMBOL_COMPONENT_SIMULIDE = 32,
	}
	interface IDMT_EditorTabItem {
		title: string;
		tabId: string;
		documentType: EDMT_EditorDocumentType;
		draggable: boolean;
		isAbleDelete: boolean;
		notUseI18n?: boolean;
	}
	enum EDMT_EditorSplitScreenDirection {
		 HORIZONTAL = 'horizontal',
		 VERTICAL = 'vertical',
	}
	interface IDMT_EditorSplitScreenItem {
		id: string;
		fatherId?: string;
		tabs?: Array<IDMT_EditorTabItem>;
		direction?: EDMT_EditorSplitScreenDirection;
		children?: Array<IDMT_EditorSplitScreenItem>;
	}
	enum EDMT_IndicatorMarkerType {
		 POINT = 'point',
		 CIRCLE = 'circle',
		 LINE = 'line',
		 ARC = 'arc',
		 RECTANGLE = 'rectangle',
	}
	interface IDMT_IndicatorMarkerShape {
		type: EDMT_IndicatorMarkerType;
		x?: number;
		y?: number;
		r?: number;
		startX?: number;
		startY?: number;
		endX?: number;
		endY?: number;
		top?: number;
		bottom?: number;
		left?: number;
		right?: number;
		angle?: number;
	}
	enum EDMT_ProjectReadyState {
		 NOT_LOADED = 'notLoaded',
		 LOADING = 'loading',
		 READY = 'ready',
		 FAILED = 'failed',
	}
	class DMT_EditorControl {
		public openDocument(documentUuid: string, splitScreenId?: string): Promise<string | undefined>;
		public openLibraryDocument(libraryUuid: string, libraryType: ELIB_LibraryType.SYMBOL | ELIB_LibraryType.FOOTPRINT, uuid: string, splitScreenId?: string): Promise<string | undefined>;
		public closeDocument(tabId: string): Promise<boolean>;
		public getSplitScreenTree(): Promise<IDMT_EditorSplitScreenItem | undefined>;
		public getSplitScreenIdByTabId(tabId: string): Promise<string | undefined>;
		public getTabsBySplitScreenId(splitScreenId: string): Promise<Array<IDMT_EditorTabItem>>;
		public createSplitScreen(splitScreenType: EDMT_EditorSplitScreenDirection, tabId: string): Promise<{ sourceSplitScreenId: string; newSplitScreenId: string } | undefined>;
		public moveDocumentToSplitScreen(tabId: string, splitScreenId: string): Promise<boolean>;
		public activateDocument(tabId: string): Promise<boolean>;
		public activateSplitScreen(splitScreenId: string): Promise<boolean>;
		public tileAllDocumentToSplitScreen(): Promise<boolean>;
		public mergeAllDocumentFromSplitScreen(): Promise<boolean>;
		public getCurrentRenderedAreaImage(tabId?: string): Promise<Blob | undefined>;
		public zoomToRegion(left: number, right: number, top: number, bottom: number, tabId?: string): Promise<boolean>;
		public zoomTo(x?: number, y?: number, scaleRatio?: number, tabId?: string): Promise<{ left: number; right: number; top: number; bottom: number } | false>;
		public zoomToAllPrimitives(tabId?: string): Promise<{ left: number; right: number; top: number; bottom: number } | false>;
		public zoomToSelectedPrimitives(tabId?: string): Promise<{ left: number; right: number; top: number; bottom: number } | false>;
		public zoom(percent: number, tabId?: string): { left: number; right: number; top: number; bottom: number } | false;
		public generateIndicatorMarkers(markers: Array<IDMT_IndicatorMarkerShape>, color?: { r: number; g: number; b: number; alpha: number }, lineWidth?: number, zoom?: boolean, tabId?: string): Promise<boolean>;
		public removeIndicatorMarkers(tabId?: string): Promise<boolean>;
		public waitForDocumentReady(documentUuidOrTabId: string, timeoutMs?: number): Promise<boolean>;
		public getDocumentReadyState(documentUuidOrTabId: string): Promise<EDMT_ProjectReadyState>;
	}
	enum EDMT_EditorTabEventType {
		 TOGGLE = 'toggle',
		 CLOSE = 'close',
		 OPEN = 'open',
	}
	class DMT_Event {
		private extensionUuid?: string;
		public constructor(extensionUuid?: string);
		public addEditorTabEventListener(id: string, eventType: 'all' | EDMT_EditorTabEventType, callFn: (eventType: EDMT_EditorTabEventType, props: { documentType: EDMT_EditorDocumentType; title: string; tabId: string }) => void | Promise<void>, onlyOnce?: boolean): void;
		public removeEventListener(id: string): boolean;
		public isEventListenerAlreadyExist(id: string): boolean;
	}
	interface IDMT_FolderItem {
		readonly itemType: EDMT_ItemType.FOLDER;
		uuid: string;
		name: string;
		teamUuid: string;
		description?: string;
		parentFolderUuid: string;
		childrenFoldersUuid?: Array<string>;
	}
	class DMT_Folder {
		public createFolder(folderName: string, teamUuid: string, parentFolderUuid?: string, description?: string): Promise<string | undefined>;
		public modifyFolderName(teamUuid: string, folderUuid: string, folderName: string): Promise<boolean>;
		public modifyFolderDescription(teamUuid: string, folderUuid: string, description?: string): Promise<boolean>;
		public moveFolderToFolder(teamUuid: string, folderUuid: string, parentFolderUuid?: string): Promise<boolean>;
		public getAllFoldersUuid(teamUuid: string): Promise<Array<string>>;
		public getFolderInfo(teamUuid: string, folderUuid: string): Promise<IDMT_FolderItem | undefined>;
		public deleteFolder(teamUuid: string, folderUuid: string): Promise<boolean>;
	}
	interface IDMT_PanelItem {
		readonly itemType: EDMT_ItemType.PANEL;
		uuid: string;
		name: string;
		parentProjectUuid: string;
	}
	class DMT_Panel {
		public createPanel(): Promise<string | undefined>;
		public modifyPanelName(panelUuid: string, panelName: string): Promise<boolean>;
		public copyPanel(panelUuid: string): Promise<string | undefined>;
		public getPanelInfo(panelUuid: string): Promise<IDMT_PanelItem | undefined>;
		public getAllPanelsInfo(): Promise<Array<IDMT_PanelItem>>;
		public getCurrentPanelInfo(): Promise<IDMT_PanelItem | undefined>;
		public deletePanel(panelUuid: string): Promise<boolean>;
	}
	class DMT_Pcb {
		public createPcb(boardName?: string): Promise<string | undefined>;
		public modifyPcbName(pcbUuid: string, pcbName: string): Promise<boolean>;
		public copyPcb(pcbUuid: string, boardName?: string): Promise<string | undefined>;
		public getPcbInfo(pcbUuid: string): Promise<IDMT_PcbItem | undefined>;
		public getAllPcbsInfo(): Promise<Array<IDMT_PcbItem>>;
		public getCurrentPcbInfo(): Promise<IDMT_PcbItem | undefined>;
		public deletePcb(pcbUuid: string): Promise<boolean>;
	}
	enum EDMT_ProjectCollaborationMode {
		 STRICT = 3,
		 FREE = 1,
	}
	enum EDMT_ProjectFileFormat {
		 EPRJ2 = 'eprj2',
		 EPRJ3 = 'eprj3',
	}
	interface IDMT_BriefProjectItem {
		readonly itemType: EDMT_ItemType.PROJECT | EDMT_ItemType.CBB_PROJECT;
		uuid: string;
		friendlyName: string;
		teamUuid: string;
		folderUuid?: string;
	}
	interface IDMT_ProjectItem extends IDMT_BriefProjectItem {
		name: string;
		description?: string;
		data: Array<IDMT_BoardItem | IDMT_SchematicItem | IDMT_PcbItem | IDMT_PanelItem>;
		collaborationMode?: EDMT_ProjectCollaborationMode;
	}
	class DMT_Project {
		public openProject(projectUuid: string): Promise<boolean>;
		public createProject(projectFriendlyName: string, projectName?: string, teamUuid?: string, folderUuid?: string, description?: string, collaborationMode?: EDMT_ProjectCollaborationMode, fileFormat?: EDMT_ProjectFileFormat): Promise<string | undefined>;
		public modifyProjectFriendlyName(projectUuid: string, projectFriendlyName: string): boolean;
		public modifyProjectDescription(projectUuid: string, description?: string): boolean;
		public modifyProjectCollaborationMode(projectUuid: string, collaborationMode: EDMT_ProjectCollaborationMode): boolean;
		public moveProject(projectUuid: string, teamUuid: string, folderUuid?: string): boolean;
		public moveProjectToFolder(projectUuid: string, folderUuid?: string): Promise<boolean>;
		public copyProject(sourceProjectUuid: string, targetTeamUuid?: string, targetFolderUuid?: string, newProjectFriendlyName?: string, newProjectName?: string): string | undefined;
		public getAllProjectsUuid(teamUuid?: string, folderUuid?: string, workspaceUuid?: string): Promise<Array<string>>;
		public getProjectInfo(projectUuid: string): Promise<IDMT_BriefProjectItem | undefined>;
		public getCurrentProjectInfo(): Promise<IDMT_ProjectItem | undefined>;
		public deleteProject(projectUuid: string): boolean;
		public waitForReady(projectUuid?: string, timeoutMs?: number): Promise<boolean>;
		public getReadyState(projectUuid?: string): Promise<EDMT_ProjectReadyState>;
	}
	class DMT_Schematic {
		public createSchematic(boardName?: string): Promise<string | undefined>;
		public createSchematicPage(schematicUuid: string): Promise<string | undefined>;
		public modifySchematicName(schematicUuid: string, schematicName: string): Promise<boolean>;
		public modifySchematicPageName(schematicPageUuid: string, schematicPageName: string): Promise<boolean>;
		public modifySchematicPageTitleBlock(showTitleBlock?: boolean, titleBlockData?: Record<string, { showTitle: boolean; showValue: boolean; value?: any }>): Promise<boolean>;
		public copySchematic(schematicUuid: string, boardName?: string): Promise<string | undefined>;
		public copySchematicPage(schematicPageUuid: string, schematicUuid?: string): Promise<string | undefined>;
		public getSchematicInfo(schematicUuid: string): Promise<IDMT_SchematicItem | undefined>;
		public getSchematicPageInfo(schematicPageUuid: string): Promise<IDMT_SchematicPageItem | undefined>;
		public getAllSchematicsInfo(): Promise<Array<IDMT_SchematicItem>>;
		public getAllSchematicPagesInfo(): Promise<Array<IDMT_SchematicPageItem>>;
		public getCurrentSchematicAllSchematicPagesInfo(): Promise<Array<IDMT_SchematicPageItem>>;
		public getCurrentSchematicInfo(): Promise<IDMT_SchematicItem | undefined>;
		public getCurrentSchematicPageInfo(): Promise<IDMT_SchematicPageItem | undefined>;
		public reorderSchematicPages(schematicUuid: string, schematicPageItemsArray: Array<IDMT_SchematicPageItem>): Promise<boolean>;
		public deleteSchematic(schematicUuid: string): Promise<boolean>;
		public deleteSchematicPage(schematicPageUuid: string): Promise<boolean>;
	}
	interface IDMT_EditorDocumentItem {
		documentType: EDMT_EditorDocumentType;
		uuid: string;
		tabId: string;
		parentProjectUuid?: string;
		parentLibraryUuid?: string;
	}
	class DMT_SelectControl {
		public getCurrentDocumentInfo(): Promise<IDMT_EditorDocumentItem | undefined>;
	}
	interface IDMT_SourceBoardAddOptions {
		projectId: string;
		boardName?: string;
	}
	enum ESCH_SourceErrorCode {
		 PROJECT_NOT_FOUND = 'PROJECT_NOT_FOUND',
		 SCHEMATIC_NOT_FOUND = 'SCHEMATIC_NOT_FOUND',
		 BOARD_NOT_FOUND = 'BOARD_NOT_FOUND',
		 PCB_NOT_FOUND = 'PCB_NOT_FOUND',
		 PAGE_NOT_FOUND = 'PAGE_NOT_FOUND',
		 PRIMITIVE_NOT_FOUND = 'PRIMITIVE_NOT_FOUND',
		 PRIMITIVE_TYPE_MISMATCH = 'PRIMITIVE_TYPE_MISMATCH',
		 DEVICE_NOT_FOUND = 'DEVICE_NOT_FOUND',
		 DEVICE_AMBIGUOUS = 'DEVICE_AMBIGUOUS',
		 DUPLICATE_DESIGNATOR = 'DUPLICATE_DESIGNATOR',
		 DESIGNATOR_INVALID = 'DESIGNATOR_INVALID',
		 ATTRIBUTE_KEY_NOT_FOUND = 'ATTRIBUTE_KEY_NOT_FOUND',
		 PIN_NOT_FOUND = 'PIN_NOT_FOUND',
		 WIRE_GEOMETRY_INVALID = 'WIRE_GEOMETRY_INVALID',
		 NET_NOT_FOUND = 'NET_NOT_FOUND',
		 REGION_INVALID = 'REGION_INVALID',
		 PARAM_REQUIRED = 'PARAM_REQUIRED',
		 PARAM_CONFLICT = 'PARAM_CONFLICT',
		 PARAM_INVALID = 'PARAM_INVALID',
		 REPLACE_REJECTED = 'REPLACE_REJECTED',
		 GROUP_NOT_FOUND = 'GROUP_NOT_FOUND',
		 NET_CONFLICT = 'NET_CONFLICT',
		 NO_CONNECT_BLOCKED = 'NO_CONNECT_BLOCKED',
		 INTERNAL_ERROR = 'INTERNAL_ERROR',
		 NOT_IMPLEMENTED = 'NOT_IMPLEMENTED',
	}
	interface ISCH_SourceError {
		code: ESCH_SourceErrorCode;
		message: string;
	}
	type TSCH_SourceResult<T> = { ok: true; value: T } | { ok: false; error: ISCH_SourceError };
	interface IDMT_SourceBoardAddResult {
		boardName: string;
		schematicName: string;
		pcbName: string;
	}
	interface IDMT_SourceBoardGetOptions {
		projectId: string;
		boardName: string;
	}
	interface IDMT_SourceBoardGetAllOptions {
		projectId: string;
	}
	interface IDMT_SourceBoardRemoveOptions {
		projectId: string;
		boardName: string;
	}
	interface IDMT_SourceBoardRemoveResult {
		boardName: string;
	}
	class DMT_SourceBoard {
		public addBoard(options: IDMT_SourceBoardAddOptions): Promise<TSCH_SourceResult<IDMT_SourceBoardAddResult>>;
		public getBoard(options: IDMT_SourceBoardGetOptions): Promise<TSCH_SourceResult<IDMT_BoardItem>>;
		public getAllBoards(options: IDMT_SourceBoardGetAllOptions): Promise<TSCH_SourceResult<Array<IDMT_BoardItem>>>;
		public removeBoard(options: IDMT_SourceBoardRemoveOptions): Promise<TSCH_SourceResult<IDMT_SourceBoardRemoveResult>>;
	}
	interface IDMT_SourcePcbAddOptions {
		projectId: string;
		pcbName?: string;
		boardName?: string;
	}
	interface IDMT_SourcePcbAddResult {
		pcbName: string;
	}
	interface IDMT_SourcePcbUpdateOptions {
		projectId: string;
		pcbName: string;
		newPcbName?: string;
	}
	interface IDMT_SourcePcbUpdateResult {
		pcbName: string;
	}
	interface IDMT_SourcePcbRemoveOptions {
		projectId: string;
		pcbName: string;
	}
	interface IDMT_SourcePcbRemoveResult {
		pcbName: string;
	}
	class DMT_SourcePcb {
		public addPcb(options: IDMT_SourcePcbAddOptions): Promise<TSCH_SourceResult<IDMT_SourcePcbAddResult>>;
		public updatePcb(options: IDMT_SourcePcbUpdateOptions): Promise<TSCH_SourceResult<IDMT_SourcePcbUpdateResult>>;
		public removePcb(options: IDMT_SourcePcbRemoveOptions): Promise<TSCH_SourceResult<IDMT_SourcePcbRemoveResult>>;
	}
	interface IDMT_SourceProjectVirtualOpenOptions {
		projectId?: string;
		cPath?: string;
	}
	type TDMT_SourceProjectDocumentTree = Array<IDMT_BoardItem | IDMT_SchematicItem | IDMT_PcbItem | IDMT_PanelItem>;
	interface IDMT_SourceProjectVirtualOpenResult {
		projectId: string;
		documentTree: TDMT_SourceProjectDocumentTree;
	}
	interface IDMT_SourceProjectCloseVirtualOptions {
		projectId: string;
	}
	interface IDMT_SourceProjectCloseVirtualResult {
		projectId: string;
	}
	interface IDMT_SourceProjectVirtualOpenedItem {
		projectId: string;
		name?: string;
		friendlyName?: string;
	}
	class DMT_SourceProject {
		public virtualOpenProject(options: IDMT_SourceProjectVirtualOpenOptions): Promise<TSCH_SourceResult<IDMT_SourceProjectVirtualOpenResult>>;
		public closeVirtualProject(options: IDMT_SourceProjectCloseVirtualOptions): Promise<TSCH_SourceResult<IDMT_SourceProjectCloseVirtualResult>>;
		public getAllVirtualOpenedProjects(): Promise<TSCH_SourceResult<Array<IDMT_SourceProjectVirtualOpenedItem>>>;
	}
	interface IDMT_SourceSchematicGrid {
		x: number;
		y: number;
	}
	interface IDMT_SourceSchematicUpdatePageOptions {
		projectId: string;
		schematicName: string;
		pageName: string;
		newPageName?: string;
		newSchematicName?: string;
		grid?: IDMT_SourceSchematicGrid;
	}
	interface IDMT_SourceSchematicUpdatePageResult {
		schematicName: string;
		pageName: string;
	}
	interface IDMT_SourceSchematicAddSchematicOptions {
		projectId: string;
		schematicName?: string;
		boardName?: string;
	}
	interface IDMT_SourceSchematicAddSchematicResult {
		schematicName: string;
	}
	interface IDMT_SourceSchematicAddPageOptions {
		projectId: string;
		schematicName: string;
		pageName?: string;
	}
	interface IDMT_SourceSchematicAddPageResult {
		schematicName: string;
		pageName: string;
	}
	interface IDMT_SourceSchematicRemoveSchematicOptions {
		projectId: string;
		schematicName: string;
	}
	interface IDMT_SourceSchematicRemoveSchematicResult {
		schematicName: string;
		removedPageCount: number;
	}
	interface IDMT_SourceSchematicRemovePageOptions {
		projectId: string;
		schematicName: string;
		pageName: string;
	}
	interface IDMT_SourceSchematicRemovePageResult {
		schematicName: string;
		pageName: string;
	}
	class DMT_SourceSchematic {
		public updatePage(options: IDMT_SourceSchematicUpdatePageOptions): Promise<TSCH_SourceResult<IDMT_SourceSchematicUpdatePageResult>>;
		public addSchematic(options: IDMT_SourceSchematicAddSchematicOptions): Promise<TSCH_SourceResult<IDMT_SourceSchematicAddSchematicResult>>;
		public addPage(options: IDMT_SourceSchematicAddPageOptions): Promise<TSCH_SourceResult<IDMT_SourceSchematicAddPageResult>>;
		public removeSchematic(options: IDMT_SourceSchematicRemoveSchematicOptions): Promise<TSCH_SourceResult<IDMT_SourceSchematicRemoveSchematicResult>>;
		public removePage(options: IDMT_SourceSchematicRemovePageOptions): Promise<TSCH_SourceResult<IDMT_SourceSchematicRemovePageResult>>;
	}
	interface IDMT_TeamItem {
		readonly itemType: EDMT_ItemType.TEAM;
		name: string;
		uuid: string;
		identity: number;
	}
	class DMT_Team {
		public getAllTeamsInfo(): Promise<Array<IDMT_TeamItem>>;
		public getAllInvolvedTeamInfo(): Promise<Array<IDMT_TeamItem>>;
		public getCurrentTeamInfo(): Promise<IDMT_TeamItem | undefined>;
	}
	interface IDMT_WorkspaceItem {
		readonly itemType: EDMT_ItemType.WORKSPACE;
		name: string;
		uuid: string;
	}
	class DMT_Workspace {
		public getAllWorkspacesInfo(): Promise<Array<IDMT_WorkspaceItem>>;
		public toggleToWorkspace(workspaceUuid?: string): Promise<boolean>;
		public getCurrentWorkspaceInfo(): Promise<IDMT_WorkspaceItem | undefined>;
	}
	enum ESYS_Unit {
		 MILLIMETER = 'mm',
		 CENTIMETER = 'cm',
		 DECIMETER = 'dm',
		 METER = 'm',
		 INCH = 'inch',
		 IN = 'in',
		 MIL = 'mil',
	}
	interface ILIB_3DModelItem {
		readonly libraryType: ELIB_LibraryType.MODEL;
		uuid: string;
		libraryUuid: string;
		name: string;
		classification?: ILIB_ClassificationIndex | Array<string>;
		description?: string;
	}
	interface ILIB_3DModelSearchItem {
		uuid: string;
		libraryUuid: string;
		classification?: ILIB_ClassificationIndex | Array<string>;
		ordinal: number;
		name: string;
		description?: string;
		updateTimestamp: number;
		ascription: string;
		lastModifiedBy: string;
	}
	class LIB_3DModel {
		public create(libraryUuid: string, modelFile: Blob, classification?: ILIB_ClassificationIndex | Array<string>, unit?: ESYS_Unit.MILLIMETER | ESYS_Unit.CENTIMETER | ESYS_Unit.METER | ESYS_Unit.MIL | ESYS_Unit.INCH): Promise<Array<string> | undefined>;
		public delete(modelUuid: string, libraryUuid: string): Promise<boolean | undefined>;
		public modify(modelUuid: string, libraryUuid: string, modelName?: string, classification?: ILIB_ClassificationIndex | Array<string> | null, description?: string | null): Promise<boolean>;
		public get(modelUuid: string, libraryUuid?: string): Promise<ILIB_3DModelItem | undefined>;
		public copy(modelUuid: string, libraryUuid: string, targetLibraryUuid: string, targetClassification?: ILIB_ClassificationIndex | Array<string>, newModelName?: string): Promise<string | undefined>;
		public search(key: string, libraryUuid?: string, classification?: ILIB_ClassificationIndex | Array<string>, itemsOfPage?: number, page?: number): Promise<Array<ILIB_3DModelSearchItem>>;
	}
	interface ILIB_CbbItem {
		readonly libraryType: ELIB_LibraryType.CBB;
		uuid: string;
		libraryUuid: string;
		name: string;
		classification?: ILIB_ClassificationIndex | Array<string>;
		description?: string;
		boards: Array<IDMT_BoardItem>;
	}
	interface ILIB_CbbSearchItem {
		uuid: string;
		libraryUuid: string;
		classification?: ILIB_ClassificationIndex | Array<string>;
		ordinal: number;
		name: string;
		description?: string;
		updateTimestamp: number;
		ascription: string;
		lastModifiedBy: string;
	}
	class LIB_Cbb {
		public create(libraryUuid: string, cbbName: string, classification?: ILIB_ClassificationIndex | Array<string>, description?: string): Promise<string | undefined>;
		public delete(cbbUuid: string, libraryUuid: string): Promise<boolean | undefined>;
		public modify(cbbUuid: string, libraryUuid: string, cbbName?: string, classification?: ILIB_ClassificationIndex | Array<string> | null, description?: string | null): Promise<boolean>;
		public get(cbbUuid: string, libraryUuid?: string): Promise<ILIB_CbbItem | undefined>;
		public copy(cbbUuid: string, libraryUuid: string, targetLibraryUuid: string, targetClassification?: ILIB_ClassificationIndex | Array<string>, newCbbName?: string): Promise<string | undefined>;
		public search(key: string, libraryUuid?: string, classification?: ILIB_ClassificationIndex | Array<string>, itemsOfPage?: number, page?: number): Promise<Array<ILIB_CbbSearchItem>>;
		public openProjectInEditor(cbbUuid: string, libraryUuid: string): Promise<boolean>;
		public openSymbolInEditor(cbbUuid: string, libraryUuid: string, splitScreenId?: string): Promise<string | undefined>;
	}
	interface ILIB_ClassificationNode {
		name: string;
		children?: Array<ILIB_ClassificationNode>;
	}
	class LIB_Classification {
		public createPrimary(libraryUuid: string, libraryType: ELIB_LibraryType, primaryClassificationName: string): Promise<ILIB_ClassificationIndex | undefined>;
		public createSecondary(libraryUuid: string, libraryType: ELIB_LibraryType, primaryClassificationUuid: string, secondaryClassificationName: string): Promise<ILIB_ClassificationIndex | undefined>;
		public getIndexByName(libraryUuid: string, libraryType: ELIB_LibraryType, primaryClassificationName: string, secondaryClassificationName?: string): Promise<ILIB_ClassificationIndex | undefined>;
		public getNameByUuid(libraryUuid: string, libraryType: ELIB_LibraryType, primaryClassificationUuid: string, secondaryClassificationUuid?: string): Promise<{ primaryClassificationName: string; secondaryClassificationName?: string | undefined } | undefined>;
		public getNameByIndex(classificationIndex: ILIB_ClassificationIndex): Promise<{ primaryClassificationName: string; secondaryClassificationName?: string | undefined } | undefined>;
		public getAllClassificationTree(libraryUuid: string, libraryType: ELIB_LibraryType): Promise<Array<{ name: string; uuid: string; children?: Array<{ name: string; uuid: string }> | undefined }>>;
		public deleteByUuid(libraryUuid: string, classificationUuid: string): Promise<boolean>;
		public deleteByIndex(classificationIndex: ILIB_ClassificationIndex): Promise<boolean>;
		public createClassification(libraryUuid: string, libraryType: ELIB_LibraryType, classificationNames: Array<string>): Promise<boolean>;
		public deleteClassification(libraryUuid: string, libraryType: ELIB_LibraryType, classificationNames: Array<string>): Promise<boolean>;
		public getClassificationTree(libraryUuid: string, libraryType: ELIB_LibraryType): Promise<Array<ILIB_ClassificationNode>>;
	}
	interface ILIB_DeviceSymbolAssociationItem {
		uuid?: string;
		libraryUuid?: string;
		name?: string;
		type?: ELIB_SymbolType;
		isPrimary?: boolean;
	}
	interface ILIB_DeviceFootprintAssociationItem {
		uuid?: string;
		libraryUuid?: string;
		name?: string;
		isPrimary?: boolean;
	}
	interface ILIB_DeviceExtendPropertyItem {
		name?: string;
		designator?: string;
		addIntoBom?: boolean;
		addIntoPcb?: boolean;
		net?: string;
		manufacturer?: string;
		manufacturerId?: string;
		supplier?: string;
		supplierId?: string;
		otherProperty?: Record<string, boolean | number | string | undefined>;
	}
	interface ILIB_DeviceAssociationItem {
		symbolType: ELIB_SymbolType;
		symbolUuid: string;
		symbol: { type: ELIB_SymbolType; uuid: string; libraryUuid: string };
		footprintUuid: string;
		footprint?: { uuid: string; libraryUuid: string };
		symbols?: Array<ILIB_DeviceSymbolAssociationItem>;
		footprints?: Array<ILIB_DeviceFootprintAssociationItem>;
		images?: Array<string>;
	}
	interface ILIB_DeviceItem {
		readonly libraryType: ELIB_LibraryType.DEVICE;
		uuid: string;
		libraryUuid: string;
		name: string;
		classification?: ILIB_ClassificationIndex | Array<string>;
		association: ILIB_DeviceAssociationItem;
		description?: string;
		property: ILIB_DeviceExtendPropertyItem;
		subPartNames: Array<string>;
	}
	interface ILIB_DeviceSearchItem {
		uuid: string;
		libraryUuid: string;
		classification?: ILIB_ClassificationIndex | Array<string>;
		ordinal: number;
		name: string;
		symbolName: string;
		symbolUuid: string;
		symbol: { name: string; uuid: string; libraryUuid: string };
		footprintName?: string;
		footprintUuid: string;
		footprint?: { name: string; uuid: string; libraryUuid: string };
		model3DName?: string;
		model3DUuid: string;
		model3D?: { name: string; uuid: string; libraryUuid: string };
		imageUuid?: string | string[];
		description?: string;
		otherProperty?: Record<string, boolean | number | string | undefined>;
	}
	interface ILIB_DevicePropertiesForSearch {
		name?: string;
		value?: string;
		symbolName?: string;
		footprintName?: string;
		supplierFootprint?: string;
		supplierId?: string;
		partNumber?: string;
		partCode?: string;
	}
	class LIB_Device {
		public create(libraryUuid: string, deviceName: string, classification?: ILIB_ClassificationIndex | Array<string>, association?: {
			symbolType?: ELIB_SymbolType;
			symbolUuid?: string;
			symbol?: { uuid: string; libraryUuid: string };
			footprintUuid?: string;
			footprint?: { uuid: string; libraryUuid: string };
			 symbols?: Array<ILIB_DeviceSymbolAssociationItem>;
			 footprints?: Array<ILIB_DeviceFootprintAssociationItem>;
			model3D?: { uuid: string; libraryUuid: string };
			imageData?: File | Blob;
		}, description?: string, property?: ILIB_DeviceExtendPropertyItem): Promise<string | undefined>;
		public delete(deviceUuid: string, libraryUuid: string): Promise<boolean | undefined>;
		public modify(deviceUuid: string, libraryUuid: string, deviceName?: string, classification?: ILIB_ClassificationIndex | Array<string> | null, association?: {
			symbolUuid?: string;
			symbol?: { uuid: string; libraryUuid: string };
			footprintUuid?: string | null;
			footprint?: { uuid: string; libraryUuid: string } | null;
			 symbols?: Array<ILIB_DeviceSymbolAssociationItem> | null;
			 footprints?: Array<ILIB_DeviceFootprintAssociationItem> | null;
			model3D?: { uuid: string; libraryUuid: string } | null;
			imageData?: File | Blob | null;
		}, description?: string | null, property?: { name?: string | null; designator?: string; addIntoBom?: boolean; addIntoPcb?: boolean; net?: string; manufacturer?: string | null; manufacturerId?: string | null; supplier?: string | null; supplierId?: string | null; otherProperty?: Record<string, boolean | number | string | undefined | null> }): Promise<boolean>;
		public get(deviceUuid: string, libraryUuid?: string): Promise<ILIB_DeviceItem | undefined>;
		public copy(deviceUuid: string, libraryUuid: string, targetLibraryUuid: string, targetClassification?: ILIB_ClassificationIndex | Array<string>, newDeviceName?: string): Promise<string | undefined>;
		public search(key: string, libraryUuid?: string, classification?: ILIB_ClassificationIndex | Array<string>, symbolType?: ELIB_SymbolType, itemsOfPage?: number, page?: number): Promise<Array<ILIB_DeviceSearchItem>>;
		public searchByProperties(properties: ILIB_DevicePropertiesForSearch, libraryUuid?: string, classification?: Array<string>, symbolType?: ELIB_SymbolType, itemsOfPage?: number, page?: number): Promise<Array<ILIB_DeviceSearchItem>>;
		public getByLcscIds<T extends boolean>(lcscIds: string, libraryUuid?: string, allowMultiMatch?: T): Promise<T extends true ? Array<ILIB_DeviceSearchItem> : ILIB_DeviceSearchItem | undefined>;
		public getByLcscIds(lcscIds: Array<string>, libraryUuid?: string, allowMultiMatch?: boolean): Promise<Array<ILIB_DeviceSearchItem>>;
		private searchBySupplierPart(lcscIds: string | Array<string>, libraryUuid?: string, allowMultiMatch?: boolean): Promise<Array<ILIB_DeviceSearchItem>>;
		private fetchSupplierPartDevices(supplierParts: Array<string>, libraryUuid?: string): Promise<Array<{ [key: string]: any }>>;
		private mapSupplierPartDevice(device: { [key: string]: any }, deviceLibraryUuid: string, ordinal: number): ILIB_DeviceSearchItem;
	}
	interface ILIB_FootprintItem {
		readonly libraryType: ELIB_LibraryType.FOOTPRINT;
		uuid: string;
		libraryUuid: string;
		name: string;
		classification?: ILIB_ClassificationIndex | Array<string>;
		description?: string;
		model3D?: { name: string; uuid: string; libraryUuid: string };
		otherProperty?: Record<string, boolean | number | string | undefined>;
	}
	interface ILIB_FootprintSearchItem {
		uuid: string;
		libraryUuid: string;
		classification?: ILIB_ClassificationIndex | Array<string>;
		ordinal: number;
		name: string;
		description?: string;
		updateTimestamp: number;
		ascription: string;
		lastModifiedBy: string;
	}
	interface ILIB_FootprintPropertiesForSearch {
		name?: string;
	}
	interface IPCB_DocumentBBox {
		minX: number;
		minY: number;
		maxX: number;
		maxY: number;
	}
	enum ELIB_FootprintPadShape {
		 ELLIPSE = 'ELLIPSE',
		 RECT = 'RECT',
		 OVAL = 'OVAL',
		 POLYGON = 'POLYGON',
	}
	enum ELIB_FootprintPadType {
		 NORMAL = 'NORMAL',
		 TEST = 'TEST',
		 MARKER = 'MARKER',
	}
	interface ILIB_FootprintPadGeometry {
		padId: string;
		padNumber: string;
		shape: ELIB_FootprintPadShape;
		type: ELIB_FootprintPadType;
		plated: boolean;
		holeType?: 'ROUND' | 'RECT' | 'SLOT' | 'ROUND_RECT' | 'HEXAGON' | 'OCTAGON';
		x: number;
		y: number;
		rotation: number;
		width: number;
		height: number;
		layerIds: Array<number>;
		bbox: IPCB_DocumentBBox;
		holeDiameter?: number;
		slotSize?: { length: number; width: number };
	}
	interface ILIB_FootprintGeometry {
		uuid: string;
		bodyBBox: IPCB_DocumentBBox;
		fullBBox: IPCB_DocumentBBox;
		courtyardBBox?: IPCB_DocumentBBox;
		pads: Array<ILIB_FootprintPadGeometry>;
		model3DBBox?: IPCB_DocumentBBox;
	}
	class LIB_Footprint {
		public create(libraryUuid: string, footprintName: string, classification?: ILIB_ClassificationIndex | Array<string>, description?: string, otherProperty?: Record<string, boolean | number | string | undefined>, model3D?: { name: string; uuid: string; libraryUuid: string }): Promise<string | undefined>;
		public delete(footprintUuid: string, libraryUuid: string): Promise<boolean | undefined>;
		public modify(footprintUuid: string, libraryUuid: string, footprintName?: string, classification?: ILIB_ClassificationIndex | Array<string> | null, description?: string | null, otherProperty?: Record<string, boolean | number | string | undefined | null>, model3D?: { name: string; uuid: string; libraryUuid: string }): Promise<boolean>;
		public updateDocumentSource(footprintUuid: string, libraryUuid: string, documentSource: string): Promise<boolean | undefined>;
		public getDocumentSource(footprintUuid: string, libraryUuid?: string): Promise<string | undefined>;
		public get(footprintUuid: string, libraryUuid?: string): Promise<ILIB_FootprintItem | undefined>;
		public copy(footprintUuid: string, libraryUuid: string, targetLibraryUuid: string, targetClassification?: ILIB_ClassificationIndex | Array<string>, newFootprintName?: string): Promise<string | undefined>;
		public search(key: string, libraryUuid?: string, classification?: ILIB_ClassificationIndex | Array<string>, itemsOfPage?: number, page?: number): Promise<Array<ILIB_FootprintSearchItem>>;
		public searchByProperties(properties: ILIB_FootprintPropertiesForSearch, libraryUuid?: string): Promise<Array<ILIB_FootprintSearchItem>>;
		public openInEditor(footprintUuid: string, libraryUuid: string, splitScreenId?: string): Promise<string | undefined>;
		public getRenderImage(source: { footprintUuid: string; libraryUuid: string }): Promise<Blob | undefined>;
		public getGeometry(footprintUuid: string, libraryUuid: string): Promise<ILIB_FootprintGeometry | undefined>;
	}
	interface ILIB_LibraryInfo {
		name: string;
		uuid: string;
	}
	interface ILIB_ProjectLibraryUpdateOptions {
		projectUuid: string;
		primitiveIds?: Array<string>;
		libraryPaths?: Array<string>;
	}
	enum ELIB_ProjectLibraryUpdateMode {
		 SOURCE = 'source',
		 NAME = 'name',
	}
	interface ILIB_ProjectLibraryUpdateResult {
		projectUuid: string;
		mode: ELIB_ProjectLibraryUpdateMode;
		updatedDevices: Array<string>;
		updatedSymbols: Array<string>;
		updatedFootprints: Array<string>;
		notFound: Array<string>;
		failed: Array<string>;
	}
	interface ILIB_ExtendLibraryClassificationIndex {
		primaryClassificationName?: string;
		primaryClassificationUuid?: string;
		secondaryClassificationName?: string;
		secondaryClassificationUuid?: string;
	}
	interface ILIB_ExtendLibrarySearchProperty<T> {
		page?: number;
		pageSize?: number;
		query: T & { wd?: string; listByTitles?: Array<string>; classification?: ILIB_ExtendLibraryClassificationIndex | Array<string> };
	}
	interface ILIB_ExtendLibrarySearchResult<T> {
		count: number;
		lists: Array<T>;
		page: number;
		pageSize: number;
		totalPage: number;
	}
	interface ILIB_ExtendLibraryFunctions {
		getDetail: (uuid: string) => Promise<any>;
		getClassificationTree: () => Promise<Array<{ name: string; uuid?: string; children?: Array<{ name: string; uuid?: string }> | undefined }>>;
		getList: (props: ILIB_ExtendLibrarySearchProperty<any>) => Promise<ILIB_ExtendLibrarySearchResult<any>>;
	}
	interface ILIB_ExtendLibraryItemIndex {
		uuid?: string;
		name: string;
	}
	interface ILIB_ExtendLibraryItem extends ILIB_ExtendLibraryItemIndex {
		url?: string;
		data?: string | Blob;
	}
	enum ELIB_PreviewType {
		 SYMBOL = 'S',
		 FOOTPRINT = 'F',
		 PRODUCT = 'P',
		 MODEL_3D = '3D',
	}
	interface ILIB_ExtendLibraryDeviceFunctions extends ILIB_ExtendLibraryFunctions {
		getList: (props: ILIB_ExtendLibrarySearchProperty<{ attributes?: Record<string, string>; symbolType?: ELIB_SymbolType }>) => Promise<ILIB_ExtendLibrarySearchResult<ILIB_ExtendLibraryItemIndex & {
			classification?: ILIB_ExtendLibraryClassificationIndex | Array<string>;
			symbol?: ILIB_ExtendLibraryItem & { symbolType: ELIB_SymbolType };
			footprint?: ILIB_ExtendLibraryItem;
			 symbols?: Array<ILIB_ExtendLibraryItem & { symbolType: ELIB_SymbolType }>;
			 footprints?: Array<ILIB_ExtendLibraryItem>;
			model3d?: ILIB_ExtendLibraryItemIndex & { adjustment?: { size?: { x: number; y: number; z: number }; rotation?: { x: number; y: number; z: number }; offset?: { x: number; y: number; z: number } } };
			 images?: Array<ILIB_ExtendLibraryItem>;
			 value?: string;
			 supplierPart?: string;
			 manufacturer?: string;
			description?: string;
			updateTime?: number;
			createTime?: number;
			attributes?: Record<string, string>;
		}>>;
		getSupportedSymbolTypes: () => Promise<Array<ELIB_SymbolType>>;
		getSupportedPreviewTypes: () => Promise<Array<ELIB_PreviewType>>;
	}
	interface ILIB_ExtendLibraryUserIndex {
		name?: string;
		uuid?: string;
	}
	interface ILIB_ExtendLibrarySearchResultDataLine {
		classification?: ILIB_ExtendLibraryClassificationIndex | Array<string>;
		description?: string;
		version?: string;
		updateTime?: number;
		createTime?: number;
		creator?: ILIB_ExtendLibraryUserIndex;
		modifier?: ILIB_ExtendLibraryUserIndex;
		owner?: ILIB_ExtendLibraryUserIndex;
	}
	interface ILIB_ExtendLibrarySymbolFunctions extends ILIB_ExtendLibraryFunctions {
		getList: (props: ILIB_ExtendLibrarySearchProperty<{ symbolType?: ELIB_SymbolType }>) => Promise<ILIB_ExtendLibrarySearchResult<ILIB_ExtendLibraryItem & ILIB_ExtendLibrarySearchResultDataLine & { symbolType: ELIB_SymbolType }>>;
		getSupportedSymbolTypes: () => Promise<Array<ELIB_SymbolType>>;
	}
	interface ILIB_ExtendLibraryFootprintFunctions extends ILIB_ExtendLibraryFunctions {
		getList: (props: ILIB_ExtendLibrarySearchProperty<{ }>) => Promise<ILIB_ExtendLibrarySearchResult<ILIB_ExtendLibraryItem & ILIB_ExtendLibrarySearchResultDataLine>>;
	}
	interface ILIB_ExtendLibraryCbbFunctions extends ILIB_ExtendLibraryFunctions {
		getList: (props: any) => Promise<ILIB_ExtendLibrarySearchResult<ILIB_ExtendLibraryItem & ILIB_ExtendLibrarySearchResultDataLine & { schematics?: Array<{ uuid: string; name: string; updateTime: string; description?: string }>; pcbs?: Array<{ uuid: string; name: string; updateTime: number; thumb?: string; createTime?: number; creator?: ILIB_ExtendLibraryUserIndex; modifier?: ILIB_ExtendLibraryUserIndex; description?: string }>; boards?: Array<{ pcbUuid: string; schUuid: string; name: string }>; sheets?: Array<{ uuid: string; name: string; belongSchematicUuid: string; updateTime: number; thumb?: string; createTime?: number; creator?: ILIB_ExtendLibraryUserIndex; modifier?: ILIB_ExtendLibraryUserIndex; description?: string }> }>>;
	}
	interface ILIB_ExtendLibrary3DModelFunctions extends ILIB_ExtendLibraryFunctions {
		getList: (props: ILIB_ExtendLibrarySearchProperty<{ }>) => Promise<ILIB_ExtendLibrarySearchResult<ILIB_ExtendLibraryItemIndex & ILIB_ExtendLibrarySearchResultDataLine & { modelType: 'step' }>>;
	}
	interface ILIB_RegisterExtendLibraryProps {
		saveAs?: {
			 device?: boolean;
			 symbol?: boolean;
			 footprint?: boolean;
			 cbb?: boolean;
			 model3d?: boolean;
		};
	}
	class LIB_LibrariesList {
		private extensionUuid?: string;
		public constructor(extensionUuid?: string);
		public getSystemLibraryUuid(): Promise<string | undefined>;
		public getPersonalLibraryUuid(): Promise<string | undefined>;
		public getProjectLibraryUuid(): Promise<string | undefined>;
		public getFavoriteLibraryUuid(): Promise<string | undefined>;
		public getAllLibrariesList(): Promise<Array<ILIB_LibraryInfo>>;
		public getPreferredLibraryPaths(): Promise<Array<string>>;
		public setPreferredLibraryPaths(libraryPaths: Array<string>): Promise<boolean>;
		public updateProjectLibraryBySource(options: ILIB_ProjectLibraryUpdateOptions): Promise<ILIB_ProjectLibraryUpdateResult | undefined>;
		public updateProjectLibraryByName(options: ILIB_ProjectLibraryUpdateOptions): Promise<ILIB_ProjectLibraryUpdateResult | undefined>;
		public registerExtendLibrary(title: string, libraryFunctions: { device?: ILIB_ExtendLibraryDeviceFunctions; symbol?: ILIB_ExtendLibrarySymbolFunctions; footprint?: ILIB_ExtendLibraryFootprintFunctions; cbb?: ILIB_ExtendLibraryCbbFunctions; model3d?: ILIB_ExtendLibrary3DModelFunctions }, props?: ILIB_RegisterExtendLibraryProps): Promise<string | undefined>;
	}
	interface ILIB_PanelLibraryItem {
		readonly libraryType: ELIB_LibraryType.PANEL_LIBRARY;
		uuid: string;
		libraryUuid: string;
		name: string;
		classification?: ILIB_ClassificationIndex | Array<string>;
		description?: string;
	}
	interface ILIB_PanelLibrarySearchItem {
		uuid: string;
		libraryUuid: string;
		classification?: ILIB_ClassificationIndex | Array<string>;
		ordinal: number;
		name: string;
		description?: string;
		updateTimestamp: number;
		ascription: string;
		lastModifiedBy: string;
	}
	class LIB_PanelLibrary {
		public create(libraryUuid: string, panelLibraryName: string, classification?: ILIB_ClassificationIndex | Array<string>, description?: string): Promise<string | undefined>;
		public delete(panelLibraryUuid: string, libraryUuid: string): Promise<boolean | undefined>;
		public modify(panelLibraryUuid: string, libraryUuid: string, panelLibraryName?: string, classification?: ILIB_ClassificationIndex | Array<string> | null, description?: string | null): Promise<boolean>;
		public get(panelLibraryUuid: string, libraryUuid?: string): Promise<ILIB_PanelLibraryItem | undefined>;
		public copy(panelLibraryUuid: string, libraryUuid: string, targetLibraryUuid: string, targetClassification?: ILIB_ClassificationIndex | Array<string>, newPanelLibraryName?: string): Promise<string | undefined>;
		public search(key: string, libraryUuid?: string, classification?: ILIB_ClassificationIndex | Array<string>, itemsOfPage?: number, page?: number): Promise<Array<ILIB_PanelLibrarySearchItem>>;
		public openInEditor(panelLibraryUuid: string, libraryUuid: string, splitScreenId?: string): Promise<string | undefined>;
	}
	interface ILIB_LibraryItem {
		uuid: string;
		libraryType: ELIB_LibraryType;
		libraryUuid?: string;
	}
	class LIB_SelectControl {
		public getSelectedLibraryRowInfo(): Promise<ILIB_LibraryItem | undefined>;
	}
	enum ELIB_SimulationModelType {
		 NGSPICE = 'Ngspice',
		 SIMULIDE = 'SimulIDE',
	}
	interface ILIB_SimulationModelItem {
		readonly libraryType: ELIB_LibraryType.SIMULATION_MODEL_NGSPICE | ELIB_LibraryType.SIMULATION_MODEL_SIMULIDE;
		uuid: string;
		libraryUuid: string;
		name: string;
		modelData: string;
		modelCategory: string;
		modelPin: string;
		classification?: Array<string>;
		type: ELIB_SimulationModelType;
		description?: string;
	}
	interface ILIB_SimulationModelSearchItem {
		uuid: string;
		libraryUuid: string;
		classification?: Array<string>;
		ordinal: number;
		name: string;
		type: ELIB_SimulationModelType;
		description?: string;
		updateTimestamp: number;
		ascription: string;
		lastModifiedBy: string;
	}
	class LIB_SimulationModel {
		public create(libraryUuid: string, model: { modelType: 'Ngspice' } & ({ modelFile: Blob; modelName?: string; modelCategory?: string; modelPin?: string } | { modelData: string; modelName?: string; modelCategory?: string; modelPin?: string }), classification?: Array<string>, description?: string): Promise<string | undefined>;
		public delete(simulationModelUuid: string, libraryUuid: string): Promise<boolean | undefined>;
		public modify(simulationModelUuid: string, libraryUuid: string, modelProps?: { modelName?: string; modelCategory?: string; modelPin?: string }, classification?: Array<string> | null, description?: string | null): Promise<boolean>;
		public get(simulationModelUuid: string, libraryUuid?: string): Promise<ILIB_SimulationModelItem | undefined>;
		public copy(simulationModelUuid: string, libraryUuid: string, targetLibraryUuid: string, targetClassification?: Array<string>, newSimulationModelName?: string): Promise<string | undefined>;
		public search(key: string, libraryUuid?: string, classification?: Array<string>, simulationModelType?: ELIB_SimulationModelType, itemsOfPage?: number, page?: number): Promise<Array<ILIB_SimulationModelSearchItem>>;
	}
	interface ILIB_SymbolSearchItem {
		uuid: string;
		libraryUuid: string;
		classification?: ILIB_ClassificationIndex | Array<string>;
		ordinal: number;
		name: string;
		type: ELIB_SymbolType;
		description?: string;
		updateTimestamp: number;
		ascription: string;
		lastModifiedBy: string;
	}
	interface ILIB_SymbolPropertiesForSearch {
		name?: string;
	}
	interface ISCH_DocumentBBox {
		minX: number;
		minY: number;
		maxX: number;
		maxY: number;
	}
	enum ELIB_SymbolPinSide {
		 LEFT = 'left',
		 RIGHT = 'right',
		 TOP = 'top',
		 BOTTOM = 'bottom',
		 UNKNOWN = 'unknown',
	}
	enum ESCH_PrimitivePinType {
		 IN = 'IN',
		 OUT = 'OUT',
		 BI = 'BI',
		 PASSIVE = 'Passive',
		 OPEN_COLLECTOR = 'Open Collector',
		 OPEN_EMITTER = 'Open Emitter',
		 POWER = 'Power',
		 GROUND = 'Ground',
		 HIZ = 'HIZ',
		 TERMINATOR = 'Terminator',
		 UNDEFINED = 'Undefined',
	}
	interface ILIB_SymbolPinGeometry {
		pinId: string;
		pinNumber: string;
		pinName: string;
		x: number;
		y: number;
		rotation: number;
		side: ELIB_SymbolPinSide;
		length: number;
		direction: ESCH_PrimitivePinType;
	}
	interface ILIB_SymbolTextAnchor {
		key: string;
		x: number;
		y: number;
		rotation: number;
		alignHorizontal?: 'left' | 'center' | 'right';
		alignVertical?: 'top' | 'middle' | 'bottom';
	}
	interface ILIB_SymbolGeometry {
		uuid: string;
		subPartName?: string;
		bodyBBox: ISCH_DocumentBBox;
		fullBBox: ISCH_DocumentBBox;
		pins: Array<ILIB_SymbolPinGeometry>;
		textAnchors: Array<ILIB_SymbolTextAnchor>;
	}
	class LIB_Symbol {
		public create(libraryUuid: string, symbolName: string, classification?: ILIB_ClassificationIndex | Array<string>, symbolType?: ELIB_SymbolType, description?: string, otherProperty?: Record<string, boolean | number | string | undefined>): Promise<string | undefined>;
		public delete(symbolUuid: string, libraryUuid: string): Promise<boolean | undefined>;
		public modify(symbolUuid: string, libraryUuid: string, symbolName?: string, classification?: ILIB_ClassificationIndex | Array<string> | null, description?: string | null, otherProperty?: Record<string, boolean | number | string | undefined | null>): Promise<boolean>;
		public updateDocumentSource(symbolUuid: string, libraryUuid: string, documentSource: string): Promise<boolean | undefined>;
		public getDocumentSource(symbolUuid: string, libraryUuid?: string): Promise<string | undefined>;
		public get(symbolUuid: string, libraryUuid?: string): Promise<ILIB_SymbolItem | undefined>;
		public copy(symbolUuid: string, libraryUuid: string, targetLibraryUuid: string, targetClassification?: ILIB_ClassificationIndex | Array<string>, newSymbolName?: string): Promise<string | undefined>;
		public search(key: string, libraryUuid?: string, classification?: ILIB_ClassificationIndex | Array<string>, symbolType?: ELIB_SymbolType, itemsOfPage?: number, page?: number): Promise<Array<ILIB_SymbolSearchItem>>;
		public searchByProperties(properties: ILIB_SymbolPropertiesForSearch, libraryUuid?: string): Promise<Array<ILIB_SymbolSearchItem>>;
		public openInEditor(symbolUuid: string, libraryUuid: string, splitScreenId?: string): Promise<string | undefined>;
		public getRenderImage(source: { symbolUuid: string; libraryUuid: string; subPartName?: string }): Promise<Blob | undefined>;
		public getGeometry(symbolUuid: string, libraryUuid: string, subPartName?: string): Promise<ILIB_SymbolGeometry | undefined>;
	}
	enum EPCB_DocumentRatlineCalculatingActiveStatus {
		 ACTIVE = 'active',
		 INACTIVE = 'inactive',
	}
	enum EPCB_DocumentCanvasUpdateCalculationActiveStatus {
		 ACTIVE = 'active',
		 INACTIVE = 'inactive',
	}
	enum EPCB_PrimitiveType {
		 ARC = 'Arc',
		 COMPONENT = 'Component',
		 PAD = 'Pad',
		 COMPONENT_PAD = 'ComponentPad',
		 POLYLINE = 'Polyline',
		 POUR = 'Pour',
		 FILL = 'Fill',
		 REGION = 'Region',
		 LINE = 'Line',
		 VIA = 'Via',
		 DIMENSION = 'Dimension',
		 IMAGE = 'Image',
		 OBJECT = 'Object',
		 POURED = 'Poured',
		 STRING = 'String',
		 ATTRIBUTE = 'Attribute',
	}
	interface IPCB_Primitive {
		getState_PrimitiveType: () => EPCB_PrimitiveType;
		getState_PrimitiveId: () => string;
		create: () => IPCB_Primitive | Promise<IPCB_Primitive>;
		toAsync: () => IPCB_Primitive;
		toSync: () => IPCB_Primitive;
		isAsync: () => boolean;
		reset: () => IPCB_Primitive | Promise<IPCB_Primitive>;
		done: () => IPCB_Primitive | Promise<IPCB_Primitive>;
	}
	enum EPCB_AutoRoutingCornerStyle {
		 DEGREE_45 = 0,
		 DEGREE_90 = 1,
	}
	enum EPCB_AutoRoutingExistingPrimitiveMode {
		 KEEP = 'keep',
		 REMOVE = 'remove',
	}
	enum EPCB_AutoRoutingOptimization {
		 COMPLETION = 1,
		 FASTER = 0,
	}
	enum EPCB_LayerId {
		 TOP = 1,
		 TOP_SILKSCREEN = 3,
		 TOP_SOLDER_MASK = 5,
		 TOP_PASTE_MASK = 7,
		 TOP_ASSEMBLY = 9,
		 TOP_STIFFENER = 58,
		 BOTTOM = 2,
		 BOTTOM_SILKSCREEN = 4,
		 BOTTOM_SOLDER_MASK = 6,
		 BOTTOM_PASTE_MASK = 8,
		 BOTTOM_ASSEMBLY = 10,
		 BOTTOM_STIFFENER = 59,
		 BOARD_OUTLINE = 11,
		 MULTI = 12,
		 DOCUMENT = 13,
		 MECHANICAL = 14,
		 RATLINE = 57,
		 INNER_1 = 15,
		 INNER_2 = 16,
		 INNER_3 = 17,
		 INNER_4 = 18,
		 INNER_5 = 19,
		 INNER_6 = 20,
		 INNER_7 = 21,
		 INNER_8 = 22,
		 INNER_9 = 23,
		 INNER_10 = 24,
		 INNER_11 = 25,
		 INNER_12 = 26,
		 INNER_13 = 27,
		 INNER_14 = 28,
		 INNER_15 = 29,
		 INNER_16 = 30,
		 INNER_17 = 31,
		 INNER_18 = 32,
		 INNER_19 = 33,
		 INNER_20 = 34,
		 INNER_21 = 35,
		 INNER_22 = 36,
		 INNER_23 = 37,
		 INNER_24 = 38,
		 INNER_25 = 39,
		 INNER_26 = 40,
		 INNER_27 = 41,
		 INNER_28 = 42,
		 INNER_29 = 43,
		 INNER_30 = 44,
		 CUSTOM_1 = 71,
		 CUSTOM_2 = 72,
		 CUSTOM_3 = 73,
		 CUSTOM_4 = 74,
		 CUSTOM_5 = 75,
		 CUSTOM_6 = 76,
		 CUSTOM_7 = 77,
		 CUSTOM_8 = 78,
		 CUSTOM_9 = 79,
		 CUSTOM_10 = 80,
		 CUSTOM_11 = 81,
		 CUSTOM_12 = 82,
		 CUSTOM_13 = 83,
		 CUSTOM_14 = 84,
		 CUSTOM_15 = 85,
		 CUSTOM_16 = 86,
		 CUSTOM_17 = 87,
		 CUSTOM_18 = 88,
		 CUSTOM_19 = 89,
		 CUSTOM_20 = 90,
		 CUSTOM_21 = 91,
		 CUSTOM_22 = 92,
		 CUSTOM_23 = 93,
		 CUSTOM_24 = 94,
		 CUSTOM_25 = 95,
		 CUSTOM_26 = 96,
		 CUSTOM_27 = 97,
		 CUSTOM_28 = 98,
		 CUSTOM_29 = 99,
		 CUSTOM_30 = 100,
		 SUBSTRATE_1 = 101,
		 HOLE = 47,
		 COMPONENT_SHAPE = 48,
		 COMPONENT_MARKING = 49,
		 PIN_SOLDERING = 50,
		 PIN_FLOATING = 51,
		 COMPONENT_MODEL = 52,
		 SHELL_3D_OUTLINE = 53,
		 SHELL_3D_TOP = 54,
		 SHELL_3D_BOTTOM = 55,
		 DRILL_DRAWING = 56,
	}
	type TPCB_LayersOfInner = EPCB_LayerId.INNER_1 | EPCB_LayerId.INNER_2 | EPCB_LayerId.INNER_3 | EPCB_LayerId.INNER_4 | EPCB_LayerId.INNER_5 | EPCB_LayerId.INNER_6 | EPCB_LayerId.INNER_7 | EPCB_LayerId.INNER_8 | EPCB_LayerId.INNER_9 | EPCB_LayerId.INNER_10 | EPCB_LayerId.INNER_11 | EPCB_LayerId.INNER_12 | EPCB_LayerId.INNER_13 | EPCB_LayerId.INNER_14 | EPCB_LayerId.INNER_15 | EPCB_LayerId.INNER_16 | EPCB_LayerId.INNER_17 | EPCB_LayerId.INNER_18 | EPCB_LayerId.INNER_19 | EPCB_LayerId.INNER_20 | EPCB_LayerId.INNER_21 | EPCB_LayerId.INNER_22 | EPCB_LayerId.INNER_23 | EPCB_LayerId.INNER_24 | EPCB_LayerId.INNER_25 | EPCB_LayerId.INNER_26 | EPCB_LayerId.INNER_27 | EPCB_LayerId.INNER_28 | EPCB_LayerId.INNER_29 | EPCB_LayerId.INNER_30;
	type TPCB_LayersOfCopper = TPCB_LayersOfInner | EPCB_LayerId.TOP | EPCB_LayerId.BOTTOM;
	interface IPCB_AutoRoutingProps {
		RoutingNets?: 'selected' | 'selectedComponents' | Array<string>;
		cornerStyle?: EPCB_AutoRoutingCornerStyle;
		existingPrimitiveMode?: EPCB_AutoRoutingExistingPrimitiveMode;
		optimization?: EPCB_AutoRoutingOptimization;
		layers?: Array<TPCB_LayersOfCopper>;
		ignoreNets?: Array<string>;
	}
	interface IPCB_AutoRoutingResult {
		success: boolean;
		totalNetsCount: number;
		successNetsCount: number;
		failedNets: Array<string>;
		duration: number;
	}
	interface IPCB_AutoLayoutResult {
		success: boolean;
		totalComponentsCount: number;
		successComponentsCount: number;
		failedComponents: Array<string>;
		duration: number;
	}
	interface ISYS_JobHandle {
		jobId: string;
	}
	enum ESYS_JobState {
		 QUEUED = 'queued',
		 RUNNING = 'running',
		 COMPLETED = 'completed',
		 CANCELED = 'canceled',
		 FAILED = 'failed',
	}
	interface ISYS_JobStatus {
		jobId: string;
		state: ESYS_JobState;
		progress: number;
		error?: {
			 code: string;
			 message: string;
		};
		partial?: boolean;
	}
	interface ISYS_JobLogEntry {
		at: number;
		level: string;
		code?: string;
		message: string;
	}
	interface IPCB_AutoRouteIterationData {
		iterationId: number;
		stage: number;
		progress: number;
		finish?: boolean;
		traces: Array<Record<string, unknown>>;
		vias: Array<Record<string, unknown>>;
		routabitity?: number;
		time?: string;
		[key: string]: unknown;
	}
	interface IPCB_AutoLayoutIterationData {
		boardOutline?: unknown;
		components?: unknown;
		finish?: boolean;
		progress?: number;
		fitness?: number;
		generation?: number;
		generationsNum?: number;
		[key: string]: unknown;
	}
	interface IPCB_AutoJobProgress {
		progress: number;
		routabitity?: number;
		fitness?: number;
		generation?: number;
		generationsNum?: number;
	}
	interface IPCB_AutoJobSnapshot {
		logs: Array<ISYS_JobLogEntry>;
		result: IPCB_AutoRouteIterationData | IPCB_AutoLayoutIterationData | null;
		progress: IPCB_AutoJobProgress | null;
	}
	interface IPCB_RatlineQueryOptions {
		net?: string;
		cursor?: string;
		limit?: number;
	}
	interface IPCB_PageResult<T> {
		items: Array<T>;
		nextCursor?: string;
		hasMore: boolean;
		total?: number;
	}
	interface IPCB_Ratline {
		primitiveId: string;
		net: string;
		startId: string;
		endId: string;
		start: { x: number; y: number };
		end: { x: number; y: number };
		length: number;
		locked: boolean;
	}
	interface IPCB_CommandGroupResult {
		groupId: string;
	}
	type TPCB_FanoutType = 'BGA' | 'ViaInPad' | 'Top' | 'Bottom' | 'Left' | 'Right' | 'UpperLeft' | 'LowerLeft' | 'UpperRight' | 'LowerRight' | 'Outward' | 'Inward' | 'OutOrIn';
	interface IPCB_FanoutOptions {
		componentIds: Array<string>;
		fanoutType: TPCB_FanoutType;
		operationType?: 'Add' | 'Remove';
		bgaFanoutDirect?: '45' | '90';
		viaPadSpacingType?: 'PadCenter' | 'Custom';
		viaPadSpacing?: number;
		minChannelSpace?: number;
		includeNoNet?: boolean;
		fanoutOuter2Rows?: boolean;
		ignoreDRC?: boolean;
		track?: {
			 widthRuleType: 'FollowRule' | 'Custom';
			 width: number;
		};
		via?: {
			 type: 'Through' | 'Blind';
			 blindName?: string;
			 sizeType: 'FollowRule' | 'Custom';
			 outsideDiameter?: number;
			 insideDiameter?: number;
		};
	}
	interface IPCB_FanoutResult {
		accepted: boolean;
		jobId?: string;
	}
	class PCB_Document {
		public importChanges(uuid?: string): Promise<boolean>;
		public importAutoRouteJsonFile(autoRouteFile: File): Promise<boolean>;
		public importAutoRouteSesFile(autoRouteFile: File): Promise<boolean>;
		public importAutoLayoutJsonFile(autoLayoutFile: File): Promise<boolean>;
		public save(): Promise<boolean>;
		public getCalculatingRatlineStatus(): Promise<EPCB_DocumentRatlineCalculatingActiveStatus | undefined>;
		public startCalculatingRatline(): Promise<boolean>;
		public stopCalculatingRatline(): Promise<boolean>;
		public startCanvasUpdateCalculation(): Promise<boolean>;
		public stopCanvasUpdateCalculation(): Promise<boolean>;
		public getCanvasUpdateCalculationStatus(): Promise<EPCB_DocumentCanvasUpdateCalculationActiveStatus | undefined>;
		public triggerCanvasUpdateCalculation(): Promise<boolean>;
		public convertCanvasOriginToDataOrigin(x: number, y: number): Promise<{ x: number; y: number }>;
		public convertDataOriginToCanvasOrigin(x: number, y: number): Promise<{ x: number; y: number }>;
		public getCanvasOrigin(): Promise<{ offsetX: number; offsetY: number }>;
		public setCanvasOrigin(offsetX: number, offsetY: number): Promise<boolean>;
		public navigateToCoordinates(x: number, y: number): Promise<boolean>;
		public navigateToRegion(left: number, right: number, top: number, bottom: number): Promise<boolean>;
		public getPrimitiveAtPoint(x: number, y: number): Promise<IPCB_Primitive | undefined>;
		public getPrimitivesInRegion(left: number, right: number, top: number, bottom: number, leftToRight?: boolean): Promise<Array<IPCB_Primitive>>;
		public zoomToBoardOutline(): Promise<boolean>;
		public getCurrentFilterConfiguration(): Promise<Record<string, any> | undefined>;
		public clearRouting(type?: 'all' | 'net' | 'connection'): Promise<boolean>;
		public autoRouting(props?: IPCB_AutoRoutingProps): Promise<IPCB_AutoRoutingResult>;
		private getAutoRoutingUserConfig(props?: IPCB_AutoRoutingProps): Promise<any>;
		public autoLayout(): Promise<IPCB_AutoLayoutResult>;
		public getFlipBoardState(): Promise<boolean>;
		public setFlipBoardState(flipped: boolean): Promise<boolean>;
		public startAutoRouting(props?: IPCB_AutoRoutingProps): Promise<ISYS_JobHandle>;
		public startAutoLayout(): Promise<ISYS_JobHandle>;
		public getAutoJobStatus(jobId: string): Promise<ISYS_JobStatus | undefined>;
		public cancelAutoJob(jobId: string): Promise<boolean>;
		public getAutoJobLog(jobId: string): Promise<IPCB_AutoJobSnapshot>;
		public getRatlines(options?: IPCB_RatlineQueryOptions): Promise<IPCB_PageResult<IPCB_Ratline>>;
		public beginCommandGroup(name?: string): Promise<IPCB_CommandGroupResult>;
		public commitCommandGroup(groupId: string): Promise<boolean>;
		public rollbackCommandGroup(groupId: string): Promise<boolean>;
		public undoLastCommandGroup(): Promise<boolean>;
		public redoLastCommandGroup(): Promise<boolean>;
		public fanout(options: IPCB_FanoutOptions): Promise<IPCB_FanoutResult>;
	}
	interface IPCB_EqualLengthNetGroupItem {
		name: string;
		nets: Array<string>;
		color: { r: number; g: number; b: number; alpha: number } | null;
	}
	interface IPCB_NetClassItem {
		name: string;
		nets: Array<string>;
		color: { r: number; g: number; b: number; alpha: number } | null;
	}
	interface IPCB_DifferentialPairItem {
		name: string;
		positiveNet: string;
		negativeNet: string;
	}
	interface IPCB_PadPairGroupItem {
		name: string;
		padPairs: Array<[string, string]>;
	}
	interface IPCB_PadPairMinWireLengthItem {
		padPair: [string, string];
		minWireLength: number;
	}
	interface IPCB_ViolationBase {
		ruleName: string;
		errorType: string;
		layerIds: Array<number>;
		position: { x: number; y: number };
		obj1: string;
		obj1Type: string;
		obj2?: string;
		obj2Type?: string;
	}
	interface IPCB_DrcViolation extends IPCB_ViolationBase {
		explanation: string;
		minDistance?: number;
		clearance?: number;
		globalIndex: string;
	}
	interface IPCB_DrcResult {
		state: 'notChecked' | 'checking' | 'passed' | 'failed' | 'incomplete';
		totalCount: number;
		failedItems: number;
		violations: Array<IPCB_DrcViolation>;
		checkedAt?: number;
		groups?: Array<{ name: string; count: number }>;
	}
	interface IPCB_DrcCheckDetailedOptions {
		includeGroups?: boolean;
	}
	class PCB_Drc {
		public check(strict: boolean, userInterface: boolean, includeVerboseError: false): Promise<boolean>;
		public check(strict: boolean, userInterface: boolean, includeVerboseError: true): Promise<Array<any>>;
		public getRealTimeDrcStatus(): Promise<boolean>;
		public startRealTimeDrc(): Promise<boolean>;
		public stopRealTimeDrc(): Promise<boolean>;
		public getCurrentRuleConfigurationName(): Promise<string | undefined>;
		public getCurrentRuleConfiguration(): Promise<Record<string, any> | undefined>;
		public getRuleConfiguration(configurationName: string): Promise<Record<string, any> | undefined>;
		public getAllRuleConfigurations(includeSystem?: boolean): Promise<Array<Record<string, any>>>;
		public saveRuleConfiguration(ruleConfiguration: Record<string, any>, configurationName: string, allowOverwrite?: boolean): Promise<boolean>;
		public renameRuleConfiguration(originalConfigurationName: string, configurationName: string): Promise<boolean>;
		public deleteRuleConfiguration(configurationName: string): Promise<boolean>;
		public getDefaultRuleConfigurationName(): Promise<string | undefined>;
		public setAsDefaultRuleConfiguration(configurationName: string): Promise<boolean>;
		public overwriteCurrentRuleConfiguration(ruleConfiguration: Record<string, any>): Promise<boolean>;
		public getNetRules(): Promise<Array<Record<string, any>>>;
		public overwriteNetRules(netRules: Array<Record<string, any>>): Promise<boolean>;
		public getNetByNetRules(): Promise<Record<string, any>>;
		public overwriteNetByNetRules(netByNetRules: Record<string, any>): Promise<boolean>;
		public getRegionRules(): Promise<Array<Record<string, any>>>;
		public overwriteRegionRules(regionRules: Array<Record<string, any>>): Promise<boolean>;
		public createNetClass(netClassName: string, nets: Array<string>, color: IPCB_EqualLengthNetGroupItem['color']): Promise<boolean>;
		public deleteNetClass(netClassName: string): Promise<boolean>;
		public modifyNetClassName(originalNetClassName: string, netClassName: string): Promise<boolean>;
		public addNetToNetClass(netClassName: string, net: string | Array<string>): Promise<boolean>;
		public removeNetFromNetClass(netClassName: string, net: string | Array<string>): Promise<boolean>;
		public getAllNetClasses(): Promise<Array<IPCB_NetClassItem>>;
		public createDifferentialPair(differentialPairName: string, positiveNet: string, negativeNet: string): Promise<boolean>;
		public deleteDifferentialPair(differentialPairName: string): Promise<boolean>;
		public modifyDifferentialPairName(originalDifferentialPairName: string, differentialPairName: string): Promise<boolean>;
		public modifyDifferentialPairPositiveNet(differentialPairName: string, positiveNet: string): Promise<boolean>;
		public modifyDifferentialPairNegativeNet(differentialPairName: string, negativeNet: string): Promise<boolean>;
		public getAllDifferentialPairs(): Promise<Array<IPCB_DifferentialPairItem> | Record<string, any>>;
		public createEqualLengthNetGroup(equalLengthNetGroupName: string, nets: Array<string>, color: IPCB_EqualLengthNetGroupItem['color']): Promise<boolean>;
		public deleteEqualLengthNetGroup(equalLengthNetGroupName: string): Promise<boolean>;
		public modifyEqualLengthNetGroupName(originalEqualLengthNetGroupName: string, equalLengthNetGroupName: string): Promise<boolean>;
		public addNetToEqualLengthNetGroup(equalLengthNetGroupName: string, net: string | Array<string>): Promise<boolean>;
		public removeNetFromEqualLengthNetGroup(equalLengthNetGroupName: string, net: string | Array<string>): Promise<boolean>;
		public getAllEqualLengthNetGroups(): Promise<Array<IPCB_EqualLengthNetGroupItem>>;
		public createPadPairGroup(padPairGroupName: string, padPairs: Array<[string, string]>): Promise<boolean>;
		public deletePadPairGroup(padPairGroupName: string): Promise<boolean>;
		public modifyPadPairGroupName(originalPadPairGroupName: string, padPairGroupName: string): Promise<boolean>;
		public addPadPairToPadPairGroup(padPairGroupName: string, padPair: [string, string] | Array<[string, string]>): Promise<boolean>;
		public removePadPairFromPadPairGroup(padPairGroupName: string, padPair: [string, string] | Array<[string, string]>): Promise<boolean>;
		public getAllPadPairGroups(): Promise<Array<IPCB_PadPairGroupItem>>;
		public getPadPairGroupMinWireLength(padPairGroupName: string): Promise<Array<IPCB_PadPairMinWireLengthItem>>;
		public getDrcResult(): Promise<IPCB_DrcResult>;
		public checkDetailed(options?: IPCB_DrcCheckDetailedOptions): Promise<IPCB_DrcResult>;
	}
	enum EPCB_RightClickMenuTarget {
		 CANVAS_BLANK = 'canvasBlank',
		 SELECT_COMPONENT = 'selectComponent',
		 SELECT_PAD = 'selectPad',
		 SELECT_TRACK = 'selectTrack',
		 SELECT_VIA = 'selectVia',
		 SELECT_RATLINE = 'selectRatline',
		 SELECT_2D_LINE = 'select2DLine',
		 SELECT_TEXT = 'selectText',
		 SELECT_IMAGE = 'selectImage',
		 SELECT_BLEND = 'selectBlend',
		 DRAW_TRACK = 'drawTrack',
		 DRAW_POLYGON = 'drawPolygon',
		 DRAW_VIA = 'drawVia',
		 DRAW_PAD = 'drawPad',
		 MODIFY_POLYGON = 'modifyPolygon',
	}
	type TSYS_RightClickMenuItemIcon = {
		 type: 'builtin';
		 name: string;
	} | {
		 type: 'dataUrl';
		 dataUrl: string;
	};
	type TSYS_RightClickMenuItemAction = {
		 type: 'extensionCommand';
		 registerFn: string;
	} | {
		 type: 'builtinCommand';
		 command: string;
		 args?: Record<string, any>;
	};
	interface ISYS_RightClickMenuItem {
		id: string;
		title?: string;
		icon?: string;
		registerFn?: string;
		menuItems?: Array<ISYS_RightClickMenuItem | null>;
		iconConfig?: TSYS_RightClickMenuItemIcon;
		action?: TSYS_RightClickMenuItemAction;
		enabled?: boolean;
		checked?: boolean;
		visible?: boolean;
		hotkeyText?: string;
		keepMenuOpen?: boolean;
	}
	interface ISYS_RightClickMenuItemPosition {
		mode: 'start' | 'end' | 'before' | 'after' | 'index';
		referenceId?: string;
		index?: number;
	}
	class PCB_RightClickMenu {
		private extensionUuid?: string;
		public constructor(extensionUuid?: string);
		public getMenu(target: EPCB_RightClickMenuTarget): Promise<Array<ISYS_RightClickMenuItem | null>>;
		public insertMenuItem(target: EPCB_RightClickMenuTarget, menuItem: ISYS_RightClickMenuItem, position: ISYS_RightClickMenuItemPosition): Promise<boolean>;
		public updateMenuItem(target: EPCB_RightClickMenuTarget, menuItemId: string, patch: Partial<Omit<ISYS_RightClickMenuItem, 'id'>>): Promise<boolean>;
		public removeMenuItem(target: EPCB_RightClickMenuTarget, menuItemId: string): Promise<boolean>;
		public replaceMenu(target: EPCB_RightClickMenuTarget, menuItems: Array<ISYS_RightClickMenuItem | null>): Promise<boolean>;
		public resetMenu(target: EPCB_RightClickMenuTarget): Promise<boolean>;
	}
	enum EPCB_MouseEventType {
		 SELECTED = 'selected',
		 CLEAR_SELECTED = 'clearSelected',
		 MOVE = 'move',
	}
	enum EPCB_PrimitiveEventType {
		 DELETE = 'delete',
		 CREATE = 'add',
		 MODIFY = 'modify',
	}
	enum EPCB_NetEventType {
		 ADD = 'add',
		 REMOVE = 'remove',
		 SELECTED = 'selected',
	}
	class PCB_Event {
		private extensionUuid?: string;
		public constructor(extensionUuid?: string);
		public addMouseEventListener(id: string, eventType: 'all' | EPCB_MouseEventType, callFn: (eventType: EPCB_MouseEventType, props: [{ primitiveId: string; primitiveType: EPCB_PrimitiveType; net?: string; designator?: string; parentComponentPrimitiveId?: string; parentComponentDesignator?: string }]) => void | Promise<void>, onlyOnce?: boolean): void;
		public addPrimitiveEventListener(id: string, eventType: 'all' | EPCB_PrimitiveEventType, callFn: (eventType: EPCB_PrimitiveEventType, props: [{ primitiveId: string; primitiveType: EPCB_PrimitiveType; net?: string; designator?: string; parentComponentPrimitiveId?: string; parentComponentDesignator?: string }]) => void | Promise<void>, onlyOnce?: boolean): void;
		public addNetEventListener(id: string, eventType: 'all' | EPCB_NetEventType, callFn: (eventType: EPCB_NetEventType, props: [{ net: string }]) => void | Promise<void>, onlyOnce?: boolean): void;
		public addCrossProbeSelectEventListener(id: string, callFn: (props: any) => void | Promise<void>): void;
		public addRealTimeDrcResultEventListener(id: string, eventType: 'all', callFn: (eventType: undefined, props: [{ drcResult: any }]) => void | Promise<void>): void;
		public addRayTracerEngine3DViewClickMaterialEventListener(id: string, callFn: (props: { materialId: number; material: any }) => void | Promise<void>, onlyOnce?: boolean): void;
		public addRayTracerEngine3DViewCameraChangeEventListener(id: string, callFn: (props: { position: { x: number; y: number; z: number }; rotation: { x: number; y: number; z: number }; focalLength: number }) => void | Promise<void>, onlyOnce?: boolean): void;
		public addRayTracerEngineRenderProgressEventListener(id: string, callFn: (props: { loaded: boolean; sampleCount: number }) => void | Promise<void>, onlyOnce?: boolean): void;
		public addImageEventListener(id: string, callFn: (message: { file?: File; source: 'toolbar' | 'paste' }) => void | Promise<void>): boolean;
		public removeEventListener(id: string): boolean;
		public isEventListenerAlreadyExist(id: string): boolean;
	}
	class PCB_ImageTool {
		public startPlaceVectorImage(options: { path: string; width: number; height: number; unit?: 'mm' | 'mil' }): Promise<boolean>;
		public startPlaceTrueColorPicture(options: { imageBlob: Blob; width: number; height: number; unit?: 'mm' | 'mil'; fileName: string }): Promise<boolean>;
		public processImage(file: File, options?: { maxBytes?: number; acceptableBytes?: number }): Promise<{
			file: File;
			dataURL: string;
			width: number;
			height: number;
			 actualFormat: string;
			 msg: string;
		}>;
		public runInsertImageCommand(): Promise<boolean>;
	}
	enum EPCB_LayerType {
		 SIGNAL = 'SIGNAL',
		 INTERNAL_ELECTRICAL = 'PLANE',
		 SILKSCREEN = 'SILKSCREEN',
		 SOLDER_MASK = 'SOLDER_MASK',
		 PASTE_MASK = 'PASTE_MASK',
		 ASSEMBLY = 'ASSEMBLY',
		 OTHER = 'OTHER',
		 CUSTOM = 'CUSTOM',
	}
	enum EPCB_LayerStatus {
		 NOT_USED = 0,
		 SHOW = 1,
		 HIDDEN = 2,
	}
	interface IPCB_LayerItem {
		id: EPCB_LayerId;
		name: string;
		type: EPCB_LayerType;
		color: string;
		transparency: number;
		inactiveColor: string;
		inactiveTransparency: number;
		layerStatus: EPCB_LayerStatus;
		locked: boolean;
	}
	type TPCB_LayersOfCustom = EPCB_LayerId.CUSTOM_1 | EPCB_LayerId.CUSTOM_2 | EPCB_LayerId.CUSTOM_3 | EPCB_LayerId.CUSTOM_4 | EPCB_LayerId.CUSTOM_5 | EPCB_LayerId.CUSTOM_6 | EPCB_LayerId.CUSTOM_7 | EPCB_LayerId.CUSTOM_8 | EPCB_LayerId.CUSTOM_9 | EPCB_LayerId.CUSTOM_10 | EPCB_LayerId.CUSTOM_11 | EPCB_LayerId.CUSTOM_12 | EPCB_LayerId.CUSTOM_13 | EPCB_LayerId.CUSTOM_14 | EPCB_LayerId.CUSTOM_15 | EPCB_LayerId.CUSTOM_16 | EPCB_LayerId.CUSTOM_17 | EPCB_LayerId.CUSTOM_18 | EPCB_LayerId.CUSTOM_19 | EPCB_LayerId.CUSTOM_20 | EPCB_LayerId.CUSTOM_21 | EPCB_LayerId.CUSTOM_22 | EPCB_LayerId.CUSTOM_23 | EPCB_LayerId.CUSTOM_24 | EPCB_LayerId.CUSTOM_25 | EPCB_LayerId.CUSTOM_26 | EPCB_LayerId.CUSTOM_27 | EPCB_LayerId.CUSTOM_28 | EPCB_LayerId.CUSTOM_29 | EPCB_LayerId.CUSTOM_30;
	type TPCB_LayersInTheSelectable = TPCB_LayersOfInner | TPCB_LayersOfCustom | EPCB_LayerId.TOP | EPCB_LayerId.TOP_SILKSCREEN | EPCB_LayerId.TOP_SOLDER_MASK | EPCB_LayerId.TOP_PASTE_MASK | EPCB_LayerId.TOP_ASSEMBLY | EPCB_LayerId.TOP_STIFFENER | EPCB_LayerId.BOTTOM | EPCB_LayerId.BOTTOM_SILKSCREEN | EPCB_LayerId.BOTTOM_SOLDER_MASK | EPCB_LayerId.BOTTOM_PASTE_MASK | EPCB_LayerId.BOTTOM_ASSEMBLY | EPCB_LayerId.BOTTOM_STIFFENER | EPCB_LayerId.BOARD_OUTLINE | EPCB_LayerId.MULTI | EPCB_LayerId.DOCUMENT | EPCB_LayerId.MECHANICAL | EPCB_LayerId.DRILL_DRAWING | EPCB_LayerId.RATLINE | EPCB_LayerId.COMPONENT_SHAPE | EPCB_LayerId.COMPONENT_MARKING | EPCB_LayerId.PIN_SOLDERING | EPCB_LayerId.PIN_FLOATING | EPCB_LayerId.SHELL_3D_OUTLINE | EPCB_LayerId.SHELL_3D_TOP | EPCB_LayerId.SHELL_3D_BOTTOM;
	type TPCB_NumberOfCopperLayers = 2 | 4 | 6 | 8 | 10 | 12 | 14 | 16 | 18 | 20 | 22 | 24 | 26 | 28 | 30 | 32;
	enum EPCB_LayerColorConfiguration {
		 JLCEDA = 1,
		 EASYEDA = 1,
		 ALTIUM_DESIGNER = 2,
		 PADS = 3,
		 KICAD = 4,
	}
	enum EPCB_PcbPlateType {
		 NORMAL = 1,
		 FPC = 2,
	}
	type TPCB_LayerTypesOfInnerLayer = EPCB_LayerType.SIGNAL | EPCB_LayerType.INTERNAL_ELECTRICAL;
	enum EPCB_InactiveLayerDisplayMode {
		 NORMAL_BRIGHTNESS = 0,
		 TURN_GRAY = 1,
		 HIDE = 2,
	}
	interface IPCB_PhysicalStackingConfiguration {
		name: string;
		list: Array<Record<string, unknown>>;
		layerCount: number;
	}
	interface IPCB_SubstratePhysicalProperties {
		numberOfLayers: TPCB_NumberOfCopperLayers;
		substrateMaterial: 'Common' | 'FPC Flexible';
	}
	interface IPCB_StackupLayer {
		layerId: number;
		layerName: string;
		layerType: string;
		kind: 'copper' | 'dielectric' | 'other';
		material: string;
		thickness: number;
		permittivity: number;
		lossTangent: number;
		isKeepIsland: boolean;
		zIndex: number;
	}
	interface IPCB_Stackup {
		layers: Array<IPCB_StackupLayer>;
		totalThickness: number;
		unit: string;
	}
	class PCB_Layer {
		public getCurrentLayer(): Promise<IPCB_LayerItem | undefined>;
		public selectLayer(layer: TPCB_LayersInTheSelectable): Promise<boolean>;
		public setLayerVisible(layer?: TPCB_LayersInTheSelectable | Array<TPCB_LayersInTheSelectable>, setOtherLayerInvisible?: boolean): Promise<boolean>;
		public setLayerInvisible(layer?: TPCB_LayersInTheSelectable | Array<TPCB_LayersInTheSelectable>, setOtherLayerVisible?: boolean): Promise<boolean>;
		public lockLayer(layer?: TPCB_LayersInTheSelectable | Array<TPCB_LayersInTheSelectable>): Promise<boolean>;
		public unlockLayer(layer?: TPCB_LayersInTheSelectable | Array<TPCB_LayersInTheSelectable>): Promise<boolean>;
		public setTheNumberOfCopperLayers(numberOfLayers: TPCB_NumberOfCopperLayers): Promise<boolean>;
		public getTheNumberOfCopperLayers(): Promise<number>;
		public setLayerColorConfiguration(colorConfiguration: EPCB_LayerColorConfiguration): Promise<boolean>;
		public setInactiveLayerTransparency(transparency: number): Promise<boolean>;
		public setPcbType(pcbType: EPCB_PcbPlateType): Promise<boolean>;
		public addCustomLayer(): Promise<TPCB_LayersOfCustom | undefined>;
		public removeLayer(layer: TPCB_LayersOfCustom): Promise<boolean>;
		public modifyLayer(layer: TPCB_LayersInTheSelectable, property: { name?: string; type?: TPCB_LayerTypesOfInnerLayer; color?: string; transparency?: number }): Promise<boolean>;
		public getAllLayers(): Promise<Array<IPCB_LayerItem>>;
		public setInactiveLayerDisplayMode(displayMode?: EPCB_InactiveLayerDisplayMode): Promise<boolean>;
		public getCurrentPhysicalStackingConfigurationName(): Promise<string | undefined>;
		public getCurrentPhysicalStackingConfiguration(): Promise<IPCB_PhysicalStackingConfiguration | undefined>;
		public getPhysicalStackingConfiguration(configurationName: string, physicalProps?: IPCB_SubstratePhysicalProperties): Promise<IPCB_PhysicalStackingConfiguration | undefined>;
		public getAllPhysicalStackingConfigurations(physicalProps?: IPCB_SubstratePhysicalProperties): Promise<Array<IPCB_PhysicalStackingConfiguration>>;
		public savePhysicalStackingConfiguration(physicalStackingConfiguration: IPCB_PhysicalStackingConfiguration, configurationName: string, physicalProps?: IPCB_SubstratePhysicalProperties, allowOverwrite?: boolean): Promise<boolean>;
		public renamePhysicalStackingConfiguration(originalConfigurationName: string, configurationName: string, physicalProps?: IPCB_SubstratePhysicalProperties): Promise<boolean>;
		public deletePhysicalStackingConfiguration(configurationName: string, physicalProps?: IPCB_SubstratePhysicalProperties): Promise<boolean>;
		public getDefaultPhysicalStackingConfigurationName(physicalProps?: IPCB_SubstratePhysicalProperties): Promise<string | undefined>;
		public setAsDefaultPhysicalStackingConfiguration(configurationName: string, physicalProps?: IPCB_SubstratePhysicalProperties): Promise<boolean>;
		public overwriteCurrentPhysicalStackingConfiguration(physicalStackingConfiguration: IPCB_PhysicalStackingConfiguration): Promise<boolean>;
		public getStackup(): Promise<IPCB_Stackup>;
	}
	class PCB_Tool {
		public switchTool(tool: string, params?: any): Promise<boolean>;
	}
	interface IPCB_BomPropertiesTableColumns {
		property: string;
		title?: string;
		sort?: null | 'asc' | 'desc';
		group?: null | 'Yes' | 'No';
		orderWeight?: number;
	}
	enum ESYS_NetlistType {
		 ALLEGRO = 'Allegro',
		 PADS = 'PADS',
		 PROTEL2 = 'Protel2',
		 JLCEDA_PRO = 'JLCEDA',
		 EASYEDA_PRO = 'EasyEDA',
		 ALTIUM_DESIGNER = 'Protel2',
		 DISA = 'DISA',
		 DISA_SIMULATION = 'DSNET',
	}
	enum EPCB_PdfOutputMethod {
		 MULTI_PAGE_PDF = 'paged',
		 MULTIPLE_SINGLE_PAGE_PDF = 'separated',
		 SINGLE_PAGE_PDF = 'merged',
	}
	class PCB_ManufactureData {
		public getGerberFile(fileName?: string, colorSilkscreen?: boolean, unit?: ESYS_Unit.MILLIMETER | ESYS_Unit.INCH, digitalFormat?: { integerNumber: number; decimalNumber: number }, other?: { metallicDrillingInformation: boolean; nonMetallicDrillingInformation: boolean; drillTable: boolean; flyingProbeTestingFile: boolean }, layers?: Array<{ layerId: EPCB_LayerId; isMirror: boolean }>, objects?: Array<'Pad' | 'Via' | 'Track' | 'Text' | 'Image' | 'Dimension' | 'BoardOutline' | 'BoardCutout' | 'CopperFilled' | 'SolidRegion' | 'FPCStiffener' | 'Line' | 'PlaneZone' | 'ComponentProperty' | 'ComponentSilkscreen' | 'TearDrop'>): Promise<File | undefined>;
		public get3DFile(fileName?: string, fileType?: 'step' | 'obj', element?: Array<'Component Model' | 'Via' | 'Silkscreen' | 'Wire In Signal Layer'>, modelMode?: 'Outfit' | 'Parts', autoGenerateModels?: boolean): Promise<File | undefined>;
		public get3DShellFile(fileName?: string, fileType?: 'stl' | 'step' | 'obj'): Promise<File | undefined>;
		public getPickAndPlaceFile(fileName?: string, fileType?: 'xlsx' | 'csv', unit?: ESYS_Unit.MILLIMETER | ESYS_Unit.MIL): Promise<File | undefined>;
		public getFlyingProbeTestFile(fileName?: string): Promise<File | undefined>;
		public getBomTemplates(): Promise<Array<string>>;
		public uploadBomTemplateFile(templateFile: File, template?: string): Promise<string | undefined>;
		public getBomTemplateFile(template: string): Promise<File | undefined>;
		public deleteBomTemplate(template: string): Promise<boolean>;
		public getBomFile(fileName?: string, fileType?: 'xlsx' | 'csv', template?: string, filterOptions?: Array<{ property: string; includeValue: boolean | string }>, statistics?: Array<string>, property?: Array<string>, columns?: Array<IPCB_BomPropertiesTableColumns>): Promise<File | undefined>;
		public getTestPointFile(fileName?: string, fileType?: 'xlsx' | 'csv'): Promise<File | undefined>;
		public getNetlistFile(fileName?: string, netlistType?: ESYS_NetlistType): Promise<File | undefined>;
		public getDxfFile(fileName?: string, layers?: Array<{ layerId: EPCB_LayerId; mirror: boolean }>, objects?: Array<string>): Promise<File | undefined>;
		public getPdfFile(fileName?: string, outputMethod?: EPCB_PdfOutputMethod, contentConfig?: { displayAttributesAsMenu: boolean; showOutlineOnly: boolean }, watermark?: { show?: boolean; content?: string; styleConfig?: { color: string; transparency: 'Opaque' | '75%' | '50%' | '25%'; font: string; fontSize: { unit: ESYS_Unit.INCH | ESYS_Unit.MIL | ESYS_Unit.MILLIMETER; value: number }; style: { bold: boolean; italic: boolean; underline: boolean }; slope: 0 | 45 | 90; denseness: 'Single' | 'Sparse' | 'Std' | 'Dense' } }, graphPageConfig?: Array<{ checked: boolean; name: string }>): Promise<File | undefined>;
		public getIpcD356AFile(fileName?: string): Promise<File | undefined>;
		public getIpc2581CFile(fileName?: string, fileType?: 'xml' | 'cvg' | '2581', unit?: ESYS_Unit.INCH | ESYS_Unit.MILLIMETER, oemNumber?: 'Device' | 'Manufacturer Part' | 'Supplier Part' | 'Comment'): Promise<File | undefined>;
		public getOpenDatabaseDoublePlusFile(fileName?: string, unit?: ESYS_Unit.INCH | ESYS_Unit.MILLIMETER, otherData?: { metallizedDrilledHoles?: boolean; nonMetallizedDrilledHoles?: boolean; drillTable?: boolean; flyingProbeTestFile?: boolean }, layers?: Array<{ layerId: EPCB_LayerId; mirror: boolean }>, objects?: Array<{ objectName: string }>): Promise<File | undefined>;
		public getInteractiveBomFile(fileName?: string): Promise<File | undefined>;
		public getDsnFile(fileName?: string): Promise<File | undefined>;
		public getAutoRouteJsonFile(fileName?: string): Promise<File | undefined>;
		public getAutoRouteJsonFileForJRouter(fileName?: string): Promise<File | undefined>;
		public getAutoLayoutJsonFile(fileName?: string): Promise<File | undefined>;
		public getAltiumDesignerFile(fileName?: string): Promise<File | undefined>;
		public getPadsFile(fileName?: string): Promise<File | undefined>;
		public getPcbInfoFile(fileName?: string): Promise<File | undefined>;
		public getIdxFile(fileName?: string): Promise<File | undefined>;
		public placeComponentsOrder(interactive?: boolean, ignoreWarning?: boolean): Promise<boolean>;
		public placeSmtComponentsOrder(interactive?: boolean, ignoreWarning?: boolean): Promise<boolean>;
		public placePcbOrder(interactive?: boolean, ignoreWarning?: boolean): Promise<boolean>;
		public place3DShellOrder(interactive?: boolean, ignoreWarning?: boolean): Promise<boolean>;
		public getManufactureData(): Promise<File | undefined>;
	}
	type TPCB_PolygonSourceArray = Array<'L' | 'ARC' | 'CARC' | 'C' | 'R' | 'CIRCLE' | number>;
	interface IPCB_DiscretizeOptions {
		tolerance?: number;
	}
	interface IPCB_DiscretizedPoint {
		x: number;
		y: number;
	}
	class IPCB_Polygon {
		private polygon: TPCB_PolygonSourceArray;
		public constructor(polygon: TPCB_PolygonSourceArray);
		public getSource(): TPCB_PolygonSourceArray;
		public getCenter(): Promise<{ x: number; y: number }>;
		public discretize(options?: IPCB_DiscretizeOptions): Promise<Array<IPCB_DiscretizedPoint> | null>;
		private validateSource(complexPolygon: TPCB_PolygonSourceArray): TPCB_PolygonSourceArray;
	}
	class IPCB_ComplexPolygon {
		private complexPolygon: Array<TPCB_PolygonSourceArray>;
		public constructor(complexPolygon: TPCB_PolygonSourceArray | Array<TPCB_PolygonSourceArray> | IPCB_Polygon | Array<IPCB_Polygon>);
		public addSource(complexPolygon: TPCB_PolygonSourceArray | Array<TPCB_PolygonSourceArray> | IPCB_Polygon | Array<IPCB_Polygon>): IPCB_ComplexPolygon;
		public getSource(): TPCB_PolygonSourceArray | Array<TPCB_PolygonSourceArray>;
		public getSourceStrictComplex(): Array<TPCB_PolygonSourceArray>;
		public getCenter(): Promise<{ x: number; y: number }>;
		public toPolygon(): Array<IPCB_Polygon>;
		private validateSource(complexPolygon: TPCB_PolygonSourceArray | Array<TPCB_PolygonSourceArray> | IPCB_Polygon | Array<IPCB_Polygon>): Array<TPCB_PolygonSourceArray>;
	}
	class PCB_MathPolygon {
		public createPolygon(polygon: TPCB_PolygonSourceArray): IPCB_Polygon | undefined;
		public createComplexPolygon(complexPolygon: TPCB_PolygonSourceArray | Array<TPCB_PolygonSourceArray> | IPCB_Polygon | Array<IPCB_Polygon>): IPCB_ComplexPolygon | undefined;
		public splitPolygon(...complexPolygons: Array<IPCB_ComplexPolygon>): Array<IPCB_Polygon>;
		public discretize(polygon: IPCB_Polygon | TPCB_PolygonSourceArray, options?: IPCB_DiscretizeOptions): Promise<Array<IPCB_DiscretizedPoint> | null>;
		public calculateWidth(complexPolygon: TPCB_PolygonSourceArray | Array<TPCB_PolygonSourceArray> | IPCB_Polygon | IPCB_ComplexPolygon): number;
		public calculateHeight(complexPolygon: TPCB_PolygonSourceArray | Array<TPCB_PolygonSourceArray> | IPCB_Polygon | IPCB_ComplexPolygon): number;
		public calculateBBoxHeight(complexPolygon: TPCB_PolygonSourceArray | Array<TPCB_PolygonSourceArray>): number;
		public traceImage(options: { imageBlob?: Blob; imageWidth?: number; imageHeight?: number; quality?: 'low' | 'high'; tolerance?: number; simplify?: number; smoothness?: number; despeckle?: number; whiteAsTransparent?: boolean; antiphase?: boolean }): Promise<{ path: string; sourcePreviewUrl: string; previewUrl: string; width: number; height: number } | undefined>;
		public disposeTrace(): Promise<void>;
		public convertImageToComplexPolygon(imageBlob: Blob, imageWidth: number, imageHeight: number, tolerance?: number, simplification?: number, smoothing?: number, despeckling?: number, whiteAsBackgroundColor?: boolean, inversion?: boolean): Promise<IPCB_ComplexPolygon | undefined>;
		private calculateBBoxWidth(complexPolygon: TPCB_PolygonSourceArray | Array<TPCB_PolygonSourceArray>): number;
	}
	interface IPCB_NetInfo {
		net: string;
		color: { r: number; g: number; b: number; alpha: number } | null;
		length: number;
	}
	class PCB_Net {
		public getAllNets(): Promise<Array<IPCB_NetInfo>>;
		public getNet(net: string): Promise<IPCB_NetInfo | undefined>;
		public getAllNetsName(): Promise<Array<string>>;
		public getAllNetName(): Promise<Array<string>>;
		public getNetLength(net: string): Promise<number | undefined>;
		public getNetColor(net: string): Promise<IPCB_NetInfo['color'] | undefined>;
		public setNetColor(net: string, color: IPCB_NetInfo['color']): Promise<boolean>;
		public getAllPrimitivesByNet(net: string, primitiveTypes?: Array<EPCB_PrimitiveType>): Promise<Array<IPCB_Primitive>>;
		public selectNet(net: string): Promise<boolean>;
		public unselectNet(net: string): Promise<boolean>;
		public unselectAllNets(): Promise<boolean>;
		public highlightNet(net: string): Promise<boolean>;
		public unhighlightNet(net: string): Promise<boolean>;
		public unhighlightAllNets(): Promise<boolean>;
		public getNetlist(type?: ESYS_NetlistType): Promise<string>;
		public setNetlist(type: ESYS_NetlistType | undefined, netlist: string): Promise<boolean>;
	}
	interface IPCB_BBox {
		left: number;
		right: number;
		top: number;
		bottom: number;
	}
	interface IPCB_FindPrimitivesOptions {
		bbox?: IPCB_BBox;
		layers?: Array<number>;
		types?: Array<EPCB_PrimitiveType>;
		net?: string;
		locked?: boolean;
		cursor?: string;
		limit?: number;
	}
	interface IPCB_PrimitiveSummary {
		primitiveId: string;
		type: EPCB_PrimitiveType;
		layerId: number;
		net: string;
		bbox: IPCB_BBox;
		locked: boolean;
		componentId?: string;
		designator?: string;
	}
	class PCB_Primitive {
		public getPrimitiveTypeByPrimitiveId(id: string): Promise<EPCB_PrimitiveType | undefined>;
		public getPrimitiveByPrimitiveId(id: string): Promise<IPCB_Primitive | undefined>;
		public getPrimitivesByPrimitiveId(ids: Array<string>): Promise<Array<IPCB_Primitive>>;
		public getPrimitivesBBox(primitiveIds: Array<string | IPCB_Primitive>): Promise<{ minX: number; minY: number; maxX: number; maxY: number } | undefined>;
		public getPrimitiveBoardLine(primitiveId: string, layers?: Array<EPCB_LayerId>): Promise<IPCB_ComplexPolygon | undefined>;
		public findPrimitives(options: IPCB_FindPrimitivesOptions): Promise<IPCB_PageResult<IPCB_PrimitiveSummary>>;
	}
	interface IPCB_PrimitiveAPI {
		create: (...args: any[]) => IPCB_Primitive | undefined | Promise<IPCB_Primitive> | Promise<IPCB_Primitive | undefined>;
		delete: (primitiveIds: string | any | Array<string> | Array<any>) => boolean | Promise<boolean>;
		modify: (primitiveId: string | any, ...args: any[]) => IPCB_Primitive | undefined | Promise<IPCB_Primitive> | Promise<IPCB_Primitive | undefined>;
		get: { (primitiveIds: string): IPCB_Primitive | undefined | Promise<IPCB_Primitive | undefined>; (primitiveIds: Array<string>): Array<IPCB_Primitive> | Promise<Array<IPCB_Primitive>> };
		getAllPrimitiveId: (...args: any[]) => Array<string> | Promise<Array<string>>;
		getAll: (...args: any[]) => Array<IPCB_Primitive> | Promise<Array<IPCB_Primitive>>;
	}
	type TPCB_LayersOfLine = TPCB_LayersOfCopper | TPCB_LayersOfCustom | EPCB_LayerId.TOP_SILKSCREEN | EPCB_LayerId.TOP_SOLDER_MASK | EPCB_LayerId.TOP_PASTE_MASK | EPCB_LayerId.TOP_ASSEMBLY | EPCB_LayerId.BOTTOM_SILKSCREEN | EPCB_LayerId.BOTTOM_SOLDER_MASK | EPCB_LayerId.BOTTOM_PASTE_MASK | EPCB_LayerId.BOTTOM_ASSEMBLY | EPCB_LayerId.BOARD_OUTLINE | EPCB_LayerId.DOCUMENT | EPCB_LayerId.MECHANICAL | EPCB_LayerId.DRILL_DRAWING;
	enum EPCB_PrimitiveArcInteractiveMode {
		 TWO_POINT_ARC = 1,
		 CENTER_ARC = 2,
	}
	enum EPCB_PrimitiveViaType {
		 VIA = 0,
		 BLIND = 1,
		 SUTURE = 2,
	}
	interface IPCB_PrimitiveSolderMaskAndPasteMaskExpansion {
		topSolderMask?: number;
		bottomSolderMask?: number;
		topPasteMask?: number;
		bottomPasteMask?: number;
	}
	class IPCB_PrimitiveVia implements IPCB_Primitive {
		private async: boolean;
		private readonly primitiveType: EPCB_PrimitiveType.VIA;
		private primitiveId?: string;
		private net: string;
		private x: number;
		private y: number;
		private holeDiameter: number;
		private diameter: number;
		private viaType: EPCB_PrimitiveViaType;
		private designRuleBlindViaName: string | null;
		private solderMaskExpansion: IPCB_PrimitiveSolderMaskAndPasteMaskExpansion | null;
		private primitiveLock: boolean;
		public constructor(net: string, x: number, y: number, holeDiameter: number, diameter: number, viaType?: EPCB_PrimitiveViaType, designRuleBlindViaName?: string | null, solderMaskExpansion?: IPCB_PrimitiveSolderMaskAndPasteMaskExpansion | null, primitiveLock?: boolean, primitiveId?: string);
		public create(): Promise<IPCB_PrimitiveVia>;
		public getState_PrimitiveType(): EPCB_PrimitiveType;
		public getState_PrimitiveId(): string;
		public getState_Net(): string;
		public getState_X(): number;
		public getState_Y(): number;
		public getState_HoleDiameter(): number;
		public getState_Diameter(): number;
		public getState_ViaType(): EPCB_PrimitiveViaType;
		public getState_DesignRuleBlindViaName(): string | null;
		public getState_SolderMaskExpansion(): IPCB_PrimitiveSolderMaskAndPasteMaskExpansion | null;
		public getState_PrimitiveLock(): boolean;
		public setState_Net(net: string): IPCB_PrimitiveVia;
		public setState_X(x: number): IPCB_PrimitiveVia;
		public setState_Y(y: number): IPCB_PrimitiveVia;
		public setState_HoleDiameter(holeDiameter: number): IPCB_PrimitiveVia;
		public setState_Diameter(diameter: number): IPCB_PrimitiveVia;
		public setState_ViaType(viaType: EPCB_PrimitiveViaType): IPCB_PrimitiveVia;
		public setState_DesignRuleBlindViaName(designRuleBlindViaName: string | null): IPCB_PrimitiveVia;
		public setState_SolderMaskExpansion(solderMaskExpansion: IPCB_PrimitiveSolderMaskAndPasteMaskExpansion | null): IPCB_PrimitiveVia;
		public setState_PrimitiveLock(primitiveLock: boolean): IPCB_PrimitiveVia;
		public toAsync(): IPCB_PrimitiveVia;
		public toSync(): IPCB_PrimitiveVia;
		public isAsync(): boolean;
		public reset(): Promise<IPCB_PrimitiveVia>;
		public done(): Promise<IPCB_PrimitiveVia>;
		public getAdjacentPrimitives(): Promise<Array<IPCB_PrimitiveLine | IPCB_PrimitiveArc>>;
	}
	class IPCB_PrimitiveLine implements IPCB_Primitive {
		private async: boolean;
		private readonly primitiveType: EPCB_PrimitiveType.LINE;
		private primitiveId?: string;
		private net: string;
		private layer: TPCB_LayersOfLine;
		private startX: number;
		private startY: number;
		private endX: number;
		private endY: number;
		private lineWidth: number;
		private primitiveLock: boolean;
		public constructor(net: string, layer: TPCB_LayersOfLine, startX: number, startY: number, endX: number, endY: number, lineWidth?: number, primitiveLock?: boolean, primitiveId?: string);
		public create(): Promise<IPCB_PrimitiveLine>;
		public getState_PrimitiveType(): EPCB_PrimitiveType;
		public getState_PrimitiveId(): string;
		public getState_Net(): string;
		public getState_Layer(): TPCB_LayersOfLine;
		public getState_StartX(): number;
		public getState_StartY(): number;
		public getState_EndX(): number;
		public getState_EndY(): number;
		public getState_LineWidth(): number;
		public getState_PrimitiveLock(): boolean;
		public setState_Net(net: string): IPCB_PrimitiveLine;
		public setState_Layer(layer: TPCB_LayersOfLine): IPCB_PrimitiveLine;
		public setState_StartX(startX: number): IPCB_PrimitiveLine;
		public setState_StartY(startY: number): IPCB_PrimitiveLine;
		public setState_EndX(endX: number): IPCB_PrimitiveLine;
		public setState_EndY(endY: number): IPCB_PrimitiveLine;
		public setState_LineWidth(lineWidth: number): IPCB_PrimitiveLine;
		public setState_PrimitiveLock(primitiveLock: boolean): IPCB_PrimitiveLine;
		public toAsync(): IPCB_PrimitiveLine;
		public toSync(): IPCB_PrimitiveLine;
		public isAsync(): boolean;
		public reset(): Promise<IPCB_PrimitiveLine>;
		public done(): Promise<IPCB_PrimitiveLine>;
		public getAdjacentPrimitives(): Promise<Array<IPCB_PrimitiveLine | IPCB_PrimitiveVia | IPCB_PrimitiveArc>>;
		public getEntireTrack(includeVias: false): Promise<Array<IPCB_PrimitiveLine | IPCB_PrimitiveArc>>;
		public getEntireTrack(includeVias: true): Promise<Array<IPCB_PrimitiveLine | IPCB_PrimitiveArc | IPCB_PrimitiveVia>>;
	}
	class IPCB_PrimitiveArc implements IPCB_Primitive {
		private async: boolean;
		private readonly primitiveType: EPCB_PrimitiveType.ARC;
		private primitiveId?: string;
		private net: string;
		private layer: TPCB_LayersOfLine;
		private startX: number;
		private startY: number;
		private endX: number;
		private endY: number;
		private arcAngle: number;
		private lineWidth: number;
		private interactiveMode: EPCB_PrimitiveArcInteractiveMode;
		private primitiveLock: boolean;
		public constructor(net: string, layer: TPCB_LayersOfLine, startX: number, startY: number, endX: number, endY: number, arcAngle: number, lineWidth?: number, interactiveMode?: EPCB_PrimitiveArcInteractiveMode, primitiveLock?: boolean, primitiveId?: string);
		public create(): Promise<IPCB_PrimitiveArc>;
		public getState_PrimitiveType(): EPCB_PrimitiveType;
		public getState_PrimitiveId(): string;
		public getState_Net(): string;
		public getState_Layer(): TPCB_LayersOfLine;
		public getState_StartX(): number;
		public getState_StartY(): number;
		public getState_EndX(): number;
		public getState_EndY(): number;
		public getState_ArcAngle(): number;
		public getState_LineWidth(): number;
		public getState_InteractiveMode(): EPCB_PrimitiveArcInteractiveMode;
		public getState_PrimitiveLock(): boolean;
		public setState_Net(net: string): IPCB_PrimitiveArc;
		public setState_Layer(layer: TPCB_LayersOfLine): IPCB_PrimitiveArc;
		public setState_StartX(startX: number): IPCB_PrimitiveArc;
		public setState_StartY(startY: number): IPCB_PrimitiveArc;
		public setState_EndX(endX: number): IPCB_PrimitiveArc;
		public setState_EndY(endY: number): IPCB_PrimitiveArc;
		public setState_ArcAngle(arcAngle: number): IPCB_PrimitiveArc;
		public setState_LineWidth(lineWidth: number): IPCB_PrimitiveArc;
		public setState_InteractiveMode(interactiveMode: EPCB_PrimitiveArcInteractiveMode): IPCB_PrimitiveArc;
		public setState_PrimitiveLock(primitiveLock: boolean): IPCB_PrimitiveArc;
		public toAsync(): IPCB_PrimitiveArc;
		public toSync(): IPCB_PrimitiveArc;
		public isAsync(): boolean;
		public reset(): Promise<IPCB_PrimitiveArc>;
		public done(): Promise<IPCB_PrimitiveArc>;
		public getAdjacentPrimitives(): Promise<Array<IPCB_PrimitiveLine | IPCB_PrimitiveVia | IPCB_PrimitiveArc>>;
		public getEntireTrack(includeVias: false): Promise<Array<IPCB_PrimitiveLine | IPCB_PrimitiveArc>>;
		public getEntireTrack(includeVias: true): Promise<Array<IPCB_PrimitiveLine | IPCB_PrimitiveArc | IPCB_PrimitiveVia>>;
	}
	class PCB_PrimitiveArc implements IPCB_PrimitiveAPI {
		public create(net: string, layer: TPCB_LayersOfLine, startX: number, startY: number, endX: number, endY: number, arcAngle: number, lineWidth?: number, interactiveMode?: EPCB_PrimitiveArcInteractiveMode, primitiveLock?: boolean): Promise<IPCB_PrimitiveArc | undefined>;
		public delete(primitiveIds: string | IPCB_PrimitiveArc | Array<string> | Array<IPCB_PrimitiveArc>): Promise<boolean>;
		public modify(primitiveId: string | IPCB_PrimitiveArc, property: { net?: string; layer?: TPCB_LayersOfLine; startX?: number; startY?: number; endX?: number; endY?: number; arcAngle?: number; lineWidth?: number; interactiveMode?: EPCB_PrimitiveArcInteractiveMode; primitiveLock?: boolean }): Promise<IPCB_PrimitiveArc | undefined>;
		public get(primitiveIds: string): Promise<IPCB_PrimitiveArc | undefined>;
		public get(primitiveIds: Array<string>): Promise<Array<IPCB_PrimitiveArc>>;
		public getAllPrimitiveId(net?: string, layer?: TPCB_LayersOfLine, primitiveLock?: boolean): Promise<Array<string>>;
		public getAll(net?: string, layer?: TPCB_LayersOfLine, primitiveLock?: boolean): Promise<Array<IPCB_PrimitiveArc>>;
	}
	type TPCB_LayersOfImage = TPCB_LayersOfCopper | TPCB_LayersOfCustom | EPCB_LayerId.TOP_SILKSCREEN | EPCB_LayerId.TOP_SOLDER_MASK | EPCB_LayerId.TOP_ASSEMBLY | EPCB_LayerId.BOTTOM_SILKSCREEN | EPCB_LayerId.BOTTOM_SOLDER_MASK | EPCB_LayerId.BOTTOM_ASSEMBLY | EPCB_LayerId.DOCUMENT | EPCB_LayerId.MECHANICAL | EPCB_LayerId.DRILL_DRAWING;
	enum EPCB_PrimitiveStringAlignMode {
		 LEFT_TOP = 1,
		 LEFT_MIDDLE = 2,
		 LEFT_BOTTOM = 3,
		 CENTER_TOP = 4,
		 CENTER = 5,
		 CENTER_BOTTOM = 6,
		 RIGHT_TOP = 7,
		 RIGHT_MIDDLE = 8,
		 RIGHT_BOTTOM = 9,
	}
	class IPCB_PrimitiveAttribute implements IPCB_Primitive {
		private async: boolean;
		private readonly primitiveType: EPCB_PrimitiveType.ATTRIBUTE;
		private primitiveId: string;
		private parentPrimitiveId: string;
		private layer: TPCB_LayersOfImage;
		private x: number | null;
		private y: number | null;
		private key: string;
		private value: string;
		private keyVisible: boolean;
		private valueVisible: boolean;
		private fontFamily: string;
		private fontSize: number;
		private lineWidth: number;
		private alignMode: EPCB_PrimitiveStringAlignMode;
		private rotation: number;
		private reverse: boolean;
		private expansion: number;
		private mirror: boolean;
		private primitiveLock: boolean;
		public constructor(layer: TPCB_LayersOfImage, x: number | null, y: number | null, key: string, value: string, keyVisible: boolean, valueVisible: boolean, fontFamily: string, fontSize: number, lineWidth: number, alignMode: EPCB_PrimitiveStringAlignMode, rotation: number, reverse: boolean, expansion: number, mirror: boolean, primitiveLock: boolean, primitiveId: string, parentPrimitiveId: string);
		public create(): IPCB_PrimitiveAttribute;
		public getState_PrimitiveType(): EPCB_PrimitiveType;
		public getState_PrimitiveId(): string;
		public getState_ParentPrimitiveId(): string;
		public getState_Layer(): TPCB_LayersOfImage;
		public getState_X(): number | null;
		public getState_Y(): number | null;
		public getState_Key(): string;
		public getState_Value(): string;
		public getState_KeyVisible(): boolean;
		public getState_ValueVisible(): boolean;
		public getState_FontFamily(): string;
		public getState_FontSize(): number;
		public getState_LineWidth(): number;
		public getState_AlignMode(): EPCB_PrimitiveStringAlignMode;
		public getState_Rotation(): number;
		public getState_Reverse(): boolean;
		public getState_Expansion(): number;
		public getState_Mirror(): boolean;
		public getState_PrimitiveLock(): boolean;
		public setState_Layer(layer: TPCB_LayersOfImage): IPCB_PrimitiveAttribute;
		public setState_X(x: number): IPCB_PrimitiveAttribute;
		public setState_Y(y: number): IPCB_PrimitiveAttribute;
		public setState_Key(key: string): IPCB_PrimitiveAttribute;
		public setState_Value(value: string): IPCB_PrimitiveAttribute;
		public setState_KeyVisible(keyVisible: boolean): IPCB_PrimitiveAttribute;
		public setState_ValueVisible(valueVisible: boolean): IPCB_PrimitiveAttribute;
		public setState_FontFamily(fontFamily: string): IPCB_PrimitiveAttribute;
		public setState_FontSize(fontSize: number): IPCB_PrimitiveAttribute;
		public setState_LineWidth(lineWidth: number): IPCB_PrimitiveAttribute;
		public setState_AlignMode(alignMode: EPCB_PrimitiveStringAlignMode): IPCB_PrimitiveAttribute;
		public setState_Rotation(rotation: number): IPCB_PrimitiveAttribute;
		public setState_Reverse(reverse: boolean): IPCB_PrimitiveAttribute;
		public setState_Expansion(expansion: number): IPCB_PrimitiveAttribute;
		public setState_Mirror(mirror: boolean): IPCB_PrimitiveAttribute;
		public setState_PrimitiveLock(primitiveLock: boolean): IPCB_PrimitiveAttribute;
		public toAsync(): IPCB_PrimitiveAttribute;
		public toSync(): IPCB_PrimitiveAttribute;
		public isAsync(): boolean;
		public reset(): Promise<IPCB_PrimitiveAttribute>;
		public done(): Promise<IPCB_PrimitiveAttribute>;
	}
	class PCB_PrimitiveAttribute implements IPCB_PrimitiveAPI {
		public create(): undefined;
		public delete(primitiveIds: string | IPCB_PrimitiveAttribute | Array<string> | Array<IPCB_PrimitiveAttribute>): Promise<boolean>;
		public modify(primitiveId: string | IPCB_PrimitiveAttribute, property: { layer?: TPCB_LayersOfImage; x?: number; y?: number; key?: string; value?: string; keyVisible?: boolean; valueVisible?: boolean; fontFamily?: string; fontSize?: number; lineWidth?: number; alignMode?: EPCB_PrimitiveStringAlignMode; rotation?: number; reverse?: boolean; expansion?: number; mirror?: boolean; primitiveLock?: boolean }): Promise<IPCB_PrimitiveAttribute | undefined>;
		public get(primitiveIds: string): Promise<IPCB_PrimitiveAttribute | undefined>;
		public get(primitiveIds: Array<string>): Promise<Array<IPCB_PrimitiveAttribute>>;
		public getAllPrimitiveId(parentPrimitiveId?: string, layer?: TPCB_LayersOfImage, primitiveLock?: boolean): Promise<Array<string>>;
		public getAll(parentPrimitiveId?: string, layer?: TPCB_LayersOfImage, primitiveLock?: boolean): Promise<Array<IPCB_PrimitiveAttribute>>;
	}
	type TPCB_LayersOfComponent = EPCB_LayerId.TOP | EPCB_LayerId.BOTTOM;
	type TPCB_LayersOfPad = EPCB_LayerId.TOP | EPCB_LayerId.BOTTOM | EPCB_LayerId.MULTI;
	enum EPCB_PrimitivePadShapeType {
		 ELLIPSE = 'ELLIPSE',
		 OBLONG = 'OVAL',
		 RECTANGLE = 'RECT',
		 REGULAR_POLYGON = 'NGON',
		 POLYLINE_COMPLEX_POLYGON = 'POLYGON',
	}
	type TPCB_PrimitivePadShape = [EPCB_PrimitivePadShapeType.ELLIPSE | EPCB_PrimitivePadShapeType.OBLONG | EPCB_PrimitivePadShapeType.REGULAR_POLYGON, number, number] | [EPCB_PrimitivePadShapeType.RECTANGLE, number, number, number] | [EPCB_PrimitivePadShapeType.POLYLINE_COMPLEX_POLYGON, TPCB_PolygonSourceArray | Array<TPCB_PolygonSourceArray>];
	enum EPCB_PrimitivePadHoleType {
		 ROUND = 'ROUND',
		 RECTANGLE = 'RECT',
		 SLOT = 'SLOT',
	}
	type TPCB_PrimitivePadHole = [EPCB_PrimitivePadHoleType.ROUND, number] | [EPCB_PrimitivePadHoleType.SLOT, number, number];
	enum EPCB_PrimitivePadType {
		 NORMAL = 0,
		 TEST = 1,
		 MARK_POINT = 2,
	}
	type TPCB_PrimitiveSpecialPadShape = Array<[number, number, TPCB_PrimitivePadShape]>;
	enum EPCB_PrimitivePadHeatWeldingConnectionMethod {
		 DIVERGENT = 'Divergent',
		 DIRECT_CONNECTED = 'Direct-connected',
		 NON_CONNECTED = 'Non-connected',
	}
	interface IPCB_PrimitivePadHeatWelding {
		connectionMethod: EPCB_PrimitivePadHeatWeldingConnectionMethod;
		divergenceSpacing?: number;
		divergenceLineWidth?: number;
		divergenceAngle?: number;
	}
	class IPCB_PrimitivePad implements IPCB_Primitive {
		protected async: boolean;
		protected readonly primitiveType: EPCB_PrimitiveType;
		protected primitiveId?: string;
		protected layer: TPCB_LayersOfPad;
		protected padNumber: string;
		protected x: number;
		protected y: number;
		protected rotation: number;
		protected pad?: TPCB_PrimitivePadShape;
		protected net?: string;
		protected hole: TPCB_PrimitivePadHole | null;
		protected holeOffsetX: number;
		protected holeOffsetY: number;
		protected holeRotation: number;
		protected metallization: boolean;
		protected padType: EPCB_PrimitivePadType;
		protected specialPad?: TPCB_PrimitiveSpecialPadShape;
		protected solderMaskAndPasteMaskExpansion: IPCB_PrimitiveSolderMaskAndPasteMaskExpansion | null;
		protected heatWelding: IPCB_PrimitivePadHeatWelding | null;
		protected primitiveLock: boolean;
		public constructor(layer: TPCB_LayersOfPad, padNumber: string, x: number, y: number, rotation?: number, pad?: TPCB_PrimitivePadShape, net?: string, hole?: TPCB_PrimitivePadHole | null, holeOffsetX?: number, holeOffsetY?: number, holeRotation?: number, metallization?: boolean, padType?: EPCB_PrimitivePadType, specialPad?: TPCB_PrimitiveSpecialPadShape, solderMaskAndPasteMaskExpansion?: IPCB_PrimitiveSolderMaskAndPasteMaskExpansion | null, heatWelding?: IPCB_PrimitivePadHeatWelding | null, primitiveLock?: boolean, primitiveId?: string);
		public create(): Promise<IPCB_PrimitivePad>;
		public getState_PrimitiveType(): EPCB_PrimitiveType;
		public getState_PrimitiveId(): string;
		public getState_Layer(): TPCB_LayersOfPad;
		public getState_PadNumber(): string;
		public getState_X(): number;
		public getState_Y(): number;
		public getState_Rotation(): number;
		public getState_Pad(): TPCB_PrimitivePadShape | undefined;
		public getState_Net(): string | undefined;
		public getState_Hole(): TPCB_PrimitivePadHole | null;
		public getState_HoleOffsetX(): number;
		public getState_HoleOffsetY(): number;
		public getState_HoleRotation(): number;
		public getState_Metallization(): boolean;
		public getState_PadType(): EPCB_PrimitivePadType;
		public getState_SpecialPad(): TPCB_PrimitiveSpecialPadShape | undefined;
		public getState_SolderMaskAndPasteMaskExpansion(): IPCB_PrimitiveSolderMaskAndPasteMaskExpansion | null;
		public getState_HeatWelding(): IPCB_PrimitivePadHeatWelding | null;
		public getState_PrimitiveLock(): boolean;
		public setState_Layer(layer: TPCB_LayersOfPad): IPCB_PrimitivePad;
		public setState_PadNumber(padNumber: string): IPCB_PrimitivePad;
		public setState_X(x: number): IPCB_PrimitivePad;
		public setState_Y(y: number): IPCB_PrimitivePad;
		public setState_Rotation(rotation: number): IPCB_PrimitivePad;
		public setState_Pad(pad: TPCB_PrimitivePadShape): IPCB_PrimitivePad;
		public setState_Net(net?: string): IPCB_PrimitivePad;
		public setState_Hole(hole: TPCB_PrimitivePadHole): IPCB_PrimitivePad;
		public setState_HoleOffsetX(holeOffsetX: number): IPCB_PrimitivePad;
		public setState_HoleOffsetY(holeOffsetY: number): IPCB_PrimitivePad;
		public setState_HoleRotation(holeRotation: number): IPCB_PrimitivePad;
		public setState_Metallization(metallization: boolean): IPCB_PrimitivePad;
		public setState_SpecialPad(specialPad: TPCB_PrimitiveSpecialPadShape): IPCB_PrimitivePad;
		public setState_SolderMaskAndPasteMaskExpansion(solderMaskAndPasteMaskExpansion: IPCB_PrimitiveSolderMaskAndPasteMaskExpansion | null): IPCB_PrimitivePad;
		public setState_HeatWelding(heatWelding: IPCB_PrimitivePadHeatWelding | null): IPCB_PrimitivePad;
		public setState_PrimitiveLock(primitiveLock: boolean): IPCB_PrimitivePad;
		public toAsync(): IPCB_PrimitivePad;
		public toSync(): IPCB_PrimitivePad;
		public isAsync(): boolean;
		public reset(): Promise<IPCB_PrimitivePad>;
		public done(): Promise<IPCB_PrimitivePad>;
		private setState_PadType(padType: EPCB_PrimitivePadType): IPCB_PrimitivePad;
	}
	type TPCB_LayersOfFill = TPCB_LayersOfCopper | TPCB_LayersOfCustom | EPCB_LayerId.TOP_SILKSCREEN | EPCB_LayerId.TOP_SOLDER_MASK | EPCB_LayerId.TOP_PASTE_MASK | EPCB_LayerId.TOP_ASSEMBLY | EPCB_LayerId.BOTTOM_SILKSCREEN | EPCB_LayerId.BOTTOM_SOLDER_MASK | EPCB_LayerId.BOTTOM_PASTE_MASK | EPCB_LayerId.BOTTOM_ASSEMBLY | EPCB_LayerId.DOCUMENT | EPCB_LayerId.MECHANICAL | EPCB_LayerId.MULTI;
	enum EPCB_PrimitiveFillMode {
		 SOLID = 0,
		 MESH = 1,
		 INNER_ELECTRICAL_LAYER = 2,
	}
	enum EPCB_PrimitivePourFillMethod {
		 GRID45 = '45grid',
		 GRID = '90grid',
		 SOLID = 'solid',
	}
	interface IPCB_PrimitivePouredPourFill {
		path: IPCB_ComplexPolygon;
		lineWidth: number;
		fill: boolean;
		id: string;
	}
	class IPCB_PrimitivePoured implements IPCB_Primitive {
		private async: boolean;
		private readonly primitiveType: EPCB_PrimitiveType.POURED;
		private pourPrimitiveId?: string;
		private pourFills: Array<IPCB_PrimitivePouredPourFill>;
		private primitiveId: string;
		private layer: TPCB_LayersOfCopper;
		public constructor(pourPrimitiveId: string | undefined, pourFills: Array<IPCB_PrimitivePouredPourFill>, primitiveId: string, layer: TPCB_LayersOfCopper);
		public create(): IPCB_PrimitivePoured;
		public getState_PrimitiveType(): EPCB_PrimitiveType;
		public getState_PrimitiveId(): string;
		public getState_PourPrimitiveId(): string | undefined;
		public getState_Layer(): TPCB_LayersOfCopper;
		public getState_PourFills(): Array<IPCB_PrimitivePouredPourFill>;
		public toAsync(): IPCB_PrimitivePoured;
		public toSync(): IPCB_PrimitivePoured;
		public isAsync(): boolean;
		public reset(): Promise<IPCB_PrimitivePoured>;
		public done(): IPCB_PrimitivePoured;
		public convertToFill(pourFillId: IPCB_PrimitivePouredPourFill['id']): Promise<IPCB_PrimitiveFill | undefined>;
		public addSolderMaskFill(pourFillId: IPCB_PrimitivePouredPourFill['id']): Promise<IPCB_PrimitiveFill | undefined>;
		public deletePourFills(pourFillIds: IPCB_PrimitivePouredPourFill['id'] | Array<IPCB_PrimitivePouredPourFill['id']>): Promise<boolean>;
	}
	type TPCB_LayersOfRegion = TPCB_LayersOfCopper | EPCB_LayerId.MULTI;
	enum EPCB_PrimitiveRegionRuleType {
		 NO_COMPONENTS = 2,
		 NO_WIRES = 5,
		 NO_FILLS = 6,
		 NO_POURS = 7,
		 NO_INNER_ELECTRICAL_LAYERS = 8,
		 FOLLOW_REGION_RULE = 9,
	}
	class IPCB_PrimitiveRegion implements IPCB_Primitive {
		private async: boolean;
		private readonly primitiveType: EPCB_PrimitiveType.REGION;
		private primitiveId?: string;
		private layer: TPCB_LayersOfRegion;
		private complexPolygon: IPCB_Polygon;
		private ruleType: Array<EPCB_PrimitiveRegionRuleType>;
		private regionName?: string;
		private lineWidth?: number;
		private primitiveLock: boolean;
		public constructor(layer: TPCB_LayersOfRegion, complexPolygon: IPCB_Polygon, ruleType?: Array<EPCB_PrimitiveRegionRuleType>, regionName?: string, lineWidth?: number, primitiveLock?: boolean, primitiveId?: string);
		public create(): Promise<IPCB_PrimitiveRegion>;
		public getState_PrimitiveType(): EPCB_PrimitiveType;
		public getState_PrimitiveId(): string;
		public getState_Layer(): TPCB_LayersOfRegion;
		public getState_ComplexPolygon(): IPCB_Polygon;
		public getState_RuleType(): Array<EPCB_PrimitiveRegionRuleType>;
		public getState_RegionName(): string | undefined;
		public getState_LineWidth(): number;
		public getState_PrimitiveLock(): boolean;
		public setState_Layer(layer: TPCB_LayersOfRegion): IPCB_PrimitiveRegion;
		public setState_ComplexPolygon(complexPolygon: IPCB_Polygon): IPCB_PrimitiveRegion;
		public setState_RuleType(ruleType: Array<EPCB_PrimitiveRegionRuleType>): IPCB_PrimitiveRegion;
		public setState_RegionName(regionName?: string): IPCB_PrimitiveRegion;
		public setState_LineWidth(lineWidth: number): IPCB_PrimitiveRegion;
		public setState_PrimitiveLock(primitiveLock: boolean): IPCB_PrimitiveRegion;
		public toAsync(): IPCB_PrimitiveRegion;
		public toSync(): IPCB_PrimitiveRegion;
		public isAsync(): boolean;
		public reset(): Promise<IPCB_PrimitiveRegion>;
		public done(): Promise<IPCB_PrimitiveRegion>;
		public convertToFill(): Promise<IPCB_PrimitiveFill>;
		public convertToPolyline(): Promise<IPCB_PrimitivePolyline>;
		public convertToPour(): Promise<IPCB_PrimitivePour>;
	}
	class IPCB_PrimitivePour implements IPCB_Primitive {
		private async: boolean;
		private readonly primitiveType: EPCB_PrimitiveType.POUR;
		private primitiveId?: string;
		private net: string;
		private layer: TPCB_LayersOfCopper;
		private complexPolygon: IPCB_Polygon;
		private pourFillMethod: EPCB_PrimitivePourFillMethod;
		private preserveSilos: boolean;
		private pourName?: string;
		private pourPriority?: number;
		private lineWidth?: number;
		private primitiveLock: boolean;
		public constructor(net: string, layer: TPCB_LayersOfCopper, complexPolygon: IPCB_Polygon, pourFillMethod?: EPCB_PrimitivePourFillMethod, preserveSilos?: boolean, pourName?: string, pourPriority?: number, lineWidth?: number, primitiveLock?: boolean, primitiveId?: string);
		public create(): Promise<IPCB_PrimitivePour>;
		public getState_PrimitiveType(): EPCB_PrimitiveType;
		public getState_PrimitiveId(): string;
		public getState_Net(): string;
		public getState_Layer(): TPCB_LayersOfCopper;
		public getState_ComplexPolygon(): IPCB_Polygon;
		public getState_PourFillMethod(): any;
		public getState_PreserveSilos(): boolean;
		public getState_PourName(): string;
		public getState_PourPriority(): number;
		public getState_LineWidth(): number;
		public getState_PrimitiveLock(): boolean;
		public setState_Net(net: string): IPCB_PrimitivePour;
		public setState_Layer(layer: TPCB_LayersOfCopper): IPCB_PrimitivePour;
		public setState_ComplexPolygon(complexPolygon: IPCB_Polygon): IPCB_PrimitivePour;
		public setState_PourFillMethod(pourFillMethod: EPCB_PrimitivePourFillMethod): IPCB_PrimitivePour;
		public setState_PreserveSilos(preserveSilos: boolean): IPCB_PrimitivePour;
		public setState_PourName(pourName: string): IPCB_PrimitivePour;
		public setState_PourPriority(pourPriority: number): IPCB_PrimitivePour;
		public setState_LineWidth(lineWidth: number): IPCB_PrimitivePour;
		public setState_PrimitiveLock(primitiveLock: boolean): IPCB_PrimitivePour;
		public toAsync(): IPCB_PrimitivePour;
		public toSync(): IPCB_PrimitivePour;
		public isAsync(): boolean;
		public reset(): Promise<IPCB_PrimitivePour>;
		public done(): Promise<IPCB_PrimitivePour>;
		public getCopperRegion(): Promise<IPCB_PrimitivePoured | undefined>;
		public rebuildCopperRegion(): Promise<IPCB_PrimitivePoured | undefined>;
		public convertToFill(): Promise<IPCB_PrimitiveFill>;
		public convertToPolyline(): Promise<IPCB_PrimitivePolyline>;
		public convertToRegion(): Promise<IPCB_PrimitiveRegion>;
	}
	class IPCB_PrimitiveFill implements IPCB_Primitive {
		private async: boolean;
		private readonly primitiveType: EPCB_PrimitiveType.FILL;
		private primitiveId?: string;
		private layer: TPCB_LayersOfFill;
		private complexPolygon: IPCB_Polygon;
		private net?: string;
		private fillMode?: EPCB_PrimitiveFillMode;
		private lineWidth?: number;
		private primitiveLock: boolean;
		public constructor(layer: TPCB_LayersOfFill, complexPolygon: IPCB_Polygon, net?: string, fillMode?: EPCB_PrimitiveFillMode, lineWidth?: number, primitiveLock?: boolean, primitiveId?: string);
		public create(): Promise<IPCB_PrimitiveFill>;
		public getState_PrimitiveType(): EPCB_PrimitiveType;
		public getState_PrimitiveId(): string;
		public getState_Net(): string | undefined;
		public getState_Layer(): TPCB_LayersOfFill;
		public getState_ComplexPolygon(): IPCB_Polygon;
		public getState_FillMode(): EPCB_PrimitiveFillMode | undefined;
		public getState_LineWidth(): number;
		public getState_PrimitiveLock(): boolean;
		public setState_Layer(layer: TPCB_LayersOfFill): IPCB_PrimitiveFill;
		public setState_ComplexPolygon(complexPolygon: IPCB_Polygon): IPCB_PrimitiveFill;
		public setState_Net(net: string): IPCB_PrimitiveFill;
		public setState_FillMode(fillMode: EPCB_PrimitiveFillMode): IPCB_PrimitiveFill;
		public setState_LineWidth(lineWidth: number): IPCB_PrimitiveFill;
		public setState_PrimitiveLock(primitiveLock: boolean): IPCB_PrimitiveFill;
		public toAsync(): IPCB_PrimitiveFill;
		public toSync(): IPCB_PrimitiveFill;
		public isAsync(): boolean;
		public reset(): Promise<IPCB_PrimitiveFill>;
		public done(): Promise<IPCB_PrimitiveFill>;
		public convertToPolyline(): Promise<IPCB_PrimitivePolyline>;
		public convertToPour(): Promise<IPCB_PrimitivePour>;
		public convertToRegion(): Promise<IPCB_PrimitiveRegion>;
	}
	class IPCB_PrimitivePolyline implements IPCB_Primitive {
		private async: boolean;
		private readonly primitiveType: EPCB_PrimitiveType.POLYLINE;
		private primitiveId?: string;
		private net: string;
		private layer: TPCB_LayersOfLine;
		private polygon: IPCB_Polygon;
		private lineWidth: number;
		private primitiveLock: boolean;
		public constructor(net: string, layer: TPCB_LayersOfLine, polygon: IPCB_Polygon, lineWidth?: number, primitiveLock?: boolean, primitiveId?: string);
		public create(): Promise<IPCB_PrimitivePolyline>;
		public getState_PrimitiveType(): EPCB_PrimitiveType;
		public getState_PrimitiveId(): string;
		public getState_Net(): string;
		public getState_Layer(): TPCB_LayersOfLine;
		public getState_Polygon(): IPCB_Polygon;
		public getState_LineWidth(): number;
		public getState_PrimitiveLock(): boolean;
		public setState_Net(net: string): IPCB_PrimitivePolyline;
		public setState_Layer(layer: TPCB_LayersOfLine): IPCB_PrimitivePolyline;
		public setState_Polygon(polygon: IPCB_Polygon): IPCB_PrimitivePolyline;
		public setState_LineWidth(lineWidth: number): IPCB_PrimitivePolyline;
		public setState_PrimitiveLock(primitiveLock: boolean): IPCB_PrimitivePolyline;
		public toAsync(): IPCB_PrimitivePolyline;
		public toSync(): IPCB_PrimitivePolyline;
		public isAsync(): boolean;
		public reset(): Promise<IPCB_PrimitivePolyline>;
		public done(): Promise<IPCB_PrimitivePolyline>;
		public convertToFill(): Promise<IPCB_PrimitiveFill>;
		public convertToPour(): Promise<IPCB_PrimitivePour>;
		public convertToRegion(): Promise<IPCB_PrimitiveRegion>;
	}
	class IPCB_PrimitiveComponentPad extends IPCB_PrimitivePad {
		protected readonly primitiveType: EPCB_PrimitiveType.COMPONENT_PAD;
		private parentComponentPrimitiveId: string;
		public constructor(primitiveId: string, parentComponentPrimitiveId: string, layer: TPCB_LayersOfPad, padNumber: string, x: number, y: number, rotation: number, hole: TPCB_PrimitivePadHole | null, holeOffsetX: number, holeOffsetY: number, holeRotation: number, metallization: boolean, padType: EPCB_PrimitivePadType, solderMaskAndPasteMaskExpansion: IPCB_PrimitiveSolderMaskAndPasteMaskExpansion | null, heatWelding: IPCB_PrimitivePadHeatWelding | null, primitiveLock: boolean, net?: string, pad?: TPCB_PrimitivePadShape, specialPad?: TPCB_PrimitiveSpecialPadShape);
		public getState_ParentComponentPrimitiveId(): string;
		public create(): Promise<IPCB_PrimitiveComponentPad>;
		public setState_Layer(): IPCB_PrimitiveComponentPad;
		public setState_PadNumber(): IPCB_PrimitiveComponentPad;
		public reset(): Promise<IPCB_PrimitiveComponentPad>;
		public done(): Promise<IPCB_PrimitiveComponentPad>;
		public getConnectedPrimitives(onlyCentreConnection: true): Promise<Array<IPCB_PrimitiveLine | IPCB_PrimitiveArc | IPCB_PrimitiveVia>>;
		public getConnectedPrimitives(onlyCentreConnection: false): Promise<Array<IPCB_PrimitiveLine | IPCB_PrimitiveArc | IPCB_PrimitiveVia | IPCB_PrimitivePolyline | IPCB_PrimitiveFill>>;
		public setState_ParentComponentPrimitiveId(): IPCB_PrimitiveComponentPad;
	}
	class IPCB_PrimitiveComponent implements IPCB_Primitive {
		private async: boolean;
		private readonly primitiveType: EPCB_PrimitiveType.COMPONENT;
		private primitiveId?: string;
		private component?: { libraryUuid: string; uuid: string; name?: string };
		private footprint?: { libraryUuid: string; uuid: string; name?: string };
		private layer: TPCB_LayersOfComponent;
		private x: number;
		private y: number;
		private rotation: number;
		private primitiveLock: boolean;
		private addIntoBom: boolean;
		private model3D?: { libraryUuid: string; uuid: string; name?: string };
		private designator?: string;
		private pads?: Array<{ primitiveId: string; net: string; padNumber: string }>;
		private name?: string;
		private uniqueId?: string;
		private manufacturer?: string;
		private manufacturerId?: string;
		private supplier?: string;
		private supplierId?: string;
		private otherProperty?: Record<string, string | number | boolean>;
		private _attributeVisible?: Record<string, { value?: string | number | boolean; keyVisible?: boolean; valueVisible?: boolean }>;
		public constructor(component: { libraryType?: ELIB_LibraryType.DEVICE | ELIB_LibraryType.FOOTPRINT; libraryUuid: string; uuid: string; name?: string }, layer: TPCB_LayersOfComponent, x: number, y: number, rotation?: number, primitiveLock?: boolean, addIntoBom?: boolean, primitiveId?: string, footprint?: { libraryUuid: string; uuid: string; name?: string }, model3D?: { libraryUuid: string; uuid: string; name?: string }, designator?: string, pads?: Array<{ primitiveId: string; net: string; padNumber: string }>, name?: string, uniqueId?: string, manufacturer?: string, manufacturerId?: string, supplier?: string, supplierId?: string, otherProperty?: Record<string, string | number | boolean>);
		public create(): Promise<IPCB_PrimitiveComponent>;
		public getState_PrimitiveType(): EPCB_PrimitiveType;
		public getState_PrimitiveId(): string;
		public getState_Component(): { libraryUuid: string; uuid: string; name?: string } | undefined;
		public getState_Footprint(): { libraryUuid: string; uuid: string; name?: string } | undefined;
		public getState_Layer(): TPCB_LayersOfComponent;
		public getState_X(): number;
		public getState_Y(): number;
		public getState_Rotation(): number;
		public getState_PrimitiveLock(): boolean;
		public getState_AddIntoBom(): boolean;
		public getState_Model3D(): { libraryUuid: string; uuid: string; name?: string } | undefined;
		public getState_Designator(): string | undefined;
		public getState_Pads(): Array<{ primitiveId: string; net: string; padNumber: string }> | undefined;
		public getState_Name(): string | undefined;
		public getState_UniqueId(): string | undefined;
		public getState_Manufacturer(): string | undefined;
		public getState_ManufacturerId(): string | undefined;
		public getState_Supplier(): string | undefined;
		public getState_SupplierId(): string | undefined;
		public getState_OtherProperty(): Record<string, string | number | boolean> | undefined;
		public setState_Layer(layer: TPCB_LayersOfComponent): IPCB_PrimitiveComponent;
		public setState_X(x: number): IPCB_PrimitiveComponent;
		public setState_Y(y: number): IPCB_PrimitiveComponent;
		public setState_Rotation(rotation: number): IPCB_PrimitiveComponent;
		public setState_PrimitiveLock(primitiveLock: boolean): IPCB_PrimitiveComponent;
		public setState_AddIntoBom(addIntoBom: boolean): IPCB_PrimitiveComponent;
		public setState_Designator(designator: string | undefined): IPCB_PrimitiveComponent;
		public setState_Name(name: string | undefined): IPCB_PrimitiveComponent;
		public setState_UniqueId(uniqueId: string | undefined): IPCB_PrimitiveComponent;
		public setState_Manufacturer(manufacturer: string | undefined): IPCB_PrimitiveComponent;
		public setState_ManufacturerId(manufacturerId: string | undefined): IPCB_PrimitiveComponent;
		public setState_Supplier(supplier: string | undefined): IPCB_PrimitiveComponent;
		public setState_SupplierId(supplierId: string | undefined): IPCB_PrimitiveComponent;
		public setState_OtherProperty(otherProperty: Record<string, string | number | boolean>): IPCB_PrimitiveComponent;
		public toAsync(): IPCB_PrimitiveComponent;
		public toSync(): IPCB_PrimitiveComponent;
		public isAsync(): boolean;
		public reset(): Promise<IPCB_PrimitiveComponent>;
		public done(): Promise<IPCB_PrimitiveComponent>;
		public getAllPins(): Promise<Array<IPCB_PrimitiveComponentPad>>;
		public setAttribute(key: string, value?: string | number | boolean, keyVisible?: boolean, valueVisible?: boolean): Promise<IPCB_PrimitiveAttribute>;
		private setState_Component(component?: { libraryUuid: string; uuid: string }): void;
	}
	class PCB_PrimitiveComponent implements IPCB_PrimitiveAPI {
		public create(component: { libraryUuid: string; uuid: string } | ILIB_DeviceItem | ILIB_DeviceSearchItem | { libraryType: ELIB_LibraryType.FOOTPRINT; libraryUuid: string; uuid: string } | ILIB_FootprintItem | ILIB_FootprintSearchItem, layer: TPCB_LayersOfComponent, x: number, y: number, rotation?: number, primitiveLock?: boolean): Promise<IPCB_PrimitiveComponent | undefined>;
		public placeCbbPcb(cbbPcb: { libraryUuid: string; cbbUuid: string; uuid: string }, x: number, y: number, props?: { reimportWhenNameRepeated?: boolean }): Promise<boolean>;
		public delete(primitiveIds: string | IPCB_PrimitiveComponent | Array<string> | Array<IPCB_PrimitiveComponent>): Promise<boolean>;
		public modify(primitiveId: string | IPCB_PrimitiveComponent, property: { layer?: TPCB_LayersOfComponent; x?: number; y?: number; rotation?: number; primitiveLock?: boolean; addIntoBom?: boolean; designator?: string | null; name?: string | null; uniqueId?: string | null; manufacturer?: string | null; manufacturerId?: string | null; supplier?: string | null; supplierId?: string | null; otherProperty?: Record<string, any> }): Promise<IPCB_PrimitiveComponent | undefined>;
		public get(primitiveIds: string): Promise<IPCB_PrimitiveComponent | undefined>;
		public get(primitiveIds: Array<string>): Promise<Array<IPCB_PrimitiveComponent>>;
		public getAllPrimitiveId(layer?: TPCB_LayersOfComponent, primitiveLock?: boolean): Promise<Array<string>>;
		public getAll(layer?: TPCB_LayersOfComponent, primitiveLock?: boolean): Promise<Array<IPCB_PrimitiveComponent>>;
		public getAllPinsByPrimitiveId(primitiveId: string): Promise<Array<IPCB_PrimitiveComponentPad> | undefined>;
		public placeComponentWithMouse(component: { libraryUuid: string; uuid: string } | ILIB_DeviceItem | ILIB_DeviceSearchItem): Promise<boolean>;
		public placeFootprintWithMouse(footprint: { libraryUuid: string; uuid: string } | ILIB_FootprintItem | ILIB_FootprintSearchItem, properties?: Record<string, boolean | number | string | undefined>): Promise<boolean>;
		public getAllPropertyNames(): Promise<Array<string>>;
	}
	enum EPCB_PrimitiveDimensionType {
		 RADIUS = 'Radius Dimension',
		 LENGTH = 'Length Dimension',
		 ANGLE = 'Protractor Dimension',
	}
	type TPCB_PrimitiveDimensionCoordinateSet = [number, number, number, number, number, number] | [number, number, number, number, number, number, number, number];
	type TPCB_LayersOfDimension = TPCB_LayersOfCustom | EPCB_LayerId.TOP_SILKSCREEN | EPCB_LayerId.BOTTOM_SILKSCREEN | EPCB_LayerId.DOCUMENT | EPCB_LayerId.MECHANICAL;
	class IPCB_PrimitiveDimension implements IPCB_Primitive {
		private async: boolean;
		private readonly primitiveType: EPCB_PrimitiveType.DIMENSION;
		private primitiveId?: string;
		private dimensionType: EPCB_PrimitiveDimensionType;
		private coordinateSet: TPCB_PrimitiveDimensionCoordinateSet;
		private layer: TPCB_LayersOfDimension;
		private unit: ESYS_Unit.MILLIMETER | ESYS_Unit.CENTIMETER | ESYS_Unit.INCH | ESYS_Unit.MIL;
		private lineWidth: number;
		private precision: number;
		private textFollow: 0 | 1;
		private primitiveLock: boolean;
		public constructor(dimensionType: EPCB_PrimitiveDimensionType, coordinateSet: TPCB_PrimitiveDimensionCoordinateSet, layer?: TPCB_LayersOfDimension, unit?: ESYS_Unit.MILLIMETER | ESYS_Unit.CENTIMETER | ESYS_Unit.INCH | ESYS_Unit.MIL, lineWidth?: number, precision?: number, primitiveLock?: boolean, primitiveId?: string);
		public create(): Promise<IPCB_PrimitiveDimension>;
		public getState_PrimitiveType(): EPCB_PrimitiveType;
		public getState_PrimitiveId(): string;
		public getState_DimensionType(): EPCB_PrimitiveDimensionType;
		public getState_CoordinateSet(): TPCB_PrimitiveDimensionCoordinateSet;
		public getState_Layer(): TPCB_LayersOfDimension;
		public getState_Unit(): ESYS_Unit.MILLIMETER | ESYS_Unit.CENTIMETER | ESYS_Unit.INCH | ESYS_Unit.MIL;
		public getState_LineWidth(): number;
		public getState_Precision(): number;
		public getState_TextFollow(): 0 | 1;
		public getState_PrimitiveLock(): boolean;
		public setState_DimensionType(dimensionType: EPCB_PrimitiveDimensionType): IPCB_PrimitiveDimension;
		public setState_CoordinateSet(coordinateSet: TPCB_PrimitiveDimensionCoordinateSet): IPCB_PrimitiveDimension;
		public setState_Layer(layer: TPCB_LayersOfDimension): IPCB_PrimitiveDimension;
		public setState_Unit(unit: ESYS_Unit.MILLIMETER | ESYS_Unit.CENTIMETER | ESYS_Unit.INCH | ESYS_Unit.MIL): IPCB_PrimitiveDimension;
		public setState_LineWidth(lineWidth: number): IPCB_PrimitiveDimension;
		public setState_Precision(precision: number): IPCB_PrimitiveDimension;
		public setState_PrimitiveLock(primitiveLock: boolean): IPCB_PrimitiveDimension;
		public toAsync(): IPCB_PrimitiveDimension;
		public toSync(): IPCB_PrimitiveDimension;
		public isAsync(): boolean;
		public reset(): Promise<IPCB_PrimitiveDimension>;
		public done(): Promise<IPCB_PrimitiveDimension>;
	}
	class PCB_PrimitiveDimension implements IPCB_PrimitiveAPI {
		public create(dimensionType: EPCB_PrimitiveDimensionType, coordinateSet: TPCB_PrimitiveDimensionCoordinateSet, layer?: TPCB_LayersOfDimension, unit?: ESYS_Unit.MILLIMETER | ESYS_Unit.CENTIMETER | ESYS_Unit.INCH | ESYS_Unit.MIL, lineWidth?: number, precision?: number, primitiveLock?: boolean): Promise<IPCB_PrimitiveDimension | undefined>;
		public delete(primitiveIds: string | IPCB_PrimitiveDimension | Array<string> | Array<IPCB_PrimitiveDimension>): Promise<boolean>;
		public modify(primitiveId: string | IPCB_PrimitiveDimension, property: { dimensionType?: EPCB_PrimitiveDimensionType; coordinateSet?: TPCB_PrimitiveDimensionCoordinateSet; layer?: TPCB_LayersOfDimension; unit?: ESYS_Unit.MILLIMETER | ESYS_Unit.CENTIMETER | ESYS_Unit.INCH | ESYS_Unit.MIL; lineWidth?: number; precision?: number; primitiveLock?: boolean }): Promise<IPCB_PrimitiveDimension | undefined>;
		public get(primitiveIds: string): Promise<IPCB_PrimitiveDimension | undefined>;
		public get(primitiveIds: Array<string>): Promise<Array<IPCB_PrimitiveDimension>>;
		public getAllPrimitiveId(layer?: TPCB_LayersOfDimension, primitiveLock?: boolean): Promise<Array<string>>;
		public getAll(layer?: TPCB_LayersOfDimension, primitiveLock?: boolean): Promise<Array<IPCB_PrimitiveDimension>>;
	}
	class PCB_PrimitiveFill implements IPCB_PrimitiveAPI {
		public create(layer: TPCB_LayersOfFill, complexPolygon: IPCB_Polygon, net?: string, fillMode?: EPCB_PrimitiveFillMode, lineWidth?: number, primitiveLock?: boolean): Promise<IPCB_PrimitiveFill | undefined>;
		public delete(primitiveIds: string | IPCB_PrimitiveFill | Array<string> | Array<IPCB_PrimitiveFill>): Promise<boolean>;
		public modify(primitiveId: string | IPCB_PrimitiveFill, property: { layer?: TPCB_LayersOfFill; complexPolygon?: IPCB_Polygon; net?: string; fillMode?: EPCB_PrimitiveFillMode; lineWidth?: number; primitiveLock?: boolean }): Promise<IPCB_PrimitiveFill | undefined>;
		public get(primitiveIds: string): Promise<IPCB_PrimitiveFill | undefined>;
		public get(primitiveIds: Array<string>): Promise<Array<IPCB_PrimitiveFill>>;
		public getAllPrimitiveId(layer?: TPCB_LayersOfFill, net?: string, primitiveLock?: boolean): Promise<Array<string>>;
		public getAll(layer?: TPCB_LayersOfFill, net?: string, primitiveLock?: boolean): Promise<Array<IPCB_PrimitiveFill>>;
	}
	class IPCB_PrimitiveImage implements IPCB_Primitive {
		private async: boolean;
		private readonly primitiveType: EPCB_PrimitiveType.IMAGE;
		private primitiveId?: string;
		private x: number;
		private y: number;
		private complexPolygon: TPCB_PolygonSourceArray | Array<TPCB_PolygonSourceArray>;
		private layer: TPCB_LayersOfImage;
		private width: number;
		private height: number;
		private rotation: number;
		private horizonMirror: boolean;
		private primitiveLock: boolean;
		public constructor(x: number, y: number, complexPolygon: TPCB_PolygonSourceArray | Array<TPCB_PolygonSourceArray>, layer: TPCB_LayersOfImage, width?: number, height?: number, rotation?: number, horizonMirror?: boolean, primitiveLock?: boolean, primitiveId?: string);
		public create(): Promise<IPCB_PrimitiveImage>;
		public getState_PrimitiveType(): EPCB_PrimitiveType;
		public getState_PrimitiveId(): string;
		public getState_X(): number;
		public getState_Y(): number;
		public getState_ComplexPolygon(): TPCB_PolygonSourceArray | Array<TPCB_PolygonSourceArray>;
		public getState_Layer(): TPCB_LayersOfImage;
		public getState_Width(): number;
		public getState_Height(): number;
		public getState_Rotation(): number;
		public getState_HorizonMirror(): boolean;
		public getState_PrimitiveLock(): boolean;
		public setState_X(x: number): IPCB_PrimitiveImage;
		public setState_Y(y: number): IPCB_PrimitiveImage;
		public setState_Layer(layer: TPCB_LayersOfImage): IPCB_PrimitiveImage;
		public setState_Width(width: number): IPCB_PrimitiveImage;
		public setState_Height(height: number): IPCB_PrimitiveImage;
		public setState_Rotation(rotation: number): IPCB_PrimitiveImage;
		public setState_HorizonMirror(horizonMirror: boolean): IPCB_PrimitiveImage;
		public setState_PrimitiveLock(primitiveLock: boolean): IPCB_PrimitiveImage;
		public toAsync(): IPCB_PrimitiveImage;
		public toSync(): IPCB_PrimitiveImage;
		public isAsync(): boolean;
		public reset(): Promise<IPCB_PrimitiveImage>;
		public done(): Promise<IPCB_PrimitiveImage>;
		private setState_ComplexPolygon(complexPolygon: TPCB_PolygonSourceArray | Array<TPCB_PolygonSourceArray>): void;
	}
	class PCB_PrimitiveImage implements IPCB_PrimitiveAPI {
		public create(x: number, y: number, complexPolygon: TPCB_PolygonSourceArray | Array<TPCB_PolygonSourceArray> | IPCB_Polygon | IPCB_ComplexPolygon, layer: TPCB_LayersOfImage, width?: number, height?: number, rotation?: number, horizonMirror?: boolean, primitiveLock?: boolean): Promise<IPCB_PrimitiveImage | undefined>;
		public delete(primitiveIds: string | IPCB_PrimitiveImage | Array<string> | Array<IPCB_PrimitiveImage>): Promise<boolean>;
		public modify(primitiveId: string | IPCB_PrimitiveImage, property: { x?: number; y?: number; layer?: TPCB_LayersOfImage; width?: number; height?: number; rotation?: number; horizonMirror?: boolean; primitiveLock?: boolean }): Promise<IPCB_PrimitiveImage | undefined>;
		public get(primitiveIds: string): Promise<IPCB_PrimitiveImage | undefined>;
		public get(primitiveIds: Array<string>): Promise<Array<IPCB_PrimitiveImage>>;
		public getAllPrimitiveId(layer?: TPCB_LayersOfImage, primitiveLock?: boolean): Promise<Array<string>>;
		public getAll(layer?: TPCB_LayersOfImage, primitiveLock?: boolean): Promise<Array<IPCB_PrimitiveImage>>;
	}
	class PCB_PrimitiveLine implements IPCB_PrimitiveAPI {
		public create(net: string, layer: TPCB_LayersOfLine, startX: number, startY: number, endX: number, endY: number, lineWidth?: number, primitiveLock?: boolean): Promise<IPCB_PrimitiveLine | undefined>;
		public delete(primitiveIds: string | IPCB_PrimitiveLine | Array<string> | Array<IPCB_PrimitiveLine>): Promise<boolean>;
		public modify(primitiveId: string | IPCB_PrimitiveLine, property: { net?: string; layer?: TPCB_LayersOfLine; startX?: number; startY?: number; endX?: number; endY?: number; lineWidth?: number; primitiveLock?: boolean }): Promise<IPCB_PrimitiveLine | undefined>;
		public get(primitiveIds: string): Promise<IPCB_PrimitiveLine | undefined>;
		public get(primitiveIds: Array<string>): Promise<Array<IPCB_PrimitiveLine>>;
		public getAllPrimitiveId(net?: string, layer?: TPCB_LayersOfLine, primitiveLock?: boolean): Promise<Array<string>>;
		public getAll(net?: string, layer?: TPCB_LayersOfLine, primitiveLock?: boolean): Promise<Array<IPCB_PrimitiveLine>>;
	}
	type TPCB_LayersOfObject = EPCB_LayerId.TOP_SILKSCREEN | EPCB_LayerId.BOTTOM_SILKSCREEN | EPCB_LayerId.DOCUMENT;
	class IPCB_PrimitiveObject implements IPCB_Primitive {
		private async: boolean;
		private readonly primitiveType: EPCB_PrimitiveType.OBJECT;
		private primitiveId?: string;
		private layer: TPCB_LayersOfObject;
		private topLeftX: number;
		private topLeftY: number;
		private binaryData: string;
		private width: number;
		private height: number;
		private rotation: number;
		private mirror: boolean;
		private fileName: string;
		private primitiveLock: boolean;
		public constructor(layer: TPCB_LayersOfObject, topLeftX: number, topLeftY: number, binaryData: string, width: number, height: number, rotation?: number, mirror?: boolean, fileName?: string, primitiveLock?: boolean, primitiveId?: string);
		public create(): Promise<IPCB_PrimitiveObject>;
		public getState_PrimitiveType(): EPCB_PrimitiveType;
		public getState_PrimitiveId(): string;
		public getState_Layer(): TPCB_LayersOfObject | undefined;
		public getState_TopLeftX(): number | undefined;
		public getState_TopLeftY(): number | undefined;
		public getState_BinaryData(): string;
		public getState_Width(): number;
		public getState_Height(): number;
		public getState_Rotation(): number;
		public getState_Mirror(): boolean;
		public getState_FileName(): string;
		public getState_PrimitiveLock(): boolean;
		public setState_Layer(layer: TPCB_LayersOfObject): IPCB_PrimitiveObject;
		public setState_TopLeftX(topLeftX: number): IPCB_PrimitiveObject;
		public setState_TopLeftY(topLeftY: number): IPCB_PrimitiveObject;
		public setState_BinaryData(binaryData: string): IPCB_PrimitiveObject;
		public setState_Width(width: number): IPCB_PrimitiveObject;
		public setState_Height(height: number): IPCB_PrimitiveObject;
		public setState_Rotation(rotation: number): IPCB_PrimitiveObject;
		public setState_Mirror(mirror: boolean): IPCB_PrimitiveObject;
		public setState_FileName(fileName: string): IPCB_PrimitiveObject;
		public setState_PrimitiveLock(primitiveLock: boolean): IPCB_PrimitiveObject;
		public toAsync(): IPCB_PrimitiveObject;
		public toSync(): IPCB_PrimitiveObject;
		public isAsync(): boolean;
		public reset(): Promise<IPCB_PrimitiveObject>;
		public done(): Promise<IPCB_PrimitiveObject>;
	}
	class PCB_PrimitiveObject implements IPCB_PrimitiveAPI {
		public create(layer: TPCB_LayersOfObject, topLeftX: number, topLeftY: number, binaryData: string, width: number, height: number, rotation?: number, mirror?: boolean, fileName?: string, primitiveLock?: boolean): Promise<IPCB_PrimitiveObject | undefined>;
		public delete(primitiveIds: string | IPCB_PrimitiveObject | Array<string> | Array<IPCB_PrimitiveObject>): Promise<boolean>;
		public modify(primitiveId: string | IPCB_PrimitiveObject, property: { layer?: TPCB_LayersOfObject; topLeftX?: number; topLeftY?: number; binaryData?: string; width?: number; height?: number; rotation?: number; mirror?: boolean; fileName?: string; primitiveLock?: boolean }): Promise<IPCB_PrimitiveObject | undefined>;
		public get(primitiveIds: string): Promise<IPCB_PrimitiveObject | undefined>;
		public get(primitiveIds: Array<string>): Promise<Array<IPCB_PrimitiveObject>>;
		public getAllPrimitiveId(layer?: TPCB_LayersOfObject, primitiveLock?: boolean): Promise<Array<string>>;
		public getAll(layer?: TPCB_LayersOfObject, primitiveLock?: boolean): Promise<Array<IPCB_PrimitiveObject>>;
	}
	class PCB_PrimitivePad implements IPCB_PrimitiveAPI {
		public create(layer: TPCB_LayersOfPad, padNumber: string, x: number, y: number, rotation?: number, pad?: TPCB_PrimitivePadShape, net?: string, hole?: TPCB_PrimitivePadHole | null, holeOffsetX?: number, holeOffsetY?: number, holeRotation?: number, metallization?: boolean, padType?: EPCB_PrimitivePadType, specialPad?: TPCB_PrimitiveSpecialPadShape, solderMaskAndPasteMaskExpansion?: IPCB_PrimitiveSolderMaskAndPasteMaskExpansion | null, heatWelding?: IPCB_PrimitivePadHeatWelding | null, primitiveLock?: boolean): Promise<IPCB_PrimitivePad | undefined>;
		public delete(primitiveIds: string | IPCB_PrimitivePad | Array<string> | Array<IPCB_PrimitivePad>): Promise<boolean>;
		public modify(primitiveId: string | IPCB_PrimitivePad, property: { layer?: TPCB_LayersOfPad; padNumber?: string; x?: number; y?: number; rotation?: number; pad?: TPCB_PrimitivePadShape; net?: string; hole?: TPCB_PrimitivePadHole | null; holeOffsetX?: number; holeOffsetY?: number; holeRotation?: number; metallization?: boolean; specialPad?: TPCB_PrimitiveSpecialPadShape; solderMaskAndPasteMaskExpansion?: IPCB_PrimitiveSolderMaskAndPasteMaskExpansion | null; heatWelding?: IPCB_PrimitivePadHeatWelding | null; primitiveLock?: boolean }): Promise<IPCB_PrimitivePad | undefined>;
		public get(primitiveIds: string): Promise<IPCB_PrimitivePad | undefined>;
		public get(primitiveIds: Array<string>): Promise<Array<IPCB_PrimitivePad>>;
		public getAllPrimitiveId(layer?: TPCB_LayersOfPad, net?: string, primitiveLock?: boolean, padType?: EPCB_PrimitivePadType): Promise<Array<string>>;
		public getAll(layer?: TPCB_LayersOfPad, net?: string, primitiveLock?: boolean, padType?: EPCB_PrimitivePadType): Promise<Array<IPCB_PrimitivePad>>;
	}
	class PCB_PrimitivePolyline implements IPCB_PrimitiveAPI {
		public create(net: string, layer: TPCB_LayersOfLine, polygon: IPCB_Polygon, lineWidth?: number, primitiveLock?: boolean): Promise<IPCB_PrimitivePolyline | undefined>;
		public delete(primitiveIds: string | IPCB_PrimitivePolyline | Array<string> | Array<IPCB_PrimitivePolyline>): Promise<boolean>;
		public modify(primitiveId: string | IPCB_PrimitivePolyline, property: { net?: string; layer?: TPCB_LayersOfLine; polygon?: IPCB_Polygon; lineWidth?: number; primitiveLock?: boolean }): Promise<IPCB_PrimitivePolyline | undefined>;
		public get(primitiveIds: string): Promise<IPCB_PrimitivePolyline | undefined>;
		public get(primitiveIds: Array<string>): Promise<Array<IPCB_PrimitivePolyline>>;
		public getAllPrimitiveId(net?: string, layer?: TPCB_LayersOfLine, primitiveLock?: boolean): Promise<Array<string>>;
		public getAll(net?: string, layer?: TPCB_LayersOfLine, primitiveLock?: boolean): Promise<Array<IPCB_PrimitivePolyline>>;
	}
	class PCB_PrimitivePour implements IPCB_PrimitiveAPI {
		public create(net: string, layer: TPCB_LayersOfCopper, complexPolygon: IPCB_Polygon, pourFillMethod?: EPCB_PrimitivePourFillMethod, preserveSilos?: boolean, pourName?: string, pourPriority?: number, lineWidth?: number, primitiveLock?: boolean): Promise<IPCB_PrimitivePour | undefined>;
		public delete(primitiveIds: string | IPCB_PrimitivePour | Array<string> | Array<IPCB_PrimitivePour>): Promise<boolean>;
		public modify(primitiveId: string | IPCB_PrimitivePour, property: { net?: string; layer?: TPCB_LayersOfCopper; complexPolygon?: IPCB_Polygon; pourFillMethod?: EPCB_PrimitivePourFillMethod; preserveSilos?: boolean; pourName?: string; pourPriority?: number; lineWidth?: number; primitiveLock?: boolean }): Promise<IPCB_PrimitivePour | undefined>;
		public get(primitiveIds: string): Promise<IPCB_PrimitivePour | undefined>;
		public get(primitiveIds: Array<string>): Promise<Array<IPCB_PrimitivePour>>;
		public getAllPrimitiveId(net?: string, layer?: TPCB_LayersOfCopper, primitiveLock?: boolean): Promise<Array<string>>;
		public getAll(net?: string, layer?: TPCB_LayersOfCopper, primitiveLock?: boolean): Promise<Array<IPCB_PrimitivePour>>;
		public rebuildCopperRegions(primitiveIds?: Array<string>): Promise<Array<IPCB_PrimitivePoured>>;
		public rebuildAllCopperRegions(): Promise<Array<IPCB_PrimitivePoured>>;
		public rebuildCopperRegionsByLayer(layer: TPCB_LayersOfCopper | Array<TPCB_LayersOfCopper>): Promise<Array<IPCB_PrimitivePoured>>;
		private rebuildPlaneCopperRegions(layers?: Array<TPCB_LayersOfCopper>): Promise<Array<IPCB_PrimitivePoured>>;
		private rebuildCopperRegionsByIds(opIds: Array<string>): Promise<Array<IPCB_PrimitivePoured>>;
	}
	class PCB_PrimitivePoured implements IPCB_PrimitiveAPI {
		public create(): undefined;
		public delete(primitiveIds: string | IPCB_PrimitivePoured | Array<string> | Array<IPCB_PrimitivePoured>): Promise<boolean>;
		public modify(): undefined;
		public get(primitiveIds: string): Promise<IPCB_PrimitivePoured | undefined>;
		public get(primitiveIds: Array<string>): Promise<Array<IPCB_PrimitivePoured>>;
		public getAllPrimitiveId(): Promise<Array<string>>;
		public getAll(): Promise<Array<IPCB_PrimitivePoured>>;
	}
	class PCB_PrimitiveRegion implements IPCB_PrimitiveAPI {
		public create(layer: TPCB_LayersOfRegion, complexPolygon: IPCB_Polygon, ruleType?: Array<EPCB_PrimitiveRegionRuleType>, regionName?: string, lineWidth?: number, primitiveLock?: boolean): Promise<IPCB_PrimitiveRegion | undefined>;
		public delete(primitiveIds: string | IPCB_PrimitiveRegion | Array<string> | Array<IPCB_PrimitiveRegion>): Promise<boolean>;
		public modify(primitiveId: string | IPCB_PrimitiveRegion, property: { layer?: TPCB_LayersOfRegion; complexPolygon?: IPCB_Polygon; ruleType?: Array<EPCB_PrimitiveRegionRuleType>; regionName?: string; lineWidth?: number; primitiveLock?: boolean }): Promise<IPCB_PrimitiveRegion | undefined>;
		public get(primitiveIds: string): Promise<IPCB_PrimitiveRegion | undefined>;
		public get(primitiveIds: Array<string>): Promise<Array<IPCB_PrimitiveRegion>>;
		public getAllPrimitiveId(layer?: TPCB_LayersOfRegion, ruleType?: Array<EPCB_PrimitiveRegionRuleType>, primitiveLock?: boolean): Promise<Array<string>>;
		public getAll(layer?: TPCB_LayersOfRegion, ruleType?: Array<EPCB_PrimitiveRegionRuleType>, primitiveLock?: boolean): Promise<Array<IPCB_PrimitiveRegion>>;
	}
	class IPCB_PrimitiveString implements IPCB_Primitive {
		private async: boolean;
		private readonly primitiveType: EPCB_PrimitiveType.STRING;
		private primitiveId?: string;
		private layer: TPCB_LayersOfImage;
		private x: number;
		private y: number;
		private text: string;
		private fontFamily: string;
		private fontSize: number;
		private lineWidth: number;
		private alignMode: EPCB_PrimitiveStringAlignMode;
		private rotation: number;
		private reverse: boolean;
		private expansion: number;
		private mirror: boolean;
		private primitiveLock: boolean;
		public constructor(layer: TPCB_LayersOfImage, x: number, y: number, text: string, fontFamily?: string, fontSize?: number, lineWidth?: number, alignMode?: EPCB_PrimitiveStringAlignMode, rotation?: number, reverse?: boolean, expansion?: number, mirror?: boolean, primitiveLock?: boolean, primitiveId?: string);
		public create(): Promise<IPCB_PrimitiveString>;
		public getState_PrimitiveType(): EPCB_PrimitiveType;
		public getState_PrimitiveId(): string;
		public getState_Layer(): TPCB_LayersOfImage;
		public getState_X(): number;
		public getState_Y(): number;
		public getState_Text(): string;
		public getState_FontFamily(): string;
		public getState_FontSize(): number;
		public getState_LineWidth(): number;
		public getState_AlignMode(): EPCB_PrimitiveStringAlignMode;
		public getState_Rotation(): number;
		public getState_Reverse(): boolean;
		public getState_Expansion(): number;
		public getState_Mirror(): boolean;
		public getState_PrimitiveLock(): boolean;
		public setState_Layer(layer: TPCB_LayersOfImage): IPCB_PrimitiveString;
		public setState_X(x: number): IPCB_PrimitiveString;
		public setState_Y(y: number): IPCB_PrimitiveString;
		public setState_Text(text: string): IPCB_PrimitiveString;
		public setState_FontFamily(fontFamily: string): IPCB_PrimitiveString;
		public setState_FontSize(fontSize: number): IPCB_PrimitiveString;
		public setState_LineWidth(lineWidth: number): IPCB_PrimitiveString;
		public setState_AlignMode(alignMode: EPCB_PrimitiveStringAlignMode): IPCB_PrimitiveString;
		public setState_Rotation(rotation: number): IPCB_PrimitiveString;
		public setState_Reverse(reverse: boolean): IPCB_PrimitiveString;
		public setState_Expansion(expansion: number): IPCB_PrimitiveString;
		public setState_Mirror(mirror: boolean): IPCB_PrimitiveString;
		public setState_PrimitiveLock(primitiveLock: boolean): IPCB_PrimitiveString;
		public toAsync(): IPCB_PrimitiveString;
		public toSync(): IPCB_PrimitiveString;
		public isAsync(): boolean;
		public reset(): Promise<IPCB_PrimitiveString>;
		public done(): Promise<IPCB_PrimitiveString>;
	}
	class PCB_PrimitiveString implements IPCB_PrimitiveAPI {
		public create(layer: TPCB_LayersOfImage, x: number, y: number, text: string, fontFamily: string, fontSize: number, lineWidth: number, alignMode: EPCB_PrimitiveStringAlignMode, rotation: number, reverse: boolean, expansion: number, mirror: boolean, primitiveLock: boolean): Promise<IPCB_PrimitiveString | undefined>;
		public delete(primitiveIds: string | IPCB_PrimitiveString | Array<string> | Array<IPCB_PrimitiveString>): Promise<boolean>;
		public modify(primitiveId: string | IPCB_PrimitiveString, property: { layer?: TPCB_LayersOfImage; x?: number; y?: number; text?: string; fontFamily?: string; fontSize?: number; lineWidth?: number; alignMode?: EPCB_PrimitiveStringAlignMode; rotation?: number; reverse?: boolean; expansion?: number; mirror?: boolean; primitiveLock?: boolean }): Promise<IPCB_PrimitiveString | undefined>;
		public get(primitiveIds: string): Promise<IPCB_PrimitiveString | undefined>;
		public get(primitiveIds: Array<string>): Promise<Array<IPCB_PrimitiveString>>;
		public getAllPrimitiveId(layer?: TPCB_LayersOfImage, primitiveLock?: boolean): Promise<Array<string>>;
		public getAll(layer?: TPCB_LayersOfImage, primitiveLock?: boolean): Promise<Array<IPCB_PrimitiveString>>;
	}
	class PCB_PrimitiveVia implements IPCB_PrimitiveAPI {
		public create(net: string, x: number, y: number, holeDiameter: number, diameter: number, viaType?: EPCB_PrimitiveViaType, designRuleBlindViaName?: string | null, solderMaskExpansion?: IPCB_PrimitiveSolderMaskAndPasteMaskExpansion | null, primitiveLock?: boolean): Promise<IPCB_PrimitiveVia | undefined>;
		public delete(primitiveIds: string | IPCB_PrimitiveVia | Array<string> | Array<IPCB_PrimitiveVia>): Promise<boolean>;
		public modify(primitiveId: string | IPCB_PrimitiveVia, property: { net?: string; x?: number; y?: number; holeDiameter?: number; diameter?: number; viaType?: EPCB_PrimitiveViaType; designRuleBlindViaName?: string | null; solderMaskExpansion?: IPCB_PrimitiveSolderMaskAndPasteMaskExpansion | null; primitiveLock?: boolean }): Promise<IPCB_PrimitiveVia | undefined>;
		public get(primitiveIds: string): Promise<IPCB_PrimitiveVia | undefined>;
		public get(primitiveIds: Array<string>): Promise<Array<IPCB_PrimitiveVia>>;
		public getAllPrimitiveId(net?: string, primitiveLock?: boolean): Promise<Array<string>>;
		public getAll(net?: string, primitiveLock?: boolean): Promise<Array<IPCB_PrimitiveVia>>;
	}
	interface IPCB_RayTracerBackgroundConfig {
		useColor?: boolean;
		intensity?: number;
		texture?: string;
		color?: string;
		rotation?: number;
		hide?: boolean;
		hideColor?: string;
	}
	interface IPCB_RayTracerRendererConfig {
		maxRayBounces?: number;
		rendererMaxSample?: number;
		rendererEnableDenoise?: boolean;
		displayDevice?: string;
		viewTransform?: string;
		lutName?: string;
	}
	interface IPCB_RayTracerLightConfig {
		color?: string;
		power?: number;
		size?: { width?: number; height?: number };
		position?: { x?: number; y?: number; z?: number };
		rotate?: { x?: number; y?: number; z?: number };
		normalize?: boolean;
		rayVisibilityDiffuse?: boolean;
		rayVisibilityGlossy?: boolean;
		castShadow?: boolean;
		hideRender?: boolean;
		cameraVisible?: boolean;
		spread?: number;
		colorMap?: string;
		file?: File;
	}
	interface IPCB_RayTracerTexture {
		name?: string;
		scale?: number;
	}
	interface IPCB_RayTracerMaterialConfig {
		materialId?: string;
		color?: string;
		colorTexture?: IPCB_RayTracerTexture;
		metallic?: number;
		metallicTexture?: IPCB_RayTracerTexture;
		roughness?: number;
		roughnessTexture?: IPCB_RayTracerTexture;
		normalIntensity?: number;
		normalTexture?: IPCB_RayTracerTexture;
		ior?: number;
		iorLevel?: number;
		clearcoatIntensity?: number;
		clearcoatTintColor?: string;
		clearcoatIor?: number;
		clearcoatRoughness?: number;
		colorTextureFile?: File;
		metallicTextureFile?: File;
		roughnessTextureFile?: File;
		normalTextureFile?: File;
	}
	interface IPCB_RayTracerPcbMaterialConfig {
		substrate?: string;
		solder?: string;
		spray?: string;
		lastSubstrate?: string;
		lastSolder?: string;
		lastSpray?: string;
	}
	interface IPCB_RayTracerRenderConfigurations {
		file?: File;
		background?: IPCB_RayTracerBackgroundConfig;
		renderer?: IPCB_RayTracerRendererConfig;
		light?: Record<string, IPCB_RayTracerLightConfig>;
		materialConfig?: IPCB_RayTracerMaterialConfig;
		pcbMaterialConfig?: IPCB_RayTracerPcbMaterialConfig;
	}
	interface IPCB_RayTracerSceneElementTransform {
		position: { x: number; y: number; z: number };
		rotation: { x: number; y: number; z: number };
		scale: number;
	}
	interface IPCB_RayTracerSceneElement {
		id: string;
		name: string;
		transform: IPCB_RayTracerSceneElementTransform;
	}
	class PCB_RayTracerEngine {
		private extensionUuid?: string;
		public constructor(extensionUuid?: string);
		public init(): Promise<void>;
		public dispose(): Promise<void>;
		public setRenderConfigurations(configurations: IPCB_RayTracerRenderConfigurations): Promise<void>;
		public getRenderConfigurations(): Promise<IPCB_RayTracerRenderConfigurations>;
		public getLightConfigurations(lightName: string): Promise<any>;
		public pauseRender(): Promise<void>;
		public exportImage(): Promise<Blob | null>;
		public exportPackage(preset: 'geometry' | 'asset' | 'scene'): Promise<Blob>;
		public importPackage(file: Blob): Promise<void>;
		public getSceneElements(): Promise<IPCB_RayTracerSceneElement[]>;
		public addSceneElement(file: Blob): Promise<IPCB_RayTracerSceneElement>;
		public removeSceneElement(id: string): Promise<void>;
		public setSceneElementTransform(id: string, transform: IPCB_RayTracerSceneElementTransform): Promise<void>;
	}
	class PCB_SelectControl {
		public getAllSelectedPrimitives_PrimitiveId(): Promise<Array<string>>;
		public getAllSelectedPrimitives(): Promise<Array<IPCB_Primitive>>;
		public getSelectedPrimitives(): Promise<Array<object>>;
		public doSelectPrimitives(primitiveIds: string | Array<string>): Promise<boolean>;
		public doCrossProbeSelect(components?: Array<string>, pins?: Array<string>, nets?: Array<string>, highlight?: boolean, select?: boolean): Promise<boolean>;
		public doCrossProbeSelectByObject(components?: Array<string>, pins?: Array<string>, nets?: Array<string>): Promise<boolean>;
		public clearSelected(): Promise<boolean>;
		public getCurrentMousePosition(): Promise<{ x: number; y: number } | undefined>;
	}
	interface IPNL_CombinationItem {
		combinationId: string;
		displayId?: string;
		name: string;
		parentCombinationId: string | null;
		elementIds: Array<string>;
		combinationIds: Array<string>;
		visible: boolean;
		locked: boolean;
	}
	interface IPNL_CombinationModifyProperty {
		name?: string;
		parentCombinationId?: string | null;
		addElementIds?: Array<string>;
		removeElementIds?: Array<string>;
		addCombinationIds?: Array<string>;
		removeCombinationIds?: Array<string>;
		visible?: boolean;
		locked?: boolean;
	}
	interface IPNL_CombinationTreeNode {
		combinationId: string;
		displayId?: string;
		name: string;
		visible: boolean;
		locked: boolean;
		elementIds: Array<string>;
		children: Array<IPNL_CombinationTreeNode>;
	}
	class PNL_Combination {
		public create(primitiveIds: Array<string>, combinationIds?: Array<string>, parentCombinationId?: string | null): Promise<IPNL_CombinationItem | undefined>;
		public delete(combinationIds: string | IPNL_CombinationItem | Array<string> | Array<IPNL_CombinationItem>): Promise<boolean>;
		public modify(combinationId: string | IPNL_CombinationItem, property: IPNL_CombinationModifyProperty): Promise<IPNL_CombinationItem | undefined>;
		public get(combinationId: string): Promise<IPNL_CombinationItem | undefined>;
		public getAll(): Promise<Array<IPNL_CombinationItem>>;
		public getTree(parentCombinationId?: string | null): Promise<Array<IPNL_CombinationTreeNode>>;
		public getAllPrimitiveIds(combinationId: string): Promise<Array<string>>;
		public addToGroup(combinationId: string, primitiveIds: string | Array<string>): Promise<boolean>;
		public removeFromGroup(primitiveIds: string | Array<string>): Promise<boolean>;
		public ungroup(combinationIds: string | IPNL_CombinationItem | Array<string> | Array<IPNL_CombinationItem>): Promise<boolean>;
		public enterGroup(combinationId: string): Promise<boolean>;
		public exitGroup(): Promise<boolean>;
		public getCurrentEditingCombinationId(): Promise<string | undefined>;
		public select(combinationIds: string | Array<string>): Promise<boolean>;
	}
	enum EPNL_PrimitiveType {
		 RECT = 'Rect',
		 ELLIPSE = 'Ellipse',
		 ARC = 'Arc',
		 PATH = 'Path',
		 TEXT = 'Text',
		 IMAGE = 'Image',
		 DIMENSION = 'Dimension',
		 AUXILIARY_LINE = 'AuxiliaryLine',
		 AUXILIARY_POINT = 'AuxiliaryPoint',
		 COMBINATION = 'Combination',
	}
	interface IPNL_Primitive {
		getState_PrimitiveType: () => EPNL_PrimitiveType;
		getState_PrimitiveId: () => string;
		create: () => IPNL_Primitive | Promise<IPNL_Primitive>;
		toAsync: () => IPNL_Primitive;
		toSync: () => IPNL_Primitive;
		isAsync: () => boolean;
		reset: () => IPNL_Primitive | Promise<IPNL_Primitive>;
		done: () => IPNL_Primitive | Promise<IPNL_Primitive>;
	}
	enum EPNL_Material {
		 ACRYLIC = 'acrylic',
		 PVC = 'PVC',
	}
	enum EPNL_CoverColor {
		 WHITE = 'white',
		 BLACK = 'black',
	}
	enum EPNL_PrintSide {
		 TOP = 'Top Side',
		 BOTTOM = 'Bottom Side',
	}
	interface IPNL_DocumentInfo {
		docType: number;
		name: string;
		title: string;
		desc: string;
		width: string;
		height: string;
		material: EPNL_Material;
		thickness: string;
		craft: string;
		coverColor: EPNL_CoverColor;
		print: EPNL_PrintSide;
	}
	enum EPNL_SelectionMode {
		 NORMAL = 'normal',
		 CONTINUOUS = 'continuousSelection',
		 RECTANGLE_INSIDE = 'rectangleInside',
		 RECTANGLE_OUTSIDE = 'rectangleOutside',
		 POLYGON_INSIDE = 'polygonInside',
		 POLYGON_OUTSIDE = 'polygonOutside',
		 LINE_TOUCHED = 'lineTouched',
	}
	interface IPNL_DocumentStatus {
		canUndo: boolean;
		canRedo: boolean;
		canPaste: boolean;
		canCut: boolean;
		canCopy: boolean;
		canRotate: boolean;
		canFlip: boolean;
		canAlign: boolean;
		canEditArray: boolean;
		zoom: number;
		selectionMode: EPNL_SelectionMode;
		selectedCount: number;
		selectedCombinationCount: number;
		isEditingPath: boolean;
		isDragging: boolean;
		isPasting: boolean;
		isLibPlacing: boolean;
		visibleGrid: boolean;
		snapGrid: boolean;
		isFocusOnCanvas: boolean;
	}
	enum EPNL_GridType {
		 NONE = 'not',
		 DOT = 'dot',
		 LINE = 'line',
	}
	interface IPNL_GridSetting {
		size: number;
		type: EPNL_GridType;
		visible: boolean;
		snap: boolean;
	}
	interface IPNL_FilterItem {
		key: string;
		title: string;
		visible?: boolean;
		checked?: boolean;
	}
	interface IPNL_FilterGroup {
		title: string;
		allKey: string;
		items: Array<IPNL_FilterItem>;
	}
	interface IPNL_FilterConfiguration {
		name: string;
		groups: Array<IPNL_FilterGroup>;
	}
	class PNL_Document {
		public save(): Promise<boolean>;
		public navigateToCoordinates(x: number, y: number): Promise<boolean>;
		public navigateToRegion(left: number, right: number, top: number, bottom: number): Promise<boolean>;
		public getPrimitiveAtPoint(x: number, y: number): Promise<IPNL_Primitive | undefined>;
		public getPrimitivesInRegion(left: number, right: number, top: number, bottom: number): Promise<Array<IPNL_Primitive>>;
		public getProductSize(): Promise<{ width: string; height: string } | undefined>;
		public getDocumentInfo(): Promise<IPNL_DocumentInfo | undefined>;
		public modifyDocumentInfo(property: Partial<IPNL_DocumentInfo>): Promise<boolean>;
		public mmToPixel(mm: number): number;
		public pixelToMm(pixel: number): number;
		public undo(): Promise<boolean>;
		public redo(): Promise<boolean>;
		public undoDraw(): Promise<boolean>;
		public getDocumentStatus(): Promise<IPNL_DocumentStatus | undefined>;
		public getCanvasOrigin(): Promise<{ x: number; y: number } | undefined>;
		public setCanvasOrigin(x: number, y: number): Promise<boolean>;
		public setOriginByCenter(): Promise<boolean>;
		public getGridSetting(): Promise<IPNL_GridSetting | undefined>;
		public setGridSetting(property: Partial<IPNL_GridSetting>): Promise<boolean>;
		public getFilterConfigurations(): Promise<Array<IPNL_FilterConfiguration>>;
		public getCurrentFilterConfiguration(): Promise<IPNL_FilterConfiguration | undefined>;
		public applyFilterConfiguration(name: string): Promise<boolean>;
	}
	interface IPNL_DrcCheckResult {
		fatalErrorCount: number;
		errorCount: number;
		warnCount: number;
		infoCount: number;
	}
	class PNL_Drc {
		public check(): Promise<IPNL_DrcCheckResult | undefined>;
	}
	enum EPNL_AlignType {
		 LEFT = 'alignLeft',
		 RIGHT = 'alignRight',
		 TOP = 'alignTop',
		 BOTTOM = 'alignBottom',
		 HORIZONTAL_CENTER = 'alignHorizontalCenter',
		 VERTICAL_CENTER = 'alignVerticalCenter',
		 HORIZONTAL_EQUIDISTANT = 'alignHorizontalEquidistant',
		 VERTICAL_EQUIDISTANT = 'alignVerticalEquidistant',
		 LEFT_SIDE_EDGE_EQUIDISTANT = 'alignLeftSideEdgeEquidistant',
		 TOP_SIDE_EDGE_EQUIDISTANT = 'alignTopSideEdgeEquidistant',
		 GRID = 'alignGrid',
	}
	enum EPNL_BooleanOperationType {
		 INTERSECTION = 'boolIntersection',
		 SUBTRACTION = 'boolSubtraction',
		 AGGREGATE = 'boolAggregate',
		 EXCLUSIVE = 'boolExclusive',
	}
	enum EPNL_ExpandShapeType {
		 EXPAND_IN = 'expandIn',
		 EXPAND_OUT = 'expandOut',
		 SCALE = 'scale',
	}
	enum EPNL_LayerId {
		 BOUNDARY = -1,
		 PRINT = 1,
		 OPACITY = 2,
		 BOARD = 3,
		 BOARD_HOLE = 4,
		 GLUE_HOLE = 5,
		 LIGHT = 6,
		 BUN = 7,
		 ASSIST = 8,
		 APPLY_ALL = 99,
	}
	interface IPNL_ExpandShapeOption {
		type: EPNL_ExpandShapeType;
		value: number;
		targetLayer?: EPNL_LayerId;
		deleteOriginal?: boolean;
	}
	class PNL_EditControl {
		public align(primitiveIds: Array<string>, alignType: EPNL_AlignType): Promise<boolean>;
		public booleanOperation(primitiveIds: Array<string>, operationType: EPNL_BooleanOperationType): Promise<Array<string>>;
		public arrayCopy(primitiveIds: Array<string>, row: number, column: number, rowSpacing: number, columnSpacing: number): Promise<boolean>;
		public bringToFront(primitiveIds: Array<string>): Promise<boolean>;
		public sendToBack(primitiveIds: Array<string>): Promise<boolean>;
		public raiseOneLevel(primitiveIds: Array<string>): Promise<boolean>;
		public lowerOneLevel(primitiveIds: Array<string>): Promise<boolean>;
		public rotate(primitiveIds: Array<string>, angle: number): Promise<boolean>;
		public flipHorizontal(primitiveIds: Array<string>): Promise<boolean>;
		public flipVertical(primitiveIds: Array<string>): Promise<boolean>;
		public lock(primitiveIds: Array<string>): Promise<boolean>;
		public unlock(primitiveIds: Array<string>): Promise<boolean>;
		public hide(primitiveIds: Array<string>): Promise<boolean>;
		public show(primitiveIds: Array<string>): Promise<boolean>;
		public copy(primitiveIds: Array<string>): Promise<boolean>;
		public cut(primitiveIds: Array<string>): Promise<boolean>;
		public paste(): Promise<boolean>;
		public duplicateTo(primitiveIds: Array<string>, offsetX: number, offsetY: number): Promise<Array<string>>;
		public delete(primitiveIds: Array<string>): Promise<boolean>;
		public joinPath(primitiveIds: Array<string>): Promise<Array<string>>;
		public reversePath(primitiveIds: Array<string>): Promise<boolean>;
		public simplifyPath(primitiveIds: Array<string>): Promise<boolean>;
		public convertStrokeToShape(primitiveIds: Array<string>): Promise<Array<string>>;
		public convertBaseShapeToPath(primitiveIds: Array<string>): Promise<Array<string>>;
		public breakShapeApart(primitiveIds: Array<string>): Promise<Array<string>>;
		public combineShapes(primitiveIds: Array<string>): Promise<Array<string>>;
		public expandShapes(primitiveIds: Array<string>, option: IPNL_ExpandShapeOption): Promise<Array<string>>;
		public generateImageOutline(primitiveIds: Array<string>): Promise<Array<string>>;
	}
	enum EPNL_EventType {
		 SELECTION_CHANGE = 'selectionChange',
		 DOCUMENT_SAVE = 'documentSave',
		 LAYER_CHANGE = 'layerChange',
		 DRAW_END = 'drawEnd',
	}
	interface IPNL_EventPayload {
		type: EPNL_EventType;
		primitiveIds?: Array<string>;
		layer?: EPNL_LayerId;
	}
	enum EPNL_MouseEventType {
		 SELECTED = 'selected',
		 CLEAR_SELECTED = 'clearSelected',
		 MOVE = 'move',
	}
	interface IPNL_MouseEventPayload {
		primitiveId?: string;
		primitiveType?: EPNL_PrimitiveType;
		x: number;
		y: number;
	}
	enum EPNL_PrimitiveEventType {
		 CREATE = 'add',
		 MODIFY = 'modify',
		 DELETE = 'delete',
	}
	interface IPNL_PrimitiveEventPayload {
		primitiveIds: Array<string>;
		primitiveTypes: Array<EPNL_PrimitiveType>;
	}
	class PNL_Event {
		private readonly extensionUuid?: string;
		public constructor(extensionUuid?: string);
		public addEventListener(id: string, eventType: EPNL_EventType, callFn: (event: IPNL_EventPayload) => void | Promise<void>, onlyOnce?: boolean): boolean;
		public removeEventListener(id: string): boolean;
		public isEventListenerAlreadyExist(id: string): boolean;
		public addMouseEventListener(id: string, eventType: 'all' | EPNL_MouseEventType, callFn: (eventType: EPNL_MouseEventType, payload: IPNL_MouseEventPayload) => void | Promise<void>, onlyOnce?: boolean): boolean;
		public addPrimitiveEventListener(id: string, eventType: 'all' | EPNL_PrimitiveEventType, callFn: (eventType: EPNL_PrimitiveEventType, payload: IPNL_PrimitiveEventPayload) => void | Promise<void>, onlyOnce?: boolean): boolean;
	}
	interface IPNL_ImportLayerInfo {
		dxfLayerName: string;
		shapeCount: number;
	}
	interface IPNL_ImportLayerOption {
		dxfLayerName: string;
		layerId: EPNL_LayerId;
		visible: boolean;
	}
	class PNL_Import {
		public initPreview(dataStr: string): Promise<string>;
		public getLayerInfo(): Promise<Array<IPNL_ImportLayerInfo>>;
		public previewForLatestParam(): Promise<string>;
		public updateParameter(scale?: number, strokeWidth?: number): Promise<boolean>;
		public import(origin: boolean): Promise<boolean>;
		public close(): Promise<boolean>;
		public updateLayerData(options: Array<IPNL_ImportLayerOption>): Promise<string>;
	}
	enum EPNL_PrintScope {
		 PRINT_AND_COVER = 1,
		 PRINT = 2,
		 COVER = 3,
	}
	interface IPNL_PrimitiveCommonState {
		name: string;
		layer?: EPNL_LayerId;
		hide: boolean;
		visible: boolean;
		rotation: number;
		primitiveLock: boolean;
		zIndex?: number;
		scope: EPNL_PrintScope;
		opacity: number;
		cover: boolean;
		isWhiteBackground: boolean;
		transparencyPrint: number;
		transparencyWhite: number;
		strokeStyle?: number;
		displayStroke?: boolean;
		displayFill?: boolean;
	}
	class PNL_Primitive {
		public getPrimitiveTypeByPrimitiveId(id: string): Promise<EPNL_PrimitiveType | undefined>;
		public getPrimitiveByPrimitiveId(id: string): Promise<IPNL_Primitive | undefined>;
		public getPrimitivesBBox(primitiveIds: Array<string | IPNL_Primitive>): Promise<{ minX: number; minY: number; maxX: number; maxY: number } | undefined>;
		public getCommonState(primitiveId: string | IPNL_Primitive): Promise<IPNL_PrimitiveCommonState | undefined>;
		public modifyCommonState(primitiveIds: string | IPNL_Primitive | Array<string> | Array<IPNL_Primitive>, property: Partial<IPNL_PrimitiveCommonState>): Promise<boolean>;
	}
	interface IPNL_LayerItem {
		id: EPNL_LayerId;
		name: string;
		visible: boolean;
		locked: boolean;
	}
	enum EPNL_LayerMode {
		 FIXED = 'fixed',
		 CUSTOM = 'custom',
	}
	enum EPNL_LayerFixedScheme {
		 DEFAULT = 'default',
		 EDIT_BOARD = 'editBoard',
		 EDIT_PRINT = 'editPrint',
		 EDIT_OPACITY = 'editOpacity',
		 EDIT_GLUE = 'editGlue',
		 EDIT_SIMULATION_LIGHT = 'editSimulationLight',
	}
	interface IPNL_LayerSchemeOption {
		id: number;
		name: string;
		actived?: boolean;
		locked?: boolean;
		visible: boolean;
		backgroundSelector?: string;
	}
	interface IPNL_LayerScheme {
		mode: EPNL_LayerMode;
		name: string;
		label: EPNL_LayerFixedScheme | string;
		options: Array<IPNL_LayerSchemeOption>;
	}
	class PNL_Layer {
		public getAllLayers(): Promise<Array<IPNL_LayerItem>>;
		public getCurrentLayer(): Promise<EPNL_LayerId | undefined>;
		public selectLayer(layer: EPNL_LayerId): Promise<boolean>;
		public setLayerVisible(layer: EPNL_LayerId): Promise<boolean>;
		public setLayerInvisible(layer: EPNL_LayerId): Promise<boolean>;
		public lockLayer(layer: EPNL_LayerId): Promise<boolean>;
		public unlockLayer(layer: EPNL_LayerId): Promise<boolean>;
		public getLayerScheme(): Promise<IPNL_LayerScheme | undefined>;
		public switchLayerScheme(scheme: EPNL_LayerFixedScheme | string): Promise<boolean>;
		public resetLayerScheme(): Promise<boolean>;
	}
	class PNL_ManufactureData {
		public getSvgString(svgMargin?: number): Promise<string>;
		public getPreviewSvg(): Promise<string>;
		public getPdfFile(fileName?: string): Promise<File | undefined>;
	}
	class PNL_SelectControl {
		public getAllSelectedPrimitives_PrimitiveId(): Promise<Array<string>>;
		public getAllSelectedPrimitives(): Promise<Array<IPNL_Primitive>>;
		public doSelectPrimitives(primitiveIds: string | Array<string>): Promise<boolean>;
		public clearSelected(): Promise<boolean>;
		public getCurrentMousePosition(): Promise<{ x: number; y: number } | undefined>;
		public highlight(primitiveIds: string | Array<string>): Promise<boolean>;
		public unhighlight(primitiveIds: string | Array<string>): Promise<boolean>;
		public highlightCombination(combinationIds: string | Array<string>): Promise<boolean>;
		public unhighlightCombination(combinationIds: string | Array<string>): Promise<boolean>;
		public selectAll(): Promise<boolean>;
		public unselect(primitiveIds: string | Array<string>): Promise<boolean>;
		public getSelectedCount(): Promise<number>;
		public setSelectionMode(mode: EPNL_SelectionMode): Promise<boolean>;
		public getSelectionMode(): Promise<EPNL_SelectionMode | undefined>;
		public selectOverlap(): Promise<boolean>;
	}
	interface IPNL_PrimitiveAPI {
		create: (...args: any[]) => IPNL_Primitive | undefined | Promise<IPNL_Primitive> | Promise<IPNL_Primitive | undefined>;
		delete: (primitiveIds: string | any | Array<string> | Array<any>) => boolean | Promise<boolean>;
		modify: (primitiveId: string | any, ...args: any[]) => IPNL_Primitive | undefined | Promise<IPNL_Primitive> | Promise<IPNL_Primitive | undefined>;
		get: { (primitiveIds: string): IPNL_Primitive | undefined | Promise<IPNL_Primitive | undefined>; (primitiveIds: Array<string>): Array<IPNL_Primitive> | Promise<Array<IPNL_Primitive>> };
		getAllPrimitiveId: (...args: any[]) => Array<string> | Promise<Array<string>>;
		getAll: (...args: any[]) => Array<IPNL_Primitive> | Promise<Array<IPNL_Primitive>>;
	}
	interface IPNL_RectangleCreateParameters {
		x: number;
		y: number;
		width: number;
		height: number;
		rx?: number;
		ry?: number;
		layer?: EPNL_LayerId;
		strokeColor?: string;
		fillColor?: string;
		strokeWidth?: number;
		rotation?: number;
		primitiveLock?: boolean;
	}
	interface IPNL_RectangleData {
		primitiveId: string;
		x: number;
		y: number;
		width: number;
		height: number;
		rx: number;
		ry: number;
		layer: number;
		strokeColor?: string;
		fillColor?: string;
		strokeWidth?: number;
		rotation: number;
		primitiveLock: boolean;
	}
	class IPNL_PrimitiveRectangle implements IPNL_Primitive {
		private async: boolean;
		private readonly primitiveType: EPNL_PrimitiveType.RECT;
		private primitiveId?: string;
		private x: number;
		private y: number;
		private width: number;
		private height: number;
		private rx?: number;
		private ry?: number;
		private layer?: EPNL_LayerId;
		private strokeColor?: string;
		private fillColor?: string;
		private strokeWidth?: number;
		private rotation?: number;
		private primitiveLock: boolean;
		public constructor(params: IPNL_RectangleCreateParameters, primitiveId?: string);
		public create(): Promise<IPNL_PrimitiveRectangle>;
		public getState_PrimitiveType(): EPNL_PrimitiveType;
		public getState_PrimitiveId(): string;
		public getState_X(): number;
		public setState_X(x: number): IPNL_PrimitiveRectangle;
		public getState_Y(): number;
		public setState_Y(y: number): IPNL_PrimitiveRectangle;
		public getState_Width(): number;
		public setState_Width(width: number): IPNL_PrimitiveRectangle;
		public getState_Height(): number;
		public setState_Height(height: number): IPNL_PrimitiveRectangle;
		public getState_Rx(): number | undefined;
		public setState_Rx(rx?: number): IPNL_PrimitiveRectangle;
		public getState_Ry(): number | undefined;
		public setState_Ry(ry?: number): IPNL_PrimitiveRectangle;
		public getState_Layer(): EPNL_LayerId | undefined;
		public setState_Layer(layer?: EPNL_LayerId): IPNL_PrimitiveRectangle;
		public getState_StrokeColor(): string | undefined;
		public setState_StrokeColor(strokeColor?: string): IPNL_PrimitiveRectangle;
		public getState_FillColor(): string | undefined;
		public setState_FillColor(fillColor?: string): IPNL_PrimitiveRectangle;
		public getState_StrokeWidth(): number | undefined;
		public setState_StrokeWidth(strokeWidth?: number): IPNL_PrimitiveRectangle;
		public getState_Rotation(): number | undefined;
		public setState_Rotation(rotation?: number): IPNL_PrimitiveRectangle;
		public getState_PrimitiveLock(): boolean;
		public setState_PrimitiveLock(primitiveLock: boolean): IPNL_PrimitiveRectangle;
		public toSync(): IPNL_PrimitiveRectangle;
		public toAsync(): IPNL_PrimitiveRectangle;
		public isAsync(): boolean;
		public reset(): Promise<IPNL_PrimitiveRectangle>;
		public done(): Promise<IPNL_PrimitiveRectangle>;
		private refreshFromData(data: IPNL_RectangleData): void;
	}
	class PNL_PrimitiveRectangle implements IPNL_PrimitiveAPI {
		public create(params: IPNL_RectangleCreateParameters): Promise<IPNL_PrimitiveRectangle | undefined>;
		public delete(primitiveIds: string | IPNL_PrimitiveRectangle | Array<string> | Array<IPNL_PrimitiveRectangle>): Promise<boolean>;
		public modify(primitiveId: string | IPNL_PrimitiveRectangle, property: { x?: number; y?: number; width?: number; height?: number; rx?: number; ry?: number; layer?: EPNL_LayerId; strokeColor?: string; fillColor?: string; strokeWidth?: number; rotation?: number; primitiveLock?: boolean }): Promise<IPNL_PrimitiveRectangle | undefined>;
		public get(primitiveIds: string): Promise<IPNL_PrimitiveRectangle | undefined>;
		public get(primitiveIds: Array<string>): Promise<Array<IPNL_PrimitiveRectangle>>;
		public getAllPrimitiveId(): Promise<Array<string>>;
		public getAll(layer?: EPNL_LayerId, primitiveLock?: boolean): Promise<Array<IPNL_PrimitiveRectangle>>;
		private static buildFromData(data: IPNL_RectangleData): IPNL_PrimitiveRectangle;
	}
	interface IPNL_EllipseCreateParameters {
		centerX: number;
		centerY: number;
		radiusX: number;
		radiusY: number;
		layer?: EPNL_LayerId;
		strokeColor?: string;
		fillColor?: string;
		strokeWidth?: number;
		rotation?: number;
		primitiveLock?: boolean;
	}
	interface IPNL_EllipseData {
		primitiveId: string;
		centerX: number;
		centerY: number;
		radiusX: number;
		radiusY: number;
		layer: number;
		strokeColor?: string;
		fillColor?: string;
		strokeWidth?: number;
		rotation: number;
		primitiveLock: boolean;
	}
	class IPNL_PrimitiveEllipse implements IPNL_Primitive {
		private async: boolean;
		private readonly primitiveType: EPNL_PrimitiveType.ELLIPSE;
		private primitiveId?: string;
		private centerX: number;
		private centerY: number;
		private radiusX: number;
		private radiusY: number;
		private layer?: EPNL_LayerId;
		private strokeColor?: string;
		private fillColor?: string;
		private strokeWidth?: number;
		private rotation?: number;
		private primitiveLock: boolean;
		public constructor(params: IPNL_EllipseCreateParameters, primitiveId?: string);
		public create(): Promise<IPNL_PrimitiveEllipse>;
		public getState_PrimitiveType(): EPNL_PrimitiveType;
		public getState_PrimitiveId(): string;
		public getState_CenterX(): number;
		public setState_CenterX(centerX: number): IPNL_PrimitiveEllipse;
		public getState_CenterY(): number;
		public setState_CenterY(centerY: number): IPNL_PrimitiveEllipse;
		public getState_RadiusX(): number;
		public setState_RadiusX(radiusX: number): IPNL_PrimitiveEllipse;
		public getState_RadiusY(): number;
		public setState_RadiusY(radiusY: number): IPNL_PrimitiveEllipse;
		public getState_Layer(): EPNL_LayerId | undefined;
		public setState_Layer(layer?: EPNL_LayerId): IPNL_PrimitiveEllipse;
		public getState_StrokeColor(): string | undefined;
		public setState_StrokeColor(strokeColor?: string): IPNL_PrimitiveEllipse;
		public getState_FillColor(): string | undefined;
		public setState_FillColor(fillColor?: string): IPNL_PrimitiveEllipse;
		public getState_StrokeWidth(): number | undefined;
		public setState_StrokeWidth(strokeWidth?: number): IPNL_PrimitiveEllipse;
		public getState_Rotation(): number | undefined;
		public setState_Rotation(rotation?: number): IPNL_PrimitiveEllipse;
		public getState_PrimitiveLock(): boolean;
		public setState_PrimitiveLock(primitiveLock: boolean): IPNL_PrimitiveEllipse;
		public toSync(): IPNL_PrimitiveEllipse;
		public toAsync(): IPNL_PrimitiveEllipse;
		public isAsync(): boolean;
		public reset(): Promise<IPNL_PrimitiveEllipse>;
		public done(): Promise<IPNL_PrimitiveEllipse>;
		private refreshFromData(data: IPNL_EllipseData): void;
	}
	class PNL_PrimitiveEllipse implements IPNL_PrimitiveAPI {
		public create(params: IPNL_EllipseCreateParameters): Promise<IPNL_PrimitiveEllipse | undefined>;
		public delete(primitiveIds: string | IPNL_PrimitiveEllipse | Array<string> | Array<IPNL_PrimitiveEllipse>): Promise<boolean>;
		public modify(primitiveId: string | IPNL_PrimitiveEllipse, property: { centerX?: number; centerY?: number; radiusX?: number; radiusY?: number; layer?: EPNL_LayerId; strokeColor?: string; fillColor?: string; strokeWidth?: number; rotation?: number; primitiveLock?: boolean }): Promise<IPNL_PrimitiveEllipse | undefined>;
		public get(primitiveIds: string): Promise<IPNL_PrimitiveEllipse | undefined>;
		public get(primitiveIds: Array<string>): Promise<Array<IPNL_PrimitiveEllipse>>;
		public getAllPrimitiveId(): Promise<Array<string>>;
		public getAll(layer?: EPNL_LayerId, primitiveLock?: boolean): Promise<Array<IPNL_PrimitiveEllipse>>;
		private static buildFromData(data: IPNL_EllipseData): IPNL_PrimitiveEllipse;
	}
	enum EPNL_ArcLarge {
		 SMALL = 0,
		 LARGE = 1,
	}
	enum EPNL_ArcSweep {
		 CCW = 0,
		 CW = 1,
	}
	enum EPNL_ArcType {
		 CENTER = 1,
		 TWO_POINT = 2,
	}
	class IPNL_PrimitiveArc implements IPNL_Primitive {
		private async: boolean;
		private readonly primitiveType: EPNL_PrimitiveType.ARC;
		private primitiveId?: string;
		private startX: number;
		private startY: number;
		private endX: number;
		private endY: number;
		private radiusX: number;
		private radiusY: number;
		private angle: number;
		private large?: EPNL_ArcLarge;
		private sweep?: EPNL_ArcSweep;
		private arcType?: EPNL_ArcType;
		private layer?: EPNL_LayerId;
		private strokeColor?: string;
		private fillColor?: string;
		private strokeWidth?: number;
		private primitiveLock: boolean;
		public constructor(startX: number, startY: number, endX: number, endY: number, radiusX: number, radiusY: number, angle: number, large?: EPNL_ArcLarge, sweep?: EPNL_ArcSweep, arcType?: EPNL_ArcType, layer?: EPNL_LayerId, strokeColor?: string, fillColor?: string, strokeWidth?: number, primitiveLock?: boolean, primitiveId?: string);
		public create(): Promise<IPNL_PrimitiveArc>;
		public getState_PrimitiveType(): EPNL_PrimitiveType;
		public getState_PrimitiveId(): string;
		public getState_StartX(): number;
		public setState_StartX(startX: number): IPNL_PrimitiveArc;
		public getState_StartY(): number;
		public setState_StartY(startY: number): IPNL_PrimitiveArc;
		public getState_EndX(): number;
		public setState_EndX(endX: number): IPNL_PrimitiveArc;
		public getState_EndY(): number;
		public setState_EndY(endY: number): IPNL_PrimitiveArc;
		public getState_RadiusX(): number;
		public setState_RadiusX(radiusX: number): IPNL_PrimitiveArc;
		public getState_RadiusY(): number;
		public setState_RadiusY(radiusY: number): IPNL_PrimitiveArc;
		public getState_Angle(): number;
		public setState_Angle(angle: number): IPNL_PrimitiveArc;
		public getState_Large(): EPNL_ArcLarge | undefined;
		public setState_Large(large?: EPNL_ArcLarge): IPNL_PrimitiveArc;
		public getState_Sweep(): EPNL_ArcSweep | undefined;
		public setState_Sweep(sweep?: EPNL_ArcSweep): IPNL_PrimitiveArc;
		public getState_ArcType(): EPNL_ArcType | undefined;
		public setState_ArcType(arcType?: EPNL_ArcType): IPNL_PrimitiveArc;
		public getState_Layer(): EPNL_LayerId | undefined;
		public setState_Layer(layer?: EPNL_LayerId): IPNL_PrimitiveArc;
		public getState_StrokeColor(): string | undefined;
		public setState_StrokeColor(strokeColor?: string): IPNL_PrimitiveArc;
		public getState_FillColor(): string | undefined;
		public setState_FillColor(fillColor?: string): IPNL_PrimitiveArc;
		public getState_StrokeWidth(): number | undefined;
		public setState_StrokeWidth(strokeWidth?: number): IPNL_PrimitiveArc;
		public getState_PrimitiveLock(): boolean;
		public setState_PrimitiveLock(primitiveLock: boolean): IPNL_PrimitiveArc;
		public toSync(): IPNL_PrimitiveArc;
		public toAsync(): IPNL_PrimitiveArc;
		public isAsync(): boolean;
		public reset(): Promise<IPNL_PrimitiveArc>;
		public done(): Promise<IPNL_PrimitiveArc>;
	}
	class PNL_PrimitiveArc implements IPNL_PrimitiveAPI {
		public create(startX: number, startY: number, endX: number, endY: number, radiusX: number, radiusY: number, angle: number, large?: EPNL_ArcLarge, sweep?: EPNL_ArcSweep, arcType?: EPNL_ArcType, layer?: EPNL_LayerId, strokeColor?: string, fillColor?: string, strokeWidth?: number, primitiveLock?: boolean): Promise<IPNL_PrimitiveArc | undefined>;
		public delete(primitiveIds: string | IPNL_PrimitiveArc | Array<string> | Array<IPNL_PrimitiveArc>): Promise<boolean>;
		public modify(primitiveId: string | IPNL_PrimitiveArc, property: { startX?: number; startY?: number; endX?: number; endY?: number; radiusX?: number; radiusY?: number; angle?: number; large?: EPNL_ArcLarge; sweep?: EPNL_ArcSweep; arcType?: EPNL_ArcType; layer?: EPNL_LayerId; strokeColor?: string; fillColor?: string; strokeWidth?: number; primitiveLock?: boolean }): Promise<IPNL_PrimitiveArc | undefined>;
		public get(primitiveIds: string): Promise<IPNL_PrimitiveArc | undefined>;
		public get(primitiveIds: Array<string>): Promise<Array<IPNL_PrimitiveArc>>;
		public getAllPrimitiveId(): Promise<Array<string>>;
		public getAll(layer?: EPNL_LayerId, primitiveLock?: boolean): Promise<Array<IPNL_PrimitiveArc>>;
	}
	class IPNL_PrimitivePath implements IPNL_Primitive {
		private async: boolean;
		private readonly primitiveType: EPNL_PrimitiveType.PATH;
		private primitiveId?: string;
		private points: Array<number>;
		private close?: boolean;
		private pathData?: string;
		private layer?: EPNL_LayerId;
		private strokeColor?: string;
		private fillColor?: string;
		private strokeWidth?: number;
		private rotation?: number;
		private primitiveLock: boolean;
		public constructor(pointsOrPathData: Array<number> | string, close?: boolean, layer?: EPNL_LayerId, strokeColor?: string, fillColor?: string, strokeWidth?: number, rotation?: number, primitiveLock?: boolean, primitiveId?: string);
		public create(): Promise<IPNL_PrimitivePath>;
		public getState_PrimitiveType(): EPNL_PrimitiveType;
		public getState_PrimitiveId(): string;
		public getState_Points(): Array<number>;
		public setState_Points(points: Array<number>): IPNL_PrimitivePath;
		public getState_Close(): boolean | undefined;
		public setState_Close(close?: boolean): IPNL_PrimitivePath;
		public getState_PathData(): string | undefined;
		public setState_PathData(pathData?: string): IPNL_PrimitivePath;
		public getState_Layer(): EPNL_LayerId | undefined;
		public setState_Layer(layer?: EPNL_LayerId): IPNL_PrimitivePath;
		public getState_StrokeColor(): string | undefined;
		public setState_StrokeColor(strokeColor?: string): IPNL_PrimitivePath;
		public getState_FillColor(): string | undefined;
		public setState_FillColor(fillColor?: string): IPNL_PrimitivePath;
		public getState_StrokeWidth(): number | undefined;
		public setState_StrokeWidth(strokeWidth?: number): IPNL_PrimitivePath;
		public getState_Rotation(): number | undefined;
		public setState_Rotation(rotation?: number): IPNL_PrimitivePath;
		public getState_PrimitiveLock(): boolean;
		public setState_PrimitiveLock(primitiveLock: boolean): IPNL_PrimitivePath;
		public toSync(): IPNL_PrimitivePath;
		public toAsync(): IPNL_PrimitivePath;
		public isAsync(): boolean;
		public reset(): Promise<IPNL_PrimitivePath>;
		public done(): Promise<IPNL_PrimitivePath>;
	}
	class PNL_PrimitivePath implements IPNL_PrimitiveAPI {
		public create(pointsOrPathData: Array<number> | string, close?: boolean, layer?: EPNL_LayerId, strokeColor?: string, fillColor?: string, strokeWidth?: number, rotation?: number, primitiveLock?: boolean): Promise<IPNL_PrimitivePath | undefined>;
		public delete(primitiveIds: string | IPNL_PrimitivePath | Array<string> | Array<IPNL_PrimitivePath>): Promise<boolean>;
		public modify(primitiveId: string | IPNL_PrimitivePath, property: { points?: Array<number>; pathData?: string; layer?: EPNL_LayerId; strokeColor?: string; fillColor?: string; strokeWidth?: number; rotation?: number; primitiveLock?: boolean }): Promise<IPNL_PrimitivePath | undefined>;
		public get(primitiveIds: string): Promise<IPNL_PrimitivePath | undefined>;
		public get(primitiveIds: Array<string>): Promise<Array<IPNL_PrimitivePath>>;
		public getAllPrimitiveId(): Promise<Array<string>>;
		public getAll(layer?: EPNL_LayerId, primitiveLock?: boolean): Promise<Array<IPNL_PrimitivePath>>;
	}
	enum EPNL_TextHAlign {
		 LEFT = 0,
		 CENTER = 1,
		 RIGHT = 2,
	}
	enum EPNL_TextVAlign {
		 TOP = 0,
		 MIDDLE = 1,
		 BOTTOM = 2,
	}
	class IPNL_PrimitiveText implements IPNL_Primitive {
		private async: boolean;
		private readonly primitiveType: EPNL_PrimitiveType.TEXT;
		private primitiveId?: string;
		private x: number;
		private y: number;
		private content: string;
		private fontSize?: number;
		private fontFamily?: string;
		private hAlign?: EPNL_TextHAlign;
		private vAlign?: EPNL_TextVAlign;
		private bold?: boolean;
		private italic?: boolean;
		private underline?: boolean;
		private textColor?: string;
		private rotation?: number;
		private primitiveLock: boolean;
		private layer?: EPNL_LayerId;
		public constructor(x: number, y: number, content: string, fontSize?: number, fontFamily?: string, hAlign?: EPNL_TextHAlign, vAlign?: EPNL_TextVAlign, bold?: boolean, italic?: boolean, underline?: boolean, textColor?: string, rotation?: number, primitiveLock?: boolean, layer?: EPNL_LayerId, primitiveId?: string);
		public create(): Promise<IPNL_PrimitiveText>;
		public getState_PrimitiveType(): EPNL_PrimitiveType;
		public getState_PrimitiveId(): string;
		public getState_X(): number;
		public setState_X(x: number): IPNL_PrimitiveText;
		public getState_Y(): number;
		public setState_Y(y: number): IPNL_PrimitiveText;
		public getState_Content(): string;
		public setState_Content(content: string): IPNL_PrimitiveText;
		public getState_FontSize(): number | undefined;
		public setState_FontSize(fontSize?: number): IPNL_PrimitiveText;
		public getState_FontFamily(): string | undefined;
		public setState_FontFamily(fontFamily?: string): IPNL_PrimitiveText;
		public getState_HAlign(): EPNL_TextHAlign | undefined;
		public setState_HAlign(hAlign?: EPNL_TextHAlign): IPNL_PrimitiveText;
		public getState_VAlign(): EPNL_TextVAlign | undefined;
		public setState_VAlign(vAlign?: EPNL_TextVAlign): IPNL_PrimitiveText;
		public getState_Bold(): boolean | undefined;
		public setState_Bold(bold?: boolean): IPNL_PrimitiveText;
		public getState_Italic(): boolean | undefined;
		public setState_Italic(italic?: boolean): IPNL_PrimitiveText;
		public getState_Underline(): boolean | undefined;
		public setState_Underline(underline?: boolean): IPNL_PrimitiveText;
		public getState_TextColor(): string | undefined;
		public setState_TextColor(textColor?: string): IPNL_PrimitiveText;
		public getState_Rotation(): number | undefined;
		public setState_Rotation(rotation?: number): IPNL_PrimitiveText;
		public getState_PrimitiveLock(): boolean;
		public setState_PrimitiveLock(primitiveLock: boolean): IPNL_PrimitiveText;
		public getState_Layer(): EPNL_LayerId | undefined;
		public setState_Layer(layer?: EPNL_LayerId): IPNL_PrimitiveText;
		public toSync(): IPNL_PrimitiveText;
		public toAsync(): IPNL_PrimitiveText;
		public isAsync(): boolean;
		public reset(): Promise<IPNL_PrimitiveText>;
		public done(): Promise<IPNL_PrimitiveText>;
	}
	class PNL_PrimitiveText implements IPNL_PrimitiveAPI {
		public create(x: number, y: number, content: string, fontSize?: number, fontFamily?: string, hAlign?: EPNL_TextHAlign, vAlign?: EPNL_TextVAlign, bold?: boolean, italic?: boolean, underline?: boolean, textColor?: string, rotation?: number, primitiveLock?: boolean, layer?: EPNL_LayerId): Promise<IPNL_PrimitiveText | undefined>;
		public delete(primitiveIds: string | IPNL_PrimitiveText | Array<string> | Array<IPNL_PrimitiveText>): Promise<boolean>;
		public modify(primitiveId: string | IPNL_PrimitiveText, property: { x?: number; y?: number; content?: string; fontSize?: number; fontFamily?: string; hAlign?: EPNL_TextHAlign; vAlign?: EPNL_TextVAlign; bold?: boolean; italic?: boolean; underline?: boolean; textColor?: string; rotation?: number; primitiveLock?: boolean; layer?: EPNL_LayerId }): Promise<IPNL_PrimitiveText | undefined>;
		public get(primitiveIds: string): Promise<IPNL_PrimitiveText | undefined>;
		public get(primitiveIds: Array<string>): Promise<Array<IPNL_PrimitiveText>>;
		public getAllPrimitiveId(): Promise<Array<string>>;
		public getAll(layer?: EPNL_LayerId, primitiveLock?: boolean): Promise<Array<IPNL_PrimitiveText>>;
	}
	class IPNL_PrimitiveImage implements IPNL_Primitive {
		private async: boolean;
		private readonly primitiveType: EPNL_PrimitiveType.IMAGE;
		private primitiveId?: string;
		private x: number;
		private y: number;
		private width: number;
		private height: number;
		private rotation?: number;
		private primitiveLock: boolean;
		private layer?: EPNL_LayerId;
		private imageFile?: File;
		public constructor(x: number, y: number, width: number, height: number, rotation?: number, primitiveLock?: boolean, layer?: EPNL_LayerId, imageFile?: File, primitiveId?: string);
		public create(): Promise<IPNL_PrimitiveImage>;
		public getState_PrimitiveType(): EPNL_PrimitiveType;
		public getState_PrimitiveId(): string;
		public getState_X(): number;
		public setState_X(x: number): IPNL_PrimitiveImage;
		public getState_Y(): number;
		public setState_Y(y: number): IPNL_PrimitiveImage;
		public getState_Width(): number;
		public setState_Width(width: number): IPNL_PrimitiveImage;
		public getState_Height(): number;
		public setState_Height(height: number): IPNL_PrimitiveImage;
		public getState_Layer(): EPNL_LayerId | undefined;
		public setState_Layer(layer?: EPNL_LayerId): IPNL_PrimitiveImage;
		public getState_ImageFile(): File | undefined;
		public setState_ImageFile(imageFile?: File): IPNL_PrimitiveImage;
		public getState_Rotation(): number | undefined;
		public setState_Rotation(rotation?: number): IPNL_PrimitiveImage;
		public getState_PrimitiveLock(): boolean;
		public setState_PrimitiveLock(primitiveLock: boolean): IPNL_PrimitiveImage;
		public toSync(): IPNL_PrimitiveImage;
		public toAsync(): IPNL_PrimitiveImage;
		public isAsync(): boolean;
		public reset(): Promise<IPNL_PrimitiveImage>;
		public done(): Promise<IPNL_PrimitiveImage>;
	}
	class PNL_PrimitiveImage implements IPNL_PrimitiveAPI {
		public create(x: number, y: number, width: number, height: number, imageFile: File, rotation?: number, primitiveLock?: boolean, layer?: EPNL_LayerId): Promise<IPNL_PrimitiveImage | undefined>;
		public delete(primitiveIds: string | IPNL_PrimitiveImage | Array<string> | Array<IPNL_PrimitiveImage>): Promise<boolean>;
		public modify(primitiveId: string | IPNL_PrimitiveImage, property: { x?: number; y?: number; width?: number; height?: number; rotation?: number; primitiveLock?: boolean; layer?: EPNL_LayerId; imageFile?: File }): Promise<IPNL_PrimitiveImage | undefined>;
		public get(primitiveIds: string): Promise<IPNL_PrimitiveImage | undefined>;
		public get(primitiveIds: Array<string>): Promise<Array<IPNL_PrimitiveImage>>;
		public getAllPrimitiveId(): Promise<Array<string>>;
		public getAll(layer?: EPNL_LayerId, primitiveLock?: boolean): Promise<Array<IPNL_PrimitiveImage>>;
	}
	enum EPNL_PrimitiveDimensionType {
		 LENGTH = 'Length',
		 ANGLE = 'Angle',
		 RADIUS = 'Radius',
		 SMART = 'Smart',
	}
	enum EPNL_PrimitiveDimensionDirection {
		 X = 'x',
		 Y = 'y',
		 XY = 'xy',
	}
	interface IPNL_PrimitiveDimensionLengthCoordinateSet {
		startX: number;
		startY: number;
		endX: number;
		endY: number;
		measureStartX?: number;
		measureStartY?: number;
		measureEndX?: number;
		measureEndY?: number;
		direction?: EPNL_PrimitiveDimensionDirection;
		rotation?: number;
	}
	interface IPNL_PrimitiveDimensionAngleCoordinateSet {
		firstEdgeX: number;
		firstEdgeY: number;
		secondEdgeX: number;
		secondEdgeY: number;
		angleX: number;
		angleY: number;
		textX: number;
		textY: number;
		rotation?: number;
	}
	interface IPNL_PrimitiveDimensionRadiusCoordinateSet {
		headX: number;
		headY: number;
		tailX: number;
		tailY: number;
		textX: number;
		textY: number;
		ellipseId: string;
		rotation?: number;
	}
	interface IPNL_PrimitiveDimensionNode {
		primitiveId: string;
		index: number;
		primitivePointX: number;
		primitivePointY: number;
		otherPointX: number;
		otherPointY: number;
	}
	enum EPNL_PrimitiveDimensionCategory {
		 ANNOTATION = 'Annotation',
		 CONSTRAINT = 'Constraint',
	}
	interface IPNL_PrimitiveDimensionSmartCoordinateSet {
		start: IPNL_PrimitiveDimensionNode;
		end: IPNL_PrimitiveDimensionNode;
		direction: EPNL_PrimitiveDimensionDirection;
		category: EPNL_PrimitiveDimensionCategory;
	}
	type TPNL_PrimitiveDimensionCoordinateSet = IPNL_PrimitiveDimensionLengthCoordinateSet | IPNL_PrimitiveDimensionAngleCoordinateSet | IPNL_PrimitiveDimensionRadiusCoordinateSet | IPNL_PrimitiveDimensionSmartCoordinateSet;
	class IPNL_PrimitiveDimension implements IPNL_Primitive {
		private async: boolean;
		private readonly primitiveType: EPNL_PrimitiveType.DIMENSION;
		private primitiveId?: string;
		private dimensionType: EPNL_PrimitiveDimensionType;
		private coordinateSet: TPNL_PrimitiveDimensionCoordinateSet;
		private primitiveLock: boolean;
		private layer?: EPNL_LayerId;
		public constructor(dimensionType: EPNL_PrimitiveDimensionType, coordinateSet: TPNL_PrimitiveDimensionCoordinateSet, primitiveLock?: boolean, layer?: EPNL_LayerId, primitiveId?: string);
		public create(): Promise<IPNL_PrimitiveDimension>;
		public getState_PrimitiveType(): EPNL_PrimitiveType;
		public getState_PrimitiveId(): string;
		public getState_DimensionType(): EPNL_PrimitiveDimensionType;
		public setState_DimensionType(dimensionType: EPNL_PrimitiveDimensionType): IPNL_PrimitiveDimension;
		public getState_CoordinateSet(): TPNL_PrimitiveDimensionCoordinateSet;
		public setState_CoordinateSet(coordinateSet: TPNL_PrimitiveDimensionCoordinateSet): IPNL_PrimitiveDimension;
		public getState_PrimitiveLock(): boolean;
		public setState_PrimitiveLock(primitiveLock: boolean): IPNL_PrimitiveDimension;
		public getState_Layer(): EPNL_LayerId | undefined;
		public setState_Layer(layer?: EPNL_LayerId): IPNL_PrimitiveDimension;
		public toSync(): IPNL_PrimitiveDimension;
		public toAsync(): IPNL_PrimitiveDimension;
		public isAsync(): boolean;
		public reset(): Promise<IPNL_PrimitiveDimension>;
		public done(): Promise<IPNL_PrimitiveDimension>;
	}
	class PNL_PrimitiveDimension implements IPNL_PrimitiveAPI {
		public create(dimensionType: EPNL_PrimitiveDimensionType, coordinateSet: TPNL_PrimitiveDimensionCoordinateSet, primitiveLock?: boolean, layer?: EPNL_LayerId): Promise<IPNL_PrimitiveDimension | undefined>;
		public delete(primitiveIds: string | IPNL_PrimitiveDimension | Array<string> | Array<IPNL_PrimitiveDimension>): Promise<boolean>;
		public modify(primitiveId: string | IPNL_PrimitiveDimension, property: { dimensionType?: EPNL_PrimitiveDimensionType; coordinateSet?: TPNL_PrimitiveDimensionCoordinateSet; primitiveLock?: boolean; layer?: EPNL_LayerId }): Promise<IPNL_PrimitiveDimension | undefined>;
		public get(primitiveIds: string): Promise<IPNL_PrimitiveDimension | undefined>;
		public get(primitiveIds: Array<string>): Promise<Array<IPNL_PrimitiveDimension>>;
		public getAllPrimitiveId(): Promise<Array<string>>;
		public getAll(layer?: EPNL_LayerId, primitiveLock?: boolean): Promise<Array<IPNL_PrimitiveDimension>>;
	}
	enum EPNL_PrimitiveAuxiliaryLineOrientation {
		 HORIZONTAL = 'horizontal',
		 VERTICAL = 'vertical',
	}
	class IPNL_PrimitiveAuxiliaryLine implements IPNL_Primitive {
		private async: boolean;
		private readonly primitiveType: EPNL_PrimitiveType.AUXILIARY_LINE;
		private primitiveId?: string;
		private x: number;
		private y: number;
		private orientation?: EPNL_PrimitiveAuxiliaryLineOrientation;
		private strokeColor?: string;
		private strokeStyle?: number;
		private layer?: EPNL_LayerId;
		private primitiveLock: boolean;
		public constructor(x: number, y: number, orientation?: EPNL_PrimitiveAuxiliaryLineOrientation, strokeColor?: string, strokeStyle?: number, layer?: EPNL_LayerId, primitiveLock?: boolean, primitiveId?: string);
		public create(): Promise<IPNL_PrimitiveAuxiliaryLine>;
		public createCross(): Promise<Array<IPNL_PrimitiveAuxiliaryLine>>;
		public getState_PrimitiveType(): EPNL_PrimitiveType;
		public getState_PrimitiveId(): string;
		public getState_X(): number;
		public setState_X(x: number): IPNL_PrimitiveAuxiliaryLine;
		public getState_Y(): number;
		public setState_Y(y: number): IPNL_PrimitiveAuxiliaryLine;
		public getState_Orientation(): EPNL_PrimitiveAuxiliaryLineOrientation | undefined;
		public setState_Orientation(orientation?: EPNL_PrimitiveAuxiliaryLineOrientation): IPNL_PrimitiveAuxiliaryLine;
		public getState_StrokeColor(): string | undefined;
		public setState_StrokeColor(strokeColor?: string): IPNL_PrimitiveAuxiliaryLine;
		public getState_StrokeStyle(): number | undefined;
		public setState_StrokeStyle(strokeStyle?: number): IPNL_PrimitiveAuxiliaryLine;
		public getState_Layer(): EPNL_LayerId | undefined;
		public setState_Layer(layer?: EPNL_LayerId): IPNL_PrimitiveAuxiliaryLine;
		public getState_PrimitiveLock(): boolean;
		public setState_PrimitiveLock(primitiveLock: boolean): IPNL_PrimitiveAuxiliaryLine;
		public toSync(): IPNL_PrimitiveAuxiliaryLine;
		public toAsync(): IPNL_PrimitiveAuxiliaryLine;
		public isAsync(): boolean;
		public reset(): Promise<IPNL_PrimitiveAuxiliaryLine>;
		public done(): Promise<IPNL_PrimitiveAuxiliaryLine>;
	}
	class PNL_PrimitiveAuxiliaryLine implements IPNL_PrimitiveAPI {
		public create(x: number, y: number, orientation?: EPNL_PrimitiveAuxiliaryLineOrientation, strokeColor?: string, strokeStyle?: number, layer?: EPNL_LayerId, primitiveLock?: boolean): Promise<IPNL_PrimitiveAuxiliaryLine | undefined>;
		public createCross(x: number, y: number, strokeColor?: string, strokeStyle?: number, layer?: EPNL_LayerId, primitiveLock?: boolean): Promise<Array<IPNL_PrimitiveAuxiliaryLine> | undefined>;
		public delete(primitiveIds: string | IPNL_PrimitiveAuxiliaryLine | Array<string> | Array<IPNL_PrimitiveAuxiliaryLine>): Promise<boolean>;
		public modify(primitiveId: string | IPNL_PrimitiveAuxiliaryLine, property: { x?: number; y?: number; orientation?: EPNL_PrimitiveAuxiliaryLineOrientation; strokeColor?: string; strokeStyle?: number; layer?: EPNL_LayerId; primitiveLock?: boolean }): Promise<IPNL_PrimitiveAuxiliaryLine | undefined>;
		public get(primitiveIds: string): Promise<IPNL_PrimitiveAuxiliaryLine | undefined>;
		public get(primitiveIds: Array<string>): Promise<Array<IPNL_PrimitiveAuxiliaryLine>>;
		public getAllPrimitiveId(): Promise<Array<string>>;
		public getAll(layer?: EPNL_LayerId, primitiveLock?: boolean): Promise<Array<IPNL_PrimitiveAuxiliaryLine>>;
	}
	class IPNL_PrimitiveAuxiliaryPoint implements IPNL_Primitive {
		private async: boolean;
		private readonly primitiveType: EPNL_PrimitiveType.AUXILIARY_POINT;
		private primitiveId?: string;
		private x: number;
		private y: number;
		private fillColor?: string;
		private layer?: EPNL_LayerId;
		private primitiveLock: boolean;
		public constructor(x: number, y: number, fillColor?: string, layer?: EPNL_LayerId, primitiveLock?: boolean, primitiveId?: string);
		public create(): Promise<IPNL_PrimitiveAuxiliaryPoint>;
		public getState_PrimitiveType(): EPNL_PrimitiveType;
		public getState_PrimitiveId(): string;
		public getState_X(): number;
		public setState_X(x: number): IPNL_PrimitiveAuxiliaryPoint;
		public getState_Y(): number;
		public setState_Y(y: number): IPNL_PrimitiveAuxiliaryPoint;
		public getState_FillColor(): string | undefined;
		public setState_FillColor(fillColor?: string): IPNL_PrimitiveAuxiliaryPoint;
		public getState_Layer(): EPNL_LayerId | undefined;
		public setState_Layer(layer?: EPNL_LayerId): IPNL_PrimitiveAuxiliaryPoint;
		public getState_PrimitiveLock(): boolean;
		public setState_PrimitiveLock(primitiveLock: boolean): IPNL_PrimitiveAuxiliaryPoint;
		public toSync(): IPNL_PrimitiveAuxiliaryPoint;
		public toAsync(): IPNL_PrimitiveAuxiliaryPoint;
		public isAsync(): boolean;
		public reset(): Promise<IPNL_PrimitiveAuxiliaryPoint>;
		public done(): Promise<IPNL_PrimitiveAuxiliaryPoint>;
	}
	class PNL_PrimitiveAuxiliaryPoint implements IPNL_PrimitiveAPI {
		public create(x: number, y: number, fillColor?: string, layer?: EPNL_LayerId, primitiveLock?: boolean): Promise<IPNL_PrimitiveAuxiliaryPoint | undefined>;
		public delete(primitiveIds: string | IPNL_PrimitiveAuxiliaryPoint | Array<string> | Array<IPNL_PrimitiveAuxiliaryPoint>): Promise<boolean>;
		public modify(primitiveId: string | IPNL_PrimitiveAuxiliaryPoint, property: { x?: number; y?: number; fillColor?: string; layer?: EPNL_LayerId; primitiveLock?: boolean }): Promise<IPNL_PrimitiveAuxiliaryPoint | undefined>;
		public get(primitiveIds: string): Promise<IPNL_PrimitiveAuxiliaryPoint | undefined>;
		public get(primitiveIds: Array<string>): Promise<Array<IPNL_PrimitiveAuxiliaryPoint>>;
		public getAllPrimitiveId(): Promise<Array<string>>;
		public getAll(layer?: EPNL_LayerId, primitiveLock?: boolean): Promise<Array<IPNL_PrimitiveAuxiliaryPoint>>;
	}
	enum ESCH_PrimitiveType {
		 ARC = 'Arc',
		 BUS = 'Bus',
		 CIRCLE = 'Circle',
		 COMPONENT = 'Component',
		 COMPONENT_PIN = 'ComponentPin',
		 PIN = 'Pin',
		 POLYGON = 'Polygon',
		 RECTANGLE = 'Rectangle',
		 TEXT = 'Text',
		 WIRE = 'Wire',
		 OBJECT = 'Object',
		 BEZIER = 'Bezier',
		 ELLIPSE = 'Ellipse',
		 ATTRIBUTE = 'Attribute',
		 GENERIC_PORT = 'GenericPort',
	}
	interface ISCH_Primitive {
		getState_PrimitiveType: () => ESCH_PrimitiveType;
		getState_PrimitiveId: () => string;
		create: () => ISCH_Primitive | Promise<ISCH_Primitive>;
		toAsync: () => ISCH_Primitive;
		toSync: () => ISCH_Primitive;
		isAsync: () => boolean;
		reset: () => ISCH_Primitive | Promise<ISCH_Primitive>;
		done: () => ISCH_Primitive | Promise<ISCH_Primitive>;
	}
	interface ISCH_SourceIdentity {
		projectId: string;
		schematicName: string;
		pageName: string;
		branchUuid?: string;
	}
	interface ISCH_SourceRegion {
		minX: number;
		minY: number;
		maxX: number;
		maxY: number;
	}
	enum ESCH_SourceElementType {
		 COMPONENT = 'Component',
		 WIRE = 'Wire',
		 TEXT = 'Text',
		 RECTANGLE = 'Rectangle',
		 CIRCLE = 'Circle',
		 ARC = 'Arc',
		 POLYGON = 'Polygon',
		 NET_LABEL = 'NetLabel',
		 NET_FLAG = 'NetFlag',
	}
	interface ISCH_DocumentGetElementsInRegionOptions extends ISCH_SourceIdentity {
		region: ISCH_SourceRegion;
		types?: Array<ESCH_SourceElementType>;
	}
	interface ISCH_DocumentRegionGeometry {
		x?: number;
		y?: number;
		width?: number;
		height?: number;
		cx?: number;
		cy?: number;
		radius?: number;
		points?: Array<Array<number>>;
	}
	interface ISCH_DocumentRegionElement {
		primitiveId: string;
		type: ESCH_SourceElementType;
		designator?: string;
		x?: number;
		y?: number;
		rotation?: number;
		mirror?: boolean;
		net?: string;
		line?: Array<Array<number>>;
		text?: string;
		geometry?: ISCH_DocumentRegionGeometry;
		parentId?: string;
	}
	interface ISCH_DocumentRenderRegionOptions extends ISCH_SourceIdentity {
		region: ISCH_SourceRegion;
		width?: number;
		format?: string;
	}
	class SCH_Document {
		public importChanges(): Promise<boolean>;
		public save(): Promise<boolean>;
		public navigateToCoordinates(x: number, y: number): Promise<boolean>;
		public navigateToRegion(left: number, right: number, top: number, bottom: number): Promise<boolean>;
		public getPrimitiveAtPoint(x: number, y: number): Promise<ISCH_Primitive | undefined>;
		public getPrimitivesInRegion(left: number, right: number, top: number, bottom: number): Promise<Array<ISCH_Primitive>>;
		public getCurrentFilterConfiguration(): Promise<Record<string, boolean> | undefined>;
		public autoRouting(props?: { uuids?: Array<string>; netlist?: { component: Record<string, { pinInfoMap: Record<string, { name: string; number: string; net: string; props: { 'Pin Number': string } }> }> }; designatorDeviceTypeMap?: Record<string, 'resistor' | 'capacitor' | 'inductive' | 'diode' | 'triode' | 'oscillator' | 'chip' | 'otherDevice'> }): Promise<any>;
		public autoLayout(props?: { uuids?: Array<string>; netlist?: { component: Record<string, { pinInfoMap: Record<string, { name: string; number: string; net: string; props: { 'Pin Number': string } }> }> }; designatorDeviceTypeMap?: Record<string, 'resistor' | 'capacitor' | 'inductive' | 'diode' | 'triode' | 'oscillator' | 'chip' | 'otherDevice'> }): Promise<any>;
		public getElementsInRegion(options: ISCH_DocumentGetElementsInRegionOptions): Promise<TSCH_SourceResult<Array<ISCH_DocumentRegionElement>>>;
		public renderRegion(options: ISCH_DocumentRenderRegionOptions): Promise<TSCH_SourceResult<File>>;
	}
	interface ISCH_DrcErrorPrimitive {
		name?: string;
		designator?: string;
		primitiveId: string;
		sheet?: string;
	}
	interface ISCH_DrcError {
		type: 'fatalError' | 'error' | 'warn';
		rule: string;
		primitives: Array<ISCH_DrcErrorPrimitive>;
		net?: string;
	}
	class SCH_Drc {
		public check(strict: boolean, userInterface: boolean, includeVerboseError: false): Promise<boolean>;
		public check(strict: boolean, userInterface: boolean, includeVerboseError: true): Promise<Array<ISCH_DrcError>>;
	}
	enum ESCH_RightClickMenuTarget {
		 CANVAS = 'canvas',
		 SYMBOL = 'symbol',
		 BLOCK_SYMBOL = 'blockSymbol',
		 PIN = 'pin',
		 WIRE = 'wire',
		 BUS = 'bus',
		 BUS_ENTRY = 'busEntry',
		 NET_LABEL = 'netLabel',
		 NET_PORT = 'netPort',
		 NET_FLAG = 'netFlag',
		 NO_CONNECT = 'noConnect',
		 OFF_PAGE_CONNECTOR = 'offPageConnector',
		 DIFF_PAIRS_FLAG = 'diffPairsFlag',
		 SHORT_SYMBOL = 'shortSymbol',
		 HARNESS_CONNECTOR = 'harnessConnector',
		 HARNESS_ENTRY = 'harnessEntry',
		 SIGNAL_HARNESS = 'signalHarness',
		 TEXT = 'text',
		 NAME = 'name',
		 PROPERTY = 'property',
		 TABLE = 'table',
		 TABLE_CELL = 'tableCell',
		 CONTROL_DOT = 'controlDot',
		 OTHERS = 'others',
	}
	class SCH_RightClickMenu {
		private extensionUuid?: string;
		public constructor(extensionUuid?: string);
		public getMenu(target: ESCH_RightClickMenuTarget): Promise<Array<ISYS_RightClickMenuItem | null>>;
		public insertMenuItem(target: ESCH_RightClickMenuTarget, menuItem: ISYS_RightClickMenuItem, position: ISYS_RightClickMenuItemPosition): Promise<boolean>;
		public updateMenuItem(target: ESCH_RightClickMenuTarget, menuItemId: string, patch: Partial<Omit<ISYS_RightClickMenuItem, 'id'>>): Promise<boolean>;
		public removeMenuItem(target: ESCH_RightClickMenuTarget, menuItemId: string): Promise<boolean>;
		public replaceMenu(target: ESCH_RightClickMenuTarget, menuItems: Array<ISYS_RightClickMenuItem | null>): Promise<boolean>;
		public resetMenu(target: ESCH_RightClickMenuTarget): Promise<boolean>;
	}
	enum ESCH_MouseEventType {
		 SELECTED = 'selected',
		 CLEAR_SELECTED = 'clearSelected',
	}
	enum ESCH_PrimitiveEventType {
		 DELETE = 'delete',
		 CREATE = 'create',
		 MOVE = 'move',
		 CHANGE = 'change',
	}
	enum ESCH_DynamicSimulationEnginePullEventType {
		 SESSION_START = 'SESSION_START',
		 SESSION_PAUSE = 'SESSION_PAUSE',
		 SESSION_RESUME = 'SESSION_RESUME',
		 SESSION_STOP = 'SESSION_STOP',
		 SESSION_STATE_QUERY = 'SESSION_STATE_QUERY',
		 SPEED_SET = 'SPEED_SET',
		 COMPONENT_UPDATE = 'COMPONENT_UPDATE',
	}
	enum ESCH_SpiceSimulationEnginePullEventType {
		 SIMULATE_NETLIST = 'SIMULATE_NETLIST',
		 VALIDATE_NETLIST = 'VALIDATE_NETLIST',
	}
	class SCH_Event {
		private extensionUuid?: string;
		public constructor(extensionUuid?: string);
		public addMouseEventListener(id: string, eventType: 'all' | ESCH_MouseEventType, callFn: (eventType: ESCH_MouseEventType) => void | Promise<void>, onlyOnce?: boolean): void;
		public addPrimitiveEventListener(id: string, eventType: 'all' | ESCH_PrimitiveEventType, callFn: (eventType: ESCH_PrimitiveEventType, props: { primitiveIds: Array<string> }) => void | Promise<void>, onlyOnce?: boolean): void;
		public addSimulationEnginePullEventListener(id: string, eventType: 'all', callFn: (eventType: ESCH_DynamicSimulationEnginePullEventType | ESCH_SpiceSimulationEnginePullEventType, props: Record<string, any>) => void | Promise<void>): void;
		public removeEventListener(id: string): boolean;
		public isEventListenerAlreadyExist(id: string): boolean;
	}
	enum ESCH_SimulationNetlistType {
		 NGSPICE = 'Ngspice',
	}
	interface ISCH_ExportPngResolution {
		width?: number;
		height?: number;
	}
	enum ESCH_ExportDocumentFileType {
		 PDF = 'PDF',
		 PNG = 'PNG',
		 SVG = 'SVG',
	}
	class SCH_ManufactureData {
		public getAssemblyVariantsConfigs(): Promise<Array<{ text: string; value: string }>>;
		public getBomTemplates(): Promise<Array<string>>;
		public uploadBomTemplateFile(templateFile: File, template?: string): Promise<string | undefined>;
		public getBomTemplateFile(template: string): Promise<File | undefined>;
		public deleteBomTemplate(template: string): Promise<boolean>;
		public getBomFile(fileName?: string, fileType?: 'xlsx' | 'csv', template?: string, filterOptions?: Array<{ property: string; includeValue: boolean | string }>, statistics?: Array<string>, property?: Array<string>, columns?: Array<IPCB_BomPropertiesTableColumns>, assemblyVariantsConfig?: { text: string; value: string }): Promise<File | undefined>;
		public getNetlistFile(fileName?: string, netlistType?: ESYS_NetlistType): Promise<File | undefined>;
		public getSimulationNetlistFile(fileName?: string, netlistType?: ESCH_SimulationNetlistType): Promise<File | undefined>;
		public getPdfFile(fileName?: string, typeSpecificParams?: { theme?: 'Default' | 'White on Black' | 'Black on White'; lineWidth?: 'Default' | 'Always 1px' | 'Follow the Zoom Change'; displayAttributesAsMenu?: boolean; size?: 'Original Size' | string | { width: number; height: number; unit: ESYS_Unit.INCH | ESYS_Unit.MILLIMETER } }, object?: 'All Schematic' | 'Current Schematic' | 'Current Schematic Page' | string, objectSpecificParams?: { range?: 'All' | [number, number]; outputMethod?: 'Merged sheet' | 'Separated sheet' }): Promise<File | undefined>;
		public getPngFile(fileName?: string, resolution?: ISCH_ExportPngResolution): Promise<File | undefined>;
		public getSvgFile(fileName?: string): Promise<File | undefined>;
		public getExportDocumentFile(fileName?: string, fileType?: ESCH_ExportDocumentFileType, typeSpecificParams?: { theme?: 'Default' | 'White on Black' | 'Black on White'; lineWidth?: 'Default' | 'Always 1px' | 'Follow the Zoom Change'; displayAttributesAsMenu?: boolean; size?: 'Original Size' | string | { width: number; height: number; unit: ESYS_Unit.INCH | ESYS_Unit.MILLIMETER } }, object?: 'All Schematic' | 'Current Schematic' | 'Current Schematic Page' | string, objectSpecificParams?: { range?: 'All' | [number, number]; outputMethod?: 'Merged sheet' | 'Separated sheet' }): Promise<File | undefined>;
		public placeComponentsOrder(interactive?: boolean, ignoreWarning?: boolean): Promise<boolean>;
		public placeSmtComponentsOrder(interactive?: boolean, ignoreWarning?: boolean): Promise<boolean>;
	}
	interface ISCH_WireInfo {
		name: string;
		id: string;
		globalNetName: string;
		pageName: string;
		pageUuid: string;
	}
	interface ISCH_NetInfo {
		net: string;
		wires: Array<ISCH_WireInfo>;
	}
	interface ISCH_ProjectNetInfo {
		schematicName: string;
		schematicUuid: string;
		boardName: string;
		nets: Array<ISCH_NetInfo>;
	}
	interface IRawSchematic {
		title: string;
		displayTitle: string;
		board: string;
	}
	interface IRawWire {
		wirePath: string;
		net: string;
		netName: string[];
		nlNet: string;
		path: string;
	}
	interface IRawNet {
		nlNet: string;
		designatorPinName: string | null;
		wires: Array<IRawWire>;
	}
	interface IRawPureSchematic {
		sheets: { [uuid: string]: { uuid: string; title: string; displayTitle: string; zIndex: number } };
		nlNetWires: Array<IRawNet>;
	}
	class SCH_Net {
		public getCurrentProjectAllNets(): Promise<Array<ISCH_ProjectNetInfo>>;
		public getAllNets(): Promise<Array<ISCH_NetInfo>>;
		public getNet(net: string): Promise<ISCH_NetInfo | undefined>;
		public getAllNetsName(): Promise<Array<string>>;
		private buildProjectNetInfo(schId: string, schematic: IRawSchematic, pure: IRawPureSchematic, boardName: string): ISCH_ProjectNetInfo;
		private buildSortedNets(nlNetWires: Array<IRawNet>, sheetMap: Map<string, IRawPureSchematic['sheets'][string]>): Array<ISCH_NetInfo>;
		private buildSortedWires(wires: Array<IRawWire>, sheetMap: Map<string, IRawPureSchematic['sheets'][string]>): Array<ISCH_WireInfo>;
	}
	class SCH_Netlist {
		public getNetlist(type?: ESYS_NetlistType): Promise<string>;
		public setNetlist(type: ESYS_NetlistType | undefined, netlist: string): Promise<void>;
	}
	class SCH_Primitive {
		public getPrimitiveTypeByPrimitiveId(id: string): Promise<ESCH_PrimitiveType | undefined>;
		public getPrimitiveByPrimitiveId(id: string): Promise<ISCH_Primitive | undefined>;
		public getPrimitivesByPrimitiveId(ids: Array<string>): Promise<Array<ISCH_Primitive>>;
		public getPrimitivesBBox(primitiveIds: Array<string | ISCH_Primitive>): Promise<{ minX: number; minY: number; maxX: number; maxY: number } | undefined>;
	}
	interface ISCH_PrimitiveAPI {
		create: (...args: any[]) => ISCH_Primitive | undefined | Promise<ISCH_Primitive> | Promise<ISCH_Primitive | undefined>;
		delete: (primitiveIds: string | any | Array<string> | Array<any>) => boolean | Promise<boolean>;
		modify: (primitiveId: string | any, ...args: any[]) => ISCH_Primitive | undefined | Promise<ISCH_Primitive> | Promise<ISCH_Primitive | undefined>;
		get: { (primitiveIds: string): ISCH_Primitive | undefined | Promise<ISCH_Primitive | undefined>; (primitiveIds: Array<string>): Array<ISCH_Primitive> | Promise<Array<ISCH_Primitive>> };
		getAllPrimitiveId: (...args: any[]) => Array<string> | Promise<Array<string>>;
		getAll: (...args: any[]) => Array<ISCH_Primitive> | Promise<Array<ISCH_Primitive>>;
	}
	enum ESCH_PrimitiveLineType {
		 SOLID = 0,
		 DASHED = 1,
		 DOTTED = 2,
		 DOT_DASHED = 3,
	}
	class ISCH_PrimitiveArc implements ISCH_Primitive {
		private async: boolean;
		private readonly primitiveType: ESCH_PrimitiveType.ARC;
		private primitiveId?: string;
		private startX: number;
		private startY: number;
		private referenceX: number;
		private referenceY: number;
		private endX: number;
		private endY: number;
		private color: string | null;
		private fillColor: string | null;
		private lineWidth: number | null;
		private lineType: ESCH_PrimitiveLineType | null;
		public constructor(startX: number, startY: number, referenceX: number, referenceY: number, endX: number, endY: number, color?: string | null, fillColor?: string | null, lineWidth?: number | null, lineType?: ESCH_PrimitiveLineType | null, primitiveId?: string);
		public create(): Promise<ISCH_PrimitiveArc>;
		public getState_PrimitiveType(): ESCH_PrimitiveType;
		public getState_PrimitiveId(): string;
		public getState_StartX(): number;
		public getState_StartY(): number;
		public getState_ReferenceX(): number;
		public getState_ReferenceY(): number;
		public getState_EndX(): number;
		public getState_EndY(): number;
		public getState_Color(): string | null;
		public getState_FillColor(): string | null;
		public getState_LineWidth(): number | null;
		public getState_LineType(): ESCH_PrimitiveLineType | null;
		public setState_StartX(startX: number): ISCH_PrimitiveArc;
		public setState_StartY(startY: number): ISCH_PrimitiveArc;
		public setState_ReferenceX(referenceX: number): ISCH_PrimitiveArc;
		public setState_ReferenceY(referenceY: number): ISCH_PrimitiveArc;
		public setState_EndX(endX: number): ISCH_PrimitiveArc;
		public setState_EndY(endY: number): ISCH_PrimitiveArc;
		public setState_Color(color: string | null): ISCH_PrimitiveArc;
		public setState_FillColor(fillColor: string | null): ISCH_PrimitiveArc;
		public setState_LineWidth(lineWidth: number | null): ISCH_PrimitiveArc;
		public setState_LineType(lineType: ESCH_PrimitiveLineType | null): ISCH_PrimitiveArc;
		public toAsync(): ISCH_PrimitiveArc;
		public toSync(): ISCH_PrimitiveArc;
		public isAsync(): boolean;
		public reset(): Promise<ISCH_PrimitiveArc>;
		public done(): Promise<ISCH_PrimitiveArc>;
	}
	class SCH_PrimitiveArc implements ISCH_PrimitiveAPI {
		public create(startX: number, startY: number, referenceX: number, referenceY: number, endX: number, endY: number, color?: string | null, fillColor?: string | null, lineWidth?: number | null, lineType?: ESCH_PrimitiveLineType | null): Promise<ISCH_PrimitiveArc | undefined>;
		public delete(primitiveIds: string | ISCH_PrimitiveArc | Array<string> | Array<ISCH_PrimitiveArc>): Promise<boolean>;
		public modify(primitiveId: string | ISCH_PrimitiveArc, property: { startX?: number; startY?: number; referenceX?: number; referenceY?: number; endX?: number; endY?: number; color?: string | null; fillColor?: string | null; lineWidth?: number | null; lineType?: ESCH_PrimitiveLineType | null }): Promise<ISCH_PrimitiveArc | undefined>;
		public get(primitiveIds: string): Promise<ISCH_PrimitiveArc | undefined>;
		public get(primitiveIds: Array<string>): Promise<Array<ISCH_PrimitiveArc>>;
		public getAllPrimitiveId(): Promise<Array<string>>;
		public getAll(): Promise<Array<ISCH_PrimitiveArc>>;
	}
	enum ESCH_PrimitiveTextAlignMode {
		 LEFT_TOP = 1,
		 LEFT_MIDDLE = 2,
		 LEFT_BOTTOM = 3,
		 CENTER_TOP = 4,
		 CENTER = 5,
		 CENTER_BOTTOM = 6,
		 RIGHT_TOP = 7,
		 RIGHT_MIDDLE = 8,
		 RIGHT_BOTTOM = 9,
	}
	class ISCH_PrimitiveAttribute implements ISCH_Primitive {
		private async: boolean;
		private readonly primitiveType: ESCH_PrimitiveType.ATTRIBUTE;
		private primitiveId: string;
		private x: number | null;
		private y: number | null;
		private rotation: number | null;
		private color: string | null;
		private fontName: string | null;
		private fontSize: number | null;
		private bold: boolean | null;
		private italic: boolean | null;
		private underLine: boolean | null;
		private alignMode: ESCH_PrimitiveTextAlignMode | null;
		private fillColor: string | null;
		private key: string;
		private value: string;
		private keyVisible: boolean | null;
		private valueVisible: boolean | null;
		private parentPrimitiveId: string;
		public constructor(x: number, y: number, rotation: number, color: string | null, fontName: string | null, fontSize: number | null, bold: boolean | null, italic: boolean | null, underLine: boolean | null, alignMode: ESCH_PrimitiveTextAlignMode | null, fillColor: string | null, key: string, value: string, keyVisible: boolean | null, valueVisible: boolean | null, parentPrimitiveId: string, primitiveId: string);
		public create(): ISCH_PrimitiveAttribute;
		public getState_PrimitiveType(): ESCH_PrimitiveType;
		public getState_PrimitiveId(): string;
		public getState_X(): number | null;
		public getState_Y(): number | null;
		public getState_Rotation(): number | null;
		public getState_Color(): string | null;
		public getState_FontName(): string | null;
		public getState_FontSize(): number | null;
		public getState_Bold(): boolean | null;
		public getState_Italic(): boolean | null;
		public getState_UnderLine(): boolean | null;
		public getState_AlignMode(): ESCH_PrimitiveTextAlignMode | null;
		public getState_FillColor(): string | null;
		public getState_Key(): string;
		public getState_Value(): string;
		public getState_KeyVisible(): boolean | null;
		public getState_ValueVisible(): boolean | null;
		public getState_ParentPrimitiveId(): string;
		public setState_X(x: number | null): ISCH_PrimitiveAttribute;
		public setState_Y(y: number | null): ISCH_PrimitiveAttribute;
		public setState_Rotation(rotation: number | null): ISCH_PrimitiveAttribute;
		public setState_Color(color: string | null): ISCH_PrimitiveAttribute;
		public setState_FontName(fontName: string | null): ISCH_PrimitiveAttribute;
		public setState_FontSize(fontSize: number | null): ISCH_PrimitiveAttribute;
		public setState_Bold(bold: boolean | null): ISCH_PrimitiveAttribute;
		public setState_Italic(italic: boolean | null): ISCH_PrimitiveAttribute;
		public setState_UnderLine(underLine: boolean | null): ISCH_PrimitiveAttribute;
		public setState_AlignMode(alignMode: ESCH_PrimitiveTextAlignMode | null): ISCH_PrimitiveAttribute;
		public setState_FillColor(fillColor: string | null): ISCH_PrimitiveAttribute;
		public setState_Key(key: string): ISCH_PrimitiveAttribute;
		public setState_Value(value: string): ISCH_PrimitiveAttribute;
		public setState_KeyVisible(keyVisible: boolean | null): ISCH_PrimitiveAttribute;
		public setState_ValueVisible(valueVisible: boolean | null): ISCH_PrimitiveAttribute;
		public toAsync(): ISCH_PrimitiveAttribute;
		public toSync(): ISCH_PrimitiveAttribute;
		public isAsync(): boolean;
		public reset(): Promise<ISCH_PrimitiveAttribute>;
		public done(): Promise<ISCH_PrimitiveAttribute>;
	}
	class SCH_PrimitiveAttribute implements ISCH_PrimitiveAPI {
		public create(): undefined;
		public delete(): boolean;
		public modify(primitiveId: string | ISCH_PrimitiveAttribute, property: { x?: number | null; y?: number | null; rotation?: number | null; color?: string | null; fontName?: string | null; fontSize?: number | null; bold?: boolean | null; italic?: boolean | null; underLine?: boolean | null; alignMode?: ESCH_PrimitiveTextAlignMode | null; fillColor?: string | null; key?: string; value?: string; keyVisible?: boolean | null; valueVisible?: boolean | null }): Promise<ISCH_PrimitiveAttribute | undefined>;
		public get(primitiveIds: string): Promise<ISCH_PrimitiveAttribute | undefined>;
		public get(primitiveIds: Array<string>): Promise<Array<ISCH_PrimitiveAttribute>>;
		public getAllPrimitiveId(parentPrimitiveId?: string): Promise<Array<string>>;
		public getAll(parentPrimitiveId?: string): Promise<Array<ISCH_PrimitiveAttribute>>;
		public createNetLabel(x: number, y: number, net: string): Promise<ISCH_PrimitiveAttribute | undefined>;
	}
	class ISCH_PrimitiveBus implements ISCH_Primitive {
		private async: boolean;
		private readonly primitiveType: ESCH_PrimitiveType.BUS;
		private primitiveId?: string;
		private busName: string;
		private line: Array<number> | Array<Array<number>>;
		private color: string | null;
		private lineWidth: number | null;
		private lineType: ESCH_PrimitiveLineType | null;
		public constructor(busName: string, line: Array<number> | Array<Array<number>>, color?: string | null, lineWidth?: number | null, lineType?: ESCH_PrimitiveLineType | null, primitiveId?: string);
		public create(): Promise<ISCH_PrimitiveBus>;
		public getState_PrimitiveType(): ESCH_PrimitiveType;
		public getState_PrimitiveId(): string;
		public getState_BusName(): string;
		public getState_Line(): Array<number> | Array<Array<number>>;
		public getState_Color(): string | null;
		public getState_LineWidth(): number | null;
		public getState_LineType(): ESCH_PrimitiveLineType | null;
		public setState_BusName(busName: string): ISCH_PrimitiveBus;
		public setState_Line(line: Array<number> | Array<Array<number>>): ISCH_PrimitiveBus;
		public setState_Color(color: string | null): ISCH_PrimitiveBus;
		public setState_LineWidth(lineWidth: number | null): ISCH_PrimitiveBus;
		public setState_LineType(lineType: ESCH_PrimitiveLineType | null): ISCH_PrimitiveBus;
		public toAsync(): ISCH_PrimitiveBus;
		public toSync(): ISCH_PrimitiveBus;
		public isAsync(): boolean;
		public reset(): Promise<ISCH_PrimitiveBus>;
		public done(): Promise<ISCH_PrimitiveBus>;
	}
	class SCH_PrimitiveBus implements ISCH_PrimitiveAPI {
		public create(busName: string, line: Array<number> | Array<Array<number>>, color?: string | null, lineWidth?: number | null, lineType?: ESCH_PrimitiveLineType | null): Promise<ISCH_PrimitiveBus | undefined>;
		public delete(primitiveIds: string | ISCH_PrimitiveBus | Array<string> | Array<ISCH_PrimitiveBus>): Promise<boolean>;
		public modify(primitiveId: string | ISCH_PrimitiveBus, property: { busName?: string; line?: Array<number> | Array<Array<number>>; color?: string | null; lineWidth?: number | null; lineType?: ESCH_PrimitiveLineType | null }): Promise<ISCH_PrimitiveBus | undefined>;
		public get(primitiveIds: string): Promise<ISCH_PrimitiveBus | undefined>;
		public get(primitiveIds: Array<string>): Promise<Array<ISCH_PrimitiveBus>>;
		public getAllPrimitiveId(): Promise<Array<string>>;
		public getAll(): Promise<Array<ISCH_PrimitiveBus>>;
	}
	enum ESCH_PrimitiveFillStyle {
		 NONE = 'None',
		 SOLID = 'Solid',
		 GRID = 'Grid',
		 HORIZONTAL_LINE = 'Horizontal Line',
		 VERTICAL_LINE = 'Vertical Line',
		 RHOMBIC_GRID = 'Rhombic Grid',
		 LEFT_SLASH_LINE = 'Left Slash Line',
		 RIGHT_SLASH_LINE = 'Right Slash Line',
	}
	class ISCH_PrimitiveCircle implements ISCH_Primitive {
		private async: boolean;
		private readonly primitiveType: ESCH_PrimitiveType.CIRCLE;
		private primitiveId?: string;
		private centerX: number;
		private centerY: number;
		private radius: number;
		private color: string | null;
		private fillColor: string | null;
		private lineWidth: number | null;
		private lineType: ESCH_PrimitiveLineType | null;
		private fillStyle: ESCH_PrimitiveFillStyle | null;
		public constructor(centerX: number, centerY: number, radius: number, color?: string | null, fillColor?: string | null, lineWidth?: number | null, lineType?: ESCH_PrimitiveLineType | null, fillStyle?: ESCH_PrimitiveFillStyle | null, primitiveId?: string);
		public create(): Promise<ISCH_PrimitiveCircle>;
		public getState_PrimitiveType(): ESCH_PrimitiveType;
		public getState_PrimitiveId(): string;
		public getState_CenterX(): number;
		public getState_CenterY(): number;
		public getState_Radius(): number;
		public getState_Color(): string | null;
		public getState_FillColor(): string | null;
		public getState_LineWidth(): number | null;
		public getState_LineType(): ESCH_PrimitiveLineType | null;
		public getState_FillStyle(): ESCH_PrimitiveFillStyle | null;
		public setState_CenterX(centerX: number): ISCH_PrimitiveCircle;
		public setState_CenterY(centerY: number): ISCH_PrimitiveCircle;
		public setState_Radius(radius: number): ISCH_PrimitiveCircle;
		public setState_Color(color: string | null): ISCH_PrimitiveCircle;
		public setState_FillColor(fillColor: string | null): ISCH_PrimitiveCircle;
		public setState_LineWidth(lineWidth: number | null): ISCH_PrimitiveCircle;
		public setState_LineType(lineType: ESCH_PrimitiveLineType | null): ISCH_PrimitiveCircle;
		public setState_FillStyle(fillStyle: ESCH_PrimitiveFillStyle | null): ISCH_PrimitiveCircle;
		public toAsync(): ISCH_PrimitiveCircle;
		public toSync(): ISCH_PrimitiveCircle;
		public isAsync(): boolean;
		public reset(): Promise<ISCH_PrimitiveCircle>;
		public done(): Promise<ISCH_PrimitiveCircle>;
	}
	class SCH_PrimitiveCircle implements ISCH_PrimitiveAPI {
		public create(centerX: number, centerY: number, radius: number, color?: string | null, fillColor?: string | null, lineWidth?: number | null, lineType?: ESCH_PrimitiveLineType | null, fillStyle?: ESCH_PrimitiveFillStyle | null): Promise<ISCH_PrimitiveCircle | undefined>;
		public delete(primitiveIds: string | ISCH_PrimitiveCircle | Array<string> | Array<ISCH_PrimitiveCircle>): Promise<boolean>;
		public modify(primitiveId: string | ISCH_PrimitiveCircle, property: { centerX?: number; centerY?: number; radius?: number; color?: string | null; fillColor?: string | null; lineWidth?: number | null; lineType?: ESCH_PrimitiveLineType | null; fillStyle?: ESCH_PrimitiveFillStyle | null }): Promise<ISCH_PrimitiveCircle | undefined>;
		public get(primitiveIds: string): Promise<ISCH_PrimitiveCircle | undefined>;
		public get(primitiveIds: Array<string>): Promise<Array<ISCH_PrimitiveCircle>>;
		public getAllPrimitiveId(): Promise<Array<string>>;
		public getAll(): Promise<Array<ISCH_PrimitiveCircle>>;
	}
	enum ESCH_PrimitiveComponentType {
		 COMPONENT = 'part',
		 DRAWING = 'sheet',
		 NET_FLAG = 'netflag',
		 NET_PORT = 'netport',
		 NON_ELECTRICAL_FLAG = 'nonElectrical_symbol',
		 SHORT_CIRCUIT_FLAG = 'short_symbol',
		 OFF_PAGE_CONNECTOR = 'offPageConnector',
		 DIFFERENTIAL_PAIRS_FLAG = 'diffPairsFlag',
		 CBB_SYMBOL = 'block_symbol',
	}
	enum ESCH_PrimitivePinShape {
		 NONE = 'None',
		 INVERTED = 'Inverted',
		 CLOCK = 'Clock',
		 INVERTED_CLOCK = 'Inverted Clock',
	}
	class ISCH_PrimitivePin implements ISCH_Primitive {
		protected async: boolean;
		protected readonly primitiveType: ESCH_PrimitiveType;
		protected primitiveId?: string;
		protected x: number;
		protected y: number;
		protected pinNumber: string;
		protected pinName: string;
		protected rotation: number;
		protected pinLength: number;
		protected pinColor: string | null;
		protected pinShape: ESCH_PrimitivePinShape;
		protected pinType: ESCH_PrimitivePinType;
		protected noConnected?: boolean;
		protected otherProperty?: Record<string, string | number | boolean>;
		public constructor(x: number, y: number, pinNumber: string, pinName?: string, rotation?: number, pinLength?: number, pinColor?: string | null, pinShape?: ESCH_PrimitivePinShape, pinType?: ESCH_PrimitivePinType, noConnected?: boolean, primitiveId?: string, otherProperty?: Record<string, string | number | boolean>);
		public create(): Promise<ISCH_PrimitivePin>;
		public getState_PrimitiveType(): ESCH_PrimitiveType;
		public getState_PrimitiveId(): string;
		public getState_X(): number;
		public getState_Y(): number;
		public getState_PinNumber(): string;
		public getState_PinName(): string;
		public getState_Rotation(): number;
		public getState_PinLength(): number;
		public getState_PinColor(): string | null;
		public getState_PinShape(): ESCH_PrimitivePinShape;
		public getState_pinType(): ESCH_PrimitivePinType;
		public getState_NoConnected(): boolean | undefined;
		public getState_OtherProperty(): Record<string, string | number | boolean> | undefined;
		public setState_X(x: number): ISCH_PrimitivePin;
		public setState_Y(y: number): ISCH_PrimitivePin;
		public setState_PinNumber(pinNumber: string): ISCH_PrimitivePin;
		public setState_PinName(pinName: string): ISCH_PrimitivePin;
		public setState_Rotation(rotation: number): ISCH_PrimitivePin;
		public setState_PinLength(pinLength: number): ISCH_PrimitivePin;
		public setState_PinColor(pinColor: string | null): ISCH_PrimitivePin;
		public setState_PinShape(pinShape: ESCH_PrimitivePinShape): ISCH_PrimitivePin;
		public setState_PinType(pinType: ESCH_PrimitivePinType): ISCH_PrimitivePin;
		public setState_NoConnected(noConnected: boolean): ISCH_PrimitivePin;
		public setState_OtherProperty(otherProperty: Record<string, string | number | boolean>): ISCH_PrimitivePin;
		public toAsync(): ISCH_PrimitivePin;
		public toSync(): ISCH_PrimitivePin;
		public isAsync(): boolean;
		public reset(): Promise<ISCH_PrimitivePin>;
		public done(): Promise<ISCH_PrimitivePin>;
	}
	class ISCH_PrimitiveComponentPin extends ISCH_PrimitivePin {
		protected readonly primitiveType: ESCH_PrimitiveType.COMPONENT_PIN;
		public constructor(primitiveId: string, x: number, y: number, pinNumber: string, pinName: string, rotation: number, pinLength: number, pinColor: string | null, pinShape: ESCH_PrimitivePinShape, pinType: ESCH_PrimitivePinType, noConnected: boolean, otherProperty?: Record<string, string | number | boolean>);
		public create(): Promise<ISCH_PrimitiveComponentPin>;
		public setState_X(): ISCH_PrimitiveComponentPin;
		public setState_Y(): ISCH_PrimitiveComponentPin;
		public setState_PinName(): ISCH_PrimitiveComponentPin;
		public setState_Rotation(): ISCH_PrimitiveComponentPin;
		public setState_PinLength(): ISCH_PrimitiveComponentPin;
		public setState_PinColor(): ISCH_PrimitiveComponentPin;
		public setState_PinShape(): ISCH_PrimitiveComponentPin;
		public setState_PinType(): ISCH_PrimitiveComponentPin;
		public reset(): Promise<ISCH_PrimitiveComponentPin>;
		public done(): Promise<ISCH_PrimitiveComponentPin>;
	}
	class ISCH_PrimitiveComponent implements ISCH_Primitive {
		protected async: boolean;
		protected x: number;
		protected y: number;
		protected rotation: number;
		protected mirror: boolean;
		protected designator?: string;
		protected name?: string;
		protected primitiveId?: string;
		protected otherProperty?: Record<string, string | number | boolean>;
		private readonly primitiveType: ESCH_PrimitiveType.COMPONENT;
		private componentType: ESCH_PrimitiveComponentType;
		private component?: { libraryUuid: string; uuid: string; name?: string };
		private subPartName?: string;
		private addIntoBom?: boolean;
		private addIntoPcb?: boolean;
		private net?: string;
		private symbol?: { libraryUuid: string; uuid: string; name?: string };
		private footprint?: { libraryUuid: string; uuid: string; name?: string };
		private uniqueId?: string;
		private manufacturer?: string;
		private manufacturerId?: string;
		private supplier?: string;
		private supplierId?: string;
		public constructor(componentType: ESCH_PrimitiveComponentType, component: { libraryType?: ELIB_LibraryType.DEVICE | ELIB_LibraryType.SYMBOL; libraryUuid: string; uuid: string; name?: string }, x: number, y: number, subPartName?: string, rotation?: number, mirror?: boolean, addIntoBom?: boolean, addIntoPcb?: boolean, net?: string, primitiveId?: string, symbol?: { libraryUuid: string; uuid: string; name?: string }, footprint?: { libraryUuid: string; uuid: string; name?: string }, designator?: string, name?: string, uniqueId?: string, manufacturer?: string, manufacturerId?: string, supplier?: string, supplierId?: string, otherProperty?: Record<string, string | number | boolean>);
		public create(): Promise<ISCH_PrimitiveComponent>;
		public getState_PrimitiveType(): ESCH_PrimitiveType;
		public getState_ComponentType(): ESCH_PrimitiveComponentType;
		public getState_PrimitiveId(): string;
		public getState_Component(): { libraryUuid: string; uuid: string; name?: string } | undefined;
		public getState_X(): number;
		public getState_Y(): number;
		public getState_SubPartName(): string | undefined;
		public getState_Rotation(): number;
		public getState_Mirror(): boolean;
		public getState_AddIntoBom(): boolean | undefined;
		public getState_AddIntoPcb(): boolean | undefined;
		public getState_Net(): string | undefined;
		public getState_Symbol(): { libraryUuid: string; uuid: string; name?: string } | undefined;
		public getState_Footprint(): { libraryUuid: string; uuid: string; name?: string } | undefined;
		public getState_Designator(): string | undefined;
		public getState_Name(): string | undefined;
		public getState_UniqueId(): string | undefined;
		public getState_Manufacturer(): string | undefined;
		public getState_ManufacturerId(): string | undefined;
		public getState_Supplier(): string | undefined;
		public getState_SupplierId(): string | undefined;
		public getState_OtherProperty(): Record<string, string | number | boolean> | undefined;
		public setState_X(x: number): ISCH_PrimitiveComponent;
		public setState_Y(y: number): ISCH_PrimitiveComponent;
		public setState_Rotation(rotation: number): ISCH_PrimitiveComponent;
		public setState_Mirror(mirror: boolean): ISCH_PrimitiveComponent;
		public setState_AddIntoBom(addIntoBom: boolean | undefined): ISCH_PrimitiveComponent;
		public setState_AddIntoPcb(addIntoPcb: boolean | undefined): ISCH_PrimitiveComponent;
		public setState_Net(net: string | undefined): ISCH_PrimitiveComponent;
		public setState_Designator(designator: string | undefined): ISCH_PrimitiveComponent;
		public setState_Name(name: string | undefined): ISCH_PrimitiveComponent;
		public setState_UniqueId(uniqueId: string | undefined): ISCH_PrimitiveComponent;
		public setState_Manufacturer(manufacturer: string | undefined): ISCH_PrimitiveComponent;
		public setState_ManufacturerId(manufacturerId: string | undefined): ISCH_PrimitiveComponent;
		public setState_Supplier(supplier: string | undefined): ISCH_PrimitiveComponent;
		public setState_SupplierId(supplierId: string | undefined): ISCH_PrimitiveComponent;
		public setState_OtherProperty(otherProperty: Record<string, string | number | boolean>): ISCH_PrimitiveComponent;
		public toAsync(): ISCH_PrimitiveComponent;
		public toSync(): ISCH_PrimitiveComponent;
		public isAsync(): boolean;
		public reset(): Promise<ISCH_PrimitiveComponent>;
		public done(): Promise<ISCH_PrimitiveComponent>;
		public getAllPins(): Promise<Array<ISCH_PrimitiveComponentPin> | undefined>;
		private setState_Component(component?: { libraryUuid: string; uuid: string }): ISCH_PrimitiveComponent;
		private setState_SubPartName(subPartName?: string): ISCH_PrimitiveComponent;
	}
	class ISCH_PrimitiveCbbSymbolComponent extends ISCH_PrimitiveComponent {
		private cbb: { libraryUuid: string; uuid: string };
		private cbbSymbol: { libraryUuid: string; cbbUuid: string; uuid?: string; name?: string };
		public constructor(cbbSymbol: { libraryUuid: string; cbbUuid: string; uuid?: string; name?: string }, x: number, y: number, rotation?: number, mirror?: boolean, primitiveId?: string, symbol?: { libraryUuid: string; uuid: string; name?: string }, designator?: string, name?: string, otherProperty?: Record<string, string | number | boolean>);
		public create(): Promise<ISCH_PrimitiveCbbSymbolComponent>;
		public getState_Cbb(): { libraryUuid: string; uuid: string };
		public getState_CbbSymbol(): { libraryUuid: string; cbbUuid: string; uuid?: string; name?: string };
		public reset(): Promise<ISCH_PrimitiveCbbSymbolComponent>;
		public done(): Promise<ISCH_PrimitiveCbbSymbolComponent>;
		private setState_CbbSymbol(cbbSymbol: { libraryUuid: string; cbbUuid: string; uuid?: string }): ISCH_PrimitiveCbbSymbolComponent;
	}
	enum NetportDeviceName {
		IN = 'Netport-IN',
		OUT = 'Netport-OUT',
		BI = 'Netport-BI',
		Power = 'Netport-Power',
		OpenEmitter = 'Netport-Open-Emitter',
		OpenCollector = 'Netport-Open-Collector',
		Passive = 'Netport-Passive',
		HIZ = 'Netport-HIZ',
		Terminator = 'Netport-Terminator',
		Ground = 'Netport-Ground',
		Undefined = 'Netport-Undefined',
	}
	enum SchToolBarDeviceName {
		VCC = 'Power-VCC',
		V5 = 'Power-5V',
		GND = 'Ground-GND',
		PGND = 'Ground-PGND',
		AGND = 'Ground-AGND',
		IN = 'Netport-IN',
		OUT = 'Netport-OUT',
		BI = 'Netport-BI',
		OFF_PAGE_CONNECTOR_IN = 'Off-Page-Connector-In',
		OFF_PAGE_CONNECTOR_OUT = 'Off-Page-Connector-Out',
		OFF_PAGE_CONNECTOR_BI = 'Off-Page-Connector-BI',
		DIFF_PAIRS_FLAG = 'Differential-Pairs-Flag',
		SHORT = 'Short-Symbol',
		RESISTOR = 'Res_0603',
		CAPACITOR = 'CAP_0603',
		INDUCTOR = 'L_0603',
		DIODE = '1N4007',
		TEST_POINT = 'Test-Point',
		PROBE_I = '电流探针',
		PROBE_V = '电压探针',
		PROBE_L = '逻辑探针',
		FOUR_CHANNEL_OSCILLOSCOPE = '四通道示波器',
		MULTIMETER = '万用表',
	}
	class SCH_PrimitiveComponent implements ISCH_PrimitiveAPI {
		private netFlagComponentUuid_Power: any;
		private netFlagComponentUuid_Ground: any;
		private netFlagComponentUuid_AnalogGround: any;
		private netFlagComponentUuid_ProtectGround: any;
		private netPortComponentUuid_IN: any;
		private netPortComponentUuid_OUT: any;
		private netPortComponentUuid_BI: any;
		private shortCircuitFlagComponentUuid: any;
		private defaultLibraryUuid: string;
		public constructor();
		public setNetFlagComponentUuid_Power(component: { libraryUuid: string; uuid: string } | ILIB_DeviceItem | ILIB_DeviceSearchItem): Promise<boolean>;
		public setNetFlagComponentUuid_Ground(component: { libraryUuid: string; uuid: string } | ILIB_DeviceItem | ILIB_DeviceSearchItem): Promise<boolean>;
		public setNetFlagComponentUuid_AnalogGround(component: { libraryUuid: string; uuid: string } | ILIB_DeviceItem | ILIB_DeviceSearchItem): Promise<boolean>;
		public setNetFlagComponentUuid_ProtectGround(component: { libraryUuid: string; uuid: string } | ILIB_DeviceItem | ILIB_DeviceSearchItem): Promise<boolean>;
		public setNetPortComponentUuid_IN(component: { libraryUuid: string; uuid: string } | ILIB_DeviceItem | ILIB_DeviceSearchItem): Promise<boolean>;
		public setNetPortComponentUuid_OUT(component: { libraryUuid: string; uuid: string } | ILIB_DeviceItem | ILIB_DeviceSearchItem): Promise<boolean>;
		public setNetPortComponentUuid_BI(component: { libraryUuid: string; uuid: string } | ILIB_DeviceItem | ILIB_DeviceSearchItem): Promise<boolean>;
		public create(component: {
			libraryType?: ELIB_LibraryType.DEVICE;
			libraryUuid: string;
			uuid: string;
			 symbol?: { uuid: string; libraryUuid: string };
			 symbolName?: string;
		} | ILIB_DeviceItem | ILIB_DeviceSearchItem | { libraryType: ELIB_LibraryType.SYMBOL; libraryUuid: string; uuid: string } | ILIB_SymbolItem | ILIB_SymbolSearchItem, x: number, y: number, subPartName?: string, rotation?: number, mirror?: boolean, addIntoBom?: boolean, addIntoPcb?: boolean): Promise<ISCH_PrimitiveComponent | undefined>;
		public createNetFlag(identification: 'Power' | 'Ground' | 'AnalogGround' | 'ProtectGround', net: string, x: number, y: number, rotation?: number, mirror?: boolean): Promise<ISCH_PrimitiveComponent | undefined>;
		public createNetPort(direction: 'IN' | 'OUT' | 'BI', net: string, x: number, y: number, rotation?: number, mirror?: boolean): Promise<ISCH_PrimitiveComponent | undefined>;
		public createShortCircuitFlag(x: number, y: number, rotation?: number, mirror?: boolean): Promise<ISCH_PrimitiveComponent | undefined>;
		public createCbbSymbol(cbbSymbol: { libraryUuid: string; cbbUuid: string; uuid?: string }, x: number, y: number, rotation?: number, mirror?: boolean): Promise<ISCH_PrimitiveCbbSymbolComponent | undefined>;
		public placeCbbSchematicPage(cbbSchematicPage: { libraryUuid: string; cbbUuid: string; uuid: string }, x: number, y: number, props?: { reimportWhenNameRepeated?: boolean }): Promise<boolean>;
		public delete(primitiveIds: string | ISCH_PrimitiveComponent | Array<string> | Array<ISCH_PrimitiveComponent>): Promise<boolean>;
		public modify(primitiveId: string | ISCH_PrimitiveComponent, property: {
			x?: number;
			y?: number;
			rotation?: number;
			mirror?: boolean;
			addIntoBom?: boolean;
			addIntoPcb?: boolean;
			designator?: string | null;
			name?: string | null;
			uniqueId?: string | null;
			manufacturer?: string | null;
			manufacturerId?: string | null;
			supplier?: string | null;
			supplierId?: string | null;
			subPartName?: string;
			 symbol?: { uuid?: string; libraryUuid?: string; name?: string } | null;
			 footprint?: { uuid?: string; libraryUuid?: string; name?: string } | null;
			otherProperty?: Record<string, string | number | boolean>;
		}): Promise<ISCH_PrimitiveComponent | undefined>;
		public get(primitiveIds: string): Promise<ISCH_PrimitiveComponent | undefined>;
		public get(primitiveIds: Array<string>): Promise<Array<ISCH_PrimitiveComponent>>;
		public getAllPrimitiveId(componentType?: ESCH_PrimitiveComponentType, allSchematicPages?: boolean): Promise<Array<string>>;
		public getAll(componentType?: ESCH_PrimitiveComponentType, allSchematicPages?: boolean): Promise<Array<ISCH_PrimitiveComponent>>;
		public getAllPinsByPrimitiveId(primitiveId: string): Promise<Array<ISCH_PrimitiveComponentPin> | undefined>;
		public placeComponentWithMouse(component: { libraryUuid: string; uuid: string } | ILIB_DeviceItem | ILIB_DeviceSearchItem, subPartName?: string): Promise<boolean>;
		public placeSymbolWithMouse(symbol: { libraryUuid: string; uuid: string } | ILIB_SymbolItem | ILIB_SymbolSearchItem, subPartName?: string, properties?: Record<string, boolean | number | string | undefined>): Promise<boolean>;
		public getAllPropertyNames(): Promise<Array<string>>;
		private getComponentDetail(componentUuid: string, libraryUuid: string): Promise<any>;
		private checkComponentType(componentType: ESCH_PrimitiveComponentType, componentUuid: string, libraryUuid: string): Promise<boolean>;
		private initUuid(): Promise<void>;
	}
	enum ESCH_PrimitiveGenericPortIoType {
		 UNSPECIFIED = 'unspecified',
		 INPUT = 'input',
		 OUTPUT = 'output',
		 BIDIRECTIONAL = 'bidirectional',
	}
	enum ESCH_PrimitiveGenericPortStrokeStyle {
		 SOLID = 'solid',
		 DASHED = 'dashed',
		 DOTTED = 'dotted',
		 DOT_DASHED = 'dotdashed',
	}
	enum ESCH_PrimitiveGenericPortTextAlign {
		 LEFT = 'left',
		 CENTER = 'center',
		 RIGHT = 'right',
	}
	interface ISCH_PrimitiveGenericPortProps {
		x?: number;
		y?: number;
		value?: string;
		rotation?: number;
		width?: number | null;
		height?: number | null;
		ioType?: ESCH_PrimitiveGenericPortIoType | null;
		harnessType?: string | null;
		strokeWidth?: number | null;
		strokeStyle?: ESCH_PrimitiveGenericPortStrokeStyle | null;
		strokeColor?: string | null;
		fillColor?: string | null;
		fontColor?: string | null;
		fontFamily?: string | null;
		fontSize?: number | null;
		textAlign?: ESCH_PrimitiveGenericPortTextAlign | null;
	}
	type ISCH_PrimitiveGenericPortData = ISCH_PrimitiveGenericPortProps & Required<Pick<ISCH_PrimitiveGenericPortProps, 'x' | 'y' | 'value' | 'rotation'>> & { primitiveId: string };
	class ISCH_PrimitiveGenericPort implements ISCH_Primitive {
		private async: boolean;
		private readonly primitiveType: ESCH_PrimitiveType.GENERIC_PORT;
		private primitiveId?: string;
		private x: number;
		private y: number;
		private value: string;
		private rotation: number | null;
		private width: number | null;
		private height: number | null;
		private ioType: ESCH_PrimitiveGenericPortIoType | null;
		private harnessType: string | null;
		private strokeWidth: number | null;
		private strokeStyle: ESCH_PrimitiveGenericPortStrokeStyle | null;
		private strokeColor: string | null;
		private fillColor: string | null;
		private fontColor: string | null;
		private fontFamily: string | null;
		private fontSize: number | null;
		private textAlign: ESCH_PrimitiveGenericPortTextAlign | null;
		public constructor(x: number, y: number, value: string, rotation?: number | null, width?: number | null, height?: number | null, ioType?: ESCH_PrimitiveGenericPortIoType | null, harnessType?: string | null, strokeWidth?: number | null, strokeStyle?: ESCH_PrimitiveGenericPortStrokeStyle | null, strokeColor?: string | null, fillColor?: string | null, fontColor?: string | null, fontFamily?: string | null, fontSize?: number | null, textAlign?: ESCH_PrimitiveGenericPortTextAlign | null, primitiveId?: string);
		public static fromData(data: ISCH_PrimitiveGenericPortData): ISCH_PrimitiveGenericPort;
		public create(): Promise<ISCH_PrimitiveGenericPort>;
		public getState_PrimitiveType(): ESCH_PrimitiveType;
		public getState_PrimitiveId(): string;
		public getState_X(): number;
		public getState_Y(): number;
		public getState_Value(): string;
		public getState_Rotation(): number | null;
		public getState_Width(): number | null;
		public getState_Height(): number | null;
		public getState_IoType(): ESCH_PrimitiveGenericPortIoType | null;
		public getState_HarnessType(): string | null;
		public getState_StrokeWidth(): number | null;
		public getState_StrokeStyle(): ESCH_PrimitiveGenericPortStrokeStyle | null;
		public getState_StrokeColor(): string | null;
		public getState_FillColor(): string | null;
		public getState_FontColor(): string | null;
		public getState_FontFamily(): string | null;
		public getState_FontSize(): number | null;
		public getState_TextAlign(): ESCH_PrimitiveGenericPortTextAlign | null;
		public setState_X(x: number): ISCH_PrimitiveGenericPort;
		public setState_Y(y: number): ISCH_PrimitiveGenericPort;
		public setState_Value(value: string): ISCH_PrimitiveGenericPort;
		public setState_Rotation(rotation: number | null): ISCH_PrimitiveGenericPort;
		public setState_Width(width: number | null): ISCH_PrimitiveGenericPort;
		public setState_Height(height: number | null): ISCH_PrimitiveGenericPort;
		public setState_IoType(ioType: ESCH_PrimitiveGenericPortIoType | null): ISCH_PrimitiveGenericPort;
		public setState_HarnessType(harnessType: string | null): ISCH_PrimitiveGenericPort;
		public setState_StrokeWidth(strokeWidth: number | null): ISCH_PrimitiveGenericPort;
		public setState_StrokeStyle(strokeStyle: ESCH_PrimitiveGenericPortStrokeStyle | null): ISCH_PrimitiveGenericPort;
		public setState_StrokeColor(strokeColor: string | null): ISCH_PrimitiveGenericPort;
		public setState_FillColor(fillColor: string | null): ISCH_PrimitiveGenericPort;
		public setState_FontColor(fontColor: string | null): ISCH_PrimitiveGenericPort;
		public setState_FontFamily(fontFamily: string | null): ISCH_PrimitiveGenericPort;
		public setState_FontSize(fontSize: number | null): ISCH_PrimitiveGenericPort;
		public setState_TextAlign(textAlign: ESCH_PrimitiveGenericPortTextAlign | null): ISCH_PrimitiveGenericPort;
		public toAsync(): ISCH_PrimitiveGenericPort;
		public toSync(): ISCH_PrimitiveGenericPort;
		public toSyncAndWait(): Promise<ISCH_PrimitiveGenericPort>;
		public isAsync(): boolean;
		public reset(): Promise<ISCH_PrimitiveGenericPort>;
		public done(): Promise<ISCH_PrimitiveGenericPort>;
	}
	class SCH_PrimitiveGenericPort implements ISCH_PrimitiveAPI {
		public create(x: number, y: number, value: string, rotation?: number, width?: number | null, height?: number | null, ioType?: ESCH_PrimitiveGenericPortIoType | null, harnessType?: string | null, strokeWidth?: number | null, strokeStyle?: ESCH_PrimitiveGenericPortStrokeStyle | null, strokeColor?: string | null, fillColor?: string | null, fontColor?: string | null, fontFamily?: string | null, fontSize?: number | null, textAlign?: ESCH_PrimitiveGenericPortTextAlign | null): Promise<ISCH_PrimitiveGenericPort | undefined>;
		private static normalizeIds(primitiveIds: string | ISCH_PrimitiveGenericPort | Array<string | ISCH_PrimitiveGenericPort>): string[];
		public delete(primitiveIds: string | ISCH_PrimitiveGenericPort | Array<string> | Array<ISCH_PrimitiveGenericPort>): Promise<boolean>;
		public modify(primitiveId: string | ISCH_PrimitiveGenericPort, property: ISCH_PrimitiveGenericPortProps): Promise<ISCH_PrimitiveGenericPort | undefined>;
		public get(primitiveIds: string): Promise<ISCH_PrimitiveGenericPort | undefined>;
		public get(primitiveIds: Array<string>): Promise<Array<ISCH_PrimitiveGenericPort>>;
		public getAllPrimitiveId(): Promise<Array<string>>;
		public getAll(): Promise<Array<ISCH_PrimitiveGenericPort>>;
	}
	class SCH_PrimitivePin implements ISCH_PrimitiveAPI {
		public create(x: number, y: number, pinNumber: string, pinName?: string, rotation?: number, pinLength?: number, pinColor?: string | null, pinShape?: ESCH_PrimitivePinShape, pinType?: ESCH_PrimitivePinType): Promise<ISCH_PrimitivePin | undefined>;
		public delete(primitiveIds: string | ISCH_PrimitivePin | Array<string> | Array<ISCH_PrimitivePin>): Promise<boolean>;
		public modify(primitiveId: string | ISCH_PrimitivePin | ISCH_PrimitiveComponentPin, property: { x?: number; y?: number; pinNumber?: string; pinName?: string; rotation?: number; pinLength?: number; pinColor?: string | null; pinShape?: ESCH_PrimitivePinShape; pinType?: ESCH_PrimitivePinType; noConnected?: boolean; otherProperty?: Record<string, string | number | boolean> }): Promise<ISCH_PrimitivePin | ISCH_PrimitiveComponentPin | undefined>;
		public get(primitiveIds: string): Promise<ISCH_PrimitivePin | ISCH_PrimitiveComponentPin | undefined>;
		public get(primitiveIds: Array<string>): Promise<Array<ISCH_PrimitivePin | ISCH_PrimitiveComponentPin>>;
		public getAllPrimitiveId(): Promise<Array<string>>;
		public getAll(): Promise<Array<ISCH_PrimitivePin>>;
	}
	class ISCH_PrimitivePolygon implements ISCH_Primitive {
		private async: boolean;
		private readonly primitiveType: ESCH_PrimitiveType.POLYGON;
		private primitiveId?: string;
		private line: Array<number>;
		private color: string | null;
		private fillColor: string | null;
		private lineWidth: number | null;
		private lineType: ESCH_PrimitiveLineType | null;
		public constructor(line: Array<number>, color?: string | null, fillColor?: string | null, lineWidth?: number | null, lineType?: ESCH_PrimitiveLineType | null, primitiveId?: string);
		public create(): Promise<ISCH_PrimitivePolygon>;
		public getState_PrimitiveType(): ESCH_PrimitiveType;
		public getState_PrimitiveId(): string;
		public getState_Line(): Array<number>;
		public getState_Color(): string | null;
		public getState_FillColor(): string | null;
		public getState_LineWidth(): number | null;
		public getState_LineType(): ESCH_PrimitiveLineType | null;
		public setState_Line(line: Array<number>): ISCH_PrimitivePolygon;
		public setState_Color(color: string | null): ISCH_PrimitivePolygon;
		public setState_FillColor(fillColor: string | null): ISCH_PrimitivePolygon;
		public setState_LineWidth(lineWidth: number | null): ISCH_PrimitivePolygon;
		public setState_LineType(lineType: ESCH_PrimitiveLineType | null): ISCH_PrimitivePolygon;
		public toAsync(): ISCH_PrimitivePolygon;
		public toSync(): ISCH_PrimitivePolygon;
		public isAsync(): boolean;
		public reset(): Promise<ISCH_PrimitivePolygon>;
		public done(): Promise<ISCH_PrimitivePolygon>;
	}
	class SCH_PrimitivePolygon implements ISCH_PrimitiveAPI {
		public create(line: Array<number>, color?: string | null, fillColor?: string | null, lineWidth?: number | null, lineType?: ESCH_PrimitiveLineType | null): Promise<ISCH_PrimitivePolygon | undefined>;
		public delete(primitiveIds: string | ISCH_PrimitivePolygon | Array<string> | Array<ISCH_PrimitivePolygon>): Promise<boolean>;
		public modify(primitiveId: string | ISCH_PrimitivePolygon, property: { line?: Array<number>; color?: string | null; fillColor?: string | null; lineWidth?: number | null; lineType?: ESCH_PrimitiveLineType | null }): Promise<ISCH_PrimitivePolygon | undefined>;
		public get(primitiveIds: string): Promise<ISCH_PrimitivePolygon | undefined>;
		public get(primitiveIds: Array<string>): Promise<Array<ISCH_PrimitivePolygon>>;
		public getAllPrimitiveId(): Promise<Array<string>>;
		public getAll(): Promise<Array<ISCH_PrimitivePolygon>>;
	}
	class ISCH_PrimitiveRectangle implements ISCH_Primitive {
		private async: boolean;
		private readonly primitiveType: ESCH_PrimitiveType.RECTANGLE;
		private primitiveId?: string;
		private topLeftX: number;
		private topLeftY: number;
		private width: number;
		private height: number;
		private cornerRadius: number;
		private rotation: number;
		private color: string | null;
		private fillColor: string | null;
		private lineWidth: number | null;
		private lineType: ESCH_PrimitiveLineType | null;
		private fillStyle: ESCH_PrimitiveFillStyle | null;
		private bindSchematicPageUuid: string | null;
		public constructor(topLeftX: number, topLeftY: number, width: number, height: number, cornerRadius?: number, rotation?: number, color?: string | null, fillColor?: string | null, lineWidth?: number | null, lineType?: ESCH_PrimitiveLineType | null, fillStyle?: ESCH_PrimitiveFillStyle | null, bindSchematicPageUuid?: string | null, primitiveId?: string);
		public create(): Promise<ISCH_PrimitiveRectangle>;
		public getState_PrimitiveType(): ESCH_PrimitiveType;
		public getState_PrimitiveId(): string;
		public getState_TopLeftX(): number;
		public getState_TopLeftY(): number;
		public getState_Width(): number;
		public getState_Height(): number;
		public getState_CornerRadius(): number;
		public getState_Rotation(): number;
		public getState_Color(): string | null;
		public getState_FillColor(): string | null;
		public getState_LineWidth(): number | null;
		public getState_LineType(): ESCH_PrimitiveLineType | null;
		public getState_FillStyle(): ESCH_PrimitiveFillStyle | null;
		public getState_BindSchematicPageUuid(): string | null;
		public setState_TopLeftX(topLeftX: number): ISCH_PrimitiveRectangle;
		public setState_TopLeftY(topLeftY: number): ISCH_PrimitiveRectangle;
		public setState_Width(width: number): ISCH_PrimitiveRectangle;
		public setState_Height(height: number): ISCH_PrimitiveRectangle;
		public setState_CornerRadius(cornerRadius: number): ISCH_PrimitiveRectangle;
		public setState_Rotation(rotation: number): ISCH_PrimitiveRectangle;
		public setState_Color(color: string | null): ISCH_PrimitiveRectangle;
		public setState_FillColor(fillColor: string | null): ISCH_PrimitiveRectangle;
		public setState_LineWidth(lineWidth: number | null): ISCH_PrimitiveRectangle;
		public setState_LineType(lineType: ESCH_PrimitiveLineType | null): ISCH_PrimitiveRectangle;
		public setState_FillStyle(fillStyle: ESCH_PrimitiveFillStyle | null): ISCH_PrimitiveRectangle;
		public setState_BindSchematicPageUuid(bindSchematicPageUuid: string | null): ISCH_PrimitiveRectangle;
		public toAsync(): ISCH_PrimitiveRectangle;
		public toSync(): ISCH_PrimitiveRectangle;
		public isAsync(): boolean;
		public reset(): Promise<ISCH_PrimitiveRectangle>;
		public done(): Promise<ISCH_PrimitiveRectangle>;
	}
	class SCH_PrimitiveRectangle implements ISCH_PrimitiveAPI {
		public create(topLeftX: number, topLeftY: number, width: number, height: number, cornerRadius?: number, rotation?: number, color?: string | null, fillColor?: string | null, lineWidth?: number | null, lineType?: ESCH_PrimitiveLineType | null, fillStyle?: ESCH_PrimitiveFillStyle | null, bindSchematicPageUuid?: string | null): Promise<ISCH_PrimitiveRectangle | undefined>;
		public delete(primitiveIds: string | ISCH_PrimitiveRectangle | Array<string> | Array<ISCH_PrimitiveRectangle>): Promise<boolean>;
		public modify(primitiveId: string | ISCH_PrimitiveRectangle, property: { topLeftX?: number; topLeftY?: number; width?: number; height?: number; cornerRadius?: number; rotation?: number; color?: string | null; fillColor?: string | null; lineWidth?: number | null; lineType?: ESCH_PrimitiveLineType | null; fillStyle?: ESCH_PrimitiveFillStyle | null; bindSchematicPageUuid?: string | null }): Promise<ISCH_PrimitiveRectangle | undefined>;
		public get(primitiveIds: string): Promise<ISCH_PrimitiveRectangle | undefined>;
		public get(primitiveIds: Array<string>): Promise<Array<ISCH_PrimitiveRectangle>>;
		public getAllPrimitiveId(): Promise<Array<string>>;
		public getAll(): Promise<Array<ISCH_PrimitiveRectangle>>;
	}
	class ISCH_PrimitiveText implements ISCH_Primitive {
		private async: boolean;
		private readonly primitiveType: ESCH_PrimitiveType.TEXT;
		private primitiveId?: string;
		private x: number;
		private y: number;
		private content: string;
		private rotation: number;
		private textColor: string | null;
		private fontName: string | null;
		private fontSize: number | null;
		private bold: boolean;
		private italic: boolean;
		private underLine: boolean;
		private alignMode: ESCH_PrimitiveTextAlignMode;
		public constructor(x: number, y: number, content: string, rotation: number, textColor: string | null, fontName: string | null, fontSize: number | null, bold: boolean, italic: boolean, underLine: boolean, alignMode: ESCH_PrimitiveTextAlignMode, primitiveId?: string);
		public create(): Promise<ISCH_PrimitiveText>;
		public getState_PrimitiveType(): ESCH_PrimitiveType;
		public getState_PrimitiveId(): string;
		public getState_X(): number;
		public getState_Y(): number;
		public getState_Content(): string;
		public getState_Rotation(): number;
		public getState_TextColor(): string | null;
		public getState_FontName(): string | null;
		public getState_FontSize(): number | null;
		public getState_Bold(): boolean;
		public getState_Italic(): boolean;
		public getState_UnderLine(): boolean;
		public getState_AlignMode(): ESCH_PrimitiveTextAlignMode;
		public setState_X(x: number): ISCH_PrimitiveText;
		public setState_Y(y: number): ISCH_PrimitiveText;
		public setState_Content(content: string): ISCH_PrimitiveText;
		public setState_Rotation(rotation: number): ISCH_PrimitiveText;
		public setState_TextColor(textColor: string | null): ISCH_PrimitiveText;
		public setState_FontName(fontName: string | null): ISCH_PrimitiveText;
		public setState_FontSize(fontSize: number | null): ISCH_PrimitiveText;
		public setState_Bold(bold: boolean): ISCH_PrimitiveText;
		public setState_Italic(italic: boolean): ISCH_PrimitiveText;
		public setState_UnderLine(underLine: boolean): ISCH_PrimitiveText;
		public setState_AlignMode(alignMode: ESCH_PrimitiveTextAlignMode): ISCH_PrimitiveText;
		public toAsync(): ISCH_PrimitiveText;
		public toSync(): ISCH_PrimitiveText;
		public isAsync(): boolean;
		public reset(): Promise<ISCH_PrimitiveText>;
		public done(): Promise<ISCH_PrimitiveText>;
	}
	class SCH_PrimitiveText implements ISCH_PrimitiveAPI {
		public create(x: number, y: number, content: string, rotation?: number, textColor?: string | null, fontName?: string | null, fontSize?: number | null, bold?: boolean, italic?: boolean, underLine?: boolean, alignMode?: ESCH_PrimitiveTextAlignMode): Promise<ISCH_PrimitiveText | undefined>;
		public delete(primitiveIds: string | ISCH_PrimitiveText | Array<string> | Array<ISCH_PrimitiveText>): Promise<boolean>;
		public modify(primitiveId: string | ISCH_PrimitiveText, property: { x?: number; y?: number; content?: string; rotation?: number; textColor?: string | null; fontName?: string | null; fontSize?: number | null; bold?: boolean; italic?: boolean; underLine?: boolean; alignMode?: ESCH_PrimitiveTextAlignMode }): Promise<ISCH_PrimitiveText | undefined>;
		public get(primitiveIds: string): Promise<ISCH_PrimitiveText | undefined>;
		public get(primitiveIds: Array<string>): Promise<Array<ISCH_PrimitiveText>>;
		public getAllPrimitiveId(): Promise<Array<string>>;
		public getAll(): Promise<Array<ISCH_PrimitiveText>>;
	}
	class ISCH_PrimitiveWire implements ISCH_Primitive {
		private async: boolean;
		private readonly primitiveType: ESCH_PrimitiveType.WIRE;
		private primitiveId?: string;
		private line: Array<number> | Array<Array<number>>;
		private net: string;
		private color: string | null;
		private lineWidth: number | null;
		private lineType: ESCH_PrimitiveLineType | null;
		public constructor(line: Array<number> | Array<Array<number>>, net?: string, color?: string | null, lineWidth?: number | null, lineType?: ESCH_PrimitiveLineType | null, primitiveId?: string);
		public create(): Promise<ISCH_PrimitiveWire>;
		public getState_PrimitiveType(): ESCH_PrimitiveType;
		public getState_PrimitiveId(): string;
		public getState_Line(): Array<number> | Array<Array<number>>;
		public getState_Net(): string;
		public getState_Color(): string | null;
		public getState_LineWidth(): number | null;
		public getState_LineType(): ESCH_PrimitiveLineType | null;
		public setState_Line(line: Array<number> | Array<Array<number>>): ISCH_PrimitiveWire;
		public setState_Net(net: string): ISCH_PrimitiveWire;
		public setState_Color(color: string | null): ISCH_PrimitiveWire;
		public setState_LineWidth(lineWidth: number | null): ISCH_PrimitiveWire;
		public setState_LineType(lineType: ESCH_PrimitiveLineType | null): ISCH_PrimitiveWire;
		public toAsync(): ISCH_PrimitiveWire;
		public toSync(): ISCH_PrimitiveWire;
		public isAsync(): boolean;
		public reset(): Promise<ISCH_PrimitiveWire>;
		public done(): Promise<ISCH_PrimitiveWire>;
	}
	class SCH_PrimitiveWire implements ISCH_PrimitiveAPI {
		public create(line: Array<number> | Array<Array<number>>, net?: string, color?: string | null, lineWidth?: number | null, lineType?: ESCH_PrimitiveLineType | null): Promise<ISCH_PrimitiveWire | undefined>;
		public delete(primitiveIds: string | ISCH_PrimitiveWire | Array<string> | Array<ISCH_PrimitiveWire>): Promise<boolean>;
		public modify(primitiveId: string | ISCH_PrimitiveWire, property: { line?: Array<number> | Array<Array<number>>; net?: string; color?: string | null; lineWidth?: number | null; lineType?: ESCH_PrimitiveLineType | null }): Promise<ISCH_PrimitiveWire | undefined>;
		public get(primitiveIds: string): Promise<ISCH_PrimitiveWire | undefined>;
		public get(primitiveIds: Array<string>): Promise<Array<ISCH_PrimitiveWire>>;
		public getAllPrimitiveId(net?: string | Array<string>): Promise<Array<string>>;
		public getAll(net?: string | Array<string>): Promise<Array<ISCH_PrimitiveWire>>;
	}
	class SCH_SelectControl {
		public getAllSelectedPrimitives_PrimitiveId(): Promise<Array<string>>;
		public getAllSelectedPrimitives(): Promise<Array<ISCH_Primitive>>;
		public getSelectedPrimitives_PrimitiveId(): Promise<Array<string>>;
		public getSelectedPrimitives(): Promise<Array<object>>;
		public doSelectPrimitives(primitiveIds: string | Array<string>): Promise<boolean>;
		public doCrossProbeSelect(components?: Array<string>, pins?: Array<string>, nets?: Array<string>, highlight?: boolean, select?: boolean): boolean;
		public clearSelected(): boolean;
		public getCurrentMousePosition(): Promise<{ x: number; y: number } | undefined>;
	}
	enum ESCH_DynamicSimulationEnginePushEventType {
		 SESSION_STATE = 'SESSION_STATE',
		 STREAM_DATA = 'STREAM_DATA',
		 STREAM_SNAPSHOT = 'STREAM_SNAPSHOT',
		 ENGINE_LOG = 'ENGINE_LOG',
		 ENGINE_ERROR = 'ENGINE_ERROR',
	}
	enum ESCH_SpiceSimulationEnginePushEventType {
		 SIMULATION_RESULT = 'SIMULATION_RESULT',
		 VALIDATION_RESULT = 'VALIDATION_RESULT',
		 LOG_RESULT = 'LOG_RESULT',
		 ERROR_RESULT = 'ERROR_RESULT',
	}
	class SCH_SimulationEngine {
		public pushData(eventType: ESCH_DynamicSimulationEnginePushEventType | ESCH_SpiceSimulationEnginePushEventType, props: Record<string, any>): void;
	}
	interface ISCH_SourceDocumentFunctionGroup {
		groupId: string;
		members: Array<string>;
		nets: Array<string>;
	}
	interface ISCH_SourceDocumentTransformFunctionGroupOptions extends ISCH_SourceIdentity {
		groupId: string;
		dx?: number;
		dy?: number;
		rotation?: number;
	}
	interface ISCH_SourceDocumentTransformFunctionGroupResult {
		groupId: string;
		movedCount: number;
	}
	interface ISCH_SourceDocumentRemoveFunctionGroupOptions extends ISCH_SourceIdentity {
		groupId: string;
		withWires?: boolean;
	}
	interface ISCH_SourceDocumentRemoveFunctionGroupResult {
		groupId: string;
		removedCount: number;
		removedWires: number;
	}
	class SCH_SourceDocument {
		public getFunctionGroups(options: ISCH_SourceIdentity): Promise<TSCH_SourceResult<Array<ISCH_SourceDocumentFunctionGroup>>>;
		public transformFunctionGroup(options: ISCH_SourceDocumentTransformFunctionGroupOptions): Promise<TSCH_SourceResult<ISCH_SourceDocumentTransformFunctionGroupResult>>;
		public removeFunctionGroup(options: ISCH_SourceDocumentRemoveFunctionGroupOptions): Promise<TSCH_SourceResult<ISCH_SourceDocumentRemoveFunctionGroupResult>>;
	}
	interface ISCH_SourceDrcViolation {
		rule: string;
		severity: string;
		message: string;
		elements: Array<{
			 primitiveId: string;
			 pinId?: string;
		}>;
	}
	interface ISCH_SourceDrcCheckResult {
		passed: boolean;
		violations: Array<ISCH_SourceDrcViolation>;
	}
	class SCH_SourceDrc {
		public check(options: ISCH_SourceIdentity): Promise<TSCH_SourceResult<ISCH_SourceDrcCheckResult>>;
	}
	interface ISCH_SourcePrimitiveIdOptions extends ISCH_SourceIdentity {
		primitiveId: string;
	}
	interface ISCH_SourceNetConnection {
		primitiveId: string;
		designator?: string;
		pinNumber?: string;
		type?: string;
	}
	interface ISCH_SourceNetConnectionsResult {
		net: string | null;
		connections: Array<ISCH_SourceNetConnection>;
	}
	class SCH_SourceNet {
		public getConnections(options: ISCH_SourcePrimitiveIdOptions): Promise<TSCH_SourceResult<ISCH_SourceNetConnectionsResult>>;
	}
	interface ISCH_SourceNetlistGetNetlistInRegionOptions extends ISCH_SourceIdentity {
		region: ISCH_SourceRegion;
	}
	interface ISCH_SourceNetlistNetPin {
		primitiveId: string;
		designator: string;
		pinNumber: string;
	}
	interface ISCH_SourceNetlistNetFlag {
		primitiveId: string;
		type: string;
	}
	interface ISCH_SourceNetlistNet {
		name: string;
		pins: Array<ISCH_SourceNetlistNetPin>;
		netFlags: Array<ISCH_SourceNetlistNetFlag>;
	}
	interface ISCH_SourceNetlistRegionResult {
		nets: Array<ISCH_SourceNetlistNet>;
	}
	class SCH_SourceNetlist {
		public getNetlistInRegion(options: ISCH_SourceNetlistGetNetlistInRegionOptions): Promise<TSCH_SourceResult<ISCH_SourceNetlistRegionResult>>;
	}
	interface ISCH_SourcePinGetGeometryOptions extends ISCH_SourceIdentity {
		primitiveId: string;
	}
	enum ESCH_SourcePinSide {
		 LEFT = 'left',
		 RIGHT = 'right',
		 TOP = 'top',
		 BOTTOM = 'bottom',
		 UNKNOWN = 'unknown',
	}
	interface ISCH_SourcePinGeometryItem {
		pinId: string;
		pinNumber: string;
		pinName: string;
		x: number;
		y: number;
		side: ESCH_SourcePinSide;
		length: number;
		direction: ESCH_PrimitivePinType;
		bodyBBox: {
			 minX: number;
			 minY: number;
			 maxX: number;
			 maxY: number;
		};
	}
	interface ISCH_SourcePinNoConnectOptions extends ISCH_SourceIdentity {
		primitiveId: string;
		pinId: string;
		noConnect?: boolean;
	}
	interface ISCH_SourcePinNoConnectResult {
		primitiveId: string;
		pinId: string;
		noConnect: boolean;
	}
	class SCH_SourcePin {
		public getGeometry(options: ISCH_SourcePinGetGeometryOptions): Promise<TSCH_SourceResult<Array<ISCH_SourcePinGeometryItem>>>;
		public setNoConnect(options: ISCH_SourcePinNoConnectOptions): Promise<TSCH_SourceResult<ISCH_SourcePinNoConnectResult>>;
	}
	interface ISCH_SourcePrimitiveArcAddOptions extends ISCH_SourceIdentity {
		points: Array<Array<number>>;
		curve: number;
	}
	interface ISCH_SourcePrimitiveResult {
		primitiveId: string;
	}
	class SCH_SourcePrimitiveArc {
		public add(options: ISCH_SourcePrimitiveArcAddOptions): Promise<TSCH_SourceResult<ISCH_SourcePrimitiveResult>>;
		public remove(options: ISCH_SourcePrimitiveIdOptions): Promise<TSCH_SourceResult<ISCH_SourcePrimitiveResult>>;
	}
	interface ISCH_SourcePrimitiveAttributeAddNetLabelOptions extends ISCH_SourceIdentity {
		net: string;
		x: number;
		y: number;
		rotation?: number;
		mirror?: boolean;
	}
	interface ISCH_SourcePrimitiveAttributeNetLabelResult {
		primitiveId: string;
		net: string;
	}
	interface ISCH_SourcePrimitiveAttributeUpdateNetLabelOptions extends ISCH_SourceIdentity {
		primitiveId: string;
		net?: string;
		x?: number;
		y?: number;
		rotation?: number;
	}
	class SCH_SourcePrimitiveAttribute {
		public addNetLabel(options: ISCH_SourcePrimitiveAttributeAddNetLabelOptions): Promise<TSCH_SourceResult<ISCH_SourcePrimitiveAttributeNetLabelResult>>;
		public updateNetLabel(options: ISCH_SourcePrimitiveAttributeUpdateNetLabelOptions): Promise<TSCH_SourceResult<ISCH_SourcePrimitiveAttributeNetLabelResult>>;
		public removeNetLabel(options: ISCH_SourcePrimitiveAttributeUpdateNetLabelOptions): Promise<TSCH_SourceResult<ISCH_SourcePrimitiveAttributeNetLabelResult>>;
	}
	interface ISCH_SourcePrimitiveCircleAddOptions extends ISCH_SourceIdentity {
		x: number;
		y: number;
		radius: number;
	}
	class SCH_SourcePrimitiveCircle {
		public add(options: ISCH_SourcePrimitiveCircleAddOptions): Promise<TSCH_SourceResult<ISCH_SourcePrimitiveResult>>;
		public remove(options: ISCH_SourcePrimitiveIdOptions): Promise<TSCH_SourceResult<ISCH_SourcePrimitiveResult>>;
	}
	interface ISCH_SourcePrimitiveComponentAddOptions extends ISCH_SourceIdentity {
		libraryUuid: string;
		name: string;
		x: number;
		y: number;
		designator?: string;
		rotation?: number;
		mirror?: boolean;
		subPartName?: string;
		properties?: { [key: string]: string };
	}
	interface ISCH_SourcePrimitiveComponentAddResult extends ISCH_SourcePrimitiveResult {
		designator: string;
	}
	enum ESCH_SourcePrimitiveComponentNetFlagType {
		 POWER = 'Power',
		 GROUND = 'Ground',
		 ANALOG_GROUND = 'AnalogGround',
		 PROTECT_GROUND = 'ProtectGround',
	}
	interface ISCH_SourcePrimitiveComponentAddNetFlagOptions extends ISCH_SourceIdentity {
		type: ESCH_SourcePrimitiveComponentNetFlagType;
		net: string;
		x: number;
		y: number;
		rotation?: number;
		mirror?: boolean;
	}
	interface ISCH_SourcePrimitiveComponentUpdateOptions extends ISCH_SourcePrimitiveIdOptions {
		designator?: string;
		x?: number;
		y?: number;
		rotation?: number;
		mirror?: boolean;
		properties?: { [key: string]: string };
	}
	interface ISCH_SourcePrimitiveComponentUpdateAttributeOptions extends ISCH_SourcePrimitiveIdOptions {
		key: string;
		valueVisible?: boolean;
		keyVisible?: boolean;
		x?: number;
		y?: number;
		rotation?: number;
	}
	interface ISCH_SourcePrimitiveComponentUpdateAttributeResult extends ISCH_SourcePrimitiveResult {
		key: string;
	}
	interface ISCH_SourcePrimitiveComponentReplaceOptions extends ISCH_SourcePrimitiveIdOptions {
		libraryUuid: string;
		name: string;
	}
	interface ISCH_SourcePrimitiveComponentRemoveOptions extends ISCH_SourcePrimitiveIdOptions {
		withWires?: boolean;
	}
	interface ISCH_SourcePrimitiveComponentRemoveResult extends ISCH_SourcePrimitiveResult {
		removedWires: number;
	}
	interface ISCH_SourcePrimitiveComponentGetOptions extends ISCH_SourceIdentity {
		primitiveId?: string;
		designator?: string;
	}
	interface ISCH_SourcePrimitiveComponentPinItem {
		pinId: string;
		pinNumber: string;
		pinName: string;
		x: number;
		y: number;
	}
	interface ISCH_SourcePrimitiveComponentDetail {
		primitiveId: string;
		designator: string;
		x: number;
		y: number;
		rotation: number;
		mirror: boolean;
		subPartName: string;
		properties: { [key: string]: string };
		pins: Array<ISCH_SourcePrimitiveComponentPinItem>;
	}
	class SCH_SourcePrimitiveComponent {
		public add(options: ISCH_SourcePrimitiveComponentAddOptions): Promise<TSCH_SourceResult<ISCH_SourcePrimitiveComponentAddResult>>;
		public addNetFlag(options: ISCH_SourcePrimitiveComponentAddNetFlagOptions): Promise<TSCH_SourceResult<ISCH_SourcePrimitiveResult>>;
		public update(options: ISCH_SourcePrimitiveComponentUpdateOptions): Promise<TSCH_SourceResult<ISCH_SourcePrimitiveComponentAddResult>>;
		public updateAttribute(options: ISCH_SourcePrimitiveComponentUpdateAttributeOptions): Promise<TSCH_SourceResult<ISCH_SourcePrimitiveComponentUpdateAttributeResult>>;
		public replace(options: ISCH_SourcePrimitiveComponentReplaceOptions): Promise<TSCH_SourceResult<ISCH_SourcePrimitiveComponentAddResult>>;
		public remove(options: ISCH_SourcePrimitiveComponentRemoveOptions): Promise<TSCH_SourceResult<ISCH_SourcePrimitiveComponentRemoveResult>>;
		public removeNetFlag(options: ISCH_SourcePrimitiveIdOptions): Promise<TSCH_SourceResult<ISCH_SourcePrimitiveResult>>;
		public get(options: ISCH_SourcePrimitiveComponentGetOptions): Promise<TSCH_SourceResult<ISCH_SourcePrimitiveComponentDetail>>;
	}
	interface ISCH_SourcePrimitivePolygonAddOptions extends ISCH_SourceIdentity {
		points: Array<Array<number>>;
	}
	class SCH_SourcePrimitivePolygon {
		public add(options: ISCH_SourcePrimitivePolygonAddOptions): Promise<TSCH_SourceResult<ISCH_SourcePrimitiveResult>>;
		public remove(options: ISCH_SourcePrimitiveIdOptions): Promise<TSCH_SourceResult<ISCH_SourcePrimitiveResult>>;
	}
	interface ISCH_SourcePrimitiveRectangleAddOptions extends ISCH_SourceIdentity {
		x: number;
		y: number;
		width: number;
		height: number;
		rotation?: number;
	}
	class SCH_SourcePrimitiveRectangle {
		public add(options: ISCH_SourcePrimitiveRectangleAddOptions): Promise<TSCH_SourceResult<ISCH_SourcePrimitiveResult>>;
		public remove(options: ISCH_SourcePrimitiveIdOptions): Promise<TSCH_SourceResult<ISCH_SourcePrimitiveResult>>;
	}
	interface ISCH_SourcePrimitiveTextAddOptions extends ISCH_SourceIdentity {
		text: string;
		x: number;
		y: number;
		rotation?: number;
	}
	class SCH_SourcePrimitiveText {
		public add(options: ISCH_SourcePrimitiveTextAddOptions): Promise<TSCH_SourceResult<ISCH_SourcePrimitiveResult>>;
		public remove(options: ISCH_SourcePrimitiveIdOptions): Promise<TSCH_SourceResult<ISCH_SourcePrimitiveResult>>;
	}
	interface ISCH_SourcePrimitiveWireAddOptions extends ISCH_SourceIdentity {
		line: Array<number> | Array<Array<number>>;
		net?: string;
	}
	interface ISCH_SourcePrimitiveWireAddResult extends ISCH_SourcePrimitiveResult {
		net: string;
	}
	interface ISCH_SourcePrimitiveWireRemovePinWiresOptions extends ISCH_SourcePrimitiveIdOptions {
		pinId: string;
	}
	interface ISCH_SourcePrimitiveWireRemovePinWiresResult {
		pinId: string;
		removedWires: number;
	}
	class SCH_SourcePrimitiveWire {
		public add(options: ISCH_SourcePrimitiveWireAddOptions): Promise<TSCH_SourceResult<ISCH_SourcePrimitiveWireAddResult>>;
		public remove(options: ISCH_SourcePrimitiveIdOptions): Promise<TSCH_SourceResult<ISCH_SourcePrimitiveResult>>;
		public removePinWires(options: ISCH_SourcePrimitiveWireRemovePinWiresOptions): Promise<TSCH_SourceResult<ISCH_SourcePrimitiveWireRemovePinWiresResult>>;
	}
	class SCH_Utils {
		public splitLines(lines: Array<number | Array<number>>): Array<Array<number | Array<number>>> | undefined;
	}
	class ISCH_PrimitiveObject implements ISCH_Primitive {
		private async: boolean;
		private readonly primitiveType: ESCH_PrimitiveType.OBJECT;
		private primitiveId?: string;
		private content: File | string;
		private startX: number;
		private startY: number;
		private width: number;
		private height: number;
		private rotation: number;
		private mirror: boolean;
		private fileName: string;
		public constructor(content: File | string, startX: number, startY: number, width?: number, height?: number, rotation?: number, mirror?: boolean, fileName?: string, primitiveId?: string);
		public create(): Promise<ISCH_PrimitiveObject>;
		public getState_PrimitiveType(): ESCH_PrimitiveType;
		public getState_PrimitiveId(): string;
		public getState_Content(): File | string;
		public getState_StartX(): number;
		public getState_StartY(): number;
		public getState_Width(): number;
		public getState_Height(): number;
		public getState_Rotation(): number;
		public getState_Mirror(): boolean;
		public getState_FileName(): string;
		public setState_Content(content: File | string): ISCH_PrimitiveObject;
		public setState_StartX(startX: number): ISCH_PrimitiveObject;
		public setState_StartY(startY: number): ISCH_PrimitiveObject;
		public setState_Width(width: number): ISCH_PrimitiveObject;
		public setState_Height(height: number): ISCH_PrimitiveObject;
		public setState_Rotation(rotation: number): ISCH_PrimitiveObject;
		public setState_Mirror(mirror: boolean): ISCH_PrimitiveObject;
		public setState_FileName(fileName: string): ISCH_PrimitiveObject;
		public toAsync(): ISCH_PrimitiveObject;
		public toSync(): ISCH_PrimitiveObject;
		public isAsync(): boolean;
		public reset(): Promise<ISCH_PrimitiveObject>;
		public done(): Promise<ISCH_PrimitiveObject>;
	}
	class SCH_PrimitiveObject implements ISCH_PrimitiveAPI {
		public create(content: File | string, startX: number, startY: number, width?: number, height?: number, rotation?: number, mirror?: boolean, fileName?: string): Promise<ISCH_PrimitiveObject | undefined>;
		public delete(primitiveIds: string | ISCH_PrimitiveObject | Array<string> | Array<ISCH_PrimitiveObject>): Promise<boolean>;
		public modify(primitiveId: string | ISCH_PrimitiveObject, property: { content?: File | string; startX?: number; startY?: number; width?: number; height?: number; rotation?: number; mirror?: boolean; fileName?: string }): Promise<ISCH_PrimitiveObject | undefined>;
		public get(primitiveIds: string): Promise<ISCH_PrimitiveObject | undefined>;
		public get(primitiveIds: Array<string>): Promise<Array<ISCH_PrimitiveObject>>;
		public getAllPrimitiveId(): Promise<Array<string>>;
		public getAll(): Promise<Array<ISCH_PrimitiveObject>>;
	}
	class SYS_ClientUrl {
		private extensionUuid?: string;
		public constructor(extensionUuid?: string);
		public request(url: string, method?: 'GET' | 'POST' | 'HEAD' | 'PUT' | 'DELETE' | 'PATCH', data?: string | Blob | FormData | URLSearchParams, options?: { headers?: { [header: string]: any }; integrity?: string }, succeedCallFn?: (data: Response) => void | Promise<void>): Promise<Response>;
	}
	interface IconProps {
		iconUrl?: string;
		iconClass?: string;
	}
	interface ButtonProps {
		text?: string;
		disabled?: boolean;
		type?: 'default' | 'primary' | 'danger' | 'forbidden' | 'text';
		icon?: IconProps;
		triggerEnter?: boolean;
		onClick?: () => void;
	}
	interface ListChildren {
		title: string;
		id?: string;
		value?: string;
		clearBtn?: boolean;
		children?: ListChildren[];
		selected?: boolean;
		icons?: IconProps[];
	}
	interface InputProps {
		disabled?: boolean;
		readonly?: boolean;
		textAlign?: 'left' | 'center' | 'right';
		clearBtn?: boolean;
		clickBtn?: boolean;
		dropDownList?: ListChildren[];
		searchBtn?: boolean;
		value?: string;
		placeholder?: string;
		preText?: string;
		type: 'text' | 'telephone' | 'number' | 'password' | 'color' | 'email';
		otherAttr?: { [key: string]: string };
		testVal?: string;
		onClick?: () => void;
		onSearchClick?: (data: string) => void;
		onFilterClick?: (data: string) => void;
		onChange?: (data: string) => void;
		onAddClick?: (data: string) => void;
		onBlur?: (data: string) => void;
	}
	interface TextProps {
		value: string;
		fontFamily?: string;
		textAlign?: 'left' | 'center' | 'right';
		fontSize?: number;
		color?: string;
	}
	interface StyleProps {
		backgroundColor?: string;
		backgroundImage?: string;
		borderWidth?: number;
		borderColor?: string;
		borderStyle?: 'solid' | 'dashed' | 'dotted';
		hide?: boolean;
		color?: string;
		padding?: number[];
		margin?: number[];
		width?: number | '100%';
		height?: number | '100%';
		rotate?: number;
		cursor?: 'pointer' | 'default' | 'none' | 'move' | 'text';
		invisible?: boolean;
		display?: string;
	}
	interface FlexProps extends StyleProps {
		children?: any;
		direction?: 'column' | 'column-reverse' | 'row' | 'row-reverse';
		alignX?: 'start' | 'center' | 'end';
		alignY?: 'start' | 'center' | 'end' | 'stretch';
		gap?: number;
		classes?: string[];
		onClick?: () => void;
	}
	interface FlexItemProps extends StyleProps {
		children?: any;
		flexRatio?: number;
		onClick?: () => void;
	}
	interface GridProps extends StyleProps {
		children?: any;
		columns: number | (number | string)[];
		rowGap?: number;
		colGap?: number;
	}
	interface GridItemProps extends StyleProps {
		children?: any;
		colSpan?: number;
		rowSpan?: number;
		align?: 'start' | 'center' | 'end' | 'stretch';
	}
	interface ListProps {
		list: ListChildren[];
		itemHeight?: number;
		border?: boolean;
		expandEnable?: boolean;
		maxHeight?: number;
		onItemClick?: (id: string, item: ListChildren) => void;
		onItemDblclick?: (id: string) => void;
		onItemContextmenu?: (id: string) => void;
	}
	interface CheckBoxProps {
		checked?: boolean;
		disabled?: boolean;
		indeterminate?: boolean;
		text?: string;
		name?: string;
		onlyChangeByBox?: boolean;
		onChange?: (checked: boolean) => void;
	}
	interface RadioItem {
		disabled?: boolean;
		text: string;
		value: string;
	}
	interface RadioGroupProps {
		group: RadioItem[];
		selectedValue?: string;
		onlyChangeByBox?: boolean;
		lineBreak?: boolean;
		gap?: number;
		onChange?: (value: string) => void;
	}
	interface TextAreaProps {
		disabled?: boolean;
		value?: string;
		resizable?: { x?: boolean; y?: boolean };
		placeholder?: string;
		name?: string;
		onChange?: (value: string) => void;
	}
	interface SliderProps {
		value?: number;
		min?: number;
		max?: number;
		onChange?: (value: number) => void;
	}
	interface ModalProps {
		children?: any;
		top: number;
		left: number;
		width: number;
		height: number | 'auto';
		overlay?: boolean;
		maxDragX?: number;
		maxDragY?: number;
		hide?: boolean;
		resizeX?: boolean;
		resizeY?: boolean;
		onMoved?: (top: number, left: number) => void;
	}
	interface DialogProps {
		children?: any;
		title: string;
		width?: number;
		height?: number | 'auto';
		left?: number;
		top?: number;
		hide?: boolean;
		overlay?: boolean;
		maxDragY?: number;
		modal?: boolean;
		resizeX?: boolean;
		resizeY?: boolean;
		onClose?: () => void;
	}
	interface SlotProps {
		children?: any;
		name: string;
	}
	interface SelectListItem {
		title: string;
		value?: string;
		selected?: boolean;
		children?: SelectListItem[];
	}
	interface SelectProps {
		disabled?: boolean;
		readonly?: boolean;
		dropDownList?: SelectListItem[];
		value?: string;
		onChange?: (value: string) => void;
	}
	interface BoardProps {
		children?: any;
		padding?: number[];
		bgColor?: string;
		title: string;
		onClick?: () => void;
	}
	interface ImageProps {
		src: string;
		title?: string;
		onClick?: () => void;
	}
	interface ScrollerProps {
		children?: any;
		itemCount: number;
		itemHeight: number;
		buffer?: number;
		onVisibleRowsChange?: (visibleRows: { index: number; slotName: string }[]) => void;
	}
	interface ColorPickerProps {
		value?: string;
		disabled?: boolean;
		readonly?: boolean;
		onChange?: (color: string) => void;
		onDefault?: () => void;
	}
	type ColumnType = 'text' | 'number' | 'select' | 'checkbox' | 'date' | 'boolean';
	type Align = 'left' | 'center' | 'right';
	type FilterMatchMode = 'contains' | 'startsWith' | 'endsWith' | 'exact' | 'regex';
	interface ColumnEditTrigger {
		trigger: 'click' | 'doubleClick';
	}
	interface SelectOption {
		text: string;
		value: string | number;
		color?: string;
		disabled?: boolean;
	}
	interface ValidationRule {
		required?: boolean;
		message?: string;
		min?: number;
		max?: number;
		minLength?: number;
		maxLength?: number;
		pattern?: string;
	}
	type SerializablePrimitive = string | number | boolean | null;
	type Serializable = SerializablePrimitive | Serializable[] | { [key: string]: Serializable };
	interface ColumnDef<T = any> {
		key: keyof T & string;
		title: string;
		type?: ColumnType;
		width?: number | string;
		minWidth?: number;
		align?: Align;
		fixed?: 'left' | 'right';
		hidden?: boolean;
		sortable?: boolean;
		sortKey?: string | string[];
		sortType?: 'string' | 'number' | 'date';
		filterable?: boolean;
		filterMatchMode?: FilterMatchMode;
		resizable?: boolean;
		editable?: boolean | ColumnEditTrigger;
		selectList?: SelectOption[];
		mergeByField?: keyof T & string;
		rules?: ValidationRule[];
		slot?: string;
		slotProps?: Serializable;
		ellipsis?: boolean;
	}
	interface ColumnGroupDef<T = any> {
		type: 'group';
		key: string;
		title: string;
		align?: Align;
		fixed?: 'left' | 'right';
		children: ColumnDef<T>[];
	}
	type ColumnDefOrGroup<T = any> = ColumnDef<T> | ColumnGroupDef<T>;
	interface BorderConfig {
		horizontal?: boolean;
		vertical?: boolean;
		header?: boolean;
	}
	interface RowMetaConfig {
		bgColor?: string;
		noCheckbox?: boolean;
		disabledRow?: boolean;
		disabledCheckbox?: boolean;
	}
	type RichTableRow<T = any> = T & Partial<RowMetaConfig>;
	interface SelectionConfig {
		type: 'single' | 'multiple' | 'checkbox';
		selectedKeys?: string[];
		defaultSelectedKeys?: string[];
		selectOnRowClick?: boolean;
		ctrlSelect?: boolean;
		shiftSelect?: boolean;
		rangeSelect?: boolean;
		disabledSelectKeys?: string[];
		disabledCheckboxKeys?: string[];
		checkboxColumnWidth?: number;
		align?: Align;
		onChange?: (info: { selectedKeys: string[]; selectedRows: RichTableRow[]; detail: { action: 'select' | 'unselect' | 'selectAll' | 'clear'; row?: RichTableRow; triggerFromCheck?: boolean } }) => void;
	}
	type SortOrder = 'asc' | 'desc';
	interface SortState {
		columnKey: string;
		order: SortOrder;
	}
	interface SortingConfig {
		multiple?: boolean;
		remote?: boolean;
		state?: SortState[];
		defaultState?: SortState[];
		onChange?: (state: SortState[]) => void;
	}
	interface FilteringConfig {
		position?: 'inline' | 'popover';
		filters?: Record<string, string>;
		defaultFilters?: Record<string, string>;
		debounce?: number;
		caseSensitive?: boolean;
		placeholder?: string;
		onChange?: (filters: Record<string, string>) => void;
		onFilterCancel?: () => void;
	}
	interface InputEditConfig {
		type: 'input';
		inputType?: 'text' | 'number';
		placeholder?: string;
		maxLength?: number;
		onChange?: (value: string) => void;
		onConfirm?: (value: string) => void;
	}
	interface NumberEditConfig {
		type: 'number';
		min?: number;
		max?: number;
		step?: number;
		precision?: number;
		placeholder?: string;
		onChange?: (value: number) => void;
		onConfirm?: (value: number) => void;
	}
	interface SelectEditConfig {
		type: 'select';
		options: SelectOption[];
		searchable?: boolean;
		multiple?: boolean;
		placeholder?: string;
		disabled?: boolean;
		onChange?: (value: string | number | Array<string | number>) => void;
	}
	interface TextareaEditConfig {
		type: 'textarea';
		rows?: number;
		maxLength?: number;
		placeholder?: string;
		onChange?: (value: string) => void;
		onConfirm?: (value: string) => void;
	}
	interface CheckboxEditConfig {
		type: 'checkbox';
		checkedValue?: any;
		uncheckedValue?: any;
		disabled?: boolean;
		onChange?: (checked: boolean) => void;
	}
	type ColumnEditConfig = InputEditConfig | NumberEditConfig | SelectEditConfig | TextareaEditConfig | CheckboxEditConfig;
	interface EditingConfig {
		trigger?: 'click' | 'doubleClick';
		editingRowIndices?: number[];
		setEditingRowIndex?: (index: number) => void;
		columns?: Record<string, ColumnEditConfig>;
		onChange?: (info: { rowKey: string; colKey: string; value: any }) => void;
		onConfirm?: (info: { rowKey: string; colKey: string; value: any }) => void;
	}
	type CellContentType = 'TEXT' | 'INPUT' | 'TEXTAREA' | 'SELECT' | 'CHECKBOX';
	interface ClipboardCellData {
		contentType: CellContentType;
		subType?: string;
		value: any;
		text: string;
	}
	interface CellCoord {
		rowKey: string;
		colKey: string;
	}
	interface ClipboardConfig {
		shortcuts?: { copy?: string; paste?: string; cut?: string };
		onCopy?: (data: ClipboardCellData[][]) => void;
		onPaste?: (data: ClipboardCellData[][], targetCell: CellCoord) => void;
	}
	interface KeyboardConfig {
		useExcelDefaults?: boolean;
	}
	interface VirtualScrollConfig {
		overscan?: number;
		onScrollToEnd?: () => void;
		scrollEndThreshold?: number;
	}
	interface ColumnResizeConfig {
		minWidth?: number;
		persist?: boolean;
		storageKey?: string;
		onChange?: (info: { colKey: string; width: number }) => void;
	}
	interface DragSortConfig {
		handle?: 'drag-column' | 'row';
		showDragIcon?: boolean;
		onDragEnd?: (info: { fromIndices: number | number[]; toIndex: number; currentIndices: number | number[] }) => void;
	}
	interface FixedColumnConfig {
		left?: number;
		right?: number;
	}
	interface CustomHeaderConfig {
		availableColumns: ColumnDef[];
		visibleKeys: string[];
		onChange: (visibleKeys: string[]) => void;
		persist?: boolean;
		storageKey?: string;
	}
	interface CellClickInfo<T = any> {
		row: T;
		rowIndex: number;
		colKey: string;
		value: any;
	}
	type DataChangeType = 'NORMAL' | 'CHECKED' | 'ASC_SORT' | 'DESC_SORT';
	interface CheckChangeDetail {
		trigger: 'rowsUpdate' | 'checkListUpdate' | 'user';
		row?: Record<string, any>;
	}
	interface RichTableProps<T extends Record<string, any> = Record<string, any>> {
		columns: ColumnDefOrGroup<T>[];
		data: T[];
		rowKey?: keyof T | ((row: T, index: number) => string);
		height?: number | string;
		width?: number | string;
		rowHeight?: number;
		headHeight?: number;
		showHeader?: boolean;
		fixedHeader?: boolean;
		striped?: boolean;
		border?: boolean | BorderConfig;
		textAlign?: Align;
		showRowNumber?: boolean;
		rowHighlightOnHover?: boolean;
		selection?: SelectionConfig | true;
		sorting?: SortingConfig | true;
		filtering?: FilteringConfig | true;
		editing?: EditingConfig;
		clipboard?: ClipboardConfig | true;
		keyboard?: KeyboardConfig | true;
		virtualScroll?: VirtualScrollConfig | true;
		columnResize?: ColumnResizeConfig | true;
		dragSort?: DragSortConfig | true;
		fixedColumns?: FixedColumnConfig;
		customHeader?: CustomHeaderConfig;
		searchHighlight?: string;
		onRowClick?: (info: { row: T; index: number }) => void;
		onRowDoubleClick?: (info: { row: T; index: number }) => void;
		onCellClick?: (info: CellClickInfo<T>) => void;
		onRowMouseEnter?: (info: { row: T; index: number }) => void;
		onRowMouseLeave?: (info: { row: T; index: number }) => void;
		onRowContextMenu?: (info: { row: T; index: number }) => void;
		onHeaderContextMenu?: (colKey: string) => void;
		onDataChange?: (info: { data: T[]; changedRow?: T; type?: DataChangeType }) => void;
		onCheckChange?: (info: { checkedRows: T[]; checkedKeys: string[]; detail: CheckChangeDetail }) => void;
		onAllChecked?: (info: { data: T[]; checked: boolean }) => void;
		onSortChange?: (sort: SortState[]) => void;
		onFilterChange?: (filters: Record<string, string>) => void;
		onSelectionChange?: (info: { selectedKeys: string[]; selectedRows: T[] }) => void;
		onEditCommit?: (info: { row: T; colKey: string; value: any; oldValue: any }) => void;
		onEditStateChange?: (cell: CellCoord | null) => void;
		onDragMoveEnd?: (info: { fromIndices: number | number[]; toIndex: number; currentIndices: number | number[] }) => void;
		onColSizeChange?: (info: { colKey: string; width: number }) => void;
		onError?: (info: { message: string }) => void;
		emptyText?: string;
		loading?: boolean;
		className?: string;
		style?: Record<string, string | number>;
		tableBodyStyle?: Record<string, string>;
	}
	interface ComponentPropsMap {
		Button: ButtonProps;
		Input: InputProps;
		Text: TextProps;
		Flex: FlexProps;
		FlexItem: FlexItemProps;
		Grid: GridProps;
		GridItem: GridItemProps;
		List: ListProps;
		CheckBox: CheckBoxProps;
		RadioGroup: RadioGroupProps;
		TextArea: TextAreaProps;
		Slider: SliderProps;
		Modal: ModalProps;
		Dialog: DialogProps;
		Slot: SlotProps;
		Select: SelectProps;
		Board: BoardProps;
		Image: ImageProps;
		Scroller: ScrollerProps;
		ColorPicker: ColorPickerProps;
		RichTable: RichTableProps;
	}
	interface IDesignPortal<T extends keyof ComponentPropsMap = keyof ComponentPropsMap> {
		createComponent(handle: string, type: T, props: ComponentPropsMap[T], eventDispatcher: (ev: any) => void, parent?: string): void;
		updateComponent(handle: string, type: T, props: ComponentPropsMap[T], eventDispatcher: (ev: any) => void): void;
		detachComponent(handle: string): void;
	}
	class SYS_Dialog {
		public createDesignPortal(): IDesignPortal;
		public showInformationMessage(content: string, title?: string, buttonTitle?: string): void;
		public showConfirmationMessage(content: string, title?: string, mainButtonTitle?: string, buttonTitle?: string, callbackFn?: (mainButtonClicked: boolean) => void): void;
		public showInputDialog(beforeContent?: string, afterContent?: string, title?: string, type?: 'color' | 'date' | 'datetime-local' | 'email' | 'mouth' | 'number' | 'password' | 'tel' | 'text' | 'time' | 'url' | 'week', value?: string | number, otherProperty?: { max?: number; maxlength?: number; min?: number; minlength?: number; multiple?: boolean; pattern?: RegExp; placeholder?: string; readonly?: boolean; step?: number }, callbackFn?: (value: any) => void): void;
		public showSelectDialog(options: Array<string> | Array<{ value: string; displayContent: string }>, beforeContent?: string, afterContent?: string, title?: string, defaultOption?: string, multiple?: false, callbackFn?: (value: string) => void | Promise<void>): void;
		public showSelectDialog(options: Array<string> | Array<{ value: string; displayContent: string }>, beforeContent?: string, afterContent?: string, title?: string, defaultOption?: Array<string>, multiple?: true, callbackFn?: (value: Array<string>) => void | Promise<void>): void;
		public insertScriptToDialog(dialogId: string, scriptFunction: (...args: Array<any>) => void | Promise<void>, ...args: Array<any>): void;
	}
	class SYS_Environment {
		public isWeb(): boolean;
		public isClient(): boolean;
		public isEasyEDAProEdition(): boolean;
		public isJLCEDAProEdition(): boolean;
		public isProPrivateEdition(): boolean;
		public isOnlineMode(): boolean;
		public isHalfOfflineMode(): boolean;
		public isOfflineMode(): boolean;
		public getEditorCurrentVersion(onlySemantic?: boolean): string;
		public isEditorCurrentVersionGreaterThanOrEqual(version: string): boolean;
		public isEditorCurrentVersionLessThanOrEqual(version: string): boolean;
		public getEditorCompliedDate(): string;
		public getUserInfo(): { username?: string; nickname?: string; avatar?: string; uuid?: string; customerCode?: string };
		public setKeepProjectHasOnlyOneBoard(status?: boolean): Promise<void>;
	}
	enum ESYS_ProgressBarAction {
		 START = 'start',
		 UPDATE = 'update',
		 COMPLETE = 'complete',
		 CLOSE = 'close',
		 DESTROY = 'destroy',
	}
	interface ISYS_ProgressBarEventProps {
		progressBarId: string;
		title?: string;
		progress: number;
		action: ESYS_ProgressBarAction;
	}
	class SYS_Event {
		private extensionUuid?: string;
		public constructor(extensionUuid?: string);
		public addProgressBarEventListener(id: string, callFn: (props: ISYS_ProgressBarEventProps) => void | Promise<void>, onlyOnce?: boolean, actions?: ESYS_ProgressBarAction[]): void;
		public removeEventListener(id: string): boolean;
		public isEventListenerAlreadyExist(id: string): boolean;
	}
	interface ISYS_ExternalApiHelp {
		title?: string;
		description?: string;
		params?: Array<{ name: string; type?: string; description?: string; required?: boolean }>;
		returns?: { type?: string; description?: string };
		example?: string;
	}
	class SYS_ExternalApi {
		private extensionUuid: string;
		public constructor(extensionUuid: string);
		public register(namespace: string, apiName: string, callFn: (...args: any[]) => any | Promise<any>, help?: ISYS_ExternalApiHelp): void;
		public unregister(namespace: string, apiName: string): boolean;
	}
	enum ESYS_ImportProjectImportOption {
		 IMPORT_DOCUMENT = 'ImportDocument',
		 EXTRACT_LIBRARIES = 'ExtractLibraries',
		 IMPORT_DOCUMENT_EXTRACT_LIBRARIES = 'ImportDocumentExtractLibraries',
	}
	enum ESYS_ImportProjectSchematicObjectStyle {
		 USE_SYSTEM_THEME = 'system',
		 USE_SOURCE_FILE_STYLE = 'custom',
	}
	enum ESYS_ImportProjectViaSolderMaskExpansion {
		 ALL_COVER_OIL = 'cover',
		 FOLLOW_ORIGINAL_SETTING = 'custom',
	}
	enum ESYS_ImportProjectBoardOutlineSource {
		 FROM_KEEPOUT_LAYER = 'keepout',
		 FROM_MECHANICAL_LAYER_1 = 'mechanical',
	}
	enum ESYS_LibraryFileImportMode {
		 CREATE = 'create',
		 OVERWRITE = 'overwrite',
	}
	interface ILIB_LibraryFileImportResult {
		libraryUuid: string;
		libraryName: string;
		mode: ESYS_LibraryFileImportMode;
		devices: Array<ILIB_LibraryInfo>;
		symbols: Array<ILIB_LibraryInfo>;
		footprints: Array<ILIB_LibraryInfo>;
		models3D: Array<ILIB_LibraryInfo>;
		cbbs: Array<ILIB_LibraryInfo>;
		panelLibraries: Array<ILIB_LibraryInfo>;
	}
	class SYS_FileManager {
		private extensionUuid?: string;
		public constructor(extensionUuid?: string);
		public getProjectFile(fileName?: string, password?: string, fileType?: 'epro' | 'epro2'): Promise<File | undefined>;
		public getDocumentFile(fileName?: string, password?: string, fileType?: 'epro' | 'epro2'): Promise<File | undefined>;
		public getSchematicFile(fileName?: string, password?: string, fileType?: 'epro' | 'epro2'): Promise<File | undefined>;
		public getDocumentSource(): Promise<string | undefined>;
		public getDocumentFootprintSources(): Promise<Array<{ footprintUuid: string; documentSource: string }>>;
		public setDocumentSource(source: string): Promise<boolean>;
		public getProjectFileByProjectUuid(projectUuid: string, fileName?: string, password?: string, fileType?: 'epro' | 'epro2'): Promise<File | undefined>;
		public getDeviceFileByDeviceUuid(deviceUuid: string | Array<string>, libraryUuid?: string, fileType?: 'elibz' | 'elibz2'): Promise<File | undefined>;
		public getSymbolFileBySymbolUuid(symbolUuid: string | Array<string>, libraryUuid?: string, fileType?: 'elibz' | 'elibz2'): Promise<File | undefined>;
		public getFootprintFileByFootprintUuid(footprintUuid: string | Array<string>, libraryUuid?: string, fileType?: 'elibz' | 'elibz2'): Promise<File | undefined>;
		public getCbbFileByCbbUuid(cbbUuid: string, libraryUuid?: string, props?: { fileName?: string; password?: string; fileType?: 'epro' | 'epro2'; templateSchematicUuid?: string; templatePcbUuid?: string }): Promise<File | undefined>;
		public getPanelLibraryFileByPanelLibraryUuid(panelLibraryUuid: string | Array<string>, libraryUuid?: string, fileType?: 'elibz' | 'elibz2'): Promise<File | undefined>;
		public importProjectByProjectFile(projectFile: File, fileType?: 'JLCEDA' | 'JLCEDA Pro' | 'EasyEDA' | 'EasyEDA Pro' | 'Allegro' | 'OrCAD' | 'EAGLE' | 'KiCad' | 'PADS' | 'LTspice', props?: { importOption?: ESYS_ImportProjectImportOption; schematicObjectStyle?: ESYS_ImportProjectSchematicObjectStyle; associateFootprint?: boolean; associate3DModel?: boolean; importFootprintNotesLayer?: boolean }, saveTo?: { operation: 'New Project'; newProjectOwnerTeamUuid: IDMT_TeamItem['uuid']; newProjectOwnerFolderUuid?: IDMT_FolderItem['uuid']; newProjectName?: string; newProjectFriendlyName?: string; newProjectDescription?: string; newProjectCollaborationMode?: EDMT_ProjectCollaborationMode } | { operation: 'Existing Project'; existingProjectUuid: IDMT_BriefProjectItem['uuid'] } | { operation: 'Offline Client Local Path'; folderPath: string; fileFormat?: EDMT_ProjectFileFormat }, librariesImportSetting?: { ownerTeamUuid: IDMT_TeamItem['uuid']; deviceClassification?: Array<string>; symbolClassification?: Array<string>; footprintClassification?: Array<string>; createDeviceForSingleSymbol?: boolean; updateExistingLibrariesWithTheSameName?: boolean }): Promise<IDMT_BriefProjectItem | undefined>;
		public importProjectByProjectFile(projectFile: File, fileType?: 'Altium Designer' | 'Protel', props?: { importOption?: ESYS_ImportProjectImportOption; viaSolderMaskExpansion?: ESYS_ImportProjectViaSolderMaskExpansion; boardOutlineSource?: ESYS_ImportProjectBoardOutlineSource; schematicObjectStyle?: ESYS_ImportProjectSchematicObjectStyle; associateFootprint?: boolean; associate3DModel?: boolean; importFootprintNotesLayer?: boolean }, saveTo?: { operation: 'New Project'; newProjectOwnerTeamUuid: IDMT_TeamItem['uuid']; newProjectOwnerFolderUuid?: IDMT_FolderItem['uuid']; newProjectName?: string; newProjectFriendlyName?: string; newProjectDescription?: string; newProjectCollaborationMode?: EDMT_ProjectCollaborationMode } | { operation: 'Existing Project'; existingProjectUuid: IDMT_BriefProjectItem['uuid'] } | { operation: 'Offline Client Local Path'; folderPath: string; fileFormat?: EDMT_ProjectFileFormat }, librariesImportSetting?: { ownerTeamUuid: IDMT_TeamItem['uuid']; deviceClassification?: Array<string>; symbolClassification?: Array<string>; footprintClassification?: Array<string>; createDeviceForSingleSymbol?: boolean; updateExistingLibrariesWithTheSameName?: boolean }): Promise<IDMT_BriefProjectItem | undefined>;
		public extractProjectInfo(data: File): Promise<any>;
		public extractLibInfo(data: File | Array<File>): Promise<any>;
		public importLibrary(libraryUuid: string, libraryFile: File): Promise<ILIB_LibraryFileImportResult | undefined>;
		public importLibraryByProjectUuid(projectUuid: string, libraryFile: File): Promise<ILIB_LibraryFileImportResult | undefined>;
	}
	interface ISYS_FileSystemFileList {
		fileName: string;
		isDirectory: boolean;
		subFiles?: Array<ISYS_FileSystemFileList>;
		relativePath?: string;
		fullPath: string;
	}
	class SYS_FileSystem {
		private extensionUuid?: string;
		public constructor(extensionUuid?: string);
		public getExtensionFile(uri: string): Promise<File | undefined>;
		public openReadFileDialog(filenameExtensions?: string | Array<string>, multiFiles?: true): Promise<Array<File> | undefined>;
		public openReadFileDialog(filenameExtensions?: string | Array<string>, multiFiles?: false): Promise<File | undefined>;
		public openReadFolderDialog(): Promise<Array<{ relativePath: string; file: File }>>;
		public openReadFilePathDialog(filenameExtensions?: string | Array<string>, multiFiles?: true): Promise<Array<string>>;
		public openReadFilePathDialog(filenameExtensions?: string | Array<string>, multiFiles?: false): Promise<string | undefined>;
		public openReadFolderPathDialog(): Promise<string | undefined>;
		public saveFile(fileData: File | Blob, fileName?: string): Promise<void>;
		public readFileFromFileSystem(uri: string): Promise<File | undefined>;
		public saveFileToFileSystem(uri: string, fileData: File | Blob, fileName?: string): Promise<boolean>;
		public listFilesOfFileSystem(folderPath: string, recursive?: boolean): Promise<Array<ISYS_FileSystemFileList>>;
		public deleteFileInFileSystem(uri: string, force?: boolean): Promise<boolean>;
		public createDirectoryInFileSystem(folderPath: string): Promise<boolean>;
		public existsPathInFileSystem(uri: string): Promise<boolean>;
		public getEdaPath(): Promise<string>;
		public getDocumentsPath(): Promise<string>;
		public getLibrariesPaths(): Promise<Array<string>>;
		public getProjectsPaths(): Promise<Array<string>>;
		public createObjectURL(blob: Blob | File): string;
		public revokeObjectURL(url: string): void;
	}
	class SYS_FontManager {
		public getFontsList(): Promise<Array<string>>;
		public addFont(fontName: string): Promise<boolean>;
		public deleteFont(fontName: string): Promise<boolean>;
	}
	class SYS_FormatConversion {
		public convertAltiumDesignerLibrariesToEasyEDASingleFile(file: File | Array<File>): Promise<File | undefined>;
		public convertAltiumDesignerLibrariesToEasyEDAMultiFiles(file: File | Array<File>): Promise<Array<File>>;
		public convertDisaLibrariesToEasyEDASingleFile(file: File | Array<File>): Promise<File | undefined>;
		public convertDisaLibrariesToEasyEDAMultiFiles(file: File | Array<File>): Promise<Array<File>>;
	}
	type TSYS_ShortcutKeys = Array<'SHIFT' | 'LEFT_SHIFT' | 'RIGHT_SHIFT' | 'FN' | 'ALT' | 'LEFT_ALT' | 'RIGHT_ALT' | 'CONTROL' | 'LEFT_CONTROL' | 'RIGHT_CONTROL' | 'COMMAND' | 'WIN' | 'OPTION' | 'SUPER' | 'TAB' | 'SPACE' | 'UP' | 'DOWN' | 'LEFT' | 'RIGHT' | 'F1' | 'F2' | 'F3' | 'F4' | 'F5' | 'F6' | 'F7' | 'F8' | 'F9' | 'F10' | 'F11' | 'F12' | 'F13' | 'F14' | 'F15' | 'F16' | 'F17' | 'F18' | 'F19' | 'F20' | '`' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '0' | '-' | '=' | 'Q' | 'W' | 'E' | 'R' | 'T' | 'Y' | 'U' | 'I' | 'O' | 'P' | '[' | ']' | 'A' | 'S' | 'D' | 'F' | 'G' | 'H' | 'J' | 'K' | 'L' | ';' | '\'' | '\\' | 'Z' | 'X' | 'C' | 'V' | 'B' | 'N' | 'M' | ',' | '.' | '/'>;
	interface ISYS_HeaderMenuSub2MenuItem {
		id: string;
		title: string;
		icon?: string;
		registerFn?: string;
		shortcutKey?: TSYS_ShortcutKeys;
	}
	interface ISYS_HeaderMenuSub1MenuItem {
		id: string;
		title: string;
		icon?: string;
		registerFn?: string;
		shortcutKey?: TSYS_ShortcutKeys;
		menuItems?: Array<ISYS_HeaderMenuSub2MenuItem | null>;
	}
	interface ISYS_HeaderMenuTopMenuItem {
		id: string;
		title: string;
		menuItems?: Array<ISYS_HeaderMenuSub1MenuItem | null>;
	}
	interface ISYS_HeaderMenus {
		home?: Array<ISYS_HeaderMenuTopMenuItem>;
		blank?: Array<ISYS_HeaderMenuTopMenuItem>;
		schematic?: Array<ISYS_HeaderMenuTopMenuItem>;
		sch?: Array<ISYS_HeaderMenuTopMenuItem>;
		symbol?: Array<ISYS_HeaderMenuTopMenuItem>;
		pcb?: Array<ISYS_HeaderMenuTopMenuItem>;
		footprint?: Array<ISYS_HeaderMenuTopMenuItem>;
		pcbView?: Array<ISYS_HeaderMenuTopMenuItem>;
		panel?: Array<ISYS_HeaderMenuTopMenuItem>;
		panelLibrary?: Array<ISYS_HeaderMenuTopMenuItem>;
		panelView?: Array<ISYS_HeaderMenuTopMenuItem>;
		simulationSchematicNgspice?: Array<ISYS_HeaderMenuTopMenuItem>;
		simulationSchematicNGspice?: Array<ISYS_HeaderMenuTopMenuItem>;
		simulationSchematicSimulIDE?: Array<ISYS_HeaderMenuTopMenuItem>;
	}
	enum ESYS_HeaderMenuEnvironment {
		 HOME = 'home',
		 BLANK = 'blank',
		 SCHEMATIC = 'sch',
		 SYMBOL = 'symbol',
		 PCB = 'pcb',
		 FOOTPRINT = 'footprint',
		 PCB_VIEW = 'pcbView',
		 PANEL = 'panel',
		 PANEL_LIBRARY = 'panelLibrary',
		 PANEL_VIEW = 'panelView',
		 SIMULATION_SCHEMATIC_NGSPICE = 'simulationSchematicNgspice',
		 SIMULATION_SCHEMATIC_SIMULIDE = 'simulationSchematicSimulIDE',
	}
	class SYS_HeaderMenu {
		private extensionUuid?: string;
		public constructor(extensionUuid?: string);
		public insertHeaderMenus(headerMenus: ISYS_HeaderMenus): Promise<void>;
		public removeHeaderMenus(): void;
		public replaceHeaderMenus(headerMenus: ISYS_HeaderMenus): Promise<void>;
		public removeSystemHeaderMenuItem(id: Array<string>, props?: {
			 removeTheBeforeDivider?: boolean;
			 removeTheAfterDivider?: boolean;
		}): Promise<boolean>;
		public insertSystemHeaderMenuItem(env: ESYS_HeaderMenuEnvironment, id: Array<string>, props: {
			 title: string;
			 registerFn?: string;
			 icon?: string;
			 shortcutKey?: TSYS_ShortcutKeys;
			 menuItems?: Array<ISYS_HeaderMenuSub1MenuItem | ISYS_HeaderMenuSub2MenuItem | null>;
			 insertDividerBefore?: boolean;
			 insertDividerAfter?: boolean;
			 insertBefore?: string;
			 crossDividerWhenInsert?: boolean;
		}): Promise<string | undefined>;
		public insertSystemHeaderMenus(headerMenus: ISYS_HeaderMenus): void;
	}
	interface ISYS_HelpData {
		$schema?: string;
		$defs?: Record<string, any>;
	}
	interface ISYS_HelpClassSummary {
		title?: string;
		remarks?: string;
		visibility?: string;
		deprecated?: string;
		methods: Array<string | { name: string; comment?: string; visibility?: string }>;
		titles?: Record<string, string | undefined>;
	}
	interface ISYS_HelpAudienceEntry {
		role: string;
		note?: string;
	}
	interface ISYS_HelpMethodDetail {
		title?: string;
		remarks?: string;
		visibility?: string;
		recommendedFor?: Array<ISYS_HelpAudienceEntry>;
		notRecommendedFor?: Array<ISYS_HelpAudienceEntry>;
		params?: Array<{
			name: string;
			type?: string;
			description?: string;
			required?: boolean;
			 deprecated?: string;
		}>;
		returns?: { type?: string; description?: string };
		deprecated?: string;
		isAsync?: boolean;
		example?: string;
	}
	class SYS_Help {
		public help(namespace?: string, className?: string, methodName?: string): Promise<ISYS_HelpData | Record<string, any> | ISYS_HelpClassSummary | ISYS_HelpMethodDetail>;
	}
	type TSYS_LanguageKeyValuePairs = Record<string, string>;
	interface ISYS_MultilingualLanguagesData {
		[language: string]: TSYS_LanguageKeyValuePairs;
	}
	class SYS_I18n {
		private extensionUuid?: string;
		public constructor(extensionUuid?: string);
		public text(tag: string, namespace?: string, language?: string, ...args: Array<any>): string;
		public getCurrentLanguage(): Promise<string>;
		public getAllSupportedLanguages(): Array<string>;
		public isLanguageSupported(language: string): boolean;
		public importMultilingual(language: string, source: TSYS_LanguageKeyValuePairs): boolean;
		public importMultilingualLanguage(namespace: string, language: string, source: TSYS_LanguageKeyValuePairs): boolean;
		public importMultilingualNamespace(namespace: string, source: ISYS_MultilingualLanguagesData): boolean;
		public addLanguageChangedEventListener(id: string, callFn: (newLanguage: string, lastLanguage: string) => void | Promise<void>, onlyOnce: boolean): void;
		public removeEventListener(id: string): boolean;
		public isEventListenerAlreadyExist(id: string): boolean;
	}
	enum ESYS_PanelPosition {
		 LEFT = 'left',
		 RIGHT = 'right',
		 BOTTOM = 'bottom',
	}
	enum ESYS_PanelTab {
		 PROJECT_LIST = 'project_list',
		 PROJECT_DESIGN = 'projectDesign',
		 LIB_DESIGN = 'libDesign',
		 BASIC_LIBRARY = 'basicLibrary',
		 DEVICE_STANDARDIZATION = 'device-standardization',
		 SCH_ATTR = 'sch-attr',
		 SCH_FILTER = 'sch-filter',
		 PROJECT_ATTR = 'project-attr',
		 PANEL_LAYER = 'panel-layer',
		 PANEL_ATTR = 'panel-attr',
		 PANEL_FILTER = 'panel-filter',
		 PCB_LAYER = 'pcb-layer',
		 PCB_ATTR = 'pcb-attr',
		 PCB_SKETCHER_ATTR = 'pcb-sketcher-attr',
		 PCB_FILTER = 'pcb-filter',
		 PCB_2D_PREVIEW_ATTR = 'pcb2d-attr',
		 PCB_3D_PREVIEW_LAYER = 'pcb3d-layer',
		 PCB_3D_PREVIEW_ATTR = 'pcb3d-attr',
		 PANEL_3D_PREVIEW_LAYER = 'panel3d-layer',
		 PANEL_3D_PREVIEW_ATTR = 'panel3d-attr',
		 ANNOTATION = 'annotation',
		 LIBRARY = 'library',
		 LOG = 'log',
		 PCB_DRC = 'drcResult',
		 SCHEMATIC_DRC = 'schDrcResult',
		 FIND = 'findResult',
	}
	class SYS_IFrame {
		private extensionUuid?: string;
		public constructor(extensionUuid?: string);
		public openIFrameToPanel(id: string, htmlFileName: string, position: ESYS_PanelPosition, tab: ESYS_PanelTab, props?: {
			 closeButton?: boolean;
			 buttonCallbackFn?: (button: 'close') => void | Promise<void>;
			 onBeforeCloseCallFn?: () => boolean | undefined | Promise<boolean | undefined>;
			 title?: string;
		}): Promise<boolean>;
		public openIFrame(htmlFileName: string, width?: number, height?: number, id?: string, props?: {
			 maximizeButton?: boolean;
			 minimizeButton?: boolean;
			 minimizeStyle?: 'collapsed' | 'constricted';
			 buttonCallbackFn?: (button: 'close' | 'minimize' | 'maximize') => void | Promise<void>;
			 onBeforeCloseCallFn?: () => boolean | undefined | Promise<boolean | undefined>;
			 grayscaleMask?: boolean;
			 title?: string;
			 x?: number;
			 y?: number;
		}): Promise<boolean>;
		public closeIFrame(id?: string): Promise<boolean>;
		public hideIFrame(id?: string): Promise<boolean>;
		public showIFrame(id?: string): Promise<boolean>;
		public isIFrameAlreadyExist(id: string): Promise<boolean>;
		public modifyIFrame(id: string, props: {
			 title?: string;
			 width?: number;
			 height?: number;
			 x?: number;
			 y?: number;
		}): Promise<boolean>;
	}
	class SYS_LoadingAndProgressBar {
		public showProgressBar(progress?: number, title?: string): void;
		public destroyProgressBar(): void;
		public showLoading(): void;
		public destroyLoading(): void;
	}
	enum ESYS_LogType {
		 INFO = 'info',
		 WARNING = 'warn',
		 ERROR = 'error',
		 FATAL_ERROR = 'fatalError',
		 FIND = 'find',
		 REPLACE = 'replace',
		 OPEN_PROJECT = 'openProject',
	}
	interface ISYS_LogLine {
		timestamp: number;
		type: ESYS_LogType;
		message: string;
	}
	class SYS_Log {
		public add(message: string, type?: ESYS_LogType): void;
		public clear(): void;
		public export(types?: ESYS_LogType | Array<ESYS_LogType>): void;
		public sort(types?: ESYS_LogType | Array<ESYS_LogType>): Promise<Array<ISYS_LogLine>>;
		public find(message: string | Array<string | { text: string; attr?: { id?: string; path?: string; sheet?: string; pcbid?: string; type?: string } }>, types?: ESYS_LogType | Array<ESYS_LogType>): Promise<Array<ISYS_LogLine>>;
	}
	interface ISYS_MathPoint {
		x: number;
		y: number;
	}
	interface ISYS_MathPolygonWithHoles {
		outer: Array<ISYS_MathPoint>;
		holes: Array<Array<ISYS_MathPoint>>;
	}
	type TSYS_MathPolygonGroup = Array<ISYS_MathPolygonWithHoles>;
	type TSYS_MathPolygonInput = Array<ISYS_MathPoint> | TPCB_PolygonSourceArray | IPCB_Polygon | IPCB_ComplexPolygon | TSYS_MathPolygonGroup;
	interface ISYS_MathBBox {
		minX: number;
		minY: number;
		maxX: number;
		maxY: number;
	}
	class SYS_Math {
		public containsPoint(polygon: TSYS_MathPolygonInput, point: ISYS_MathPoint): boolean;
		public distanceToPoint(polygon: TSYS_MathPolygonInput, point: ISYS_MathPoint): number;
		public intersects(polygon1: TSYS_MathPolygonInput, polygon2: TSYS_MathPolygonInput): boolean;
		public contains(polygon1: TSYS_MathPolygonInput, polygon2: TSYS_MathPolygonInput): boolean;
		public getBBox(polygon: TSYS_MathPolygonInput): ISYS_MathBBox;
		public bboxIntersects(bbox1: ISYS_MathBBox, bbox2: ISYS_MathBBox): boolean;
		public calculateArea(polygon: TSYS_MathPolygonInput): number;
		public calculatePerimeter(polygon: TSYS_MathPolygonInput): number;
		public getCentroid(polygon: TSYS_MathPolygonInput): ISYS_MathPoint;
		public translate(polygon: TSYS_MathPolygonInput, dx: number, dy: number): Array<ISYS_MathPoint>;
		public rotate(polygon: TSYS_MathPolygonInput, angle: number, centerX?: number, centerY?: number): Array<ISYS_MathPoint>;
		public scale(polygon: TSYS_MathPolygonInput, scaleX: number, scaleY?: number, centerX?: number, centerY?: number): Array<ISYS_MathPoint>;
		public union(polygon1: TSYS_MathPolygonInput, polygon2: TSYS_MathPolygonInput): TSYS_MathPolygonGroup;
		public subtract(polygon1: TSYS_MathPolygonInput, polygon2: TSYS_MathPolygonInput): TSYS_MathPolygonGroup;
		public intersection(polygon1: TSYS_MathPolygonInput, polygon2: TSYS_MathPolygonInput): TSYS_MathPolygonGroup;
		public xor(polygon1: TSYS_MathPolygonInput, polygon2: TSYS_MathPolygonInput): TSYS_MathPolygonGroup;
		private normalizeToPoints(input: TSYS_MathPolygonInput): Array<ISYS_MathPoint>;
		private normalizeToD3Polygon(input: TSYS_MathPolygonInput): Array<[number, number]>;
		private normalizeToMartinez(input: TSYS_MathPolygonInput): Array<Array<Array<number>>>;
	}
	enum ESYS_ToastMessageType {
		 ERROR = 'error',
		 WARNING = 'warn',
		 INFO = 'info',
		 SUCCESS = 'success',
		 ASK = 'question',
	}
	enum ESYS_BottomPanelTab {
		 LIBRARY = 'library',
		 LOG = 'log',
		 PCB_DRC = 'drcResult',
		 SCHEMATIC_DRC = 'schDrcResult',
		 FIND = 'findResult',
	}
	class SYS_Message {
		public showToastMessage(message: string, messageType?: ESYS_ToastMessageType, timer?: number, bottomPanel?: ESYS_BottomPanelTab, buttonTitle?: string, buttonCallbackFn?: string, id?: string): void;
		public updateToastMessage(id: string, message: string): void;
		public closeToastMessage(id: string): void;
		public showFollowMouseTip(tip: string, msTimeout?: number): Promise<void>;
		public removeFollowMouseTip(tip?: string): Promise<void>;
	}
	class SYS_MessageBox {
		public showInformationMessage(content: string, title?: string, buttonTitle?: string): void;
		public showConfirmationMessage(content: string, title?: string, mainButtonTitle?: string, buttonTitle?: string, callbackFn?: (mainButtonClicked: boolean) => void): void;
	}
	interface ISYS_MessageBusTask {
		cancel: () => void;
		running: () => boolean;
		execute: (message: any) => Promise<void>;
	}
	class SYS_MessageBus {
		private extensionUuid?: string;
		public constructor(extensionUuid?: string);
		public createPrivateMessageBus(): void;
		public removePrivateMessageBus(): void;
		public push(topic: string, message: any): void;
		public pushPublic(topic: string, message: any): void;
		public pull(topic: string, callbackFn: (message: any) => void): ISYS_MessageBusTask;
		public pullPublic(topic: string, callbackFn: (message: any) => void): ISYS_MessageBusTask;
		public pullAsync(topic: string): Promise<any>;
		public pullAsyncPublic(topic: string): Promise<any>;
		public publish(topic: string, message: any): void;
		public publishPublic(topic: string, message: any): void;
		public subscribe(topic: string, callbackFn: (message: any) => void): ISYS_MessageBusTask;
		public subscribePublic(topic: string, callbackFn: (message: any) => void): ISYS_MessageBusTask;
		public subscribeOnce(topic: string, callbackFn: (message: any) => void): ISYS_MessageBusTask;
		public subscribeOncePublic(topic: string, callbackFn: (message: any) => void): ISYS_MessageBusTask;
		public rpcCall(topic: string, message?: any, timeout?: number): Promise<any>;
		public rpcCallPublic(topic: string, message?: any, timeout?: number): Promise<any>;
		public rpcService(topic: string, callbackFn: (...args: Array<any>) => any | Promise<any>): void;
		public rpcServicePublic(topic: string, callbackFn: (...args: Array<any>) => any | Promise<any>): void;
	}
	enum ESYS_LeftPanelTab {
		 PROJECT_LIST = 'project_list',
		 PROJECT_DESIGN = 'projectDesign',
		 LIB_DESIGN = 'libDesign',
		 BASIC_LIBRARY = 'basicLibrary',
		 DEVICE_STANDARDIZATION = 'device-standardization',
	}
	enum ESYS_RightPanelTab {
		 SCH_ATTR = 'sch-attr',
		 SCH_FILTER = 'sch-filter',
		 PROJECT_ATTR = 'project-attr',
		 PANEL_LAYER = 'panel-layer',
		 PANEL_ATTR = 'panel-attr',
		 PANEL_FILTER = 'panel-filter',
		 PCB_LAYER = 'pcb-layer',
		 PCB_ATTR = 'pcb-attr',
		 PCB_SKETCHER_ATTR = 'pcb-sketcher-attr',
		 PCB_FILTER = 'pcb-filter',
		 PCB_2D_PREVIEW_ATTR = 'pcb2d-attr',
		 PCB_3D_PREVIEW_LAYER = 'pcb3d-layer',
		 PCB_3D_PREVIEW_ATTR = 'pcb3d-attr',
		 PANEL_3D_PREVIEW_LAYER = 'panel3d-layer',
		 PANEL_3D_PREVIEW_ATTR = 'panel3d-attr',
		 ANNOTATION = 'annotation',
	}
	class SYS_PanelControl {
		public openLeftPanel(tab?: ESYS_LeftPanelTab): void;
		public closeLeftPanel(): void;
		public toggleLeftPanelLockState(state?: boolean): void;
		public isLeftPanelLocked(): Promise<boolean>;
		public openRightPanel(tab?: ESYS_RightPanelTab): void;
		public closeRightPanel(): void;
		public toggleRightPanelLockState(state?: boolean): void;
		public isRightPanelLocked(): Promise<boolean>;
		public openBottomPanel(tab?: ESYS_BottomPanelTab): void;
		public closeBottomPanel(): void;
		public toggleBottomPanelLockState(state?: boolean): void;
		public isBottomPanelLocked(): Promise<boolean>;
	}
	enum ESYS_RightClickMenuTarget {
		 BOTTOM_PANEL_DEVICE_LIST_ITEM = 'bottomPanelDeviceListItem',
		 BOTTOM_PANEL_SYMBOL_LIST_ITEM = 'bottomPanelSymbolListItem',
		 BOTTOM_PANEL_FOOTPRINT_LIST_ITEM = 'bottomPanelFootprintListItem',
		 BOTTOM_PANEL_CBB_LIST_ITEM = 'bottomPanelCbbListItem',
		 BOTTOM_PANEL_3D_MODEL_LIST_ITEM = 'bottomPanel3DModelListItem',
		 BOTTOM_PANEL_PANEL_LIBRARY_LIST_ITEM = 'bottomPanelPanelLibraryListItem',
		 BOTTOM_PANEL_SIMULATION_MODEL_LIST_ITEM = 'bottomPanelSimulationModelListItem',
		 LEFT_TREE_PROJECT = 'leftTreeProject',
		 LEFT_TREE_FOLDER = 'leftTreeFolder',
		 LEFT_TREE_BLANK = 'leftTreeBlank',
	}
	class SYS_RightClickMenu {
		private extensionUuid?: string;
		public constructor(extensionUuid?: string);
		public changeMenu(menuId: string, menuItems: Array<ISYS_RightClickMenuItem | null>): Promise<void>;
		public getMenu(target: ESYS_RightClickMenuTarget): Promise<Array<ISYS_RightClickMenuItem | null>>;
		public insertMenuItem(target: ESYS_RightClickMenuTarget, menuItem: ISYS_RightClickMenuItem, position: ISYS_RightClickMenuItemPosition): Promise<boolean>;
		public updateMenuItem(target: ESYS_RightClickMenuTarget, menuItemId: string, patch: Partial<Omit<ISYS_RightClickMenuItem, 'id'>>): Promise<boolean>;
		public removeMenuItem(target: ESYS_RightClickMenuTarget, menuItemId: string): Promise<boolean>;
		public replaceMenu(target: ESYS_RightClickMenuTarget, menuItems: Array<ISYS_RightClickMenuItem | null>): Promise<boolean>;
		public resetMenu(target: ESYS_RightClickMenuTarget): Promise<boolean>;
	}
	class SYS_Setting {
		public restoreDefault(): Promise<boolean>;
		public getJLCColorSilkEnabled(): Promise<boolean>;
	}
	enum ESYS_ShortcutKeyEffectiveEditorRange {
		 BLANK = 0,
		 HOME = 1,
		 SCHEMATIC_PAGE = 2,
		 SYMBOL = 3,
		 PCB = 4,
		 FOOTPRINT = 5,
		 PANEL = 6,
		 PCB_3D_PREVIEW = 7,
		 PCB_2D_PREVIEW = 8,
		 PANEL_3D_PREVIEW = 9,
		 PANEL_LIBRARY = 10,
		 ASSEMBLY_VARIANT = 11,
		 SIMULATION_SCHEMATIC_PAGE_NGSPICE = 12,
		 SIMULATION_SCHEMATIC_PAGE_SIMULIDE = 13,
		 SIMULATION_WAVEFORM = 14,
	}
	enum ESYS_ShortcutKeyEffectiveEditorScene {
		 EDITOR = 1,
		 CANVAS_SELECTED = 2,
		 CANVAS_NOT_SELECT = 3,
		 DRAWING = 4,
		 PLACING = 5,
		 LOCAL = 6,
	}
	interface ISYS_ShortcutKeyData {
		shortcutKey: TSYS_ShortcutKeys | null;
		title: string;
		remark: string;
		range: Array<ESYS_ShortcutKeyEffectiveEditorRange>;
		scene: Array<ESYS_ShortcutKeyEffectiveEditorScene>;
	}
	interface ISYS_ShortcutKeyDataWithCallFn extends ISYS_ShortcutKeyData {
		callFn: () => void | Promise<void>;
	}
	interface ISYS_ShortcutKeyDataWithUserDefinedShortcutKey extends ISYS_ShortcutKeyData {
		userDefinedShortcutKey?: TSYS_ShortcutKeys | null;
	}
	class SYS_ShortcutKey {
		private extensionUuid?: string;
		public constructor(extensionUuid?: string);
		public registerShortcutKey(shortcutKey: TSYS_ShortcutKeys, title: string, callbackFn: (shortcutKey: TSYS_ShortcutKeys) => void | Promise<void>, documentType?: Array<ESYS_ShortcutKeyEffectiveEditorRange>, scene?: Array<ESYS_ShortcutKeyEffectiveEditorScene>): Promise<boolean>;
		public unregisterShortcutKey(shortcutKey: TSYS_ShortcutKeys): Promise<boolean>;
		public getShortcutKeys(includeSystem?: boolean): Promise<Array<{ shortcutKey: TSYS_ShortcutKeys; title: string; documentType: Array<ESYS_ShortcutKeyEffectiveEditorRange>; scene: Array<ESYS_ShortcutKeyEffectiveEditorScene> }>>;
		public register(id: string, props: ISYS_ShortcutKeyDataWithCallFn): boolean;
		public unregister(id: string): boolean;
		public get(id: string): ISYS_ShortcutKeyDataWithUserDefinedShortcutKey | undefined;
		public getAll(): Record<string, ISYS_ShortcutKeyDataWithUserDefinedShortcutKey>;
	}
	class SYS_Storage {
		private extensionUuid?: string;
		public constructor(extensionUuid?: string);
		public getExtensionAllUserConfigs(): Record<string, any>;
		public setExtensionAllUserConfigs(configs: Record<string, any>): Promise<boolean>;
		public clearExtensionAllUserConfigs(): Promise<boolean>;
		public getExtensionUserConfig(key: string): any | undefined;
		public setExtensionUserConfig(key: string, value: any): Promise<boolean>;
		public deleteExtensionUserConfig(key: string): Promise<boolean>;
	}
	class SYS_Timer {
		private extensionUuid?: string;
		public constructor(extensionUuid?: string);
		public setIntervalTimer(id: string, timeout: number, callFn: (...args: any) => void, ...args: any): boolean;
		public clearIntervalTimer(id: string): boolean;
		public setTimeoutTimer(id: string, timeout: number, callFn: (...args: any) => void, ...args: any): boolean;
		public clearTimeoutTimer(id: string): boolean;
	}
	class SYS_ToastMessage {
		public showMessage(message: string, messageType?: ESYS_ToastMessageType, timer?: number, bottomPanel?: ESYS_BottomPanelTab, buttonTitle?: string, buttonCallbackFn?: string): void;
	}
	type TSYS_ComparisonErrorCode = 'INVALID_PARAM' | 'SAME_PCB' | 'SAME_SCH' | 'PCB_NOT_FOUND' | 'SCH_NOT_FOUND' | 'COMPARISON_FAILED';
	interface ISYS_ComparisonResponse {
		success: boolean;
		data?: any;
		error?: { code: TSYS_ComparisonErrorCode; message: string };
	}
	class SYS_Tool {
		public netlistComparison(netlist1: string | { projectUuid: string; documentUuid: string } | File, netlist2: string | { projectUuid: string; documentUuid: string } | File): Promise<Array<{ type: 'Net' | 'Component'; object: string; netlist1Name: Array<string>; netlist2Name: Array<string> }>>;
		public schematicComparison(schematicUuid1: string, schematicUuid2: string): Promise<ISYS_ComparisonResponse>;
		public pcbComparison(pcb1: string | { projectUuid: string; pcbUuid: string } | File, pcb2: string | { projectUuid: string; pcbUuid: string } | File, options?: {
			 valUnit?: ESYS_Unit.MIL | ESYS_Unit.MILLIMETER | ESYS_Unit.INCH | ESYS_Unit.CENTIMETER;
			 deviation?: number;
			 comparisonSize?: number;
		}): Promise<ISYS_ComparisonResponse>;
	}
	class SYS_Unit {
		public getFrontendDataUnit(): Promise<ESYS_Unit | undefined>;
		public milToMm(mil: number, numberOfDecimals?: number): number;
		public milToInch(mil: number, numberOfDecimals?: number): number;
		public mmToMil(mm: number, numberOfDecimals?: number): number;
		public mmToInch(mm: number, numberOfDecimals?: number): number;
		public inchToMil(inch: number, numberOfDecimals?: number): number;
		public inchToMm(inch: number, numberOfDecimals?: number): number;
	}
	class SYS_WebSocket {
		private extensionUuid?: string;
		public constructor(extensionUuid?: string);
		public register(id: string, serviceUri: string, receiveMessageCallFn?: (event: MessageEvent<any>) => void | Promise<void>, connectedCallFn?: () => void | Promise<void>, protocols?: string | Array<string>): void;
		public send(id: string, data: string | Blob | BufferSource, extensionUuid?: string): void;
		public close(id: string, code?: number, reason?: string, extensionUuid?: string): void;
	}
	enum ESYS_WindowOpenTarget {
		 BLANK = '_blank',
		 SELF = '_self',
	}
	enum ESYS_WindowEventType {
		 BLUR = 'blur',
		 FOCUS = 'focus',
		 DROP = 'drop',
	}
	interface ISYS_WindowEventListenerRemovableObject {
		type: ESYS_WindowEventType;
		listener: (ev: any) => any;
		options?: { capture?: boolean };
	}
	enum ESYS_Theme {
		 LIGHT = 'light',
		 DARK = 'dark',
	}
	enum ESYS_StartPageQuickStartItem {
		 NEW_PROJECT = 'New Project',
		 OPEN_PROJECT = 'Open Project',
		 NEW_LIBRARY = 'New Library',
		 NEW_COMPONENT = 'New Component',
		 NEW_SYMBOL = 'New Symbol',
		 NEW_FOOTPRINT = 'New Footprint',
		 NEW_3D_MODEL = 'New 3D Model',
		 NEW_REUSE_BLOCK = 'New Reuse Block',
		 MIGRATE_STANDARD = 'Migrate Standard',
		 IMPORT_PROFESSIONAL = 'Import Professional',
		 IMPORT_STANDARD = 'Import Standard',
		 IMPORT_ALTIUM = 'Import Altium',
		 IMPORT_KICAD = 'Import KiCad',
		 IMPORT_OTHER = 'Import Other',
		 SETTING = 'Setting',
		 ABOUT = 'About',
	}
	class SYS_Window {
		private extensionUuid?: string;
		private static preventDefaultBound: boolean;
		private static preventDragOverFunc: (ev: DragEvent) => void;
		private static preventDropFunc: (ev: DragEvent) => void;
		public constructor(extensionUuid?: string);
		public open(url: string, target?: ESYS_WindowOpenTarget): void;
		public addEventListener(type: ESYS_WindowEventType, listener: (ev: any) => any, options?: { capture?: boolean; once?: boolean; passive?: boolean; signal?: AbortSignal }): ISYS_WindowEventListenerRemovableObject | undefined;
		public removeEventListener(removableObject: ISYS_WindowEventListenerRemovableObject): void;
		public static removeEventsForExtension(extensionUuid: string | undefined, type?: ESYS_WindowEventType): void;
		public openUI(uiName: string, args?: Record<string, any>): Promise<void>;
		public getCurrentTheme(): Promise<ESYS_Theme>;
		public getUrlParam(key: string): string | null;
		public getUrlAnchor(): string;
		public urlPushState(url: string): void;
		public urlReplaceState(url: string): void;
		public getViewportSize(): { width: number; height: number };
		public hideStartPageSupportFloatBarItems(): Promise<boolean>;
		public hideStartPageQuickStartItems(items: Array<ESYS_StartPageQuickStartItem>): Promise<boolean>;
	}
	class EDA {
		public dmt_Board: DMT_Board;
		public dmt_EditorControl: DMT_EditorControl;
		public dmt_Event: DMT_Event;
		public dmt_Folder: DMT_Folder;
		public dmt_Panel: DMT_Panel;
		public dmt_Pcb: DMT_Pcb;
		public dmt_Project: DMT_Project;
		public dmt_Schematic: DMT_Schematic;
		public dmt_SelectControl: DMT_SelectControl;
		public dmt_SourceBoard: DMT_SourceBoard;
		public dmt_SourcePcb: DMT_SourcePcb;
		public dmt_SourceProject: DMT_SourceProject;
		public dmt_SourceSchematic: DMT_SourceSchematic;
		public dmt_Team: DMT_Team;
		public dmt_Workspace: DMT_Workspace;
		public lib_3DModel: LIB_3DModel;
		public lib_Cbb: LIB_Cbb;
		public lib_Classification: LIB_Classification;
		public lib_Device: LIB_Device;
		public lib_Footprint: LIB_Footprint;
		public lib_LibrariesList: LIB_LibrariesList;
		public lib_PanelLibrary: LIB_PanelLibrary;
		public lib_SelectControl: LIB_SelectControl;
		public lib_SimulationModel: LIB_SimulationModel;
		public lib_Symbol: LIB_Symbol;
		public pcb_Document: PCB_Document;
		public pcb_Drc: PCB_Drc;
		public pcb_RightClickMenu: PCB_RightClickMenu;
		public pcb_Event: PCB_Event;
		public pcb_ImageTool: PCB_ImageTool;
		public pcb_Layer: PCB_Layer;
		public pcb_Tool: PCB_Tool;
		public pcb_ManufactureData: PCB_ManufactureData;
		public pcb_MathPolygon: PCB_MathPolygon;
		public pcb_Net: PCB_Net;
		public pcb_Primitive: PCB_Primitive;
		public pcb_PrimitiveArc: PCB_PrimitiveArc;
		public pcb_PrimitiveAttribute: PCB_PrimitiveAttribute;
		public pcb_PrimitiveComponent: PCB_PrimitiveComponent;
		public pcb_PrimitiveDimension: PCB_PrimitiveDimension;
		public pcb_PrimitiveFill: PCB_PrimitiveFill;
		public pcb_PrimitiveImage: PCB_PrimitiveImage;
		public pcb_PrimitiveLine: PCB_PrimitiveLine;
		public pcb_PrimitiveObject: PCB_PrimitiveObject;
		public pcb_PrimitivePad: PCB_PrimitivePad;
		public pcb_PrimitivePolyline: PCB_PrimitivePolyline;
		public pcb_PrimitivePour: PCB_PrimitivePour;
		public pcb_PrimitivePoured: PCB_PrimitivePoured;
		public pcb_PrimitiveRegion: PCB_PrimitiveRegion;
		public pcb_PrimitiveString: PCB_PrimitiveString;
		public pcb_PrimitiveVia: PCB_PrimitiveVia;
		public pcb_RayTracerEngine: PCB_RayTracerEngine;
		public pcb_SelectControl: PCB_SelectControl;
		public pnl_Combination: PNL_Combination;
		public pnl_Document: PNL_Document;
		public pnl_Drc: PNL_Drc;
		public pnl_EditControl: PNL_EditControl;
		public pnl_Event: PNL_Event;
		public pnl_Import: PNL_Import;
		public pnl_Primitive: PNL_Primitive;
		public pnl_Layer: PNL_Layer;
		public pnl_ManufactureData: PNL_ManufactureData;
		public pnl_SelectControl: PNL_SelectControl;
		public pnl_PrimitiveRectangle: PNL_PrimitiveRectangle;
		public pnl_PrimitiveEllipse: PNL_PrimitiveEllipse;
		public pnl_PrimitiveArc: PNL_PrimitiveArc;
		public pnl_PrimitivePath: PNL_PrimitivePath;
		public pnl_PrimitiveText: PNL_PrimitiveText;
		public pnl_PrimitiveImage: PNL_PrimitiveImage;
		public pnl_PrimitiveDimension: PNL_PrimitiveDimension;
		public pnl_PrimitiveAuxiliaryLine: PNL_PrimitiveAuxiliaryLine;
		public pnl_PrimitiveAuxiliaryPoint: PNL_PrimitiveAuxiliaryPoint;
		public sch_Document: SCH_Document;
		public sch_Drc: SCH_Drc;
		public sch_RightClickMenu: SCH_RightClickMenu;
		public sch_Event: SCH_Event;
		public sch_ManufactureData: SCH_ManufactureData;
		public sch_Net: SCH_Net;
		public sch_Netlist: SCH_Netlist;
		public sch_Primitive: SCH_Primitive;
		public sch_PrimitiveArc: SCH_PrimitiveArc;
		public sch_PrimitiveAttribute: SCH_PrimitiveAttribute;
		public sch_PrimitiveBus: SCH_PrimitiveBus;
		public sch_PrimitiveCircle: SCH_PrimitiveCircle;
		public sch_PrimitiveComponent: SCH_PrimitiveComponent;
		public sch_PrimitiveGenericPort: SCH_PrimitiveGenericPort;
		public sch_PrimitivePin: SCH_PrimitivePin;
		public sch_PrimitivePolygon: SCH_PrimitivePolygon;
		public sch_PrimitiveRectangle: SCH_PrimitiveRectangle;
		public sch_PrimitiveText: SCH_PrimitiveText;
		public sch_PrimitiveWire: SCH_PrimitiveWire;
		public sch_SelectControl: SCH_SelectControl;
		public sch_SimulationEngine: SCH_SimulationEngine;
		public sch_SourceDocument: SCH_SourceDocument;
		public sch_SourceDrc: SCH_SourceDrc;
		public sch_SourceNet: SCH_SourceNet;
		public sch_SourceNetlist: SCH_SourceNetlist;
		public sch_SourcePin: SCH_SourcePin;
		public sch_SourcePrimitiveArc: SCH_SourcePrimitiveArc;
		public sch_SourcePrimitiveAttribute: SCH_SourcePrimitiveAttribute;
		public sch_SourcePrimitiveCircle: SCH_SourcePrimitiveCircle;
		public sch_SourcePrimitiveComponent: SCH_SourcePrimitiveComponent;
		public sch_SourcePrimitivePolygon: SCH_SourcePrimitivePolygon;
		public sch_SourcePrimitiveRectangle: SCH_SourcePrimitiveRectangle;
		public sch_SourcePrimitiveText: SCH_SourcePrimitiveText;
		public sch_SourcePrimitiveWire: SCH_SourcePrimitiveWire;
		public sch_Utils: SCH_Utils;
		public sch_PrimitiveObject: SCH_PrimitiveObject;
		public sys_ClientUrl: SYS_ClientUrl;
		public sys_Dialog: SYS_Dialog;
		public sys_Environment: SYS_Environment;
		public sys_Event: SYS_Event;
		public sys_ExternalApi: SYS_ExternalApi;
		public sys_FileManager: SYS_FileManager;
		public sys_FileSystem: SYS_FileSystem;
		public sys_FontManager: SYS_FontManager;
		public sys_FormatConversion: SYS_FormatConversion;
		public sys_HeaderMenu: SYS_HeaderMenu;
		public sys_Help: SYS_Help;
		public sys_I18n: SYS_I18n;
		public sys_IFrame: SYS_IFrame;
		public sys_LoadingAndProgressBar: SYS_LoadingAndProgressBar;
		public sys_Log: SYS_Log;
		public sys_Math: SYS_Math;
		public sys_Message: SYS_Message;
		public sys_MessageBox: SYS_MessageBox;
		public sys_MessageBus: SYS_MessageBus;
		public sys_PanelControl: SYS_PanelControl;
		public sys_RightClickMenu: SYS_RightClickMenu;
		public sys_Setting: SYS_Setting;
		public sys_ShortcutKey: SYS_ShortcutKey;
		public sys_Storage: SYS_Storage;
		public sys_Timer: SYS_Timer;
		public sys_ToastMessage: SYS_ToastMessage;
		public sys_Tool: SYS_Tool;
		public sys_Unit: SYS_Unit;
		public sys_WebSocket: SYS_WebSocket;
		public sys_Window: SYS_Window;
		private extensionUuid: string;
		public constructor(extensionUuid: string);
	}
	const eda: EDA;
	interface IPCB_DfmRule {
		category: string;
		ruleType: string;
		name: string;
		isSetDefault: boolean;
		unit?: string;
		showUnit?: boolean;
		form: Record<string, number | string | boolean>;
	}
	interface IPCB_DfmAvailability {
		available: boolean;
		reason?: string;
		buildType: 'private' | 'online' | 'offline' | 'unknown';
	}
	interface IPCB_DfmCheckOptions {
		rules?: Array<string>;
	}
	interface IPCB_DfmIssue extends IPCB_ViolationBase {
		globalIndex: string;
		subtype: string;
	}
	interface IPCB_DfmCheckResult {
		issues: Array<IPCB_DfmIssue>;
		failedItems: number;
		warnings: Array<string>;
	}
	class PCB_Dfm {
		public getDfmRules(): Promise<Array<IPCB_DfmRule>>;
		public getDfmAvailability(): Promise<IPCB_DfmAvailability>;
		public checkDfm(options?: IPCB_DfmCheckOptions): Promise<IPCB_DfmCheckResult>;
	}
	enum ESYS_ApiErrorCode {
		 UNSUPPORTED = 'UNSUPPORTED',
		 INVALID_PARAM = 'INVALID_PARAM',
		 DOCUMENT_NOT_ACTIVE = 'DOCUMENT_NOT_ACTIVE',
		 DOCUMENT_NOT_READY = 'DOCUMENT_NOT_READY',
		 NOT_FOUND = 'NOT_FOUND',
		 CONFLICT = 'CONFLICT',
		 GROUP_NOT_FOUND = 'GROUP_NOT_FOUND',
		 NOTHING_TO_UNDO = 'NOTHING_TO_UNDO',
		 NOTHING_TO_REDO = 'NOTHING_TO_REDO',
		 INCOMPLETE_RESULT = 'INCOMPLETE_RESULT',
		 INTERNAL_ERROR = 'INTERNAL_ERROR',
	}
	class SYS_ApiError extends Error {
		public readonly code: ESYS_ApiErrorCode;
		public readonly details?: Record<string, unknown>;
		public constructor(code: ESYS_ApiErrorCode, message?: string, details?: Record<string, unknown>);
	}
	interface ILIB_DeviceAssociationItems {
		symbols: Array<ILIB_DeviceSymbolAssociationItem>;
		footprints?: Array<ILIB_DeviceFootprintAssociationItem>;
	}
	interface ISYS_ExternalApiRegistration {
		extensionUuid: string;
		priority: number;
		callFn: (...args: any[]) => any | Promise<any>;
		help?: ISYS_ExternalApiHelp;
	}
	interface ISYS_ExtensionExternalApiIndex {
		[namespace: string]: { [apiName: string]: Array<ISYS_ExternalApiRegistration> };
	}
	interface ISYS_ExtensionRegisteredExternalApis {
		[extensionUuid: string]: { [namespace: string]: { [apiName: string]: ISYS_ExternalApiRegistration } };
	}
	enum ELIB_DeviceJlcLibraryCategory {
		 STANDARD = 'standard',
		 EXTEND = 'extend',
	}
	enum EPNL_ReferencePoint {
		 TOP_LEFT = 0,
		 TOP_MIDDLE = 1,
		 TOP_RIGHT = 2,
		 MIDDLE_LEFT = 3,
		 MIDDLE_MIDDLE = 4,
		 MIDDLE_RIGHT = 5,
		 BOTTOM_LEFT = 6,
		 BOTTOM_MIDDLE = 7,
		 BOTTOM_RIGHT = 8,
	}
}
export {};
