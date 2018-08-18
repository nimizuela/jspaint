(function() {

    function _invoke(body, then) {
        var result = body();
        if (result && result.then) {
            return result.then(then);
        }
        return then(result);
    }
    
    function _forOf(target, body, check) {
        if (typeof Symbol !== "undefined") {
            var iteratorSymbol = Symbol.iterator;
            if (iteratorSymbol && iteratorSymbol in target) {
                var iterator = target[iteratorSymbol]();
                var step;
                var iteration = _for(check ? function() {
                    return !(step = iterator.next()).done && !check();
                } : function() {
                    return !(step = iterator.next()).done;
                }, void 0, function() {
                    return body(step.value);
                });
                if (iterator.return) {
                    function _fixup(value) {
                        // Inform iterator of early exit
                        if ((!step || !step.done) && iterator.return) {
                            try {
                                iterator.return();
                            } catch (e) {}
                        }
                        return value;
                    };
                    if (iteration && iteration.then) {
                        return iteration.then(_fixup, function(error) {
                            throw _fixup(error);
                        });
                    } else {
                        return _fixup(iteration);
                    }
                } else {
                    return iteration;
                }
            }
        } // No support for Symbol.iterator
        if (!("length" in target)) {
            throw new TypeError("value is not iterable");
        } // Handle live collections properly
        var values = [];
    
        for (var i = 0; i < target.length; i++) {
            values.push(target[i]);
        }
        return _forValues(values, body, check);
    }
    
    function _forValues(array, body, check) {
        var i = 0;
        return _for(check ? function() {
            return i < array.length && !check();
        } : function() {
            return i < array.length;
        }, function() {
            i++;
        }, function() {
            return body(array[i]);
        });
    }
    
    function _invokeIgnored(body) {
        var result = body();
        if (result && result.then) {
            return result.then(_empty);
        }
    }
    
    function _for(test, update, body) {
        var stage;
        for (;;) {
            var shouldContinue = test();
            if (_isSettledPact(shouldContinue)) {
                shouldContinue = shouldContinue.__value;
            }
            if (!shouldContinue) {
                return result;
            }
            if (shouldContinue.then) {
                stage = 0;
                break;
            }
            var result = body();
            if (result && result.then) {
    
                if (_isSettledPact(result)) {
                    result = result.__state;
                } else {
                    stage = 1;
                    break;
                }
            }
            if (update) {
                var updateValue = update();
                if (updateValue && updateValue.then && !_isSettledPact(updateValue)) {
                    stage = 2;
                    break;
                }
            }
        }
        var pact = new _Pact();
        var reject = _settle.bind(null, pact, 2);
        (stage === 0 ? shouldContinue.then(_resumeAfterTest) : stage === 1 ? result.then(_resumeAfterBody) : updateValue.then(_resumeAfterUpdate)).then(void 0, reject);
        return pact;
    
        function _resumeAfterBody(value) {
            result = value;
            do {
                if (update) {
                    updateValue = update();
                    if (updateValue && updateValue.then && !_isSettledPact(updateValue)) {
                        updateValue.then(_resumeAfterUpdate).then(void 0, reject);
                        return;
                    }
                }
                shouldContinue = test();
                if (!shouldContinue || _isSettledPact(shouldContinue) && !shouldContinue.__value) {
                    _settle(pact, 1, result);
                    return;
                }
                if (shouldContinue.then) {
                    shouldContinue.then(_resumeAfterTest).then(void 0, reject);
                    return;
                }
                result = body();
                if (_isSettledPact(result)) {
                    result = result.__value;
                }
            } while (!result || !result.then);
            result.then(_resumeAfterBody).then(void 0, reject);
        }
    
        function _resumeAfterTest(shouldContinue) {
            if (shouldContinue) {
                result = body();
                if (result && result.then) {
                    result.then(_resumeAfterBody).then(void 0, reject);
                } else {
                    _resumeAfterBody(result);
                }
            } else {
                _settle(pact, 1, result);
            }
        }
    
        function _resumeAfterUpdate() {
            if (shouldContinue = test()) {
                if (shouldContinue.then) {
                    shouldContinue.then(_resumeAfterTest).then(void 0, reject);
                } else {
                    _resumeAfterTest(shouldContinue);
                }
            } else {
                _settle(pact, 1, result);
            }
        }
    }
    
    function _isSettledPact(thenable) {
        return thenable instanceof _Pact && thenable.__state === 1;
    }
    const _Pact = function() {
        function _Pact() {}
        _Pact.prototype.then = function(onFulfilled, onRejected) {
            const state = this.__state;
            if (state) {
                const callback = state == 1 ? onFulfilled : onRejected;
                if (callback) {
                    const result = new _Pact();
                    try {
                        _settle(result, 1, callback(this.__value));
                    } catch (e) {
                        _settle(result, 2, e);
                    }
                    return result;
                } else {
                    return this;
                }
            }
            const result = new _Pact();
            this.__observer = function(_this) {
                try {
                    const value = _this.__value;
                    if (_this.__state == 1) {
                        _settle(result, 1, onFulfilled ? onFulfilled(value) : value);
                    } else if (onRejected) {
                        _settle(result, 1, onRejected(value));
                    } else {
                        _settle(result, 2, value);
                    }
                } catch (e) {
                    _settle(result, 2, e);
                }
            };
            return result;
        };
        return _Pact;
    }();
    
    function _settle(pact, state, value) {
        if (!pact.__state) {
            if (value instanceof _Pact) {
                if (value.__state) {
                    if (state === 1) {
                        state = value.__state;
                    }
                    value = value.__value;
                } else {
                    value.__observer = _settle.bind(null, pact, state);
                    return;
                }
            }
            if (value && value.then) {
                value.then(_settle.bind(null, pact, state), _settle.bind(null, pact, 2));
                return;
            }
            pact.__state = state;
            pact.__value = value;
            const observer = pact.__observer;
            if (observer) {
                observer(pact);
            }
        }
    }
    
    function _awaitIgnored(value, direct) {
        if (!direct) {
            return Promise.resolve(value).then(_empty);
        }
    }
    
    function _empty() {}
    
    function _continue(value, then) {
        return value && value.then ? value.then(then) : then(value);
    }
    
    function _catch(body, recover) {
        try {
            var result = body();
        } catch (e) {
            return recover(e);
        }
        if (result && result.then) {
            return result.then(void 0, recover);
        }
        return result;
    }
    
    function _call(body, then, direct) {
        if (direct) {
            return then ? then(body()) : body();
        }
        try {
            var result = Promise.resolve(body());
            return then ? result.then(then) : result;
        } catch (e) {
            return Promise.reject(e);
        }
    }
    const _async = function() {
        try {
            if (isNaN.apply(null, {})) {
                return function(f) {
                    return function() {
                        try {
                            return Promise.resolve(f.apply(this, arguments));
                        } catch (e) {
                            return Promise.reject(e);
                        }
                    };
                };
            }
        } catch (e) {}
        return function(f) {
            // Pre-ES5.1 JavaScript runtimes don't accept array-likes in Function.apply
            return function() {
                var args = [];
                for (var i = 0; i < arguments.length; i++) {
                    args[i] = arguments[i];
                }
                try {
                    return Promise.resolve(f.apply(this, args));
                } catch (e) {
                    return Promise.reject(e);
                }
            };
        };
    }();
    
    function _await(value, then, direct) {
        if (direct) {
            return then ? then(value) : value;
        }
        value = Promise.resolve(value);
        return then ? value.then(then) : value;
    }

	class Utf8Tools {

		/**
		 * @param {string} str
		 * @returns {Uint8Array}
		 */
		static stringToUtf8ByteArray(str) {
			// TODO: Use native implementations if/when available
			var out = [],
				p = 0;
			for (var i = 0; i < str.length; i++) {
				var c = str.charCodeAt(i);
				if (c < 128) {
					out[p++] = c;
				} else if (c < 2048) {
					out[p++] = c >> 6 | 192;
					out[p++] = c & 63 | 128;
				} else if ((c & 0xFC00) == 0xD800 && i + 1 < str.length && (str.charCodeAt(i + 1) & 0xFC00) == 0xDC00) {
					// Surrogate Pair
					c = 0x10000 + ((c & 0x03FF) << 10) + (str.charCodeAt(++i) & 0x03FF);
					out[p++] = c >> 18 | 240;
					out[p++] = c >> 12 & 63 | 128;
					out[p++] = c >> 6 & 63 | 128;
					out[p++] = c & 63 | 128;
				} else {
					out[p++] = c >> 12 | 224;
					out[p++] = c >> 6 & 63 | 128;
					out[p++] = c & 63 | 128;
				}
			}
			return new Uint8Array(out);
		}

		/**
		 * @param {Uint8Array} bytes
		 * @returns {string}
		 */
		static utf8ByteArrayToString(bytes) {
			// TODO: Use native implementations if/when available
			var out = [],
				pos = 0,
				c = 0;
			while (pos < bytes.length) {
				var c1 = bytes[pos++];
				if (c1 < 128) {
					out[c++] = String.fromCharCode(c1);
				} else if (c1 > 191 && c1 < 224) {
					var c2 = bytes[pos++];
					out[c++] = String.fromCharCode((c1 & 31) << 6 | c2 & 63);
				} else if (c1 > 239 && c1 < 365) {
					// Surrogate Pair
					var c2 = bytes[pos++];
					var c3 = bytes[pos++];
					var c4 = bytes[pos++];
					var u = ((c1 & 7) << 18 | (c2 & 63) << 12 | (c3 & 63) << 6 | c4 & 63) - 0x10000;
					out[c++] = String.fromCharCode(0xD800 + (u >> 10));
					out[c++] = String.fromCharCode(0xDC00 + (u & 1023));
				} else {
					var c2 = bytes[pos++];
					var c3 = bytes[pos++];
					out[c++] = String.fromCharCode((c1 & 15) << 12 | (c2 & 63) << 6 | c3 & 63);
				}
			}
			return out.join('');
		}
	}

	class NanoNetworkApi {

		static get API_URL() {
			return './lib/nimiq.js';
		}

		static getApi() {
			this._api = this._api || new NanoNetworkApi();
			return this._api;
		}

		constructor() {
            var _this = this;

			this._apiInitialized = new Promise(_async(function(resolve) {
				return _await(NanoNetworkApi._importApi(), function() {
					return _await(Nimiq.load(), function() {
                        // setTimeout(resolve, 500);
                        _this._onInitialized();
						resolve();
					});
				});
			}));
			this._createConsensusPromise();

			this._selfRelayedTransactionHashes = new Set();

			this._balances = new Map();
		}

		connect() {
			var _this1 = this;

			return _call(function() {
				return _await(_this1._apiInitialized, function() {

					Nimiq.GenesisConfig['main']();

					return _await(Nimiq.Consensus.volatileNano(), function(_Nimiq$Consensus$vola) {
						_this1._consensus = _Nimiq$Consensus$vola;
						_this1._consensus.on('syncing', e => _this1._onConsensusSyncing());
						_this1._consensus.on('established', e => _this1.__consensusEstablished());
						_this1._consensus.on('lost', e => _this1._consensusLost());

						_this1._consensus.on('transaction-relayed', tx => _this1._transactionRelayed(tx));

						// this._consensus.on('sync-finished', e => console.log('consensus sync-finished'));
						// this._consensus.on('sync-failed', e => console.log('consensus sync-failed'));
						// this._consensus.on('sync-chain-proof', e => console.log('consensus sync-chain-proof'));
						// this._consensus.on('verify-chain-proof', e => console.log('consensus verify-chain-proof'));

						_this1._consensus.network.connect();

						_this1._consensus.blockchain.on('head-changed', block => _this1._headChanged(block.header));
						_this1._consensus.mempool.on('transaction-added', tx => _this1._transactionAdded(tx));
						_this1._consensus.mempool.on('transaction-expired', tx => _this1._transactionExpired(tx));
						_this1._consensus.mempool.on('transaction-mined', (tx, header) => _this1._transactionMined(tx, header));
						_this1._consensus.network.on('peers-changed', () => _this1._onPeersChanged());
					});
				});
			});
		}

		_headChanged(header) {
			var _this2 = this;

			return _call(function() {
				if (!_this2._consensus.established) return;
				_this2._recheckBalances();
				_this2._onHeadChange(header);
			});
		}

		/**
		 * @returns {Array<Account>} An array element can be NULL if account does not exist
		 */
		_getAccounts(addresses, stackHeight) {
			var _this3 = this;

			return _call(function() {
				if (addresses.length === 0) return [];
				return _await(_this3._consensusEstablished, function() {
					var _exit = false;

					let accounts;
					const addressesAsAddresses = addresses.map(address => Nimiq.Address.fromUserFriendlyAddress(address));
					return _continue(_catch(function() {
						return _await(_this3._consensus.getAccounts(addressesAsAddresses), function(_this3$_consensus$get) {
							accounts = _this3$_consensus$get;
						});
					}, function() {
						stackHeight = stackHeight || 0;
						stackHeight++;
						_exit = true;
						return _await(new Promise(resolve => {
							const timeout = 1000 * stackHeight;
							setTimeout(_async(function(_) {
								return _await(_this3._getAccounts(addresses, stackHeight), function(_this3$_getAccounts) {
									resolve(_this3$_getAccounts);
								});
							}), timeout);
							console.warn(`Could not retrieve accounts from consensus, retrying in ${timeout / 1000} s`);
						}));
					}), function(_result) {
						return _exit ? _result : accounts;
					});
				});
			});
		}

		/**
		 * @param {Array<string>} addresses
		 */
		_subscribeAddresses(addresses) {
			var _this4 = this;

			return _call(function() {
				const addressesAsAddresses = addresses.map(address => Nimiq.Address.fromUserFriendlyAddress(address));
				return _await(_this4._consensusEstablished, function() {
					_this4._consensus.subscribeAccounts(addressesAsAddresses);
				});
			});
		}

		/**
		 * @param {Array<string>} addresses
		 * @returns {Map}
		 */
		_getBalances(addresses) {
			var _this5 = this;

			return _call(function() {
				return _await(_this5._getAccounts(addresses), function(accounts) {

					const balances = new Map();

					accounts.forEach((account, i) => {
						const address = addresses[i];
						const balance = account ? Nimiq.Policy.satoshisToCoins(account.balance) : 0;
						balances.set(address, balance);
					});

					return balances;
				});
			});
		}

		/**
		 * @param {string} address
		 * @param {Map} [knownReceipts] A map with the tx hash as key and the blockhash as value
		 * @param {uint} [fromHeight]
		 */
		_requestTransactionHistory(address, knownReceipts = new Map(), fromHeight = 0) {
			var _this6 = this;

			return _call(function() {
				return _await(_this6._consensusEstablished, function() {
					var _exit2 = false;

					address = Nimiq.Address.fromUserFriendlyAddress(address);

					// Inpired by Nimiq.BaseConsensus._requestTransactionHistory()

					// 1. Get transaction receipts.
					let receipts;
					let retryCounter = 1;
					return _continue(_for(function() {
						return !_exit2 && !(receipts instanceof Array);
					}, void 0, function() {
						// Return after the 3rd try
						if (retryCounter >= 4) {
							_exit2 = true;
							return {
								transactions: [],
								removedTxHashes: []
							};
						}
						return _continue(_catch(function() {
							return _await(_this6._consensus._requestTransactionReceipts(address), function(_this6$_consensus$_re) {
								receipts = _this6$_consensus$_re;
							}); //console.log(`Received ${receipts.length} receipts from the network.`);
						}, function() {
							return _awaitIgnored(new Promise(res => setTimeout(res, 1000))); // wait 1 sec until retry
						}), function() {

							retryCounter++;
						});
					}), function(_result2) {
						if (_exit2) return _result2;


						// 2 Filter out known receipts.
						const knownTxHashes = [...knownReceipts.keys()];
						const receiptTxHashes = receipts.map(r => r.transactionHash.toBase64());

						const removedTxHashes = knownTxHashes.filter(knownTxHash => !receiptTxHashes.includes(knownTxHash));

						receipts = receipts.filter(receipt => {
								if (receipt.blockHeight < fromHeight) return false;

								const hash = receipt.transactionHash.toBase64();

								// Known transaction
								if (knownTxHashes.includes(hash)) {
									// Check if block has changed
									return receipt.blockHash.toBase64() !== knownReceipts.get(hash);
								}

								// Unknown transaction
								return true;
							})
							// Sort in reverse, to resolve recent transactions first
							.sort((a, b) => b.blockHeight - a.blockHeight);

						// console.log(`Reduced to ${receipts.length} unknown receipts.`);

						const unresolvedReceipts = [];

						// 3. Request proofs for missing blocks.
						/** @type {Array.<Promise.<Block>>} */
						const blockRequests = [];
						let lastBlockHash = null;
						return _continue(_forOf(receipts, function(receipt) {
							return _invokeIgnored(function() {
								if (!receipt.blockHash.equals(lastBlockHash)) {
									// eslint-disable-next-line no-await-in-loop
									return _await(_this6._consensus._blockchain.getBlock(receipt.blockHash), function(block) {
										if (block) {
											blockRequests.push(Promise.resolve(block));
										} else {
											const request = _this6._consensus._requestBlockProof(receipt.blockHash, receipt.blockHeight).catch(e => {
												unresolvedReceipts.push(receipt);
												console.error(NanoNetworkApi, `Failed to retrieve proof for block ${receipt.blockHash}` + ` (${e}) - transaction history may be incomplete`);
											});
											blockRequests.push(request);
										}

										lastBlockHash = receipt.blockHash;
									});
								}
							});
						}), function() {
							return _await(Promise.all(blockRequests), function(blocks) {

								// console.log(`Transactions are in ${blocks.length} blocks`);
								// if (unresolvedReceipts.length) console.log(`Could not get block for ${unresolvedReceipts.length} receipts`);

								// 4. Request transaction proofs.
								const transactionRequests = [];
								for (const block of blocks) {
									if (!block) continue;

									const request = _this6._consensus._requestTransactionsProof([address], block).then(txs => txs.map(tx => ({
										transaction: tx,
										header: block.header
									}))).catch(e => console.error(NanoNetworkApi, `Failed to retrieve transactions for block ${block.hash()}` + ` (${e}) - transaction history may be incomplete`));
									transactionRequests.push(request);
								}

								return _await(Promise.all(transactionRequests), function(transactions) {

									// Reverse array, so that oldest transactions are first
									transactions.reverse();
									unresolvedReceipts.reverse();

									return {
										transactions: transactions.reduce((flat, it) => it ? flat.concat(it) : flat, []).sort((a, b) => a.header.height - b.header.height),
										removedTxHashes,
										unresolvedReceipts
                                    };
								});
							});
						});
					});
				});
			});
		}

		__consensusEstablished() {
			this._consensusEstablishedResolver();
			this._headChanged(this._consensus.blockchain.head);
			this._onConsensusEstablished();
		}

		_consensusLost() {
			this._createConsensusPromise();
			this._onConsensusLost();
		}

		_transactionAdded(tx) {
			// Self-relayed transactions are added by the 'transaction-requested' event
			const hash = tx.hash().toBase64();
			if (this._selfRelayedTransactionHashes.has(hash)) return;

			const senderAddr = tx.sender.toUserFriendlyAddress();
			const recipientAddr = tx.recipient.toUserFriendlyAddress();

			// Handle tx amount when the sender is own account
			this._balances.has(senderAddr) && this._recheckBalances(senderAddr);

			this._onTransactionPending(senderAddr, recipientAddr, Nimiq.Policy.satoshisToCoins(tx.value), Nimiq.Policy.satoshisToCoins(tx.fee), Utf8Tools.utf8ByteArrayToString(tx.data), hash, tx.validityStartHeight);
		}

		_transactionExpired(tx) {
			const senderAddr = tx.sender.toUserFriendlyAddress();

			// Handle tx amount when the sender is own account
			this._balances.has(senderAddr) && this._recheckBalances(senderAddr);

			this._onTransactionExpired(tx.hash().toBase64());
		}

		_transactionMined(tx, header) {
			const senderAddr = tx.sender.toUserFriendlyAddress();
			const recipientAddr = tx.recipient.toUserFriendlyAddress();

			// Handle tx amount when the sender is own account
			this._balances.has(senderAddr) && this._recheckBalances(senderAddr);

			this._onTransactionMined(senderAddr, recipientAddr, Nimiq.Policy.satoshisToCoins(tx.value), Nimiq.Policy.satoshisToCoins(tx.fee), Utf8Tools.utf8ByteArrayToString(tx.data), tx.hash().toBase64(), header.height, header.timestamp, tx.validityStartHeight);
		}

		_transactionRelayed(tx) {
			const senderAddr = tx.sender.toUserFriendlyAddress();
			const recipientAddr = tx.recipient.toUserFriendlyAddress();

			// Handle tx amount when the sender is own account
			this._balances.has(senderAddr) && this._recheckBalances(senderAddr);

			this._onTransactionRelayed(senderAddr, recipientAddr, Nimiq.Policy.satoshisToCoins(tx.value), Nimiq.Policy.satoshisToCoins(tx.fee), Utf8Tools.utf8ByteArrayToString(tx.data), tx.hash().toBase64(), tx.validityStartHeight);
		}

		_createConsensusPromise() {
			this._consensusEstablished = new Promise(resolve => {
				this._consensusEstablishedResolver = resolve;
			});
		}

		_globalHashrate(difficulty) {
			return Math.round(difficulty * Math.pow(2, 16) / Nimiq.Policy.BLOCK_TIME);
		}

		_recheckBalances(addresses) {
			var _this7 = this;

			return _call(function() {
				if (!addresses) addresses = [..._this7._balances.keys()];
				if (!(addresses instanceof Array)) addresses = [addresses];

				return _await(_this7._getBalances(addresses), function(balances) {

					for (let [address, balance] of balances) {
						balance -= _this7._getPendingAmount(address);

						if (_this7._balances.get(address) === balance) {
							balances.delete(address);
							continue;
						}

						balances.set(address, balance);
						_this7._balances.set(address, balance);
					}

					if (balances.size) _this7._onBalancesChanged(balances);
				});
			});
		}

		_getPendingAmount(address) {
			const txs = this._consensus.mempool.getPendingTransactions(Nimiq.Address.fromUserFriendlyAddress(address));
			const pendingAmount = txs.reduce((acc, tx) => acc + Nimiq.Policy.satoshisToCoins(tx.value + tx.fee), 0);
			return pendingAmount;
		}

		/*
		    Public API
		         @param {Object} obj: {
		        sender: <user friendly address>,
		        senderPubKey: <serialized public key>,
		        recipient: <user friendly address>,
		        value: <value in NIM>,
		        fee: <fee in NIM>,
		        validityStartHeight: <integer>,
		        signature: <serialized signature>
		    }
		*/
		relayTransaction(txObj) {
			var _this8 = this;

			return _call(function() {
				return _await(_this8._consensusEstablished, function() {
					let tx;
					return _invoke(function() {
						if (txObj.extraData && txObj.extraData.length > 0) {
							return _await(_this8._createExtendedTransactionFromObject(txObj), function(_this8$_createExtende) {
								tx = _this8$_createExtende;
							});
						} else {
							return _await(_this8._createBasicTransactionFromObject(txObj), function(_this8$_createBasicTr) {
								tx = _this8$_createBasicTr;
							});
						}
					}, function() {
						// console.log("Debug: transaction size was:", tx.serializedSize);
						_this8._selfRelayedTransactionHashes.add(tx.hash().toBase64());
						return _this8._consensus.relayTransaction(tx);
					});
				});
			});
		}

		getTransactionSize(txObj) {
			var _this9 = this;

			return _call(function() {
				return _await(_this9._apiInitialized, function() {
					let tx;
					return _invoke(function() {
						if (txObj.extraData && txObj.extraData.length > 0) {
							return _await(_this9._createExtendedTransactionFromObject(txObj), function(_this9$_createExtende) {
								tx = _this9$_createExtende;
							});
						} else {
							return _await(_this9._createBasicTransactionFromObject(txObj), function(_this9$_createBasicTr) {
								tx = _this9$_createBasicTr;
							});
						}
					}, function() {
						return tx.serializedSize;
					});
				});
			});
		}

		_createBasicTransactionFromObject(obj) {
			var _this10 = this;

			return _call(function() {
				return _await(_this10._apiInitialized, function() {
					const senderPubKey = Nimiq.PublicKey.unserialize(new Nimiq.SerialBuffer(obj.senderPubKey));
					const recipientAddr = Nimiq.Address.fromUserFriendlyAddress(obj.recipient);
					const value = Nimiq.Policy.coinsToSatoshis(obj.value);
					const fee = Nimiq.Policy.coinsToSatoshis(obj.fee);
					const validityStartHeight = parseInt(obj.validityStartHeight);
					const signature = Nimiq.Signature.unserialize(new Nimiq.SerialBuffer(obj.signature));

					return new Nimiq.BasicTransaction(senderPubKey, recipientAddr, value, fee, validityStartHeight, signature);
				});
			});
		}

		_createExtendedTransactionFromObject(obj) {
			var _this11 = this;

			return _call(function() {
				return _await(_this11._apiInitialized, function() {
					const senderPubKey = Nimiq.PublicKey.unserialize(new Nimiq.SerialBuffer(obj.senderPubKey));
					const senderAddr = senderPubKey.toAddress();
					const recipientAddr = Nimiq.Address.fromUserFriendlyAddress(obj.recipient);
					const value = Nimiq.Policy.coinsToSatoshis(obj.value);
					const fee = Nimiq.Policy.coinsToSatoshis(obj.fee);
					const validityStartHeight = parseInt(obj.validityStartHeight);
					const signature = Nimiq.Signature.unserialize(new Nimiq.SerialBuffer(obj.signature));
					const data = Utf8Tools.stringToUtf8ByteArray(obj.extraData);

					const proof = Nimiq.SignatureProof.singleSig(senderPubKey, signature);
					const serializedProof = proof.serialize();

					return new Nimiq.ExtendedTransaction(senderAddr, Nimiq.Account.Type.BASIC, recipientAddr, Nimiq.Account.Type.BASIC, value, fee, validityStartHeight, Nimiq.Transaction.Flag.NONE, data, serializedProof);
				});
			});
		}

		/**
		 * @param {string|Array<string>} addresses
		 */
		subscribe(addresses) {
			var _this12 = this;

			return _call(function() {
				if (!(addresses instanceof Array)) addresses = [addresses];
				_this12._subscribeAddresses(addresses);
				_this12._recheckBalances(addresses);
			});
		}

		/**
		 * @param {string|Array<string>} addresses
		 * @returns {Map}
		 */
		getBalance(addresses) {
			if (!(addresses instanceof Array)) addresses = [addresses];

			const balances = this._getBalances(addresses);
			for (const [address, balance] of balances) {
				this._balances.set(address, balance);
			}

			return balances;
		}

		getAccountTypeString(address) {
			var _this13 = this;

			return _call(function() {
				return _await(_this13._getAccounts([address]), function(_this13$_getAccounts) {
					const account = _this13$_getAccounts[0];

					if (!account) return 'basic';

					// See Nimiq.Account.Type
					switch (account.type) {
						case Nimiq.Account.Type.BASIC:
							return 'basic';
						case Nimiq.Account.Type.VESTING:
							return 'vesting';
						case Nimiq.Account.Type.HTLC:
							return 'htlc';
						default:
							return false;
					}
				});
			});
		}

		/**
		 * @param {string|Array<string>} addresses
		 * @param {Map} [knownReceipts] A map with the tx hash as key and the blockhash as value
		 * @param {uint} [fromHeight]
		 */
		requestTransactionHistory(addresses, knownReceipts = new Map(), fromHeight = 0) {
			var _this14 = this;

			return _call(function() {
				if (!(addresses instanceof Array)) addresses = [addresses];

				return _await(Promise.all(addresses.map(address => _this14._requestTransactionHistory(address, knownReceipts.get(address), fromHeight))), function(results) {

					// txs is an array of objects of arrays, which have the format {transaction: Nimiq.Transaction, header: Nimiq.BlockHeader}
					// We need to reduce this to usable simple tx objects

					// Construct arrays with their relavant information
					let txs = results.map(r => r.transactions);
					let removedTxs = results.map(r => r.removedTxHashes);
					let unresolvedTxs = results.map(r => r.unresolvedReceipts);

					// First, reduce
					txs = txs.reduce((flat, it) => it ? flat.concat(it) : flat, []);
					removedTxs = removedTxs.reduce((flat, it) => it ? flat.concat(it) : flat, []);
					unresolvedTxs = unresolvedTxs.reduce((flat, it) => it ? flat.concat(it) : flat, []);

					// Then map to simple objects
					txs = txs.map(tx => ({
						sender: tx.transaction.sender.toUserFriendlyAddress(),
						recipient: tx.transaction.recipient.toUserFriendlyAddress(),
						value: Nimiq.Policy.satoshisToCoins(tx.transaction.value),
						fee: Nimiq.Policy.satoshisToCoins(tx.transaction.fee),
						extraData: Utf8Tools.utf8ByteArrayToString(tx.transaction.data),
						hash: tx.transaction.hash().toBase64(),
						blockHeight: tx.header.height,
						blockHash: tx.header.hash().toBase64(),
						timestamp: tx.header.timestamp,
						validityStartHeight: tx.validityStartHeight
					}));

					// Remove duplicate txs
					const _txHashes = txs.map(tx => tx.hash);
					txs = txs.filter((tx, index) => {
						return _txHashes.indexOf(tx.hash) === index;
					});

					return {
						newTransactions: txs,
						removedTransactions: removedTxs,
						unresolvedTransactions: unresolvedTxs
					};
				});
			});
		}

		getGenesisVestingContracts() {
			var _this15 = this;

			return _call(function() {
				return _await(_this15._apiInitialized, function() {
					const accounts = [];
					const buf = Nimiq.BufferUtils.fromBase64(Nimiq.GenesisConfig.GENESIS_ACCOUNTS);
					const count = buf.readUint16();
					for (let i = 0; i < count; i++) {
						const address = Nimiq.Address.unserialize(buf);
						const account = Nimiq.Account.unserialize(buf);

						if (account.type === 1) {
							accounts.push({
								address: address.toUserFriendlyAddress(),
								// balance: Nimiq.Policy.satoshisToCoins(account.balance),
								owner: account.owner.toUserFriendlyAddress(),
								start: account.vestingStart,
								stepAmount: Nimiq.Policy.satoshisToCoins(account.vestingStepAmount),
								stepBlocks: account.vestingStepBlocks,
								totalAmount: Nimiq.Policy.satoshisToCoins(account.vestingTotalAmount)
							});
						}
					}
					return accounts;
				});
			});
		}

		removeTxFromMempool(txObj) {
			var _this16 = this;

			return _call(function() {
				return _await(_this16._createBasicTransactionFromObject(txObj), function(tx) {
					_this16._consensus.mempool.removeTransaction(tx);
				});
			});
		}

		_onInitialized() {
			// console.log('Nimiq API ready to use');
			this.fire('nimiq-api-ready');
		}

		_onConsensusSyncing() {
			// console.log('consensus syncing');
			this.fire('nimiq-consensus-syncing');
		}

		_onConsensusEstablished() {
			// console.log('consensus established');
			this.fire('nimiq-consensus-established');
		}

		_onConsensusLost() {
			// console.log('consensus lost');
			this.fire('nimiq-consensus-lost');
		}

		_onBalancesChanged(balances) {
			// console.log('new balances:', balances);
			this.fire('nimiq-balances', balances);
        }

		_onTransactionPending(sender, recipient, value, fee, extraData, hash, validityStartHeight) {
			// console.log('pending:', { sender, recipient, value, fee, extraData, hash, validityStartHeight });
			this.fire('nimiq-transaction-pending', {
				sender,
				recipient,
				value,
				fee,
				extraData,
				hash,
				validityStartHeight
			});
		}

		_onTransactionExpired(hash) {
			// console.log('expired:', hash);
			this.fire('nimiq-transaction-expired', hash);
		}

		_onTransactionMined(sender, recipient, value, fee, extraData, hash, blockHeight, timestamp, validityStartHeight) {
			// console.log('mined:', { sender, recipient, value, fee, extraData, hash, blockHeight, timestamp, validityStartHeight });
			this.fire('nimiq-transaction-mined', {
				sender,
				recipient,
				value,
				fee,
				extraData,
				hash,
				blockHeight,
				timestamp,
				validityStartHeight
			});
		}

		_onTransactionRelayed(sender, recipient, value, fee, extraData, hash, validityStartHeight) {
			// console.log('relayed:', { sender, recipient, value, fee, extraData, hash, validityStartHeight });
			this.fire('nimiq-transaction-relayed', {
				sender,
				recipient,
				value,
				fee,
				extraData,
				hash,
				validityStartHeight
			});
		}

		_onDifferentTabError(e) {
			// console.log('Nimiq API is already running in a different tab:', e);
			this.fire('nimiq-different-tab-error', e);
		}

		_onInitializationError(e) {
			// console.log('Nimiq API could not be initialized:', e);
			this.fire('nimiq-api-fail', e);
		}

		_onHeadChange(header) {
			// console.log('height changed:', height);
			this.fire('nimiq-head-change', {
				height: header.height,
				globalHashrate: this._globalHashrate(header.difficulty)
			});
		}

		_onPeersChanged() {
			// console.log('peers changed:', this._consensus.network.peerCount);
			this.fire('nimiq-peer-count', this._consensus.network.peerCount);
		}

		static _importApi() {
			return new Promise((resolve, reject) => {
				let script = document.createElement('script');
				script.type = 'text/javascript';
				script.src = NanoNetworkApi.API_URL;
				script.addEventListener('load', () => resolve(script), false);
				script.addEventListener('error', () => reject(script), false);
				document.body.appendChild(script);
			});
		}

		fire() {
			throw new Error('The fire() method needs to be overloaded!');
		}
	};

	window.NanoNetworkApi = NanoNetworkApi;
})();