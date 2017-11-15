var myHistory = [];

function isInHistory(uri) {
	for (var i = 0; i < myHistory.length; i++) {
		if (myHistory[i].uri == uri) {
			return true;
		}
	}
	return false;
}

function addHistory(uri, data, buf) {
	console.log("addHistory");

    var thumb = dataURIFromArrayBuf("image/jpeg", buf);
	myHistory.push({uri: uri, exif: data});
	var i = myHistory.length - 1;

	ThumbnailDataURI(thumb, 96, function(newThumb) {
		myHistory[i].thumb = newThumb;
		thumb = newThumb;

		browser.runtime.sendMessage(myHistory[i]);

		notificationUrls[uri] = geohackUrl(data);
		browser.notifications.create(uri, {
			"type": "basic",
			"title": "GPS Location detected",
			"message": prettyGPS(data),
			"iconUrl": thumb,
		}).then(function() {console.log("shown"); });

	});

}

// buf is an ArrayBuffer with the image contents
// uri is an nsiURI
function handleGPS(uri, buf) {
	if (isInHistory(uri)) {
		return;
	}

	var exif_gps_data = null;
	try {
		exif_gps_data = findEXIFinJPEG(buf);
	} catch(err) {
		console.log("gps-detect(" + uri + "): " + err);
	}
	console.log(exif_gps_data);
	if (!hasGPS(exif_gps_data)) {
		return;
	}

	addHistory(uri, exif_gps_data, buf);
}

function listener(details) {
	// only interested in jpegs
	if (!details.responseHeaders.some(function(x) {
		return x.name.toLowerCase() == "content-type" && x.value.toLowerCase() == "image/jpeg";
	})) {
		return null;
	}

	console.log("Listen" + details.requestId);
	var filter = browser.webRequest.filterResponseData(details.requestId);

	var data = new Uint8Array(0);

	// Takes an ArrayBuffer and appends it to data
	// TODO: be more efficient
	var addData = function(d) {
		var di = new Uint8Array(d);
		var t = new Uint8Array(di.length + data.length);
		t.set(data, 0);
		t.set(di, data.length);
		data = t;
	}

	filter.ondata = function(event) {
		addData(event.data);
		filter.write(event.data);
	}

	filter.onstop = function(event) {
		filter.close();
		handleGPS(details.url, data.buffer);
	}

	return {};
}

console.log("Loaded");

var notificationUrls = {};

browser.notifications.onClicked.addListener(function(notificationId) {
	browser.tabs.create({"url": notificationUrls[notificationId]});
});

browser.webRequest.onHeadersReceived.addListener(listener, {types: ["image","main_frame"], urls: ["http://*/*", "https://*/*"]}, ["blocking", "responseHeaders"]);

browser.runtime.onMessage.addListener(function(data) {
	if (data.type == "history-please") {
		browser.runtime.sendMessage({"type":"history", "history":myHistory});
	}
});
