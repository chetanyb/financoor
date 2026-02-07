// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {DemoToken} from "../src/DemoToken.sol";
import {ProfitMachine} from "../src/ProfitMachine.sol";
import {LossMachine} from "../src/LossMachine.sol";
import {YieldFarm} from "../src/YieldFarm.sol";
import {MockSP1Verifier} from "../src/MockSP1Verifier.sol";
import {TaxVerifier} from "../src/TaxVerifier.sol";

contract DeployScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        // Deploy DemoToken
        DemoToken token = new DemoToken();
        console.log("DemoToken deployed at:", address(token));

        // Deploy ProfitMachine
        ProfitMachine profit = new ProfitMachine(address(token));
        console.log("ProfitMachine deployed at:", address(profit));

        // Deploy LossMachine
        LossMachine loss = new LossMachine(address(token));
        console.log("LossMachine deployed at:", address(loss));

        // Deploy YieldFarm
        YieldFarm farm = new YieldFarm(address(token));
        console.log("YieldFarm deployed at:", address(farm));

        // Deploy MockSP1Verifier (for demo - in production use actual SP1 verifier)
        MockSP1Verifier mockVerifier = new MockSP1Verifier();
        console.log("MockSP1Verifier deployed at:", address(mockVerifier));

        // Deploy TaxVerifier with mock VK (all zeros for demo)
        bytes32 mockVkey = bytes32(0);
        TaxVerifier taxVerifier = new TaxVerifier(address(mockVerifier), mockVkey);
        console.log("TaxVerifier deployed at:", address(taxVerifier));

        vm.stopBroadcast();

        // Print summary
        console.log("\n=== Deployment Summary ===");
        console.log("DemoToken:        ", address(token));
        console.log("ProfitMachine:    ", address(profit));
        console.log("LossMachine:      ", address(loss));
        console.log("YieldFarm:        ", address(farm));
        console.log("MockSP1Verifier:  ", address(mockVerifier));
        console.log("TaxVerifier:      ", address(taxVerifier));
    }
}
