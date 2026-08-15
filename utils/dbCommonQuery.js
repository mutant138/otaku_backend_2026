import mongoose from "mongoose";
import modelsMap from "../Models/index.js";

/**
 * Universal Database Query Handler for Mongoose Models
 * @param {Object} params - Query configuration parameters
 * @param {string|mongoose.Model} params.model - Model name string (e.g. "User") or Mongoose Model instance
 * @param {string} params.action - Database operation to perform
 * @param {Object} [params.filter={}] - Query filter / conditions / ID
 * @param {Object|Array} [params.data=null] - Data payload for create/update operations
 * @param {Array} [params.pipeline=null] - Aggregation pipeline stages array
 * @param {Object|string} [params.projection=null] - Fields selection/projection
 * @param {Object|string} [params.sort=null] - Sorting order
 * @param {number} [params.skip=null] - Skip count for pagination
 * @param {number} [params.limit=null] - Limit count for pagination
 * @param {Object|Array|string} [params.populate=null] - Mongoose population configuration
 * @param {boolean} [params.lean=true] - Return plain JavaScript objects instead of Mongoose Documents
 * @param {Object} [params.options={}] - Additional query options (e.g. { new: true, upsert: true, runValidators: true })
 * @param {string} [params.field=null] - Field name for distinct queries
 * @returns {Promise<any>} Result of the database query execution
 */
export const dbCommonQuery = async ({
  model,
  action,
  filter = {},
  data = null,
  pipeline = null,
  projection = null,
  sort = null,
  skip = null,
  limit = null,
  populate = null,
  lean = true,
  options = {},
  field = null,
}) => {
  if (!model) {
    throw new Error("dbCommonQuery Error: Model parameter is required.");
  }
  if (!action) {
    throw new Error("dbCommonQuery Error: Action parameter is required.");
  }

  let Model = null;
  if (typeof model === "string") {
    Model = modelsMap[model] || (mongoose.models && mongoose.models[model]);
    if (!Model) {
      try {
        Model = mongoose.model(model);
      } catch (err) {
        Model = null;
      }
    }
  } else {
    Model = model;
  }

  if (!Model) {
    throw new Error(`dbCommonQuery Error: Model '${model}' is not registered with Mongoose.`);
  }

  switch (action) {
    case "find": {
      let query = Model.find(filter, projection, options);
      if (sort) query = query.sort(sort);
      if (skip !== null && skip !== undefined) query = query.skip(skip);
      if (limit !== null && limit !== undefined) query = query.limit(limit);
      if (populate) query = query.populate(populate);
      if (lean) query = query.lean();
      return await query.exec();
    }

    case "findOne": {
      let query = Model.findOne(filter, projection, options);
      if (sort) query = query.sort(sort);
      if (populate) query = query.populate(populate);
      if (lean) query = query.lean();
      return await query.exec();
    }

    case "findById": {
      let query = Model.findById(filter, projection, options);
      if (populate) query = query.populate(populate);
      if (lean) query = query.lean();
      return await query.exec();
    }

    case "create": {
      return await Model.create(data);
    }

    case "updateOne": {
      return await Model.updateOne(filter, data, options).exec();
    }

    case "updateMany": {
      return await Model.updateMany(filter, data, options).exec();
    }

    case "findOneAndUpdate": {
      const updateOptions = { new: true, ...options };
      let query = Model.findOneAndUpdate(filter, data, updateOptions);
      if (populate) query = query.populate(populate);
      if (lean) query = query.lean();
      return await query.exec();
    }

    case "findByIdAndUpdate": {
      const updateOptions = { new: true, ...options };
      let query = Model.findByIdAndUpdate(filter, data, updateOptions);
      if (populate) query = query.populate(populate);
      if (lean) query = query.lean();
      return await query.exec();
    }

    case "deleteOne": {
      return await Model.deleteOne(filter, options).exec();
    }

    case "deleteMany": {
      return await Model.deleteMany(filter, options).exec();
    }

    case "findOneAndDelete": {
      let query = Model.findOneAndDelete(filter, options);
      if (populate) query = query.populate(populate);
      if (lean) query = query.lean();
      return await query.exec();
    }

    case "findByIdAndDelete": {
      let query = Model.findByIdAndDelete(filter, options);
      if (populate) query = query.populate(populate);
      if (lean) query = query.lean();
      return await query.exec();
    }

    case "aggregate": {
      if (!Array.isArray(pipeline)) {
        throw new Error("dbCommonQuery Error: Pipeline stage array is required for aggregate action.");
      }
      return await Model.aggregate(pipeline).exec();
    }

    case "countDocuments": {
      return await Model.countDocuments(filter, options).exec();
    }

    case "distinct": {
      if (!field) {
        throw new Error("dbCommonQuery Error: Field parameter is required for distinct action.");
      }
      return await Model.distinct(field, filter).exec();
    }

    default:
      throw new Error(`dbCommonQuery Error: Unsupported database action '${action}'.`);
  }
};

export default dbCommonQuery;
