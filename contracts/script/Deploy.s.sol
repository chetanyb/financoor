// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {DemoToken} from "../src/DemoToken.sol";
import {ProfitMachine} from "../src/ProfitMachine.sol";
import {LossMachine} from "../src/LossMachine.sol";
import {YieldFarm} from "../src/YieldFarm.sol";

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

        vm.stopBroadcast();

        // Print summary
        console.log("\n=== Deployment Summary ===");
        console.log("DemoToken:     ", address(token));
        console.log("ProfitMachine: ", address(profit));
        console.log("LossMachine:   ", address(loss));
        console.log("YieldFarm:     ", address(farm));
    }
}
