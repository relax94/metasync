'use strict';

const util = require('util');
const common = require('metarhia-common');

function Collector() {}

Collector.prototype.pick = function(key, value) {
  this.collect(key, null, value);
  return this;
};

Collector.prototype.fail = function(key, err) {
  this.collect(key, err);
  return this;
};

Collector.prototype.take = function(key, fn, ...args) {
  fn(...args, (err, data) => {
    this.collect(key, err, data);
  });
  return this;
};

Collector.prototype.timeout = function(msec) {
  if (msec) {
    this.timer = setTimeout(() => {
      const err = new Error('Collector timeout');
      this.finalize(err, this.data);
    }, msec);
  }
  return this;
};

Collector.prototype.done = function(callback) {
  this.onDone = callback;
  return this;
};

Collector.prototype.finalize = function(key, err, data) {
  if (this.isDone) return this;
  if (this.onDone) {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.isDone = true;
    this.onDone(key, err, data);
  }
  return this;
};

Collector.prototype.distinct = function(value = true) {
  this.isDistinct = value;
  return this;
};

Collector.prototype.cancel = function(err) {
  err = err || new Error('Collector cancelled');
  this.finalize(err, this.data);
  return this;
};

Collector.prototype.then = function(fulfilled, rejected) {
  const fulfill = common.cb(fulfilled);
  const reject = common.cb(rejected);
  this.onDone = (err, result) => {
    if (err) reject(err);
    else fulfill(result);
  };
  return this;
};

function KeyCollector(
  expected // array of string
  // returns: collector instance
) {
  this.expectKeys = new Set(expected);
  this.expected = expected.length;
  this.keys = new Set();
  this.count = 0;
  this.timer = null;
  this.onDone = common.emptiness;
  this.isDistinct = false;
  this.isDone = false;
  this.data = {};
}

util.inherits(KeyCollector, Collector);

KeyCollector.prototype.collect = function(key, err, value) {
  if (this.isDone) return this;
  if (err) {
    this.finalize(err, this.data);
    return this;
  }
  if (!this.expectKeys.has(key)) {
    if (this.isDistinct) {
      const err = new Error('Unexpected key: ' + key);
      this.finalize(err, this.data);
      return this;
    }
  } else if (!this.keys.has(key)) {
    this.count++;
  }
  this.data[key] = value;
  this.keys.add(key);
  if (this.expected === this.count) {
    this.finalize(null, this.data);
  }
  return this;
};

function DataCollector(
  expected // keys count
  // returns: collector instance
) {
  this.expected = expected;
  this.keys = new Set();
  this.count = 0;
  this.timer = null;
  this.onDone = common.emptiness;
  this.isDistinct = false;
  this.isDone = false;
  this.data = {};
}

util.inherits(DataCollector, Collector);

DataCollector.prototype.collect = function(key, err, value) {
  if (this.isDone) return this;
  if (err) {
    this.finalize(err, this.data);
    return this;
  }
  if (!this.keys.has(key)) this.count++;
  this.data[key] = value;
  this.keys.add(key);
  if (this.expected === this.count) {
    this.finalize(null, this.data);
  }
  return this;
};

const collect = (expected) => (
  Array.isArray(expected) ?
    new KeyCollector(expected) :
    new DataCollector(expected)
);

module.exports = {
  collect
};
