
import  model from '../models/signatures.js';

export const find = (criteria, projection, options = {}) => {
    options.lean = true;
    return model.find(criteria, projection, options);
}

export const findOne = (criteria, projection, options = {}) => {
    options.lean = true;
    return model.findOne(criteria, projection, options);
}

export const updateOne = (criteria, updateObj, options = {}) => {
    options.lean = true;
    return model.findOneAndUpdate(criteria, updateObj, options);
}

export const update = (criteria, updateObj, options = {}) => {
    options.lean = true;
    return model.updateMany(criteria, updateObj, options);
}

export const save = (saveObj) => {
    return new model(saveObj).save();
}

export const findAllSignatures = (userId) => {
    return model.find({ userId }).sort({ createdAt: -1 }).lean();
}