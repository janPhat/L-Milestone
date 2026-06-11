const isLocalPreview = ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname);

if (window.location.protocol.startsWith("http") && isLocalPreview && "EventSource" in window) {
  const events = new EventSource("/__events");
  events.addEventListener("reload", () => window.location.reload());
}
