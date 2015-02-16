// This file contains two classes. ContentTypeObserver which is an nsIObserver for
// content of specific mime types, and TracingListener which is an nsIStreamListener
// which just stores data that is written through and then calls an arbitrary callback
// on the data as long as there was no failure during data transmission.

var { Cc, Ci, Cu, Cr } = require('chrome');
var { Class } = require('sdk/core/heritage');
var { has } = require('sdk/util/array');
var { str2ArrayBuf } = require('./buf_util');

// A TracingListener is a simple class that implements nsIStreamListener
// and wraps another nsIStreamListener. If everything works out okay,
// it keeps track of the entire data stream, and then calls
// callback with (data) where data is an ArrayBuffer with the data
// If there is an error, nothing will happen.
// You'll probably want to .register() it on a channel.
var TracingListener = Class({
	extends: require('sdk/platform/xpcom').Unknown,
	interfaces: ["nsIStreamListener"],
	initialize: function (callback) {
		this.originalListener = null;
		this.callback = callback;
		this.data = "";
	},
	register : function(channel) {
		var tc = channel.QueryInterface(Ci.nsITraceableChannel);
		this.originalListener = tc.setNewListener(this);
	},
	_handleData: function(offset, bytes) {
		if (this.data === null || offset !== this.data.length) {
			// wtf?? (probably range read request or something, we're not going to handle this case)
			this.data = null; // error
			return;
		}
		this.data += bytes;
	},
	_handleDone: function(statusCode) {
		if (statusCode !== Cr.NS_OK || this.data === null) {
			return;
		}
		this.callback(str2ArrayBuf(this.data));
	},
	onDataAvailable: function (request, context, inputStream, offset, count) {
		var binaryInputStream = Cc["@mozilla.org/binaryinputstream;1"].createInstance(Ci.nsIBinaryInputStream);
		var storageStream = Cc["@mozilla.org/storagestream;1"].createInstance(Ci.nsIStorageStream);
		var binaryOutputStream = Cc["@mozilla.org/binaryoutputstream;1"].createInstance(Ci.nsIBinaryOutputStream);

		binaryInputStream.setInputStream(inputStream);
		storageStream.init(8192, count, null);
		binaryOutputStream.setOutputStream(storageStream.getOutputStream(0));

		// Copy received data as they come.
		var data = binaryInputStream.readBytes(count);
		this._handleData(offset, data);

		binaryOutputStream.writeBytes(data, count);

		this.originalListener.onDataAvailable(request, context,
			storageStream.newInputStream(0), offset, count);
	},
	onStartRequest: function (request, context) {
		this.originalListener.onStartRequest (request, context);
	},
	onStopRequest: function (request, context, statusCode) {
		this.originalListener.onStopRequest (request, context, statusCode);
		this._handleDone(statusCode);
	}
});

// ContentTypeObserver is a convenience class for wrapping introspection
// of all http or cache requests for a specific content type.
// It takes in just a mime type, and a callback, which will be called with
// (uri, data) for all instances of content with that mimetype that getAttention
// loaded. The uri will be an nsIURI.
var ContentTypeObserver = Class({
	extends: require('sdk/platform/xpcom').Unknown,
	interfaces: ["nsIObserver"],
	initialize: function(ctype, callback) {
		this.callback = callback;
		this.ctype = ctype;

		this.topics = [
			"http-on-examine-response",
			"http-on-examine-cached-response",
			"http-on-examine-merged-response",
		];
		this.registered = false;
		this.observerService = Cc["@mozilla.org/observer-service;1"].getService(Ci.nsIObserverService);
	},
	register: function() {
		if (this.registered === true) {	return; }
		for(var i = 0; i < this.topics.length; i++) {
			this.observerService.addObserver(this, this.topics[i], false);
		}
		this.registered = true;
	},
	unregister: function() {
		if (this.registered === false) { return; }
		for (var i = 0; i < this.topics.length; i++) {
			this.observerService.removeObserver(this, this.topics[i]);
		}
		this.registered = false;
	},
	observe: function(subject, topic, data) {
		// do you even need this?
		if (!has(this.topics, topic)) { return; }
		
		var httpChannel = subject.QueryInterface(Ci.nsIHttpChannel);
		if (httpChannel.responseStatus !== 200) { return; }

		var ctype = null;
		try {
			ctype = httpChannel.getResponseHeader("Content-Type");
		} catch(err) {
			return; // if there's no content-type then, who knows what to do.
		}
		
		// only interested in looking at one content type
		if (ctype.indexOf(this.ctype) === -1) { return; }

		// Build the callback function to use for the listener.
		// Note that the value of this.callback is taken now,
		// but the value of this.registered is taken before the
		// callback is executed. This means if the callback is changed
		// the old callback value will remain for tracinglisteners
		// that were already created, but that if this is unregistered,
		// we'll block callback calls.
		var cb = this.callback, uri = httpChannel.URI;
		var myCallback = (function(data) {
			if (this.registered !== true) { return; }
			return cb(uri, data);
		}).bind(this);

		var newListener = TracingListener(myCallback);
		newListener.register(subject);
	}
});

exports.TracingListener = TracingListener;
exports.ContentTypeObserver = ContentTypeObserver;