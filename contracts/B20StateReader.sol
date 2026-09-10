// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./interfaces/IB20Asset.sol";
import "./interfaces/IB20AssetCobalt.sol";
import "./interfaces/IERC20.sol";

interface IERC165 {
    function supportsInterface(bytes4 interfaceId) external view returns (bool);
}

interface ICanonicalB20 {
    function multiplier() external view returns (uint256);
    function scaledBalanceOf(address account) external view returns (uint256);
    function toScaledBalance(uint256 rawAmount) external view returns (uint256);
    function toRawBalance(uint256 scaledAmount) external view returns (uint256);
}

/**
 * @title B20StateReader
 * @notice Canonical reader extracting live onchain state for Base B20 and ERC-8056 tokenized equities
 * @dev Performs dynamic interface detection and canonical B20 / ERC-8056 feature probing
 */
contract B20StateReader {
    uint256 internal constant WAD = 1e18;

    // Interface IDs for feature detection
    bytes4 private constant INTERFACE_ERC8056 = 0xa60bf13d; // ERC-8056 Scaled UI Amount Extension
    bytes4 private constant INTERFACE_B20_A    = 0x4bd27648; // Base B20 Core
    bytes4 private constant INTERFACE_B20_B    = 0xd890fd71; // Base B20 Multiplier
    bytes4 private constant INTERFACE_B20_C    = 0x57854fc3; // Base B20 Scaled Balance

    struct B20State {
        uint256 rawTokenAmount;
        uint256 effectiveMultiplier;
        uint256 pendingMultiplier;
        uint256 effectiveAt;
        uint256 uiShareAmount;
        bool hasLivePending;
        bool transferPaused;
        bool supports8056;
        bool hasCanonicalB20;
        bool isOfficialCoinbaseAsset;
        uint8 decimals;
    }

    /**
     * @notice Extracts complete, block-exact B20 asset state for a specified account
     * @param asset Address of the tokenized asset
     * @param account Target account (or vault) holding raw balance
     * @return state Canonical B20State struct
     */
    function getB20State(address asset, address account) public view returns (B20State memory state) {
        // 1. Read Raw Token Balance
        try IERC20(asset).balanceOf(account) returns (uint256 bal) {
            state.rawTokenAmount = bal;
        } catch {
            state.rawTokenAmount = 0;
        }

        // 2. Read Decimals
        try IERC20(asset).decimals() returns (uint8 dec) {
            state.decimals = dec;
        } catch {
            state.decimals = 18;
        }

        // 3. Feature Detection via ERC-165
        bool sup8056 = false;
        try IERC165(asset).supportsInterface(INTERFACE_ERC8056) returns (bool s) {
            sup8056 = s;
        } catch {}

        bool supB20A = false;
        try IERC165(asset).supportsInterface(INTERFACE_B20_A) returns (bool s) {
            supB20A = s;
        } catch {}

        bool supB20B = false;
        try IERC165(asset).supportsInterface(INTERFACE_B20_B) returns (bool s) {
            supB20B = s;
        } catch {}

        bool supB20C = false;
        try IERC165(asset).supportsInterface(INTERFACE_B20_C) returns (bool s) {
            supB20C = s;
        } catch {}

        state.supports8056 = sup8056;
        state.hasCanonicalB20 = supB20A || supB20B || supB20C;

        // 4. Read Multiplier: Try ERC-8056 uiMultiplier(), fallback to canonical multiplier()
        uint256 mult = WAD;
        try IB20Asset(asset).uiMultiplier() returns (uint256 m) {
            mult = m == 0 ? WAD : m;
            state.supports8056 = true;
        } catch {
            try ICanonicalB20(asset).multiplier() returns (uint256 m) {
                mult = m == 0 ? WAD : m;
                state.hasCanonicalB20 = true;
            } catch {
                mult = WAD;
            }
        }
        state.effectiveMultiplier = mult;

        // 5. Read Scheduled / Pending Cobalt Parameters if supported
        try IB20AssetCobalt(asset).newUIMultiplier() returns (uint256 newMult) {
            state.pendingMultiplier = newMult;
        } catch {
            state.pendingMultiplier = 0;
        }

        try IB20AssetCobalt(asset).effectiveAt() returns (uint256 effAt) {
            state.effectiveAt = effAt;
            if (effAt > block.timestamp && state.pendingMultiplier != 0) {
                state.hasLivePending = true;
            } else {
                state.hasLivePending = false;
            }
        } catch {
            state.effectiveAt = 0;
            state.hasLivePending = false;
        }

        // 6. Read Pause Status
        try IB20AssetCobalt(asset).paused() returns (bool isPaused) {
            state.transferPaused = isPaused;
        } catch {
            state.transferPaused = false;
        }

        // 7. Calculate Derived UI Share Amount (for UI reporting only)
        state.uiShareAmount = (state.rawTokenAmount * state.effectiveMultiplier) / WAD;
    }

    /**
     * @notice Computes live UI share-equivalent balance on read using live effective multiplier
     */
    function getLiveUIBalance(address asset, address account) external view returns (uint256 uiBalance) {
        B20State memory state = getB20State(asset, account);
        uiBalance = (state.rawTokenAmount * state.effectiveMultiplier) / WAD;
    }
}
