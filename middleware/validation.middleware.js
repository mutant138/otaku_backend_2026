/**
 * Reusable request validation middleware.
 * Accepts a schema object defining validation rules for body, query, or params.
 * 
 * Example Schema:
 * {
 *   body: {
 *     email: { type: "email", required: true },
 *     password: { type: "string", required: true },
 *     age: { type: "number", required: false }
 *   }
 * }
 */
export const validate = (schema) => {
  return (req, res, next) => {
    // If the schema is flat (no body/query/params key), assume it is for body
    const isFlat = !schema.body && !schema.query && !schema.params;
    const normalizedSchema = isFlat ? { body: schema } : schema;
    
    const errors = {};

    for (const [target, rules] of Object.entries(normalizedSchema)) {
      const data = req[target] || {};

      for (const [field, constraints] of Object.entries(rules)) {
        const value = data[field];

        // 1. Required check
        if (constraints.required && (value === undefined || value === null || value === "")) {
          errors[field] = `${field.charAt(0).toUpperCase() + field.slice(1)} is required`;
          continue;
        }

        // If field is not provided and not required, skip other checks
        if (value === undefined || value === null || value === "") {
          continue;
        }

        // 2. Type check
        if (constraints.type) {
          if (constraints.type === "email") {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(String(value))) {
              errors[field] = `Invalid email format`;
            }
          } else if (constraints.type === "number") {
            if (isNaN(Number(value))) {
              errors[field] = `${field} must be a number`;
            }
          } else if (constraints.type === "array") {
            if (!Array.isArray(value)) {
              errors[field] = `${field} must be an array`;
            }
          } else if (constraints.type === "object") {
            if (typeof value !== "object" || Array.isArray(value)) {
              errors[field] = `${field} must be an object`;
            }
          } else if (typeof value !== constraints.type) {
            errors[field] = `${field} must be a ${constraints.type}`;
          }
        }

        // 3. Enum check
        if (constraints.enum && Array.isArray(constraints.enum)) {
          if (!constraints.enum.includes(value)) {
            errors[field] = `${field} must be one of: ${constraints.enum.join(", ")}`;
          }
        }

        // 4. Custom validation function
        if (typeof constraints.validate === "function") {
          const customError = constraints.validate(value, data);
          if (customError) {
            errors[field] = customError;
          }
        }
      }
    }

    if (Object.keys(errors).length > 0) {
      const firstError = Object.values(errors)[0];
      return res.status(400).json({
        status: false,
        message: firstError,
        errors
      });
    }

    next();
  };
};
