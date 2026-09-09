// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./interfaces/IB20Asset.sol";
import "./interfaces/IB20AssetCobalt.sol";
import "./interfaces/IERC20.sol";

/**
 * @title B20StateReader
 * @notice Canonical reader extracting live onchain state for Base B20 / ERC-8056 tokenized equities
 */
contract B20StateReader {
    uint256 internal constant WAD = 1e18;

    struct B20State {
        uint256 rawBalance;
        uint256 effectiveMultiplier;
        uint256 pendingMultiplier;
        uint256 effectiveAt;
        bool hasLivePending;
        bool transferPaused;
        bool supports8056;
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
            state.rawBalance = bal;
        } catch {
            state.rawBalance = 0;
        }

        // 2. Read Decimals
        try IERC20(asset).decimals() returns (uint8 dec) {
            state.decimals = dec;
        } catch {
            state.decimals = 18;
        }

        // 3. Read Effective UI Multiplier (ERC-8056 / B20)
        try IB20Asset(asset).uiMultiplier() returns (uint256 mult) {
            state.effectiveMultiplier = mult == 0 ? WAD : mult;
            state.supports8056 = true;
        } catch {
            state.effectiveMultiplier = WAD;
            state.supports8056 = false;
        }

        // 4. Read Scheduled / Pending Cobalt Parameters if supported
        if (state.supports8056) {
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

            // 5. Read Pause Status
            try IB20AssetCobalt(asset).paused() returns (bool isPaused) {
                state.transferPaused = isPaused;
            } catch {
                state.transferPaused = false;
            }
        }
    }

    /**
     * @notice Computes live UI balance on read using live effective multiplier
     */
    function getLiveUIBalance(address asset, address account) external view returns (uint256 uiBalance) {
        B20State memory state = getB20State(asset, account);
        uiBalance = (state.rawBalance * state.effectiveMultiplier) / WAD;
    }
}
