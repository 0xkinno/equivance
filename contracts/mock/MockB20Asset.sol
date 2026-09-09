// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../interfaces/IB20AssetCobalt.sol";

/**
 * @title MockB20Asset
 * @notice Reference ERC-8056 / B20 token asset with scheduled multiplier support (Cobalt standard)
 * @dev Implements lazy evaluation of uiMultiplier() at block.timestamp >= effectiveAt with zero maturity tx
 */
contract MockB20Asset is IB20AssetCobalt {
    uint256 internal constant WAD = 1e18;

    string private _name;
    string private _symbol;
    uint8 private _decimals;
    uint256 private _totalSupply;

    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) private _allowances;

    // Multiplier state
    uint256 public currentMultiplier;
    uint256 public override newUIMultiplier;
    uint256 public override effectiveAt;
    bool public override paused;
    address public owner;

    // Optional compliance transfer restriction flag for Attack D
    mapping(address => bool) public isAllowlisted;
    bool public enforceAllowlist;

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor(string memory name_, string memory symbol_, uint8 decimals_) {
        _name = name_;
        _symbol = symbol_;
        _decimals = decimals_;
        currentMultiplier = WAD; // Default 1.0x
        owner = msg.sender;
    }

    function name() external view override returns (string memory) { return _name; }
    function symbol() external view override returns (string memory) { return _symbol; }
    function decimals() external view override returns (uint8) { return _decimals; }
    function totalSupply() external view override returns (uint256) { return _totalSupply; }
    function balanceOf(address account) external view override returns (uint256) { return _balances[account]; }
    function allowance(address owner_, address spender) external view override returns (uint256) { return _allowances[owner_][spender]; }

    function mint(address to, uint256 amount) external {
        _totalSupply += amount;
        _balances[to] += amount;
        emit Transfer(address(0), to, amount);
    }

    function burn(address from, uint256 amount) external {
        require(_balances[from] >= amount, "Insufficient balance");
        _balances[from] -= amount;
        _totalSupply -= amount;
        emit Transfer(from, address(0), amount);
    }

    function approve(address spender, uint256 amount) external override returns (bool) {
        _allowances[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transfer(address recipient, uint256 amount) external override returns (bool) {
        _transfer(msg.sender, recipient, amount);
        return true;
    }

    function transferFrom(address sender, address recipient, uint256 amount) external override returns (bool) {
        uint256 currentAllowance = _allowances[sender][msg.sender];
        require(currentAllowance >= amount, "ERC20: allowance exceeded");
        _allowances[sender][msg.sender] = currentAllowance - amount;
        _transfer(sender, recipient, amount);
        return true;
    }

    function _transfer(address sender, address recipient, uint256 amount) internal {
        require(!paused, "B20: asset transfer paused");
        if (enforceAllowlist) {
            require(isAllowlisted[sender] && isAllowlisted[recipient], "B20: address not allowlisted");
        }
        require(_balances[sender] >= amount, "ERC20: transfer amount exceeds balance");
        _balances[sender] -= amount;
        _balances[recipient] += amount;
        emit Transfer(sender, recipient, amount);
    }

    // --- B20 / ERC-8056 Multiplier Logic ---

    /**
     * @notice Live effective UI multiplier calculated lazily on read
     */
    function uiMultiplier() public view override returns (uint256) {
        if (effectiveAt != 0 && block.timestamp >= effectiveAt) {
            return newUIMultiplier;
        }
        return currentMultiplier;
    }

    function balanceOfUI(address account) external view override returns (uint256) {
        return (_balances[account] * uiMultiplier()) / WAD;
    }

    function totalSupplyUI() external view override returns (uint256) {
        return (_totalSupply * uiMultiplier()) / WAD;
    }

    function toUIAmount(uint256 rawAmount) external view override returns (uint256) {
        return (rawAmount * uiMultiplier()) / WAD;
    }

    function fromUIAmount(uint256 uiAmount) external view override returns (uint256) {
        return (uiAmount * WAD) / uiMultiplier();
    }

    function setCurrentMultiplier(uint256 newMultiplier_) external onlyOwner {
        require(newMultiplier_ > 0, "Invalid multiplier");
        currentMultiplier = newMultiplier_;
    }

    function updateUIMultiplier(uint256 newMultiplier_, uint256 effectiveTimestamp) external override onlyOwner {
        require(newMultiplier_ > 0, "Invalid multiplier");
        if (effectiveTimestamp == 0 || effectiveTimestamp <= block.timestamp) {
            currentMultiplier = newMultiplier_;
            newUIMultiplier = 0;
            effectiveAt = 0;
            emit UIMultiplierUpdated(currentMultiplier, newMultiplier_, block.timestamp);
        } else {
            uint256 oldMultiplier = uiMultiplier();
            newUIMultiplier = newMultiplier_;
            effectiveAt = effectiveTimestamp;
            emit UIMultiplierUpdated(oldMultiplier, newMultiplier_, effectiveTimestamp);
        }
    }

    function cancelUIMultiplierUpdate() external override onlyOwner {
        require(effectiveAt != 0, "No pending update");
        newUIMultiplier = 0;
        effectiveAt = 0;
        emit UIMultiplierUpdateCancelled(currentMultiplier);
    }

    function setPaused(bool paused_) external onlyOwner {
        paused = paused_;
    }

    function setAllowlist(address account, bool status) external onlyOwner {
        isAllowlisted[account] = status;
    }

    function setEnforceAllowlist(bool enforce) external onlyOwner {
        enforceAllowlist = enforce;
    }
}
