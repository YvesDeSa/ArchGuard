export interface ArchGuardConfig {
  projectName: string;
  historyPath: string;
  snapshotPath: string;
  swaggerUrl?: string;
  swaggerEntryPoint?: string;
  notify: {
    breakingChangesOnly: boolean;
  };
  git: {
    autoCommit: boolean;
    commitMessage: string;
  };
}

export interface OpenApiSnapshot {
  version: string;
  capturedAt: string;
  projectName: string;
  spec: OpenApiSpec;
}

export interface OpenApiSpec {
  openapi: string;
  info: {
    title: string;
    version: string;
    description?: string;
  };
  paths: Record<string, PathItem>;
  components?: {
    schemas?: Record<string, SchemaObject>;
  };
}

export interface PathItem {
  [method: string]: OperationObject;
}

export interface OperationObject {
  summary?: string;
  description?: string;
  tags?: string[];
  parameters?: ParameterObject[];
  requestBody?: RequestBodyObject;
  responses?: Record<string, ResponseObject>;
  deprecated?: boolean;
}

export interface ParameterObject {
  name: string;
  in: 'query' | 'path' | 'header' | 'cookie';
  required?: boolean;
  schema?: SchemaObject;
  description?: string;
}

export interface RequestBodyObject {
  required?: boolean;
  content?: Record<string, MediaTypeObject>;
}

export interface ResponseObject {
  description?: string;
  content?: Record<string, MediaTypeObject>;
}

export interface MediaTypeObject {
  schema?: SchemaObject;
}

export interface SchemaObject {
  type?: string;
  format?: string;
  properties?: Record<string, SchemaObject>;
  items?: SchemaObject;
  $ref?: string;
  required?: string[];
  enum?: unknown[];
  description?: string;
  nullable?: boolean;
  allOf?: SchemaObject[];
  oneOf?: SchemaObject[];
  anyOf?: SchemaObject[];
}

export interface DiffReport {
  projectName: string;
  generatedAt: string;
  fromVersion: string;
  toVersion: string;
  fromSnapshot: string;
  toSnapshot: string;
  summary: DiffSummary;
  changes: ChangeEntry[];
}

export interface DiffSummary {
  totalChanges: number;
  breakingChanges: number;
  addedEndpoints: number;
  removedEndpoints: number;
  modifiedEndpoints: number;
  addedSchemas: number;
  removedSchemas: number;
  modifiedSchemas: number;
}

export interface ChangeEntry {
  type: ChangeType;
  severity: ChangeSeverity;
  category: ChangeCategory;
  path: string;
  method?: string;
  description: string;
  before?: unknown;
  after?: unknown;
  frontendImpact: string;
}

export type ChangeType = 'added' | 'removed' | 'modified';
export type ChangeSeverity = 'breaking' | 'non-breaking' | 'informational';
export type ChangeCategory = 'endpoint' | 'schema' | 'parameter' | 'response' | 'request-body' | 'info';
