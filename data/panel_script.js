function newHistoryEntry(params) {
  var entry = $("#history-entry-template").clone();
  entry.attr("id", "");
  entry.find(".history-thumb a").attr("href", params.originalURI);
  entry.find(".history-thumb img").attr("src", params.thumbURI);
  entry.find(".history-uri").text(params.originalURI).attr('href', params.originalURI);
  entry.find(".history-coords").text(params.coords);
  if ("timestamp" in params) {
	entry.find(".history-timestamp").text(params.timestamp);
  } else {
	entry.find(".history-timestamp").remove();
  }
  for (var i = 0; i < params.links.length; i++) {
    entry.find(".history-links").append($('<a target="_blank"/>').attr("href", params.links[i].href).text(params.links[i].text));
  }
  $("#history").prepend(entry);
}

$(function() {
  addon.port.on("add-history", newHistoryEntry);
});