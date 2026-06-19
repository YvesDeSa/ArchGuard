import {
  OpenApiSnapshot,
  DiffReport,
  DiffSummary,
  ChangeEntry,
  ChangeType,
  ChangeSeverity,
  ChangeCategory,
  PathItem,
  OperationObject,
  SchemaObject,
  ParameterObject,
} from '../types/index';

const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head'] as const;
type HttpMethod = typeof HTTP_METHODS[number];

export function generateDiff(from: OpenApiSnapshot, to: OpenApiSnapshot): DiffReport {
  const changes: ChangeEntry[] = [];

  diffPaths(from.spec.paths || {}, to.spec.paths || {}, changes);
  diffSchemas(
    from.spec.components?.schemas || {},
    to.spec.components?.schemas || {},
    changes
  );

  if (from.spec.info.version !== to.spec.info.version) {
    changes.push({
      type: 'modified',
      severity: 'informational',
      category: 'info',
      path: 'info.version',
      description: `API version changed from ${from.spec.info.version} to ${to.spec.info.version}`,
      before: from.spec.info.version,
      after: to.spec.info.version,
      frontendImpact: 'Review changelog for version-specific changes.',
    });
  }

  const summary = buildSummary(changes);

  return {
    projectName: to.projectName,
    generatedAt: new Date().toISOString(),
    fromVersion: from.version,
    toVersion: to.version,
    fromSnapshot: `snapshot-${from.version}.json`,
    toSnapshot: `snapshot-${to.version}.json`,
    summary,
    changes,
  };
}

function diffPaths(
  fromPaths: Record<string, PathItem>,
  toPaths: Record<string, PathItem>,
  changes: ChangeEntry[]
): void {
  const allPaths = new Set([...Object.keys(fromPaths), ...Object.keys(toPaths)]);

  for (const routePath of allPaths) {
    const fromPath = fromPaths[routePath];
    const toPath = toPaths[routePath];

    if (!fromPath && toPath) {
      for (const method of HTTP_METHODS) {
        if (toPath[method]) {
          changes.push(createEndpointChange('added', 'non-breaking', routePath, method, toPath[method] as OperationObject));
        }
      }
    } else if (fromPath && !toPath) {
      for (const method of HTTP_METHODS) {
        if (fromPath[method]) {
          changes.push(createEndpointChange('removed', 'breaking', routePath, method, fromPath[method] as OperationObject));
        }
      }
    } else if (fromPath && toPath) {
      diffPathItem(routePath, fromPath, toPath, changes);
    }
  }
}

function diffPathItem(
  routePath: string,
  from: PathItem,
  to: PathItem,
  changes: ChangeEntry[]
): void {
  const allMethods = new Set([
    ...Object.keys(from).filter(m => (HTTP_METHODS as readonly string[]).includes(m)),
    ...Object.keys(to).filter(m => (HTTP_METHODS as readonly string[]).includes(m)),
  ]);

  for (const method of allMethods) {
    const fromOp = from[method] as OperationObject | undefined;
    const toOp = to[method] as OperationObject | undefined;

    if (!fromOp && toOp) {
      changes.push(createEndpointChange('added', 'non-breaking', routePath, method, toOp));
    } else if (fromOp && !toOp) {
      changes.push(createEndpointChange('removed', 'breaking', routePath, method, fromOp));
    } else if (fromOp && toOp) {
      diffOperation(routePath, method, fromOp, toOp, changes);
    }
  }
}

function diffOperation(
  routePath: string,
  method: string,
  from: OperationObject,
  to: OperationObject,
  changes: ChangeEntry[]
): void {
  if (!from.deprecated && to.deprecated) {
    changes.push({
      type: 'modified',
      severity: 'non-breaking',
      category: 'endpoint',
      path: routePath,
      method: method.toUpperCase(),
      description: 'Endpoint deprecated',
      before: false,
      after: true,
      frontendImpact: 'Plan to remove usage of this endpoint.',
    });
  }

  diffParameters(routePath, method, from.parameters || [], to.parameters || [], changes);

  if (JSON.stringify(from.requestBody) !== JSON.stringify(to.requestBody)) {
    const severity = determineRequestBodySeverity(from.requestBody, to.requestBody);
    changes.push({
      type: 'modified',
      severity,
      category: 'request-body',
      path: routePath,
      method: method.toUpperCase(),
      description: 'Request body changed',
      before: from.requestBody,
      after: to.requestBody,
      frontendImpact:
        severity === 'breaking'
          ? '⚠️ Required fields changed — update your request payload immediately.'
          : 'Optional fields changed — review for new capabilities.',
    });
  }

  const fromResponses = from.responses || {};
  const toResponses = to.responses || {};
  if (JSON.stringify(fromResponses) !== JSON.stringify(toResponses)) {
    changes.push({
      type: 'modified',
      severity: 'non-breaking',
      category: 'response',
      path: routePath,
      method: method.toUpperCase(),
      description: 'Response schema changed',
      before: fromResponses,
      after: toResponses,
      frontendImpact: 'Review response structure — update your data mapping/type definitions.',
    });
  }

  if (from.summary !== to.summary) {
    changes.push({
      type: 'modified',
      severity: 'informational',
      category: 'endpoint',
      path: routePath,
      method: method.toUpperCase(),
      description: `Summary updated: "${from.summary}" → "${to.summary}"`,
      before: from.summary,
      after: to.summary,
      frontendImpact: 'Documentation change only.',
    });
  }
}

function diffParameters(
  routePath: string,
  method: string,
  from: ParameterObject[],
  to: ParameterObject[],
  changes: ChangeEntry[]
): void {
  const fromMap = new Map(from.map((p) => [p.name, p]));
  const toMap = new Map(to.map((p) => [p.name, p]));

  for (const [name, toParam] of toMap) {
    if (!fromMap.has(name)) {
      changes.push({
        type: 'added',
        severity: toParam.required ? 'breaking' : 'non-breaking',
        category: 'parameter',
        path: routePath,
        method: method.toUpperCase(),
        description: `Parameter "${name}" added (${toParam.in})${
          toParam.required ? ' — REQUIRED' : ' — optional'
        }`,
        before: undefined,
        after: toParam,
        frontendImpact: toParam.required
          ? `⚠️ Must now include "${name}" in ${toParam.in} parameters.`
          : `Optional parameter "${name}" available in ${toParam.in}.`,
      });
    }
  }

  for (const [name, fromParam] of fromMap) {
    if (!toMap.has(name)) {
      changes.push({
        type: 'removed',
        severity: 'breaking',
        category: 'parameter',
        path: routePath,
        method: method.toUpperCase(),
        description: `Parameter "${name}" removed (${fromParam.in})`,
        before: fromParam,
        after: undefined,
        frontendImpact: `⚠️ Remove "${name}" from your ${fromParam.in} parameters.`,
      });
    } else {
      const toParam = toMap.get(name)!;
      if (JSON.stringify(fromParam) !== JSON.stringify(toParam)) {
        changes.push({
          type: 'modified',
          severity: toParam.required && !fromParam.required ? 'breaking' : 'non-breaking',
          category: 'parameter',
          path: routePath,
          method: method.toUpperCase(),
          description: `Parameter "${name}" modified`,
          before: fromParam,
          after: toParam,
          frontendImpact: 'Review parameter constraints and types.',
        });
      }
    }
  }
}

function diffSchemas(
  from: Record<string, SchemaObject>,
  to: Record<string, SchemaObject>,
  changes: ChangeEntry[]
): void {
  const allSchemas = new Set([...Object.keys(from), ...Object.keys(to)]);

  for (const name of allSchemas) {
    if (!from[name] && to[name]) {
      changes.push({
        type: 'added',
        severity: 'informational',
        category: 'schema',
        path: `#/components/schemas/${name}`,
        description: `Schema "${name}" added`,
        before: undefined,
        after: to[name],
        frontendImpact: `New type "${name}" available — consider adding a TypeScript interface.`,
      });
    } else if (from[name] && !to[name]) {
      changes.push({
        type: 'removed',
        severity: 'breaking',
        category: 'schema',
        path: `#/components/schemas/${name}`,
        description: `Schema "${name}" removed`,
        before: from[name],
        after: undefined,
        frontendImpact: `⚠️ Remove references to "${name}" type — it no longer exists.`,
      });
    } else if (from[name] && to[name]) {
      if (JSON.stringify(from[name]) !== JSON.stringify(to[name])) {
        const severity = determineSchemaChangeSeverity(from[name], to[name]);
        changes.push({
          type: 'modified',
          severity,
          category: 'schema',
          path: `#/components/schemas/${name}`,
          description: `Schema "${name}" modified`,
          before: from[name],
          after: to[name],
          frontendImpact:
            severity === 'breaking'
              ? `⚠️ Required fields in "${name}" changed — update all usages.`
              : `Optional fields in "${name}" changed — review your type definitions.`,
        });
      }
    }
  }
}

function createEndpointChange(
  type: ChangeType,
  severity: ChangeSeverity,
  routePath: string,
  method: string,
  op: OperationObject
): ChangeEntry {
  const tag = op.tags?.[0] ?? 'API';
  const summary = op.summary ?? 'No summary';
  const descriptions: Record<ChangeType, string> = {
    added: `[${tag}] Endpoint added: ${summary}`,
    removed: `[${tag}] Endpoint removed: ${summary}`,
    modified: `[${tag}] Endpoint modified: ${summary}`,
  };
  const impacts: Record<ChangeType, string> = {
    added: 'New endpoint available — implement integration if needed.',
    removed: '⚠️ Remove all calls to this endpoint from your codebase.',
    modified: 'Review changes and update your API client.',
  };

  return {
    type,
    severity,
    category: 'endpoint',
    path: routePath,
    method: method.toUpperCase(),
    description: descriptions[type],
    before: type === 'added' ? undefined : op,
    after: type === 'removed' ? undefined : op,
    frontendImpact: impacts[type],
  };
}

function determineRequestBodySeverity(
  from: OperationObject['requestBody'],
  to: OperationObject['requestBody']
): ChangeSeverity {
  if (!from && to) return 'non-breaking';
  if (from && !to) return 'breaking';
  return 'non-breaking';
}

function determineSchemaChangeSeverity(from: SchemaObject, to: SchemaObject): ChangeSeverity {
  const fromRequired = new Set(from.required || []);
  const toRequired = new Set(to.required || []);

  for (const field of toRequired) {
    if (!fromRequired.has(field)) return 'breaking';
  }

  const fromProps = Object.keys(from.properties || {});
  const toProps = new Set(Object.keys(to.properties || {}));
  for (const prop of fromProps) {
    if (!toProps.has(prop)) return 'breaking';
  }

  return 'non-breaking';
}

function buildSummary(changes: ChangeEntry[]): DiffSummary {
  return {
    totalChanges: changes.length,
    breakingChanges: changes.filter((c) => c.severity === 'breaking').length,
    addedEndpoints: changes.filter((c) => c.category === 'endpoint' && c.type === 'added').length,
    removedEndpoints: changes.filter((c) => c.category === 'endpoint' && c.type === 'removed').length,
    modifiedEndpoints: changes.filter((c) => c.category === 'endpoint' && c.type === 'modified').length,
    addedSchemas: changes.filter((c) => c.category === 'schema' && c.type === 'added').length,
    removedSchemas: changes.filter((c) => c.category === 'schema' && c.type === 'removed').length,
    modifiedSchemas: changes.filter((c) => c.category === 'schema' && c.type === 'modified').length,
  };
}
