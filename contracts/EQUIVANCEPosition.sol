// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title EQUIVANCEPosition
 * @notice Position storage library and accounting structures for EQUIVANCE
 */
contract EQUIVANCEPosition {
    struct Position {
        uint256 rawCollateral;       // Raw ERC-20 token units held in custody
        uint256 debtAmountUsd;       // Outstanding debt denominated in 18-decimal USD WAD
        uint256 lastUpdateTimestamp; // Block timestamp of last position mutation
    }

    // Mapping: user => asset => Position
    mapping(address => mapping(address => Position)) internal _positions;

    // List of supported collateral assets
    address[] internal _supportedAssets;
    mapping(address => bool) internal _isAssetTracked;

    event PositionUpdated(
        address indexed user,
        address indexed asset,
        uint256 rawCollateral,
        uint256 debtAmountUsd,
        uint256 timestamp
    );

    function getPosition(address user, address asset) external view returns (Position memory) {
        return _positions[user][asset];
    }

    function _updatePosition(
        address user,
        address asset,
        uint256 newRawCollateral,
        uint256 newDebtAmountUsd
    ) internal {
        _positions[user][asset] = Position({
            rawCollateral: newRawCollateral,
            debtAmountUsd: newDebtAmountUsd,
            lastUpdateTimestamp: block.timestamp
        });

        if (!_isAssetTracked[asset]) {
            _isAssetTracked[asset] = true;
            _supportedAssets.push(asset);
        }

        emit PositionUpdated(user, asset, newRawCollateral, newDebtAmountUsd, block.timestamp);
    }
}
