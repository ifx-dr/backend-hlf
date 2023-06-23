/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

const DRChaincode = require('./lib/DRChaincode');

module.exports.DRChaincode = DRChaincode;
module.exports.contracts = [DRChaincode];
