const store = { events: [] };

export function pushEvent(event) {
  store.events.push(event);
  if (store.events.length > 100) store.events.shift();
}

export function getEvents() {
  return store.events.slice().reverse();
}
