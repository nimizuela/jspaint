nimiq_address = "NQ55 Q8DX VR2X 2HSC GEH8 NY46 RULG Q9KU KEBC";
address_hash = hash(nimiq_address);
not_resizable_canvas = true;
lock_color_mode = true;
lock_transparency_mode = true;
pixel_price = 0.01;
initial_blockchain_height = 0;

class WalletNanoNetworkApi extends NanoNetworkApi {

	_onInitialized() {
		console.log('Nimiq API ready to use');
		this.addresses = [nimiq_address];
		restore_canvas(function(restored) {
			if (!restored) {
				// force fetching all images from the blockchain in case
				// a rasterized copy of the canvas hasn't been saved yet
				storage.set('height#' + address_hash, initial_blockchain_height);
			}
		});
		$status_text.text("Connecting to the Nimiq blockchain...");
		this.connect();
	}

	_onConsensusSyncing() {
		$status_text.text("Syncing with the Nimiq blockchain...");
		console.log('consensus syncing');
	}

	_onConsensusEstablished() {
		$status_text.text("Consensus established...");
		console.log('consensus established at height:' + this._consensus.blockchain.height);
		this.subscribe(this.addresses);
		//this.requestHistory();
	}

	_onConsensusLost() {
		$status_text.text("Consensus lost...");
		console.log('consensus lost');
	}

	_onBalancesChanged(balances) {
		console.log('new balances:', balances);
		// Recheck history on balance change
		this.requestHistory();
	}

	_onTransactionPending(sender, recipient, value, fee, extraData, hash, validityStartHeight) {
		console.log('pending:', { sender, recipient, value, fee, extraData, hash, validityStartHeight });
	}

	_onTransactionExpired(hash) {
		console.log('expired:', hash);
	}

	_onTransactionMined(sender, recipient, value, fee, extraData, hash, blockHeight, timestamp, validityStartHeight) {
		console.log('mined:', { sender, recipient, value, fee, extraData, hash, blockHeight, timestamp, validityStartHeight });
	}

	_onTransactionRelayed(sender, recipient, value, fee, extraData, hash, validityStartHeight) {
		console.log('relayed:', { sender, recipient, value, fee, extraData, hash, validityStartHeight });
	}

	_onDifferentTabError(e) {
		console.log('Nimiq API is already running in a different tab:', e);
	}

	_onInitializationError(e) {
		console.error('Nimiq API could not be initialized:', e);
	}

	_onHeadChange(header) {
		console.log('height changed to:' + this._consensus.blockchain.height);
		const height = this._consensus.blockchain.height;
		const difficulty = this._consensus.blockchain.head.difficulty;
		const hashrate = this._globalHashrate(difficulty);
		console.log(`Now at height ${height} with hashrate ${hashrate}.`);
	}

	_onPeersChanged() {
		console.log('peers changed:', this._consensus.network.peerCount);
	}

	requestHistory() {
		// Request history from last height
		var self = this;
		var knownReceipts = new Map();
		storage.get('height#' + address_hash, function(err, value) {
			var lastCheckedHeight = value | initial_blockchain_height;
			var requestedAtdHeight = self._consensus.blockchain.height;
			self.requestTransactionHistory(self.addresses, knownReceipts, lastCheckedHeight).then(function(history){
				console.log('got new history');
				//var regex = /^[a-zA-Z\d]{7}$/ ;
				var regex = /^([a-zA-Z\d]{7}|[-+]?\d+,[-+]?\d+,[a-zA-Z\d]{7}(\.[a-zA-Z\d-_\.]+)?)$/;
				var newTransactions = history.newTransactions;
				//console.log(JSON.stringify(newTransactions, null, 2));
				var receivedTransactions = newTransactions.filter(tx => self.addresses.indexOf(tx.recipient) > -1 && regex.test(tx.extraData));
		
				if (receivedTransactions.length == 0) {
					show_editor();
					return;
				}
	
				var images = new Array(receivedTransactions.length);
				var currentImage = 0;
				var fetchedImages = 0;
				$status_text.text("Fetching images...");
				for (var i = 0, l = receivedTransactions.length; i < l; i++) {
					var tx = receivedTransactions[i];
					var extraData = tx.extraData;
					var matches = /^([+-]?\d+)?,?([+-]?\d+)?,?([a-zA-Z\d]{7})(\.[a-zA-Z\d-_\.]+)?$/.exec(extraData);
					(function() {
						var req = new XMLHttpRequest();
						var index = i;
						var imageX = matches[1] | 0;
						var imageY = matches[2] | 0;
						var imageID = matches[3];
						var imageValue = tx.value;
		
						req.addEventListener("readystatechange", function() {
							if(req.readyState == 4){
								// posible status codes -> https://api.imgur.com/errorhandling#200
								if (req.status == 200){
									var response = JSON.parse(req.responseText);
									if(!response) return;
		
									if(!response.success){
										return;
									}
		
									//console.log(JSON.stringify(response, null, 2));
		
									var imageW = response.data.width;
									var imageH = response.data.height;
									var imageSize = response.data.size;
									var imageURL = response.data.link;
									var blob_url = new URL(imageURL);
		
									load_image_from_URI(blob_url, function(err, img){
										if(err){
											return show_resource_load_error_message();
										}
		
										var imageData = {
											"x": imageX,
											"y": imageY,
											"width": imageW,
											"height": imageH,
											"size": imageSize,
											"url": imageURL,
											"id": imageID,
											"blob_url": blob_url,
											"img": img,
											"value": imageValue
										};
		
										console.log('got image ' + (index + 1) + ': ' + imageData.url);
										images[index] = imageData;
		
										paste_images();
									});
								} else if (req.status == 404) {
									console.log('image ' + (index + 1) + ' not found: ' + imageID);
									images[index] = {};
									paste_images();
								} else {
									console.log('image ' + (index + 1) + ' returned error ' + req.status + ': ' + imageID);
								}
							}
						});
						req.open("GET", "https://api.imgur.com/3/image/" + imageID, true);
						req.setRequestHeader("Authorization", "Client-ID 4d0d3274beac836");
						req.setRequestHeader("Accept", "application/json");
						req.send(null);
						console.log('requesting image ' + (index + 1) + ': ' + imageID);
		
						function paste_images(){
							fetchedImages++;
							$status_text.text("Fetching images... (" + fetchedImages + "/" + images.length + ")");
		
							while(!!images[currentImage]) {
								if (images[currentImage].img){
									var c = new Canvas(images[currentImage].img);
									var id = c.ctx.getImageData(0, 0, c.width, c.height);
									var pixels_count = 0;
									for(var i=0; i<id.data.length; i+=4){
										if (
											id.data[i+0] != 0 ||
											id.data[i+1] != 0 ||
											id.data[i+2] != 0 ||
											id.data[i+3] != 0
										){
											pixels_count++;
										}
									}
									if (image_price(pixels_count) <= images[currentImage].value){
										console.log('paste image ' + (currentImage + 1) + ' (' + pixels_count + ' px @ ' + images[currentImage].value + ' NIM)');
										bg_ctx.drawImage(images[currentImage].img, images[currentImage].x, images[currentImage].y);
									}
								}
								images[currentImage] = null;
								currentImage++;
							}
		
							if (currentImage == images.length) {
								save_changes();
								show_editor();
							}
						}
					})();
				}
		
				function show_editor() {
					storage.set('height#' + address_hash, requestedAtdHeight);
					$status_nimiq_connection.removeClass("status-nimiq-connecting");
					$status_text.default();
				}
			});
		});
	}
}

var nimiq;

window.onload = function(e){
	var autoScroll = true;
	var $textarea = $("#mylogger");
	var loggerFunction = function(obj){
		var str = '';
		for (var i = 0; i < arguments.length; i++) {
			if (i > 0)
				str += ' ';
			str += arguments[i];
		}
		var txt = document.createTextNode(str + '\n');
		$textarea.append(txt);
		if (autoScroll) {
			$textarea.scrollTop($textarea.prop('scrollHeight'));
		}
	};
	console = {};
	console.log = console.warn = console.error = loggerFunction;

	$textarea.on('scroll', function() {
		if (($textarea.scrollTop() + $textarea.outerHeight()) > $textarea.prop('scrollHeight')) {
			autoScroll = true;
		} else {
			autoScroll = false;
		}
	});

	var $container = $("#mylogger-container");
	var $toggle = $("#mylogger-toggle");
	$toggle.on("click", function() {
		storage.get('logger', function(err, value){
			if (value) {
				$container.animate({
					top: "+=50%"
				}, 300);
			} else {
				$container.animate({
					top: "-=50%"
				}, 300);
			}
			storage.set('logger', !value);
		});
	});

	storage.get('logger', function(err, value){
		if (typeof value == "undefined" || value == false) {
			$container.animate({
				top: "+=50%"
			}, 300);
		}
	});

	console.log("initialization");

	var requested_address = get_param("address");
	if (requested_address) {
		nimiq_address = requested_address.replace(/[-_]/g, " ");
		address_hash = hash(nimiq_address);
	}
	console.log('showing Nimiq address: ' + nimiq_address);

	$status_text.text("Initializing Nimiq blockchain node...");
	$status_nimiq_connection.addClass("status-nimiq-connecting");

	nimiq = new WalletNanoNetworkApi(true);
}

function image_price(pixels) {
	return parseFloat(pixels * pixel_price).toFixed(2);
}

function get_param(name) {
	var regex = new RegExp('[?&]'+encodeURIComponent(name)+'=([^&]*)');
	var matches = regex.exec(location.search)
	if (matches) {
		return decodeURIComponent(matches[1]);
	}
}

function hash(text) {
	function chaosHash(number) {
		const k = 3.569956786876;
		let a_n = 1 / number;
		for (let i = 0; i < 100; i++) {
			a_n = (1 - a_n) * a_n * k;
		}
		return a_n;
	}
	
	return parseInt(('' + text
			.split('')
			.map(c => Number(c.charCodeAt(0)) + 3)
			.reduce((a, e) => a * (1 - a) * chaosHash(e), 0.5))
		.split('')
		.reduce((a, e) => e + a, '')
		.substr(4, 17))
		.toString(16);
}
