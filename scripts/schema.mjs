// A small JSON Schema subset: type, required, properties, additionalProperties,
// items, enum, min/max length, min/max items, pattern, and local $ref to $defs.

function resolve(root, schema) {
  if (!schema.$ref) return schema;
  const prefix = "#/$defs/";
  if (!schema.$ref.startsWith(prefix) || !root.$defs) {
    throw new Error(`Unsupported $ref ${schema.$ref}`);
  }
  const name = schema.$ref.slice(prefix.length);
  if (!root.$defs[name]) throw new Error(`Missing $def ${name}`);
  return root.$defs[name];
}

function fail(errors, path, message) {
  errors.push(`${path} ${message}`);
}

export function validateSchema(data, schema, path = "$", root = schema) {
  const errors = [];
  const node = resolve(root, schema);
  if (node.enum && !node.enum.includes(data)) {
    fail(errors, path, `must be one of ${node.enum.join(", ")}`);
    return errors;
  }
  if (node.type === "object") {
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      fail(errors, path, "must be an object");
      return errors;
    }
    for (const key of node.required || []) {
      if (data[key] == null) fail(errors, path, `is missing ${key}`);
    }
    const props = node.properties || {};
    if (node.additionalProperties === false) {
      for (const key of Object.keys(data)) {
        if (!props[key]) fail(errors, path, `has unknown property ${key}`);
      }
    }
    for (const [key, child] of Object.entries(props)) {
      if (data[key] != null) errors.push(...validateSchema(data[key], child, `${path}.${key}`, root));
    }
    return errors;
  }
  if (node.type === "array") {
    if (!Array.isArray(data)) {
      fail(errors, path, "must be an array");
      return errors;
    }
    if (node.minItems != null && data.length < node.minItems) {
      fail(errors, path, `must have at least ${node.minItems} items`);
    }
    if (node.maxItems != null && data.length > node.maxItems) {
      fail(errors, path, `must have at most ${node.maxItems} items`);
    }
    if (node.items) {
      data.forEach((item, index) => {
        errors.push(...validateSchema(item, node.items, `${path}[${index}]`, root));
      });
    }
    return errors;
  }
  if (node.type === "string") {
    if (typeof data !== "string") {
      fail(errors, path, "must be a string");
      return errors;
    }
    if (node.minLength != null && data.length < node.minLength) {
      fail(errors, path, `must be at least ${node.minLength} characters`);
    }
    if (node.maxLength != null && data.length > node.maxLength) {
      fail(errors, path, `must be at most ${node.maxLength} characters`);
    }
    if (node.pattern && !new RegExp(node.pattern).test(data)) {
      fail(errors, path, "does not match the expected pattern");
    }
    return errors;
  }
  fail(errors, path, "uses a schema type this check does not implement");
  return errors;
}
