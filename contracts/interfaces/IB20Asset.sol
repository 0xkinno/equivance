// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./IERC20.sol";

/**
 * @title IB20Asset
 * @notice Standard interface for Base B20 / ERC-8056 Scaled UI Amount Token standard
 */
interface IB20Asset is IERC20 {
    /// @notice Returns the current UI multiplier (18 decimals, 1e18 = 1.0x)
    function uiMultiplier() external view returns (uint256);

    /// @notice Returns the user balance scaled by the UI multiplier
    function balanceOfUI(address account) external view returns (uint256);

    /// @notice Returns total supply scaled by the UI multiplier
    function totalSupplyUI() external view returns (uint256);

    /// @notice Converts raw ERC-20 token amount to UI amount
    function toUIAmount(uint256 rawAmount) external view returns (uint256);

    /// @notice Converts UI amount to raw ERC-20 token amount
    function fromUIAmount(uint256 uiAmount) external view returns (uint256);
}
