// Takes a data uri for an image, and scales it to fit in size x size
// cb() is called with the result, or the original uri on failure
function ThumbnailDataURI(datauri, size, cb) {
  var img = document.createElement("img");
  img.onload = function() {
    var longest_side = Math.max(this.width, this.height);

    var scale = size / longest_side;

    var canvas = document.createElement("canvas");
    canvas.width = this.width * scale;
    canvas.height = this.height * scale;
    canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);

    cb(canvas.toDataURL("image/jpeg"));
  }
  img.onerror = function() {
    cb(datauri);
  }
  img.src = datauri;
}

function newHistoryEntryReal(params) {
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

function newHistoryEntry(params) {
  ThumbnailDataURI(params.thumbURI, 128, function(newThumb) {
    params.thumbURI = newThumb;
    addon.port.emit("thumbnail-result", params);
    newHistoryEntryReal(params);
  });
}

addon.port.on("add-history", newHistoryEntry);
