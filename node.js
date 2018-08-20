class WalletNanoNetworkApi extends NanoNetworkApi {
	
	_onInitialized() {
		console.log('Nimiq API ready to use');
		this.addresses = ["NQ40 7G2N J5FN 51MV 95DG FCQ9 ET11 DVMV QR1F"];
		this.connect();
	}

	_onConsensusSyncing() {
		console.log('consensus syncing');
	}

	_onConsensusEstablished() {
		console.log('consensus established at height:' + this._consensus.blockchain.height);
		this._updateWallet();
		// Recheck balance on every head change.
		this._consensus.blockchain.on('head-changed', this._updateWallet);
	}

	_onConsensusLost() {
		console.log('consensus lost');
	}

	_onBalancesChanged(balances) {
		console.log('new balances:', balances);
		for (let [address, balance] of balances) {
			console.log(address, balance);
		}
	}

	_onHistoryChanged(history) {
		console.log('new history: ' + history);
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

	_updateWallet() {
		// Update wallet
		console.log("update wallet");
		this._recheckBalances(this.addresses);
		this.requestTransactionHistory(this.addresses).then(nimiq._onHistoryChanged);	
	}

	/*
	_compileTransactionHistory(addresses, entries = 10) {
		this.historyResults = this.historyResults || new Array();

		if (this.historyResults.length > 0) {
			console.log("!!! got old history");
			const oldHistory = this.historyResults;
			this.historyResults = new Array();
			this._onHistoryChanged(oldHistory);

		} else {
			console.log("!!! trying to get history");
			const requestSize = 10;
			var historyHeight = this._consensus.blockchain.height - requestSize;
			var historyEntries = 0;
	
			var self = this;
	
			function getHistory() {		
				self.knownReceipts = self.knownReceipts || new Map();
				return self.requestTransactionHistory(addresses, self.knownReceipts, historyHeight).then(function (history) {
					var resultEntries = (history.newTransactions.length || 0) + (history.removedTransactions.length || 0) + (history.unresolvedTransactions.length || 0);
					if (resultEntries > 0) {
						console.log("!!! resultEntries: " + resultEntries);
						self._addToKnownReceipts(history);
						self.historyResults.push(history);
						historyEntries += resultEntries;
						console.log("!!! historyEntries: " + historyEntries);
					}
					if (historyHeight > 0 && historyEntries < entries) {
						historyHeight -= requestSize;
						return getHistory();
					}
				});
			}
	
			getHistory().then(function() {
				console.log("!!! got new history");
				const newHistory = self.historyResults;
				self.historyResults = new Array();
				self._onHistoryChanged(newHistory);
			});	
		}
	}

	_addToKnownReceipts(history) {
		for(var entry in history) {
			console.log("!!! entry:" + entry.newTransactions.length);
			if (entry.newTransactions.length) {
				for (let i = 0, j = entry.newTransactions.length; i < j; i++) {
					let tx = entry.newTransactions[i];
					console.log("!!! tx:" + tx);
					this.knownReceipts[tx.hash] = tx.blockHash;
				}
			}
			if (entry.removedTransactions.length) {
				for (let i = 0, j = entry.removedTransactions.length; i < j; i++) {
					let tx = entry.removedTransactions[i];
					this.knownReceipts[tx.hash] = tx.blockHash;
				}
			}
			if (entry.unresolvedTransactions.length) {
				for (let i = 0, j = entry.knownReceipts.length; i < j; i++) {
					let tx = entry.knownReceipts[i];
					this.knownReceipts[tx.hash] = tx.blockHash;
				}
			}
		}
		console.log("!!! knownReceipts: " + this.knownReceipts.size);
	}
	*/
}

var nimiq;

window.onload = function(e){ 
	var textarea = window.document.getElementById("mylogger");
	var loggerFunction = function(obj){
		var str = '';
		for (var i = 0; i < arguments.length; i++) {
			if (i > 0)
				str += ' ';
			str += arguments[i];
		}
		var txt = document.createTextNode(str + '\n');
		textarea.appendChild(txt);
		textarea.scrollTop = textarea.scrollHeight;
	};
	console = {};
	console.log = console.warn = console.error = loggerFunction;

	var container = window.document.getElementById("mylogger-container");
	var toggle = window.document.getElementById("mylogger-toggle");
	toggle.addEventListener("click", function() {
		if (container.clientHeight != toggle.clientHeight) {
			container.style.height = toggle.clientHeight + 'px';
		} else {
			container.style.height = '50%';
		}
	}, false);

	container.style.height = toggle.clientHeight + 'px';

	console.log("initialization");

	nimiq = new WalletNanoNetworkApi(true);
}
