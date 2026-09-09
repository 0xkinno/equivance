// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./IB20Asset.sol";

/**
 * @title IB20AssetCobalt
 * @notice Extended interface for B20 assets supporting scheduled multiplier updates introduced in Cobalt upgrade
 */
interface IB20AssetCobalt is IB20Asset {
    /// @notice Returns the pending scheduled UI multiplier (18 decimals)
    function newUIMultiplier() external view returns (uint256);

    /// @notice Returns the timestamp at which newUIMultiplier takes effect
    function effectiveAt() external view returns (uint256);

    /// @notice Schedules a future UI multiplier update
    function updateUIMultiplier(uint256 newMultiplier, uint256 effectiveTimestamp) external;

    /// @notice Cancels a pending UI multiplier update
    function cancelUIMultiplierUpdate() external;

    /// @notice Emitted when a UI multiplier update is scheduled
    event UIMultiplierUpdated(uint256 oldMultiplier, uint256 newMultiplier, uint256 effectiveAt);

    /// @notice Emitted when a pending UI multiplier update is cancelled
    event UIMultiplierUpdateCancelled(uint256 currentMultiplier);

    /// @notice Pause state inspection
    function paused() external view returns (bool);
}
