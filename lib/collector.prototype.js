'use strict';

const util = require('util');

function Collector() {}

Collector.prototype.on = function(
  // Collector events:
  eventName,
  listener // handler function
  // on('error', function(err, key))
  // on('timeout', function(err, data))
  // on('done', function(errs, data))
) {
  if (eventName in this.events) {
    this.events[eventName] = listener;
  }
};

Collector.prototype.emit = function(
  // Emit Collector events
  eventName, err, data
) {
  const event = this.events[eventName];
  if (event) event(err, data);
};

const DataCollector = function(
  expected, // number of collect() calls expected
  timeout // collect timeout (optional)
  // returns: instance of DataCollector
) {
  this.expected = expected;
  this.timeout = timeout;
  this.count = 0;
  this.data = {};
  this.errs = [];
  this.events = {
    error: null,
    timeout: null,
    done: null
  };
  const collector = this;
  if (this.timeout) {
    this.timer = setTimeout(() => {
      const err = new Error('DataCollector timeout');
      collector.emit('timeout', err, collector.data);
    }, timeout);
  }
};

util.inherits(DataCollector, Collector);

DataCollector.prototype.collect = function(
  // Push data to collector
  key, // key in result data
  data // value or error instance
) {
  this.count++;
  if (data instanceof Error) {
    this.errs[key] = data;
    this.emit('error', data, key);
  } else {
    this.data[key] = data;
  }
  if (this.expected === this.count) {
    if (this.timer) clearTimeout(this.timer);
    const errs = this.errs.length ? this.errs : null;
    this.emit('done', errs, this.data);
  }
};

const KeyCollector = function(
  // Key Collector
  keys, // array of keys, example: ['config', 'users', 'cities']
  timeout // collect timeout (optional)
  // returns: instance of DataCollector
) {
  this.isDone = false;
  this.keys = keys;
  this.expected = keys.length;
  this.count = 0;
  this.timeout = timeout;
  this.data = {};
  this.errs = [];
  this.events = {
    error: null,
    timeout: null,
    done: null
  };
  const collector = this;
  if (this.timeout) {
    this.timer = setTimeout(() => {
      const err = new Error('KeyCollector timeout');
      collector.emit('timeout', err, collector.data);
    }, timeout);
  }
};

util.inherits(KeyCollector, Collector);

KeyCollector.prototype.collect = function(
  key,
  data
) {
  if (this.keys.includes(key)) {
    this.count++;
    if (data instanceof Error) {
      this.errs[key] = data;
      this.emit('error', data, key);
    } else {
      this.data[key] = data;
    }
    if (this.expected === this.count) {
      if (this.timer) clearTimeout(this.timer);
      const errs = this.errs.length ? this.errs : null;
      this.emit('done', errs, this.data);
    }
  }
};

KeyCollector.prototype.stop = function() {
};

KeyCollector.prototype.pause = function() {
};

KeyCollector.prototype.resume = function() {
};

module.exports = {
  DataCollector,
  KeyCollector
};
