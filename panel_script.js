function dummyLink(e) {
  e.onclick = function(ev) {
    browser.tabs.create({"url": e.href});
    ev.preventDefault();
  }
}

function newHistoryEntry(params) {
  document.getElementById("history-placeholder").style.display = "none";

  var coords = prettyGPS(params.exif);

  var links_a = [{"text": "geohack", "href": geohackUrl(params.exif)}];

  var entry = document.getElementById("history-entry-template").cloneNode(true);
  entry.setAttribute("id", "");
  entry.querySelector(".history-thumb a").setAttribute("href", params.uri);
  entry.querySelector(".history-thumb img").setAttribute("src", params.thumb);
  var u = entry.querySelector(".history-uri");
  u.textContent = params.uri;
  u.setAttribute('href', params.uri);
  dummyLink(u);
  entry.querySelector(".history-coords").textContent = coords;
  if ("timestamp" in params) {
	entry.querySelector(".history-timestamp").textContent = params.timestamp;
  } else {
	var e = entry.querySelector(".history-timestamp");
        e.parentNode.removeChild(e);
  }
  var links = entry.querySelector(".history-links");
  for (let i = 0; i < links_a.length; i++) {
    var a = document.createElement("a");
    dummyLink(a);
    a.setAttribute("href", links_a[i].href);
    a.textContent = links_a[i].text;
    links.appendChild(a);
  }
  var history = document.getElementById("history");
  history.insertBefore(entry, history.firstChild);
}

browser.runtime.onMessage.addListener(function(request, sender, sendResponse) {
	if (request.type == "add-history") {
		newHistoryEntry(request);
	} else if (request.type == "history") {
		request.history.forEach(newHistoryEntry);
	}
});

browser.runtime.sendMessage({"type":"history-please"});
