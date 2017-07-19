'use strict';

function ConcurrentQueue(
  // ConcurrentQueue
  concurrency // number of simultaneous and asynchronously executing tasks
) {
  this.paused = false;
  this.concurrency = concurrency;
  this.waitTimeout = 0;
  this.processTimeout = 0;
  this.count = 0;
  this.items = [];
  this.events = {
    error: null,
    timeout: null,
    drain: null,
    process: null
  };
}

ConcurrentQueue.prototype.timeout = function(
  msec // process timeout (optional), for single item
) {
  this.processTimeout = msec;
  return this;
};

ConcurrentQueue.prototype.add = function(
  item // add item to queue
) {
  if (!this.paused) {
    if (this.count < this.concurrency) this.next(item);
    else this.items.push(item);
  }
  return this;
};

ConcurrentQueue.prototype.next = function(
  item // process next item from queue
) {
  if (this.paused) return this;
  let timer;
  this.count++;
  if (this.processTimeout) {
    timer = setTimeout(() => {
      const err = new Error('Queue timed out');
      this.emit('timeout', err);
    }, this.processTimeout);
  }
  const stub = (item, callback) => {
    callback();
    return;
  };
  const fn = this.events.process || stub;
  fn(item, (err, data) => {
    this.emit('error', err, data);
    this.count--;
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    if (this.items.length > 0) {
      const item = this.items.shift();
      this.next(item);
    } else if (this.count === 0) {
      this.emit('drain');
    }
  });
  return this;
};

ConcurrentQueue.prototype.on = function(
  // ConcurrentQueue events:
  eventName, // string
  listener // handler function
  // on('error', function(err))
  // on('drain', function()) - no more items in queue
  // on('process', function(item, callback)) - process item function
  // on('timeout', function(err, data))
) {
  if (!this.paused && eventName in this.events) {
    this.events[eventName] = listener;
  }
  return this;
};

ConcurrentQueue.prototype.emit = function(
  eventName, // event name
  err, // instance of Error
  data // attached data
) {
  if (!this.paused) {
    const event = this.events[eventName];
    if (event) event(err, data);
  }
  return this;
};

ConcurrentQueue.prototype.pause = function() {
  this.paused = true;
  return this;
};

ConcurrentQueue.prototype.resume = function() {
  this.paused = false;
  return this;
};

ConcurrentQueue.prototype.stop = function() {
  this.paused = false;
  this.concurrency = null;
  this.count = 0;
  this.items = [];
  this.events = {
    error: null,
    timeout: null,
    drain: null,
    process: null
  };
  return this;
};

const queue = (
  // ConcurrentQueue
  concurrency // number of simultaneous and asynchronously executing tasks
) => new ConcurrentQueue(concurrency);

module.exports = {
  queue
};
