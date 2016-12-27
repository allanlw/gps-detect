function newHistoryEntry(params) {
  document.getElementById("history-placeholder").style.display = "none";

  var entry = document.getElementById("history-entry-template").cloneNode(true);
  entry.setAttribute("id", "");
  entry.querySelector(".history-thumb a").setAttribute("href", params.originalURI);
  entry.querySelector(".history-thumb img").setAttribute("src", params.thumbURI);
  var u = entry.querySelector(".history-uri");
  u.textContent = params.originalURI;
  u.setAttribute('href', params.originalURI);
  entry.querySelector(".history-coords").textContent = params.coords;
  if ("timestamp" in params) {
	entry.querySelector(".history-timestamp").textContent = params.timestamp;
  } else {
	var e = entry.querySelector(".history-timestamp");
        e.parentNode.removeChild(e);
  }
  var links = entry.querySelector(".history-links");
  for (var i = 0; i < params.links.length; i++) {
    var a = document.createElement("a");
    a.setAttribute("target", "_blank");
    a.setAttribute("href", params.links[i].href);
    a.textContent = params.links[i].text;
    links.appendChild(a);
  }
  var history = document.getElementById("history");
  history.insertBefore(entry, history.firstChild);
}


addon.port.on("add-history", newHistoryEntry);
