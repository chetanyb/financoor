// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {TaxVerifier} from "../src/TaxVerifier.sol";

contract DeployTaxVerifierScript is Script {
    // Real SP1 Groth16 Verifier Gateway on Sepolia
    address constant SP1_VERIFIER_SEPOLIA = 0x397A5f7f3dBd538f23DE225B51f532c34448dA9B;

    // Real VK hash for tax-zk program (SP1 4.2 - matches VM build)
    bytes32 constant TAX_ZK_VKEY = 0x00b4a3eaf10debf992cf924c5dc4eac96d8190e60ef534fc91610cca8576b43e;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        // Deploy TaxVerifier with real SP1 verifier and updated VK
        TaxVerifier taxVerifier = new TaxVerifier(SP1_VERIFIER_SEPOLIA, TAX_ZK_VKEY);
        console.log("TaxVerifier deployed at:", address(taxVerifier));
        console.log("VK hash:");
        console.logBytes32(TAX_ZK_VKEY);

        vm.stopBroadcast();
    }
}
