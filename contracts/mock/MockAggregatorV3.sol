// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../interfaces/IAggregatorV3.sol";

contract MockAggregatorV3 is IAggregatorV3 {
    uint8 private _decimals;
    string private _description;
    uint256 private _version;

    int256 public latestAnswer;
    uint256 public latestUpdatedAt;
    uint80 public latestRoundId;

    constructor(uint8 decimals_, string memory description_, int256 initialPrice_) {
        _decimals = decimals_;
        _description = description_;
        _version = 1;
        latestAnswer = initialPrice_;
        latestUpdatedAt = block.timestamp;
        latestRoundId = 1;
    }

    function decimals() external view override returns (uint8) { return _decimals; }
    function description() external view override returns (string memory) { return _description; }
    function version() external view override returns (uint256) { return _version; }

    function updatePrice(int256 newPrice) external {
        latestAnswer = newPrice;
        latestUpdatedAt = block.timestamp;
        latestRoundId++;
    }

    function setTimestamp(uint256 customTimestamp) external {
        latestUpdatedAt = customTimestamp;
    }

    function getRoundData(uint80 _roundId) external view override returns (
        uint80 roundId,
        int256 answer,
        uint256 startedAt,
        uint256 updatedAt,
        uint80 answeredInRound
    ) {
        return (_roundId, latestAnswer, latestUpdatedAt, latestUpdatedAt, _roundId);
    }

    function latestRoundData() external view override returns (
        uint80 roundId,
        int256 answer,
        uint256 startedAt,
        uint256 updatedAt,
        uint80 answeredInRound
    ) {
        return (latestRoundId, latestAnswer, latestUpdatedAt, latestUpdatedAt, latestRoundId);
    }
}
