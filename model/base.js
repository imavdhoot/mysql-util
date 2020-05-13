
/**
 * This is a base model with filters and all operators available.
 *
 *
 */

'use strict';

var util = require('util');
var debug = require('debug')('model:base');

var sortMap = {
  desc: 'descending',
  asc: 'ascending',
  descending: 'descending',
  ascending: 'ascending'
};

function Model(options, db) {
  this.modelName = options.name;
  this.columns = options.columns;
  this.schema = {
    'name': this.modelName,
    'columns': this.columns
  };
  this.table = db.define(this.schema);
  this.updatableColumns = options.updatableColumns || this.columns;
  this.updatableFilters = options.updatableFilters || this.columns;
  this.db = db;
  this.disableScan = options.disableScan || false;
}

var operators = ['lt', 'gt', 'lte', 'gte', 'like'];

Model.prototype = {

  isValid: function isValid(obj) {
    return obj && typeof(obj) === 'object';
  },

  list: function(options, cb) {
    debug('[Model:list] options:' + JSON.stringify(options));
    var selectFields, filters, orderFields, query;

    if (typeof options === 'function') {
      cb = options;
      options = {};
    }

    selectFields = this.getselectFields(options);
    filters = this.prepareFilters(options);
    orderFields = getOrderFields(options, this);

    query = this.table.select(selectFields);

    if(this.disableScan && filters.length == 0 && !options.limit)
      return cb(new Error('Full Scan is disabled'));

	//pass whereOp as OR, to apply OR operator in set of conditions passed
	//TODO: proper postfix type condition evaluation wrapper(diff where Operator)
   if(options.whereOp && options.whereOp === "or"){
   	var self=this;
     var whereOp=options.whereOp;
   	if(options.filter && options.filter.length){
   		options.filter.forEach(function(condition,id) {
   		  var conditions=self.prepareFilters(condition);
   		  if(conditions.length){
    		  if(id === 0){
    		  	query = query.where.apply(query, conditions);
    		  }else{
    		  	query=query[whereOp].apply(query,conditions);
    		  }
   			}
   		})
   	}
   }else if(filters.length){
   	query = query.where.apply(query, filters);
   }
    // if (filters.length) {
    //   query = query.where.apply(query, filters);
    // }

    if (orderFields.length) {
      query = query.order.apply(query, orderFields);
    }

    if (options.limit) {
      query = query.limit(options.limit);
    }

    if(options.offset) {
      query=query.offset(options.offset);
    }
    query.exec(cb);
  },

  getselectFields: function getselectFields(options) {
    var fields=[], self = this;

    // Apply distinct clause on the column passed as value
    // example {distinc_column: 'state'}
    if (options.distinct_column && self.table[options.distinct_column])
      fields = [self.db.functions.DISTINCT(self.table[options.distinct_column])];

    // Add distinct and count clause on the column passed as value
    // example {distinct_count: 'state'}
    if (options.distinct_count)
      fields = fields.concat([self.db.functions.COUNT(self.db.functions.DISTINCT(self.table[options.distinct_count])).as('distinct_count')]);

    // Add count function on the column passed as value
    // example {count: 'state'}
    if (options.count)
      fields = fields.concat([self.table[options.count].count().as('count')]);

    // Apply sum function on the column passed as value
    // example {sum: 'state'}
    if (options.sum)
      fields = fields.concat([ self.table[options.sum].sum().as('sum')]);

    // Apply max function on the column passed as value
    // example {sum: 'state'}
    if (options.max)
      fields = fields.concat([ self.table[options.max].max().as('max')]);

    // Apply min function on the column passed as value
    // example {sum: 'state'}
    if (options.min)
      fields = fields.concat([ self.table[options.min].min().as('min')]);  

    //if(fields.length) return fields;
    // select all valid sub keys passed in columns key
    // example {columns: ['state','id','is_enabled']}
    // example {columns: 'state,id,is_enabled'}
    if (options.columns) {
      if (!util.isArray(options.columns))
        options.columns = options.columns.split(',');
        var field = options.columns.map(function(x) {
          return self.table[x];
        });
        fields = fields.concat(field);
    // select all columns
    } else if(!fields.length) {
      fields = [self.table.star()];
    }

    return fields;
  },

  prepareFilters: function prepareFilters(options) {
    var filters, result = [];
    filters = options.filters || (typeof(options) === 'object' && options) || {};

    for (var f in filters) {
      if (this.columns.indexOf(f) !== -1 && filters[f] !== undefined) {

        // filter based on single value
        if (typeof(filters[f]) === 'string' || typeof(filters[f]) === 'number') {
          result.push(this.table[f].equals(filters[f]));
        }

        // filter based on array of values
        else if (util.isArray(filters[f])) {
          result.push(this.table[f].in(filters[f]));
        }

        // filter for null values
        else if (typeof(filters[f]) === 'object' &&  filters[f].operator === 'null') {
          result.push(this.table[f].isNull());
        }

        // not in operator
        else if (typeof(filters[f]) === 'object' && filters[f].operator === 'notIn') {
          if (filters[f].in) result.push(this.table[f].in(filters[f].in));
          if (filters[f].notIn) result.push(this.table[f].notIn(filters[f].notIn));
        }

        // filter based on range of values
        else if (typeof(filters[f]) === 'object' && filters[f].from && filters[f].to && filters[f].operator === 'between') {
          result.push(this.table[f].between(filters[f].from, filters[f].to));
        }

        // filter based on operators like less than/greater than etc
        else if (typeof(filters[f]) === 'object' && filters[f].value && operators.indexOf(filters[f].operator) !== -1) {
          result.push(this.table[f][filters[f].operator](filters[f].value));
        }
      }
    }
    return result;
  },

  insert: function(obj, options, cb) {
    var query;

    if(typeof options === 'function') {
      cb = options;
      options = {};
    }

    debug('[insert] obj: ' + (util.isArray(obj) ? obj.length : JSON.stringify(obj)));
    if (!this.isValid(obj) && !util.isArray(obj)) return cb(new Error('Invalid Object'));

    query = this.table.insert(obj);

    if(options && options.on_duplicate) {
      query.onDuplicate(options.on_duplicate);
    }
    query.exec(cb);
  },

  update: function(obj, cb) {
    var id;
    debug('[update] obj:' + JSON.stringify(obj));
    if (obj.id) {
      id = obj.id;
      delete obj.id;
    }
    if (!this.isValid(obj)) return cb(new Error('Invalid Object'));
    if (!parseInt(id)) return cb(new Error('Invalid ID'));

    for (var f in obj) {
      if (this.updatableColumns.indexOf(f) === -1)
        return cb(new Error('Cannot update column:') + f, arguments);
    }

    this.table.update(obj).where(this.table.id.equals(id)).exec(function(e, r) {
      // Set the id value agains so as to retain the original obj
      obj.id = id;

      cb(e, r);
    });
  },

  delete: function(id, cb) {
    debug('[delete] id:' + id);
    if (!parseInt(id)) return cb(new Error('Invalid ID'));

    this.table.delete().where(this.table.id.equals(id)).exec(cb);
  },

  bulkUpdate: function(fields, filters, cb) {
    debug('[bulkUpdate] fields:' + JSON.stringify(fields) + 'filters: ' + JSON.stringify(filters));
    var f, query;

    //validations
    if(typeof (fields) !== 'object') return cb(new Error('Invalid fields'));

    for (f in fields) {
      if (this.updatableColumns.indexOf(f) === -1)
        return cb(new Error('Cannot update column:' + f), fields);
    }

    for (f in filters) {
      if (this.updatableFilters.indexOf(f) === -1)
        return cb(new Error('Cannot update table for filter:' + f), filters);
    }

    filters = this.prepareFilters({filters: filters});

    query = this.table.update(fields);

    if (!filters.length) { return cb(new Error('No filters found while updating')); }
    else { query = query.where.apply(query, filters); }

    query.exec(cb);
  },

  bulkDelete: function(filters, cb) {
    debug('[bulkDelete] filters: ' + JSON.stringify(filters));
    var f, query;

    //validations
    for (f in filters) {
      if (this.updatableFilters.indexOf(f) === -1)
        return cb(new Error('Cannot update table for filter:' + f), filters);
    }

    filters = this.prepareFilters({filters: filters});

    query = this.table.delete();
    if (!filters.length) { return cb(new Error('No filters found while deleting')); }
    else { query = query.where.apply(query, filters); }

    query.exec(cb);
  }
};


function getOrderFields(options, obj) {
  var fields = [];
  if (options.order_by && (typeof(options.order_by) === 'object')) {
    for (var f in options.order_by) {
      if (obj.table[f])
        fields.push(obj.table[f][sortMap[options.order_by[f]]]);
    }
  }
  return fields;
}

module.exports = Model;
