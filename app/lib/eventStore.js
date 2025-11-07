// app/lib/eventStore.js

let events = [];

/**
 * Add a new event to the in-memory store.
 * @param {Object} item - { timestamp, body }
 */
export function pushEvent(item) {
  events.unshift(item);
  if (events.length > 100) events = events.slice(0, 100); // keep recent 100
}

/**
 * Retrieve all stored events.
 * @returns {Array}
 */
export function getEvents() {
  return events;
}
